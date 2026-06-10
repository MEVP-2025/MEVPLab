# eDNA WorkBench — Copilot Instructions

## Project Overview

This is an Electron desktop app (React + Vite frontend, Express backends) for eDNA bioinformatics analysis and visualization.

---

## Git Flow

This project follows **Git Flow**. All contributors (human and AI) must follow these rules:

### Branch Structure

| Branch | Purpose | Lifetime |
|--------|---------|----------|
| `main` | Production releases only. Every merge gets a version tag. | Permanent |
| `develop` | Integration branch for all development work. | Permanent |
| `feature/*` | Individual features, branched from `develop`. | Temporary |
| `release/x.y.z` | Release preparation, branched from `develop`. | Temporary |
| `hotfix/*` | Urgent production fixes, branched from `main`. | Temporary |

### Rules

- **Never commit directly to `main`**. Only merge from `release/*` or `hotfix/*`.
- Daily development happens on `develop` or `feature/*` branches.
- Feature branches merge back to `develop` via PR or direct merge.
- Use **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`, `perf:`, `test:`.

---

## Release Workflow

When the user says "幫我準備 release" or "prepare release", follow these steps **in order**:

### 1. Create release branch
```bash
git checkout develop
git pull
git checkout -b release/x.y.z
```

### 2. Bump version
- Update `version` in root `package.json`
- Update `version` in `frontend/package.json` (if exists)

### 3. Generate release notes
```bash
# Get all commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```
- Read the commit log between the last tag and current HEAD.
- Categorize changes into: **Added**, **Fixed**, **Changed**, **Removed**.
- Write user-friendly descriptions (not raw commit messages).
- Prepend the new version entry to `CHANGELOG.md`.

### 4. Commit release preparation
```bash
git add -A
git commit -m "chore(release): prepare v x.y.z"
```

### 5. Present summary
- Show the user the generated release notes for review.
- Ask if they want to proceed with merging to main.

### 6. Finalize (only after user confirms)
```bash
# Merge to main
git checkout main
git merge --no-ff release/x.y.z -m "release: v x.y.z"
git tag vx.y.z

# Merge back to develop
git checkout develop
git merge --no-ff release/x.y.z -m "chore: merge release/x.y.z back to develop"

# Delete release branch
git branch -d release/x.y.z
```

### 7. Build
```bash
npm run dist
```

---

## Hotfix Workflow

When the user needs an urgent fix on a released version:

```bash
git checkout main
git checkout -b hotfix/x.y.z
# ... make fixes ...
git checkout main && git merge --no-ff hotfix/x.y.z && git tag vx.y.z
git checkout develop && git merge --no-ff hotfix/x.y.z
git branch -d hotfix/x.y.z
```

---

## Version Numbering

Follow **Semantic Versioning** (semver):
- **MAJOR** (x.0.0): Breaking changes or major overhauls
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, minor improvements

---

## Commit Message Format

```
type(scope): short description

Examples:
feat(phylotree): add Newick export support
fix(alignment): correct scroll sync between panels
refactor(pipeline): simplify Docker command builder
style(ui): update button colors for consistency
docs: update CHANGELOG for v1.1.0
chore(release): prepare v1.1.0
```
