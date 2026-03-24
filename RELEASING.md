# Releasing Simora

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- `v1.0.0` — breaking change
- `v0.2.0` — new feature, backwards compatible
- `v0.1.1` — bug fix

## Release Checklist

1. Make sure `main` is clean and all checks pass:

    ```bash
    make all
    ```

2. Update `CHANGELOG.md` — add a new section for the version being released.

3. Commit the changelog:

    ```bash
    git add CHANGELOG.md
    git commit -m "chore: release v0.2.0"
    ```

4. Create and push the tag:

    ```bash
    git tag v0.2.0
    git push
    git push --tags
    ```

    Alternatively, create the release directly in GitHub UI:
    **Releases → Draft a new release → Choose a tag → type `v0.2.0` → Create new tag → Publish release**

5. GitHub Actions will automatically:
    - Build binaries for Linux (amd64), macOS (universal), and Windows (amd64)
    - Create a GitHub Release with the binaries attached

## Pre-releases

For betas or release candidates, use a tag like `v0.2.0-beta.1` or `v0.2.0-rc.1`.
GitHub Actions will mark these as pre-releases automatically.

## Fixing a Bad Release

If something is wrong after publishing:

```bash
# Delete the tag locally and remotely
git tag -d v0.2.0
git push --delete origin v0.2.0
```

Then fix the issue, commit, and re-tag.
