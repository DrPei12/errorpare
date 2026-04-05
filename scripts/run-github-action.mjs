import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawn } from 'node:child_process';

function getInput(name, defaultValue = '') {
  const key = `INPUT_${name.replace(/ /g, '_').replace(/-/g, '_').toUpperCase()}`;
  return process.env[key] ?? defaultValue;
}

function getRequiredInput(name) {
  const value = getInput(name);
  if (!value) {
    throw new Error(`Missing required input: ${name}`);
  }

  return value;
}

function parseBoolean(value, defaultValue = false) {
  if (!value) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function writeOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    return;
  }

  fs.appendFileSync(outputFile, `${name}=${String(value)}${os.EOL}`);
}

function appendSummary(markdown) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) {
    return;
  }

  fs.appendFileSync(summaryFile, `${markdown}${os.EOL}`);
}

function quoteInline(value) {
  return `\`${String(value).replace(/`/g, '\\`')}\``;
}

function buildSummary(payload) {
  const lines = ['## ErrorPare summary', ''];
  lines.push(`- Command: ${quoteInline(payload.command)}`);
  lines.push(`- Status: ${payload.success ? 'succeeded' : 'failed'}`);
  lines.push(`- Exit code: ${payload.exitCode}`);

  if (payload.compression) {
    lines.push(
      `- Compression: ${payload.compression.originalLines} -> ${payload.compression.compressedLines} lines`
    );
    lines.push(`- Merged error entries: ${payload.errors.length}`);
  }

  if (payload.analysis.requested) {
    const analysisLabel = payload.analysis.succeeded
      ? `${payload.analysis.provider}/${payload.analysis.model}`
      : payload.analysis.error || 'requested but not completed';
    lines.push(`- Analysis: ${analysisLabel}`);
  }

  if (payload.errors.length > 0) {
    lines.push('');
    lines.push('### Top errors');
    lines.push('');

    for (const error of payload.errors.slice(0, 3)) {
      const location = error.location ? ` (${error.location})` : '';
      lines.push(`- ${error.message}${location}`);
    }
  }

  return lines.join(os.EOL);
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: code ?? 0,
        stdout,
        stderr,
      });
    });
  });
}

function resolveCliRunner() {
  if (process.env.ERRORPARE_CLI_PATH) {
    return {
      command: process.env.ERRORPARE_CLI_PATH,
      prefixArgs: [],
    };
  }

  const globalRoot =
    process.platform === 'win32'
      ? execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm root -g'], {
          encoding: 'utf8',
          windowsHide: true,
        }).trim()
      : execFileSync('npm', ['root', '-g'], {
          encoding: 'utf8',
        }).trim();

  return {
    command: process.execPath,
    prefixArgs: [path.join(globalRoot, 'errorpare', 'dist', 'cli', 'index.cjs')],
  };
}

async function main() {
  const command = getRequiredInput('command');
  const analyze = parseBoolean(getInput('analyze'), false);
  const provider = getInput('provider');
  const contextLines = getInput('context-lines', '0');
  const workingDirectory = path.resolve(process.cwd(), getInput('working-directory', '.'));
  const requestedOutputPath = getInput('output-file');
  const outputPath = requestedOutputPath
    ? path.resolve(workingDirectory, requestedOutputPath)
    : path.resolve(process.env.RUNNER_TEMP ?? os.tmpdir(), 'errorpare-result.json');
  const writeSummary = parseBoolean(getInput('write-summary', 'true'), true);
  const failOnCommandError = parseBoolean(getInput('fail-on-command-error', 'true'), true);
  const cliRunner = resolveCliRunner();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (analyze) {
    if (!provider) {
      throw new Error('The `provider` input is required when `analyze` is enabled.');
    }

    const initResult = await runProcess(
      cliRunner.command,
      [...cliRunner.prefixArgs, 'init', '--analyze', '--provider', provider, '--force'],
      {
        cwd: workingDirectory,
        env: process.env,
      }
    );

    if (initResult.code !== 0) {
      throw new Error(
        `Failed to configure ErrorPare analysis for provider ${provider}: ${initResult.stderr || initResult.stdout}`
      );
    }
  }

  const args = ['run', command, '--json', '--output', outputPath];
  if (analyze) {
    args.push('--analyze');
  }
  if (contextLines) {
    args.push('--context-lines', contextLines);
  }

  const execution = await runProcess(cliRunner.command, [...cliRunner.prefixArgs, ...args], {
    cwd: workingDirectory,
    env: process.env,
  });

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      `ErrorPare did not produce an output file at ${outputPath}.${os.EOL}${execution.stderr || execution.stdout}`
    );
  }

  const payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

  writeOutput('json-path', outputPath);
  writeOutput('success', payload.success);
  writeOutput('exit-code', payload.exitCode);
  writeOutput('error-count', Array.isArray(payload.errors) ? payload.errors.length : 0);
  writeOutput('analysis-succeeded', payload.analysis?.succeeded ?? false);

  if (writeSummary) {
    appendSummary(buildSummary(payload));
  }

  if (failOnCommandError && !payload.success) {
    process.exitCode = Number(payload.exitCode) || 1;
  }
}

main().catch((error) => {
  console.error(`[errorpare-action] ${error.message}`);
  process.exit(1);
});
