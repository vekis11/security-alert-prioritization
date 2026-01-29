# Trivy Integration – Full Scan (Config, IaC, Repo, Rootfs, SBOM, ECR)

This guide explains how Trivy is integrated and how to reuse or automate it.

## What’s in place

- **Workflow**: `.github/workflows/trivy-scan.yml`
- **Scans**:
  1. **Scan CI Pipeline (w/ Trivy Config)** – fs scan using `config/trivy/trivy.yaml`
  2. **Infrastructure as Code** – Terraform, Kubernetes, CloudFormation (config scan)
  3. **Git repo / filesystem** – vuln, secret, misconfig (fs scan)
  4. **Rootfs** (optional) – rootfs scan when `rootfs_path` is provided
  5. **SBOM** – CycloneDX SBOM generation
  6. **AWS ECR** (optional) – image scan when `ecr_image_ref` and AWS secrets are set
- **Templates**: HTML report via default Trivy template (`html.tpl`)
- **GitHub Code Scanning**: All SARIF files uploaded to the Security tab
- **Output**: SARIF + JSON for each scan, HTML report, and SBOM; all in the **trivy-reports** artifact

---

## Step-by-step integration

### 1. Enable the workflow (already done)

The workflow is under `.github/workflows/trivy-scan.yml`. It runs on:

- **Push** to `main` and `develop`
- **Pull requests** to `main`
- **Schedule**: daily at 3 AM UTC
- **Manual**: Actions → “Trivy - Full Scan (Config, IaC, Repo, Rootfs, SBOM, ECR)” → “Run workflow”
  - Optional inputs: `scan_ref`, `rootfs_path`, `ecr_image_ref`

No extra setup is required for basic use.

### 2. Grant permissions

The workflow sets:

```yaml
permissions:
  contents: read
  security-events: write
```

- **contents: read** – checkout and read repo files.
- **security-events: write** – upload SARIF to the Security tab.

If the repo uses default GHA permissions, this is enough. For restricted permissions, ensure the workflow job has at least these.

### 3. View results

- **Security tab**: **Security** → **Code scanning** → open alerts from categories: trivy-config, trivy-iac, trivy-fs, trivy-rootfs, trivy-ecr.
- **Run artifacts**: Download **trivy-reports-&lt;run_number&gt;** for:
  - SARIF: `trivy-config-results.sarif`, `trivy-iac-results.sarif`, `trivy-fs-results.sarif`, `trivy-rootfs-results.sarif`, `trivy-ecr-results.sarif`
  - JSON: `trivy-iac-results.json`, `trivy-fs-results.json`, `trivy-rootfs-results.json`, `trivy-ecr-results.json`, `trivy-sbom.json`
  - HTML: `trivy-report.html` (open in browser for a modern report)
- **Summary**: Job step summary shows a table and a link to the Security tab and artifact.

### 4. Optional: use a Trivy config file

An optional config is in `config/trivy/trivy.yaml`. To use it in the action, add `trivy-config` and keep `scan-type` and `scan-ref` in the workflow (they cannot come from the config file):

```yaml
- uses: aquasecurity/trivy-action@0.33.1
  with:
    scan-type: 'config'
    scan-ref: '.'
    trivy-config: config/trivy/trivy.yaml
```

You can add more options (severity, format, secret config path, etc.) in `config/trivy/trivy.yaml` and reduce duplication in the workflow.

### 5. Private Terraform / Kubernetes modules

If Trivy needs to pull private IaC modules, configure Git auth before the scan (e.g. in the same job, before the Trivy step):

```yaml
- name: Configure Git for private modules
  run: |
    git config --global url."https://${{ github.actor }}:${{ secrets.PRIVATE_REPO_TOKEN }}@github.com/".insteadOf "https://github.com/"
```

Add `PRIVATE_REPO_TOKEN` (e.g. a PAT with `repo` scope) to the repo secrets.

### 6. Optional: AWS ECR scan

To scan an image in AWS ECR:

