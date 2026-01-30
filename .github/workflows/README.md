# GitHub Actions Workflows

This directory contains automated workflows for BunNote.

## Workflows

### 1. CI (ci.yml)
**Trigger:** Push to main, Pull requests

**Purpose:** Continuous Integration - runs linter on every push/PR

**Steps:**
- Checkout code
- Install dependencies
- Run ESLint

### 2. Release (release.yml)
**Trigger:** Push tags matching `v*.*.*` (e.g., v1.0.0)

**Purpose:** Automatically build and create GitHub releases

**Steps:**
- Checkout code
- Install dependencies
- Run linter
- Package extension (.vsix)
- Extract changelog for the version
- Create GitHub release with .vsix file attached

**Usage:**
```bash
# Update version in package.json and CHANGELOG.md
# Then create and push a tag
git tag v1.0.0
git push origin v1.0.0
```

### 3. Publish (publish.yml)
**Trigger:** When a GitHub release is published

**Purpose:** Automatically publish to VS Code Marketplace

**Steps:**
- Checkout code
- Install dependencies
- Publish to marketplace using VSCE_TOKEN

**Setup Required:**
1. Get a Personal Access Token from Azure DevOps
2. Add it as a repository secret named `VSCE_TOKEN`
3. Go to: Settings → Secrets and variables → Actions → New repository secret

### 4. Version Bump (version-bump.yml)
**Trigger:** Manual workflow dispatch

**Purpose:** Easily bump version and create tags

**Steps:**
- Bump version in package.json
- Create git commit
- Create and push git tag

**Usage:**
1. Go to Actions tab on GitHub
2. Select "Version Bump" workflow
3. Click "Run workflow"
4. Choose version type (patch/minor/major)
5. This will automatically trigger the Release workflow

## Release Process

### Option 1: Manual
```bash
# 1. Update CHANGELOG.md with new version
# 2. Update version in package.json
npm version patch  # or minor, or major

# 3. Push changes and tags
git push
git push --tags

# 4. Release workflow runs automatically
```

### Option 2: Automated (Recommended)
```bash
# 1. Update CHANGELOG.md with new version
git add CHANGELOG.md
git commit -m "docs: update changelog for v1.0.1"
git push

# 2. Use GitHub Actions UI
# Go to Actions → Version Bump → Run workflow → Select version type

# 3. Everything else happens automatically!
```

## Secrets Required

### VSCE_TOKEN (for marketplace publishing)
1. Go to https://dev.azure.com/
2. Create a Personal Access Token with Marketplace (Publish) scope
3. Add to GitHub: Settings → Secrets → Actions → New secret
4. Name: `VSCE_TOKEN`
5. Value: Your token

## Notes

- The `GITHUB_TOKEN` is automatically provided by GitHub Actions
- Releases are created as non-draft, non-prerelease by default
- The changelog is automatically extracted from CHANGELOG.md
- .vsix files are automatically attached to releases
