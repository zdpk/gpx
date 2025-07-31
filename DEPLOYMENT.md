# GPX Deployment Guide

This document outlines the deployment process for GPX to npm using GitHub Actions.

## Overview

GPX uses automated CI/CD pipelines to ensure code quality and streamline releases:

- **CI Pipeline**: Runs on every push/PR to test code quality
- **Release Pipeline**: Automatically creates releases using semantic versioning
- **Publish Pipeline**: Publishes to npm when releases are created
- **Dependencies Pipeline**: Keeps dependencies up-to-date

## Prerequisites

Before deploying, ensure you have:

1. **NPM Token**: Required for publishing to npm
2. **GitHub Token**: Automatically provided by GitHub Actions
3. **Repository Secrets**: Configured in GitHub repository settings

### Required Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret | Description | How to get |
|--------|-------------|------------|
| `NPM_TOKEN` | npm authentication token | [Create token on npmjs.com](https://docs.npmjs.com/creating-and-viewing-access-tokens) |
| `CODECOV_TOKEN` | Code coverage reporting (optional) | [Sign up at codecov.io](https://codecov.io/) |

## Deployment Methods

### 1. Automatic Releases (Recommended)

GPX uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning and releases.

#### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Examples:**
```bash
feat: add support for private repositories
fix: resolve binary matching on Windows
docs: update installation instructions
chore: update dependencies
```

**Version Bumps:**
- `feat:` → Minor version (0.1.0 → 0.2.0)
- `fix:` → Patch version (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` → Major version (0.1.0 → 1.0.0)

#### Release Process

1. **Make changes** with conventional commit messages
2. **Push to main branch**
3. **Automatic release** is triggered
4. **npm publish** happens automatically

### 2. Manual Releases

#### Method 1: Version Tags (Recommended)

```bash
# Create and push version tag - triggers automatic npm publish
git tag v0.1.0
git push origin v0.1.0

# Or use npm version command (automatically creates tag)
npm version patch   # Creates v0.1.1
npm version minor   # Creates v0.2.0  
npm version major   # Creates v1.0.0

# Push the tag to trigger deployment
git push origin main --follow-tags
```

#### Method 2: GitHub Actions Workflow

1. Go to **Actions** tab in GitHub
2. Select **"Publish to npm"** workflow
3. Click **"Run workflow"**
4. Choose release type: `patch`, `minor`, `major`, or `prerelease`
5. Click **"Run workflow"**

#### Method 3: GitHub Releases

1. Go to **Releases** tab in GitHub
2. Click **"Create a new release"**
3. Tag version: `v1.0.0` (creates tag automatically)
4. Fill release title and description
5. Click **"Publish release"** (triggers automatic npm publish)

### 3. Emergency Releases

For critical fixes:

```bash
# Make urgent fix
git checkout -b hotfix/critical-fix
# ... make changes ...
git commit -m "fix: critical security vulnerability"

# Push and create PR
git push origin hotfix/critical-fix

# After PR merge, tag and release manually
git checkout main
git pull origin main
npm version patch
git push origin main --follow-tags
```

## Release Validation

### Pre-release Checks

The release pipeline runs these checks:

- ✅ **Type checking** (`npm run typecheck`)
- ✅ **Linting** (`npm run lint`)
- ✅ **Unit tests** (`npm test`)
- ✅ **Build process** (`npm run build`)
- ✅ **CLI functionality** (`gpx --version`, `gpx --help`)
- ✅ **Package integrity** (`npm pack --dry-run`)

### Post-release Verification

After publishing:

1. **Package availability**: Verify on [npmjs.com](https://www.npmjs.com/package/gpx)
2. **Installation test**: `npm install -g gpx@latest`
3. **Functionality test**: `gpx --version`
4. **GitHub release**: Check release was created with changelog

## Troubleshooting

### Common Issues

#### 1. npm Publish Fails

**Error**: `npm ERR! code E403`

**Solution**: 
- Check NPM_TOKEN is valid and has publish permissions
- Verify package name is available (if first release)
- Ensure you're not trying to publish same version twice

#### 2. Tests Fail in CI

**Error**: Tests pass locally but fail in CI

**Solution**:
- Check Node.js version compatibility (we support 18.x, 20.x, 21.x)
- Verify no hardcoded paths or OS-specific code
- Run tests with `--verbose` flag for more details

#### 3. Build Fails

**Error**: TypeScript compilation errors

**Solution**:
- Run `npm run typecheck` locally
- Fix any type errors
- Ensure all imports use `.js` extensions (not `.ts`)

#### 4. Semantic Release Fails

**Error**: No new version to release

**Solution**:
- Check commit messages follow conventional format
- Ensure commits contain actual changes (not just docs/chore)
- Use `npm run release:dry` to test locally

### Manual Recovery

If automated release fails:

```bash
# 1. Fix the issue locally
git checkout main
git pull origin main

# 2. Manual version bump
npm version patch  # or minor/major

# 3. Build and test
npm run build
npm test

# 4. Publish manually
npm publish

# 5. Push version tag
git push origin main --follow-tags

# 6. Create GitHub release manually
gh release create v$(node -p "require('./package.json').version") \
  --title "Release v$(node -p "require('./package.json').version")" \
  --generate-notes
```

## Monitoring

### Release Notifications

- **GitHub**: Watch repository for release notifications
- **npm**: Follow package on npmjs.com
- **Issues**: Monitor for user reports after releases

### Metrics to Track

- **Download statistics**: Check npm weekly downloads
- **Issue reports**: Monitor GitHub issues for release-related bugs
- **Performance**: CI/CD pipeline execution times
- **Security**: Automated vulnerability scans

## Environment-specific Deployments

### Beta Releases

For testing new features:

```bash
# Create beta release
npm version prerelease --preid=beta
git push origin main --follow-tags
```

This publishes to npm with `@beta` tag:
```bash
npm install -g gpx@beta
```

### Development Releases

For development testing:

```bash
# Publish to npm with dev tag
npm publish --tag dev
```

Install with:
```bash
npm install -g gpx@dev
```

## Best Practices

### Release Checklist

Before releasing:

- [ ] All tests pass locally
- [ ] Documentation is up-to-date
- [ ] CHANGELOG.md is updated (if manual)
- [ ] Breaking changes are documented
- [ ] Security vulnerabilities are fixed
- [ ] Performance regressions are addressed

### Version Strategy

- **Major (1.0.0)**: Breaking changes, new architecture
- **Minor (0.1.0)**: New features, backward compatible
- **Patch (0.0.1)**: Bug fixes, security patches
- **Prerelease (1.0.0-beta.1)**: Testing new features

### Communication

- **Breaking changes**: Announce in GitHub Discussions
- **New features**: Update README.md examples
- **Security fixes**: Follow responsible disclosure
- **Deprecations**: Provide migration guides

## Support

If you encounter issues with deployment:

1. **Check logs**: Review GitHub Actions logs
2. **Search issues**: Look for similar problems
3. **Create issue**: Include full error messages and context
4. **Contact maintainers**: For urgent deployment issues

---

**Last updated**: January 30, 2025  
**Version**: 1.0