1. Add repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` (or rely on default `us-east-1`).
2. Run the workflow manually and set **ecr_image_ref** to your ECR image URI, e.g. `123456789.dkr.ecr.us-east-1.amazonaws.com/my-repo:tag`.

### 7. Optional: Rootfs scan

To scan a rootfs directory, run the workflow manually and set **rootfs_path** to the path of the rootfs (e.g. a directory or extracted rootfs).

---

## Making it automated and reusable

### Automation (already in place)

- **On every PR to `main`** – Trivy runs and uploads SARIF; reviewers see Code Scanning alerts.
- **On push to `main` / `develop`** – Same as above; keeps default branch continuously scanned.
- **Daily schedule** – Catches issues that might have been merged without a PR or from config changes.

No extra automation steps are required; it’s already integrated into the pipeline.

### Reusing in another repo

1. **Copy the workflow**
   - Copy `.github/workflows/trivy-scan.yml` into the other repo’s `.github/workflows/`.
2. **Optional: copy Trivy config**
   - Copy `config/trivy/trivy.yaml` (and adjust paths/severity if needed).
3. **Trigger and scope**
   - Adjust `on.push.branches` and `on.pull_request.branches` if your default branch isn’t `main`.
   - To scan a subdirectory, use **workflow_dispatch** and set **scan_ref** (e.g. `infra/` or `k8s/`), or change the default in the workflow.
4. **Call from another workflow (optional)**
   - In the other repo, add a workflow that uses `workflow_call` (see below).

### Calling from another workflow (reusable pattern)

In the **same** repo you can trigger Trivy from another workflow:

```yaml
jobs:
  security:
    uses: ./.github/workflows/trivy-scan.yml
    # optional, only if trivy-scan.yml defines workflow_call with inputs:
    # with:
    #   scan_ref: '.'
```

To support this, add `workflow_call` and inputs to `trivy-scan.yml`:

```yaml
on:
  workflow_call:
    inputs:
      scan_ref:
        required: false
        default: '.'
        type: string
  push:
    branches: [main, develop]
  # ... rest of triggers
```

Then use `github.event.inputs.scan_ref || '.'` (and similar for other inputs) in the Trivy steps.

---

## Failing the pipeline on severity

By default, the workflow uses `exit-code: '0'` so the run does not fail when Trivy finds issues (results still go to Code Scanning and artifacts).

To **fail the run** on CRITICAL/HIGH:

1. In `.github/workflows/trivy-scan.yml`, in the “Run Trivy IaC” and “Run Trivy filesystem” steps, set:
   - `exit-code: '1'`
   - `severity: 'CRITICAL,HIGH'`
2. Remove `continue-on-error: true` from those steps.

Alternatively, uncomment and adjust the `trivy-fail-on-severity` job at the bottom of `trivy-scan.yml` so a second, strict run fails the workflow while the first run still uploads SARIF.

---

## Caching (optional)

Trivy action caches the vulnerability DB by default. To rely on a pre-filled cache (e.g. from a scheduled job on the default branch):

1. In a separate workflow, run on a schedule (e.g. daily) and save the cache (e.g. `actions/cache/save@v4` for `.cache/trivy`).
2. In `trivy-scan.yml`, when running the Trivy steps, set:
   ```yaml
   env:
     TRIVY_SKIP_DB_UPDATE: true
     TRIVY_SKIP_JAVA_DB_UPDATE: true
   ```
   so the job uses the cache instead of downloading DBs every time.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Workflow is in `.github/workflows/trivy-scan.yml` – runs on push/PR/schedule/manual |
| 2 | Permissions `contents: read` and `security-events: write` are set in the workflow |
| 3 | View results in Security → Code scanning and in run artifacts / job summary |
| 4 | Optionally use `config/trivy/trivy.yaml` via `trivy-config` |
| 5 | For private IaC modules, add Git auth with a PAT before the scan |
| Reuse | Copy `trivy-scan.yml` (and optionally `config/trivy/trivy.yaml`) to other repos; optionally add `workflow_call` and call from other workflows |
| Fail on severity | Set `exit-code: '1'` and desired `severity` in the Trivy steps, or enable the optional fail job |

Reference: [aquasecurity/trivy-action](https://github.com/aquasecurity/trivy-action).
