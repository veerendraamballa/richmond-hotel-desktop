# 🚀 CI/CD Quick Reference

## Quick Commands

### Setup Repository
```bash
# Create repository on GitHub (using GitHub CLI)
gh repo create richmond-hotel-desktop --public --source=. --remote=origin --push

# Or manually
git remote add origin https://github.com/YOUR_USERNAME/richmond-hotel-desktop.git
git push -u origin main
```

### Create Release
```bash
# Version 1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Version 1.1.0 (minor update)
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0
```

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, then commit
git add .
git commit -m "feat(scope): description"

# Push and create PR
git push origin feature/my-feature
# Then create PR on GitHub
```

---

## Workflows Overview

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| **build.yml** | Push, PR, Tags | Build & test all platforms | ~20 min |
| **pr-ci.yml** | Pull requests | Code quality checks | ~5 min |
| **release.yml** | Version tags (v*.*.*) | Create releases + installers | ~30 min |
| **nightly.yml** | Daily 2 AM UTC | Nightly builds + dep check | ~25 min |
| **security.yml** | Push, PR, Weekly | Security scanning | ~10 min |

---

## Pipeline Status

### Check Pipeline Status
```
https://github.com/YOUR_USERNAME/richmond-hotel-desktop/actions
```

### View Latest Release
```
https://github.com/YOUR_USERNAME/richmond-hotel-desktop/releases/latest
```

---

## Badges for README

Add these to your README.md:

```markdown
![Build](https://github.com/YOUR_USERNAME/richmond-hotel-desktop/workflows/Build%20and%20Release/badge.svg)
![Release](https://github.com/YOUR_USERNAME/richmond-hotel-desktop/workflows/Release%20Pipeline/badge.svg)
![Security](https://github.com/YOUR_USERNAME/richmond-hotel-desktop/workflows/Security%20Scan/badge.svg)
![License](https://img.shields.io/github/license/YOUR_USERNAME/richmond-hotel-desktop)
![Version](https://img.shields.io/github/v/release/YOUR_USERNAME/richmond-hotel-desktop)
```

---

## Common Tasks

### Update Version
```bash
# Update package.json version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Commit and push
git push origin main --tags
```

### Trigger Manual Build
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose branch
5. Click "Run workflow" button

### Cancel Running Workflow
1. Go to Actions tab
2. Click on running workflow
3. Click "Cancel workflow"

---

## Troubleshooting

### Build Failed
```bash
# Check logs in Actions tab
# Common fixes:

# 1. Rebuild native modules
npm rebuild better-sqlite3

# 2. Clear cache
npm ci

# 3. Update dependencies
npm update
```

### Release Not Created
```bash
# Ensure tag format is correct
git tag -a v1.0.0 -m "Message"  # ✅ Correct
git tag -a 1.0.0 -m "Message"   # ❌ Wrong (missing 'v')

# Check if tag was pushed
git push origin --tags
```

### Permission Errors
1. Settings → Actions → General
2. Workflow permissions: **Read and write**
3. ✅ Allow GitHub Actions to create/approve PRs

---

## Security

### View Security Alerts
```
https://github.com/YOUR_USERNAME/richmond-hotel-desktop/security
```

### Dependabot Alerts
- Automatically enabled
- Creates PRs for updates
- Review and merge

---

## Workflow Files Location

```
.github/
├── workflows/
│   ├── build.yml       # Main build pipeline
│   ├── pr-ci.yml       # Pull request checks
│   ├── release.yml     # Release automation
│   ├── nightly.yml     # Nightly builds
│   └── security.yml    # Security scanning
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── PULL_REQUEST_TEMPLATE.md
```

---

## Support

- 📖 [Full Setup Guide](GITHUB_SETUP.md)
- 👥 [Contributing Guide](CONTRIBUTING.md)
- 🚀 [Deployment Guide](DEPLOYMENT_GUIDE.md)
- 📝 [Changelog](CHANGELOG.md)
