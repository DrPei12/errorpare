# GitHub Action

ErrorPare ships with a first-party GitHub Action so you can run a CI command through the CLI and capture a compact JSON payload.

## Basic usage

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Run build through ErrorPare
        id: errorpare
        uses: DrPei12/errorpare@v2.1.0
        with:
          command: npm run build
          context-lines: "5"

      - name: Upload ErrorPare payload
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: errorpare-json
          path: ${{ steps.errorpare.outputs.json-path }}
```

## What the action does

1. Installs the matching `errorpare` npm package.
2. Runs `errorpare run "<command>" --json`.
3. Writes a JSON payload to a file.
4. Exposes the file path and a few summary fields as action outputs.
5. Optionally writes a short summary to the GitHub Actions job summary.

## Inputs

- `command` (required): shell command to execute through ErrorPare
- `analyze`: enable LLM analysis, default `false`
- `provider`: provider ID to use with `errorpare init --analyze --provider ...`
- `context-lines`: source context lines to attach, default `0`
- `working-directory`: working directory for the wrapped command, default `.`
- `output-file`: custom path for the JSON payload
- `write-summary`: write a compact Markdown summary to the workflow summary, default `true`
- `fail-on-command-error`: fail the action when the wrapped command fails, default `true`
- `package-version`: npm package version to install; defaults to the action tag without `v`

## Outputs

- `json-path`: absolute path to the JSON payload file
- `success`: whether the wrapped command succeeded
- `exit-code`: exit code from the wrapped command
- `error-count`: number of merged error entries
- `analysis-succeeded`: whether optional LLM analysis completed successfully

## LLM analysis in CI

When `analyze: "true"` is enabled, set:

- `provider` to a supported provider ID such as `deepseek`, `openai`, or `anthropic`
- the corresponding API key secret in the workflow environment

Example:

```yaml
      - name: Run build through ErrorPare with analysis
        id: errorpare
        uses: DrPei12/errorpare@v2.1.0
        env:
          ERRORPARE_DEEPSEEK_API_KEY: ${{ secrets.ERRORPARE_DEEPSEEK_API_KEY }}
        with:
          command: npm run build
          analyze: "true"
          provider: deepseek
          context-lines: "5"
```

The action configures ErrorPare non-interactively with `errorpare init --analyze --provider ...` before running the wrapped command.
