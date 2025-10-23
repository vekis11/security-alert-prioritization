# 🔧 Security Dashboard Pipeline - Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **1. Pipeline Not Running**
**Problem**: GitHub Actions workflow not triggering
**Solutions**:
- Check if workflow file is in `.github/workflows/` directory
- Verify branch name matches workflow trigger (`main`, `develop`)
- Ensure workflow file has correct YAML syntax
- Check GitHub Actions permissions in repository settings

### **2. Security Scan Failures**
**Problem**: Snyk or OWASP scans failing
**Solutions**:
```bash
# Check Snyk token configuration
# Go to: Repository Settings > Secrets and variables > Actions
# Add: SNYK_TOKEN = your-snyk-api-token

# Verify Snyk token is valid
snyk auth your-snyk-token
snyk test
```

### **3. Build Failures**
**Problem**: Frontend or backend build failing
**Solutions**:
- Check Node.js version compatibility (requires 18+)
- Verify all dependencies are installed
- Check for syntax errors in code
- Review build logs for specific error messages

### **4. Deployment Issues**
**Problem**: GitHub Pages deployment failing
**Solutions**:
- Enable GitHub Pages in repository settings
- Set source to "GitHub Actions"
- Check Pages permissions
- Verify build artifacts are created

### **5. Test Failures**
**Problem**: Jest tests failing
**Solutions**:
```bash
# Run tests locally to debug
npm test
cd client && npm test

# Check test coverage
npm run test:coverage
```

## 🔍 **Debugging Steps**

### **Step 1: Check Workflow Status**
1. Go to repository Actions tab
2. Click on failed workflow run
3. Review job logs for specific errors
4. Check individual step outputs

### **Step 2: Local Testing**
```bash
# Test security scanning locally
npm run security:snyk
npm run security:audit

# Test code quality
npm run lint
npm run format:check

# Test builds
npm run build
cd client && npm run build
```

### **Step 3: Environment Verification**
```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version

# Verify dependencies
npm list --depth=0
```

## 📊 **Pipeline Monitoring**

### **Health Checks**
- **Security Scan**: Daily at 2 AM UTC
- **Code Quality**: On every push/PR
- **Deployment**: On main branch pushes
- **Dependencies**: Weekly on Mondays

### **Status Indicators**
- ✅ **Green**: All checks passed
- ⚠️ **Yellow**: Warnings, non-blocking
- ❌ **Red**: Critical failures, blocking
- ⏸️ **Gray**: Skipped or cancelled

## 🛠️ **Manual Pipeline Triggers**

### **Run Specific Jobs**
```yaml
# Trigger security scan only
workflow_dispatch:
  inputs:
    run_security_scan: true
    run_tests: false
    deploy_to_pages: false
```

### **Force Deployment**
```yaml
# Deploy to GitHub Pages
workflow_dispatch:
  inputs:
    run_security_scan: false
    run_tests: false
    deploy_to_pages: true
```

## 📋 **Checklist for Issues**

### **Before Reporting Issues**
- [ ] Check workflow logs for specific errors
- [ ] Verify all secrets are configured
- [ ] Test locally with same Node.js version
- [ ] Check repository permissions
- [ ] Review recent changes

### **When Reporting Issues**
- [ ] Include workflow run URL
- [ ] Provide error logs
- [ ] Specify environment details
- [ ] Mention recent changes
- [ ] Include screenshots if relevant

## 🔧 **Configuration Files**

### **Required Secrets**
```
SNYK_TOKEN=your-snyk-api-token
```

### **Optional Secrets**
```
OPENAI_API_KEY=your-openai-key
SLACK_BOT_TOKEN=your-slack-token
MONGODB_URI=your-mongodb-uri
```

### **Environment Variables**
```env
NODE_VERSION=18
GITHUB_PAGES_URL=username.github.io/repository-name
```

## 📞 **Getting Help**

### **Documentation**
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Snyk Documentation](https://docs.snyk.io/)
- [Jest Testing](https://jestjs.io/docs/getting-started)

### **Community Support**
- [GitHub Discussions](https://github.com/vekis11/security-alert-prioritization/discussions)
- [Issues](https://github.com/vekis11/security-alert-prioritization/issues)

### **Emergency Contacts**
- Repository maintainer: @vekis11
- Security issues: Use security vulnerability template

## 🎯 **Quick Fixes**

### **Reset Pipeline**
```bash
# Cancel all running workflows
# Go to Actions tab > Cancel all runs

# Re-run from latest commit
# Click "Re-run all jobs" on failed workflow
```

### **Clear Cache**
```bash
# Clear npm cache
npm cache clean --force

# Clear GitHub Actions cache
# Go to Actions tab > Clear cache
```

### **Force Rebuild**
```bash
# Push empty commit to trigger pipeline
git commit --allow-empty -m "Trigger pipeline rebuild"
git push origin main
```

---

**💡 Tip**: Most issues can be resolved by checking the workflow logs and verifying configuration. When in doubt, start with local testing!
