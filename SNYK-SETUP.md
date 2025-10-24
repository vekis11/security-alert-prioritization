# 🔒 Snyk Security Scanning Setup Guide

## 🚨 **Current Status**
Your CI/CD pipeline includes Snyk security scanning, but the `SNYK_TOKEN` is not configured. This guide will help you set it up.

## 🎯 **Quick Setup (5 minutes)**

### **Step 1: Get Your Snyk Token**
1. Go to [https://snyk.io/account](https://snyk.io/account)
2. Sign in or create a free account
3. Navigate to **Settings** → **API Token**
4. Click **Generate Token**
5. Copy the token (starts with `snyk_`)

### **Step 2: Add Token to GitHub Secrets**
1. Go to your repository: https://github.com/vekis11/security-alert-prioritization
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `SNYK_TOKEN`
6. Value: `your-snyk-token-here`
7. Click **Add secret**

### **Step 3: Verify Setup**
1. Go to **Actions** tab
2. Click on the latest workflow run
3. Look for "✅ SNYK_TOKEN is configured" message
4. Check Snyk scan results

## 🔧 **What Snyk Does**

### **Security Scanning**
- **Vulnerability Detection**: Finds known security issues in dependencies
- **License Compliance**: Checks for problematic licenses
- **Dependency Analysis**: Maps your dependency tree
- **Risk Assessment**: Prioritizes vulnerabilities by severity

### **Integration Benefits**
- **Automated Scanning**: Runs on every push and PR
- **Daily Monitoring**: Scheduled scans at 2 AM UTC
- **GitHub Integration**: Results appear in Security tab
- **Actionable Reports**: Detailed remediation guidance

## 📊 **Scan Results**

### **What You'll See**
- **High Severity**: Critical vulnerabilities requiring immediate attention
- **Medium Severity**: Important issues that should be addressed
- **Low Severity**: Minor issues for future consideration
- **License Issues**: Dependencies with problematic licenses

### **Reports Generated**
- **snyk-backend.json**: Backend dependency scan results
- **snyk-frontend.json**: Frontend dependency scan results
- **security-report.md**: Human-readable summary

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Authentication Error (SNYK-0005)**
```
Authentication error (SNYK-0005)
Authentication credentials not recognized
```
**Solution**: 
- Verify token is correct in GitHub secrets
- Check token hasn't expired
- Ensure token has proper permissions

#### **Token Not Set**
```
⚠️ SNYK_TOKEN not set - Snyk scans will be skipped
```
**Solution**:
- Add `SNYK_TOKEN` to repository secrets
- Follow Step 2 above

#### **No Vulnerabilities Found**
```
✅ No vulnerabilities found
```
**This is good!** Your dependencies are secure.

### **Manual Testing**
```bash
# Install Snyk CLI locally
npm install -g snyk

# Authenticate
snyk auth

# Test scan
snyk test

# Monitor project
snyk monitor
```

## 🎯 **Advanced Configuration**

### **Custom Severity Thresholds**
The pipeline is configured for:
- **High severity only**: `--severity-threshold=high`
- **JSON output**: For programmatic processing
- **Continue on error**: Pipeline won't fail if Snyk has issues

### **Snyk Policy File**
Create `.snyk` file in your repository root:
```yaml
# Snyk (https://snyk.io) policy file, patches or ignores known vulnerabilities.
version: v1.25.0

# Ignore specific vulnerabilities
ignore:
  SNYK-JS-LODASH-567746:
    - '*':
        reason: 'Lodash vulnerability in dev dependencies only'
        expires: '2024-12-31T23:59:59.999Z'

# Patch vulnerabilities
patch:
  SNYK-JS-ACORN-559764:
    - '*':
        reason: 'Auto-patch high severity Acorn vulnerability'
        expires: '2024-12-31T23:59:59.999Z'
```

## 📈 **Monitoring & Alerts**

### **GitHub Security Tab**
- View all Snyk findings
- Track vulnerability trends
- Access detailed reports

### **Daily Reports**
- Automated scans every day at 2 AM UTC
- Results stored as artifacts
- 30-day retention policy

### **Integration Benefits**
- **Security Dashboard**: Centralized view of all security issues
- **Automated Remediation**: Snyk can create PRs for fixes
- **Team Collaboration**: Share findings with security team

## 🚀 **Next Steps**

1. **Set up Snyk token** (follow steps above)
2. **Run a test scan** to verify everything works
3. **Review initial results** in GitHub Security tab
4. **Configure policies** if needed (optional)
5. **Set up team notifications** (optional)

## 🔗 **Useful Links**

- **Snyk Dashboard**: https://snyk.io/account
- **Documentation**: https://docs.snyk.io/
- **GitHub Integration**: https://docs.snyk.io/integrations/git-repository-scm-integrations/github-integration
- **CLI Reference**: https://docs.snyk.io/snyk-cli

---

**💡 Tip**: Start with the free Snyk plan - it provides comprehensive security scanning for open source projects!
