# Contributing to ErrorPare

Thanks for your interest in improving ErrorPare.

We welcome:

- bug reports
- feature proposals
- documentation improvements
- tests
- code fixes and refactors

## Before you start

1. Search existing issues and pull requests to avoid duplicate work.
2. Open an issue first for larger changes so we can align on scope.
3. Keep changes focused. Small, reviewable pull requests are much easier to merge.

## Local setup

```bash
git clone https://github.com/DrPei12/errorpare.git
cd errorpare
npm install
```

## Useful commands

Type-check and run tests:

```bash
npm run check
```

Build the project:

```bash
npm run build
```

Run the CLI locally:

```bash
node dist/cli/index.cjs --help
```

## Development guidelines

- Use TypeScript for new source files.
- Keep changes compatible with Node.js 18+.
- Add or update tests when behavior changes.
- Prefer machine-readable stability over cosmetic output changes in JSON mode.
- Keep documentation in sync with user-facing CLI behavior.

## Pull request checklist

Before opening a pull request, please make sure:

- the change is scoped and explained clearly
- tests were added or updated when needed
- `npm run check` passes locally
- `npm run build` passes locally
- relevant docs were updated

## Release process

ErrorPare uses two lightweight release layers:

- `CHANGELOG.md` is the source of truth for the tagged release body
- GitHub Release Drafter keeps a rolling draft of upcoming changes between tags

When preparing a release:

1. Update `package.json`, `src/utils/constants.ts`, and any other version metadata together.
2. Add a `## [x.y.z] - YYYY-MM-DD` entry to `CHANGELOG.md`.
3. Run `npm run release:check`.
4. Tag the release as `vX.Y.Z`.

The release workflow will validate metadata, build the package, extract the matching changelog entry, create the GitHub Release, and publish to npm when `NPM_TOKEN` is available.

## Good first contributions

If you are looking for a smaller entry point, start with [GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md).

## Reporting bugs

Please include:

- what you were trying to do
- the command you ran
- expected behavior
- actual behavior
- Node.js version
- operating system
- a minimal stderr sample, if possible

Use the bug report template when opening a GitHub issue.

## Security

Do not open public issues for security vulnerabilities.

Please follow the instructions in [SECURITY.md](SECURITY.md).

## Community

By participating in this project, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
