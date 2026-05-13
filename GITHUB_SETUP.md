# 🚀 GitHub Repository Setup Guide

Complete guide to setting up your Richmond Hotel Management System on GitHub with CI/CD.

## 📋 Table of Contents

1. [Quick Setup (5 Minutes)](#quick-setup-5-minutes)
2. [Detailed Setup](#detailed-setup)
3. [CI/CD Pipeline Overview](#cicd-pipeline-overview)
4. [Repository Settings](#repository-settings)
5. [Branch Protection Rules](#branch-protection-rules)
6. [Secrets Configuration](#secrets-configuration)
7. [First Release](#first-release)
8. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Create GitHub Repository

```bash
# Option A: Using GitHub CLI (Recommended)
gh repo create richmond-hotel-desktop --public --source=. --remote=origin --push

# Option B: Using Git Commands
# First create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/richmond-hotel-desktop.git
git branch -M main
git add .
git commit -m "feat: initial commit - hotel management system"
git push -u origin main
```

### Step 2: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click **Settings** → **Actions** → **General**
3. Under "Actions permissions", select **Allow all actions and reusable workflows**
4. Click **Save**

### Step 3: Create Your First Tag

```bash
# Create and push a version tag to trigger release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

**Done! 🎉** Your CI/CD pipeline is now active!

---

## 📖 Detailed Setup

### 1. Initialize Git (if not already done)

```bash
cd richmond-hotel-desktop
git init
git branch -M main
```

### 2. Configure Git User (if needed)

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 3. Review and Commit

```bash
# Check status
git status

# Add all files
git add .

# Create initial commit
git commit -m "feat: initial commit - hotel management system v1.0.0

- Add Electron-based desktop application
- Implement SQLite database
- Add room, booking, guest, and payment management
- Include comprehensive CI/CD pipelines
- Add documentation and contributing guidelines"
```

### 4. Create GitHub Repository

#### Option A: GitHub CLI (Easiest)

```bash
# Install GitHub CLI first if not installed
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Linux: See https://github.com/cli/cli#installation

# Login to GitHub
gh auth login

# Create repository
gh repo create richmond-hotel-desktop \
  --public \
  --source=. \
  --remote=origin \
  --description="Professional hotel management desktop application built with Electron" \
  --push
```

#### Option B: Manual Creation

1. Go to https://github.com/new
2. Repository name: `richmond-hotel-desktop`
3. Description: `Professional hotel management desktop application built with Electron`
4. Visibility: **Public** (or Private)
5. Click **Create repository**

Then connect locally:
```bash
git remote add origin https://github.com/YOUR_USERNAME/richmond-hotel-desktop.git
git push -u origin main
```

### 5. Set Repository Topics (Optional but Recommended)

Add these topics to help others find your project:
- `electron`
- `desktop-app`
- `hotel-management`
- `sqlite`
- `hotel-booking`
- `javascript`
- `nodejs`
- `cross-platform`

---

## 🔄 CI/CD Pipeline Overview

### Automated Workflows

#### 1. **Build and Release** (`build.yml`)
- **Triggers:** Push to main/develop, Tags (v*.*.*), PRs
- **Actions:**
  - Tests on Windows, macOS, Linux
  - Builds executables for all platforms
  - Uploads artifacts
  - Creates GitHub Release (on tags)

#### 2. **Pull Request CI** (`pr-ci.yml`)
- **Triggers:** Pull requests
- **Actions:**
  - Code quality checks
  - Security audit
  - Build verification
  - Auto-comment on PR with results

#### 3. **Nightly Build** (`nightly.yml`)
- **Triggers:** Daily at 2 AM UTC, Manual
- **Actions:**
  - Nightly builds for all platforms
  - Dependency update checks
  - Auto-create issues for outdated deps

#### 4. **Release Pipeline** (`release.yml`)
- **Triggers:** Version tags (v1.0.0, v2.1.3, etc.)
- **Actions:**
  - Generates changelog
  - Builds all platforms
  - Creates GitHub Release
  - Uploads installers

#### 5. **Security Scan** (`security.yml`)
- **Triggers:** Push, PRs, Weekly schedule
- **Actions:**
  - npm audit for vulnerabilities
  - CodeQL security analysis
  - License compliance check
  - Auto-create security issues

### Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Push to Branch  │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌───────────────┐          ┌───────────────┐
        │  Test & Lint  │          │ Build & Test  │
        └───────────────┘          └───────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Create PR       │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  PR CI Checks    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Code Review     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Merge to Main   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Create Tag      │
                    │  (v1.0.0)        │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Release Build   │
                    │  Win/Mac/Linux   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  GitHub Release  │
                    │  + Installers    │
                    └──────────────────┘
```

---

## ⚙️ Repository Settings

### 1. Enable Features

Go to **Settings** → **General**:

✅ Enable these:
- Issues
- Projects (optional)
- Discussions (recommended)
- Wikis (optional)
- Sponsorships (optional)

### 2. Default Branch

- Set default branch to `main`

### 3. Merge Button

Go to **Settings** → **General** → **Pull Requests**:

✅ Recommended settings:
- ✅ Allow squash merging
- ✅ Allow rebase merging
- ❌ Allow merge commits (cleaner history)
- ✅ Automatically delete head branches

### 4. Actions Permissions

Go to **Settings** → **Actions** → **General**:

✅ Set:
- **Actions permissions:** Allow all actions and reusable workflows
- **Workflow permissions:** Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

---

## 🛡️ Branch Protection Rules

Protect your `main` branch from direct pushes.

### Setup Branch Protection

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`

### Recommended Rules

```
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Required checks:
    - test
    - build

✅ Require conversation resolution before merging

✅ Require linear history (optional but recommended)

❌ Do not allow bypassing the above settings (unless you're solo)
```

### For Solo Development

If you're the only developer:
- You can skip "Require approvals"
- Enable "Allow specified actors to bypass" and add yourself

---

## 🔐 Secrets Configuration

### Required Secrets

Currently, no secrets are required! The pipelines use `GITHUB_TOKEN` which is automatically provided.

### Optional Secrets (For Advanced Features)

If you add these features later, configure secrets:

#### Code Signing (Windows)

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

**Windows Code Signing:**
```
Name: WINDOWS_CERTIFICATE
Value: [Base64 encoded .pfx file]

Name: WINDOWS_CERTIFICATE_PASSWORD
Value: [Certificate password]
```

**macOS Code Signing:**
```
Name: APPLE_ID
Value: [Your Apple ID]

Name: APPLE_PASSWORD
Value: [App-specific password]

Name: APPLE_TEAM_ID
Value: [Your Team ID]
```

#### Deployment Keys (If using auto-update server)

```
Name: AWS_ACCESS_KEY_ID
Value: [Your AWS key]

Name: AWS_SECRET_ACCESS_KEY
Value: [Your AWS secret]
```

---

## 🚀 First Release

### Create Your First Release

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Create version 1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0 - Initial production release"

# Push the tag
git push origin v1.0.0
```

### What Happens Automatically

1. **Release Pipeline Triggers**
2. **Builds Start** (takes 15-30 minutes)
   - Windows .exe
   - macOS .dmg
   - Linux .AppImage
3. **GitHub Release Created**
4. **Installers Uploaded**

### Check Release Status

1. Go to **Actions** tab
2. Click on the running workflow
3. Monitor build progress

### View Your Release

1. Go to **Releases** (right sidebar)
2. You'll see "Richmond Hotel Manager v1.0.0"
3. Download links for all platforms

---

## 🔧 Repository Configuration File

Create `.github/settings.yml` (optional, for GitHub Apps):

```yaml
repository:
  name: richmond-hotel-desktop
  description: Professional hotel management desktop application built with Electron
  homepage: https://your-website.com
  topics:
    - electron
    - hotel-management
    - desktop-app
    - sqlite
  private: false
  has_issues: true
  has_projects: true
  has_wiki: false
  has_downloads: true
  default_branch: main
  allow_squash_merge: true
  allow_merge_commit: false
  allow_rebase_merge: true
  delete_branch_on_merge: true

labels:
  - name: bug
    color: d73a4a
    description: Something isn't working
  
  - name: enhancement
    color: a2eeef
    description: New feature or request
  
  - name: documentation
    color: 0075ca
    description: Improvements or additions to documentation
  
  - name: critical
    color: ff0000
    description: Critical priority
  
  - name: security
    color: ee0701
    description: Security related issue
```

---

## 📊 Monitoring Your CI/CD

### GitHub Actions Dashboard

View all workflows:
```
https://github.com/YOUR_USERNAME/richmond-hotel-desktop/actions
```

### Build Status Badges

Add to your README.md:

```markdown
![Build Status](https://github.com/YOUR_USERNAME/richmond-hotel-desktop/workflows/Build%20and%20Release/badge.svg)
![Security Scan](https://github.com/YOUR_USERNAME/richmond-hotel-desktop/workflows/Security%20Scan/badge.svg)
```

### Insights

Check repository insights:
- **Traffic:** Visitor stats
- **Commits:** Activity timeline
- **Code frequency:** Contributions
- **Dependency graph:** Package dependencies

---

## 🛠️ Troubleshooting

### Build Fails: "better-sqlite3" Error

**Problem:** Native module compilation fails

**Solution:** This is expected on first build. GitHub Actions will:
1. Try to build
2. Rebuild native modules
3. Succeed on retry

Or add to workflow:
```yaml
- name: Rebuild native modules
  run: npm rebuild better-sqlite3
```

### Release Not Created

**Problem:** Tagged but no release appears

**Solution:** 
1. Check tag format: Must be `v1.0.0` (with 'v' prefix)
2. Check Actions tab for errors
3. Ensure tag is pushed: `git push origin --tags`

### macOS Build Fails

**Problem:** macOS builds fail without code signing

**Solution:**
1. For open source: Skip signing in package.json:
```json
"mac": {
  "identity": null
}
```

2. For production: Add Apple Developer credentials

### Permission Denied Errors

**Problem:** GitHub Actions can't write

**Solution:**
1. Go to **Settings** → **Actions** → **General**
2. Workflow permissions: **Read and write**
3. ✅ Allow GitHub Actions to create/approve PRs

---

## 📚 Next Steps

After setup:

1. **Configure Branch Protection** (see above)
2. **Add Collaborators** (Settings → Collaborators)
3. **Set Up Discussions** (Engagement → Discussions)
4. **Create First Issue** (Track features/bugs)
5. **Write Wiki** (Optional documentation)
6. **Add Topics** (Help others discover your repo)

---

## 🎯 Best Practices

### Commit Messages
```bash
# Good
git commit -m "feat(bookings): add email notifications"
git commit -m "fix(payments): correct rounding error"

# Bad
git commit -m "updates"
git commit -m "fixed bug"
```

### Version Tags
```bash
# Good
v1.0.0, v1.2.3, v2.0.0

# Bad
1.0, version-1, release
```

### Branch Names
```bash
# Good
feature/email-notifications
bugfix/payment-calculation
hotfix/security-patch

# Bad
my-branch, updates, test
```

---

## 📞 Support

### GitHub Features
- **Issues:** Bug reports and feature requests
- **Discussions:** Q&A and community chat
- **Projects:** Kanban boards for project management
- **Wiki:** Extended documentation

### Resources
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Electron Builder Docs](https://www.electron.build/)
- [Contributing Guide](CONTRIBUTING.md)

---

**Your repository is now production-ready with full CI/CD! 🚀**
