# Release Guide

This guide explains how to release a new version of BunNote.

## Quick Release (Recommended)

### 1. Update Changelog
Edit `CHANGELOG.md` and add your changes under a new version:

```markdown
## [1.0.1] - 2026-01-30

### Added
- New feature description

### Fixed
- Bug fix description
```

### 2. Commit Changelog
```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for v1.0.1"
git push
```

### 3. Trigger Version Bump
1. Go to GitHub → Actions tab
2. Select "Version Bump" workflow
3. Click "Run workflow"
4. Select version type:
   - **patch** (1.0.0 → 1.0.1) - Bug fixes
   - **minor** (1.0.0 → 1.1.0) - New features
   - **major** (1.0.0 → 2.0.0) - Breaking changes
5. Click "Run workflow"

### 4. Automatic Process
The automation will:
- ✅ Bump version in package.json
- ✅ Create a git commit
- ✅ Create and push a git tag
- ✅ Trigger the Release workflow
- ✅ Build the .vsix package
- ✅ Create a GitHub release
- ✅ Attach the .vsix file
- ✅ Extract changelog notes

### 5. Publish to Marketplace (Optional)
If you've set up the `VSCE_TOKEN` secret:
- Go to the release on GitHub
- Click "Edit release"
- Click "Publish release"
- The extension will automatically publish to VS Code Marketplace

## Manual Release

### 1. Update Version
```bash
# Update CHANGELOG.md first, then:
npm version patch  # or minor, or major
```

### 2. Push Changes
```bash
git push
git push --tags
```

### 3. Wait for Automation
The release workflow will automatically:
- Build the package
- Create a GitHub release
- Attach the .vsix file

## Publishing to VS Code Marketplace

### First Time Setup

1. **Create Azure DevOps Account**
   - Go to https://dev.azure.com/
   - Sign in with your Microsoft account

2. **Create Personal Access Token**
   - Click on User Settings (top right) → Personal Access Tokens
   - Click "New Token"
   - Name: "BunNote Marketplace"
   - Organization: All accessible organizations
   - Scopes: Custom defined → Marketplace → Publish
   - Click "Create"
   - **Copy the token immediately** (you won't see it again)

3. **Add Token to GitHub**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VSCE_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

4. **Create Publisher**
   - Go to https://marketplace.visualstudio.com/manage
   - Click "Create publisher"
   - Publisher ID: `elharis` (must match package.json)
   - Display name: Your name
   - Click "Create"

### Publishing

Once setup is complete, publishing is automatic:
1. Create a release on GitHub (or let the workflow do it)
2. Click "Publish release"
3. The publish workflow runs automatically
4. Extension appears on marketplace in ~5 minutes

## Testing Before Release

### Test Build Locally
```bash
npm install -g @vscode/vsce
vsce package
```

### Test Installation
1. Open VS Code
2. Press `Ctrl+Shift+P`
3. Type "Extensions: Install from VSIX..."
4. Select the generated .vsix file
5. Test all features

### Test on Multiple Platforms
Use the "Test Build" workflow:
1. Go to Actions → Test Build
2. Click "Run workflow"
3. Downloads .vsix files for Windows, macOS, and Linux
4. Test on each platform

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

## Checklist

Before releasing:
- [ ] Update CHANGELOG.md
- [ ] Test extension locally
- [ ] Run `npm run lint` (no errors)
- [ ] Test on different platforms (if possible)
- [ ] Update README if needed
- [ ] Commit all changes

## Troubleshooting

### Release workflow fails
- Check that CHANGELOG.md has the version section
- Ensure package.json version matches the tag
- Check GitHub Actions logs for details

### Publish workflow fails
- Verify VSCE_TOKEN is set correctly
- Check token hasn't expired
- Ensure publisher exists on marketplace
- Verify publisher ID matches package.json

### Can't create tag
- Make sure you've committed all changes
- Check you have push permissions
- Verify tag doesn't already exist

## Support

For issues with the release process:
- Check `.github/workflows/README.md`
- Review GitHub Actions logs
- Open an issue on GitHub
