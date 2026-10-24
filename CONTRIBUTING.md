# Contributing to ClasseKit Education Core

Thanks for helping build small, portable assessment primitives for education
software. Documentation, tests, synthetic examples and accessibility reviews
are all valuable contributions.

## Before starting

1. Search existing issues and pull requests to avoid duplicating work.
2. For a new idea, open an issue describing the problem, the educational use
   case and the smallest useful outcome.
3. Pick a focused task from the
   [contributor starter list](docs/CONTRIBUTOR_STARTER_TASKS.md), or propose a
   similarly bounded change in an issue.

Use only synthetic content. Never include student data, credentials, API keys,
private curriculum material or other confidential information in issues,
pull requests, fixtures or examples.

## Local setup

```sh
git clone https://github.com/emeric-azonsou/education-core.git
cd education-core
npm install
npm run verify
```

The project currently has no runtime dependencies. Keep that property intact
unless a change has a clear compatibility and distribution rationale.

## Making a change

Create a focused branch:

```sh
git checkout -b feat/short-description
```

Then:

- describe the educational use case before changing the public API;
- add or update tests for every behavior change;
- keep TypeScript declarations, runtime validation and CLI behavior aligned;
- update the README or examples when a user-facing workflow changes;
- add a concise entry to `CHANGELOG.md` for notable behavior changes;
- run `npm run verify` before opening the pull request.

## Pull request expectations

A good pull request explains:

- which issue or user problem it addresses;
- what changes in the public API, CLI or generated output;
- how the change was verified;
- whether compatibility, package size or runtime behavior is affected;
- what documentation or migration guidance is needed.

Prefer small, reviewable pull requests. Commit messages should describe the
change, for example `fix: reject duplicate answers` or
`docs: add CSV import example`.

## Security and privacy

Do not report security-sensitive details in a public issue. Do not commit
tokens, personal information, real student work or proprietary assessment
content. For a private concern, contact the repository maintainer through the
GitHub profile before publishing details.

Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).
