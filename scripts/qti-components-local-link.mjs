#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const defaultComponentsPath = path.resolve(rootDir, '..', 'QTI-Components');
const qtiComponentsRoot = path.resolve(process.env.QTI_COMPONENTS_PATH || defaultComponentsPath);
const stateFilePath = path.join(rootDir, '.qti-components-local-link-state.json');
const themeWatchPidFilePath = path.join(rootDir, '.qti-components-theme-watch.pid');
const themeWatchLogFilePath = path.join(rootDir, '.qti-components-theme-watch.log');
const cachePaths = [
  path.join(rootDir, 'node_modules', '.vite'),
  path.join(rootDir, 'node_modules', '.cache', 'storybook')
];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function parseArgs(argv) {
  const args = { command: 'status', skipInstall: false };
  for (const token of argv) {
    if (token === 'link' || token === 'unlink' || token === 'on' || token === 'off' || token === 'status' || token === 'watch-theme') {
      args.command = token;
      continue;
    }
    if (token === '--skip-install') {
      args.skipInstall = true;
      continue;
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureDirExists(dirPath, label) {
  const stat = fs.statSync(dirPath, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory()) {
    throw new Error(`${label} not found: ${dirPath}`);
  }
}

function relFromRoot(absPath) {
  return toPosix(path.relative(rootDir, absPath));
}

function runInstall() {
  const result = spawnSync('pnpm', ['install'], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('pnpm install failed');
  }
}

function buildThemeForSourceLink() {
  const result = spawnSync('pnpm', ['--dir', qtiComponentsRoot, '--filter', '@qti-components/theme', 'run', 'build'], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('Building @qti-components/theme for source-link mode failed');
  }
}

function isProcessRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopProcessByPidFile(pidFilePath, label) {
  if (!fs.existsSync(pidFilePath)) return false;

  let pid = null;
  try {
    const raw = fs.readFileSync(pidFilePath, 'utf8').trim();
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      pid = parsed;
    }
  } catch {
    pid = null;
  }

  if (!pid || !isProcessRunning(pid)) {
    fs.rmSync(pidFilePath, { force: true });
    return false;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Ignore races where process exits between checks.
    }
  }

  fs.rmSync(pidFilePath, { force: true });
  console.log(`Stopped ${label} (pid ${pid}).`);
  return true;
}

function startThemeWatchIfNeeded() {
  let existingPid = null;
  if (fs.existsSync(themeWatchPidFilePath)) {
    try {
      existingPid = Number.parseInt(fs.readFileSync(themeWatchPidFilePath, 'utf8').trim(), 10);
      if (!Number.isInteger(existingPid) || existingPid <= 0) {
        existingPid = null;
      }
    } catch {
      existingPid = null;
    }
  }

  if (existingPid && isProcessRunning(existingPid)) {
    console.log(`qti-theme source watcher already running (pid ${existingPid}).`);
    return;
  }

  fs.rmSync(themeWatchPidFilePath, { force: true });
  const logFd = fs.openSync(themeWatchLogFilePath, 'a');
  const child = spawn('node', ['scripts/qti-components-local-link.mjs', 'watch-theme'], {
    cwd: rootDir,
    detached: true,
    env: {
      ...process.env,
      QTI_COMPONENTS_PATH: qtiComponentsRoot,
    },
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();

  fs.writeFileSync(themeWatchPidFilePath, `${child.pid}\n`);
  console.log(`Started qti-theme source watcher (pid ${child.pid}).`);
  console.log(`Theme watch log: ${relFromRoot(themeWatchLogFilePath)}`);
}

function stopThemeWatchIfRunning() {
  stopProcessByPidFile(themeWatchPidFilePath, 'qti-theme source watcher');
}

function runThemeWatchLoop() {
  const themeSrcRoot = path.join(qtiComponentsRoot, 'packages', 'qti-theme', 'src');
  if (!fs.existsSync(themeSrcRoot) || !fs.statSync(themeSrcRoot).isDirectory()) {
    throw new Error(`qti-theme src not found at ${themeSrcRoot}`);
  }

  let buildRunning = false;
  let buildQueued = false;
  let debounceTimer = null;

  function runThemeBuildWatch() {
    if (buildRunning) {
      buildQueued = true;
      return;
    }

    buildRunning = true;
    const child = spawn('pnpm', ['--dir', qtiComponentsRoot, '--filter', '@qti-components/theme', 'run', 'build'], {
      stdio: 'inherit',
    });

    child.on('close', code => {
      buildRunning = false;
      if (code !== 0) {
        console.error(`[qti-theme-watch] Build failed with exit code ${code ?? 1}`);
      }

      if (buildQueued) {
        buildQueued = false;
        runThemeBuildWatch();
      }
    });
  }

  function scheduleBuild(reasonPath) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      console.log(`[qti-theme-watch] Change detected: ${reasonPath}`);
      runThemeBuildWatch();
    }, 120);
  }

  console.log(`[qti-theme-watch] Watching ${themeSrcRoot}`);
  const watcher = fs.watch(themeSrcRoot, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const filePath = String(filename);
    if (!filePath.endsWith('.css')) return;
    scheduleBuild(`${eventType}:${filePath}`);
  });

  const shutdown = signal => {
    console.log(`[qti-theme-watch] Received ${signal}, shutting down.`);
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function clearEditorCaches() {
  for (const cachePath of cachePaths) {
    fs.rmSync(cachePath, { recursive: true, force: true });
  }
  console.log('Cleared editor caches: node_modules/.vite and node_modules/.cache/storybook');
}

function sourceLinkOn(skipInstall) {
  ensureDirExists(rootDir, 'workspace root');
  ensureDirExists(qtiComponentsRoot, 'qti-components workspace');

  stopThemeWatchIfRunning();

  const sourceState = {
    version: 2,
    mode: 'source-link',
    qtiComponentsRoot,
    createdAt: new Date().toISOString(),
  };

  writeJson(stateFilePath, sourceState);
  console.log(`Enabled qti-components source-link mode at ${qtiComponentsRoot}.`);
  console.log(`State file: ${relFromRoot(stateFilePath)}`);

  console.log('Building qti-components theme CSS for source-link mode...');
  buildThemeForSourceLink();

  clearEditorCaches();
  if (!skipInstall) {
    runInstall();
  }

  startThemeWatchIfNeeded();
}

function sourceLinkOff(skipInstall) {
  stopThemeWatchIfRunning();

  if (!fs.existsSync(stateFilePath)) {
    console.log(`${path.basename(stateFilePath)} not found. Nothing to restore.`);
    return;
  }

  fs.rmSync(stateFilePath, { force: true });
  console.log('Disabled qti-components source-link mode.');
  clearEditorCaches();

  if (!skipInstall) {
    runInstall();
  }
}

function status() {
  let mode = 'inactive';
  if (fs.existsSync(stateFilePath)) {
    try {
      const state = readJson(stateFilePath);
      if (typeof state?.mode === 'string') {
        mode = state.mode;
      } else {
        mode = 'present (unknown)';
      }
    } catch {
      mode = 'present (unreadable)';
    }
  }

  console.log(`qti-components workspace: ${qtiComponentsRoot}`);
  console.log(`mode: ${mode}`);
  console.log(`local-link state file: ${fs.existsSync(stateFilePath) ? 'present' : 'absent'}`);
  let themeWatchPid = null;
  if (fs.existsSync(themeWatchPidFilePath)) {
    try {
      const raw = fs.readFileSync(themeWatchPidFilePath, 'utf8').trim();
      const parsed = Number.parseInt(raw, 10);
      themeWatchPid = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    } catch {
      themeWatchPid = null;
    }
  }
  console.log(`qti-theme source watcher: ${themeWatchPid && isProcessRunning(themeWatchPid) ? `running (pid ${themeWatchPid})` : 'stopped'}`);
}

function main() {
  const { command, skipInstall } = parseArgs(process.argv.slice(2));

  if (command === 'link' || command === 'on') {
    sourceLinkOn(skipInstall);
    return;
  }

  if (command === 'unlink' || command === 'off') {
    sourceLinkOff(skipInstall);
    return;
  }

  if (command === 'status') {
    status();
    return;
  }

  if (command === 'watch-theme') {
    runThemeWatchLoop();
    return;
  }

  throw new Error('Usage: node scripts/qti-components-local-link.mjs <link|unlink|status|watch-theme> [--skip-install]');
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
