const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const localOverridePath = path.join(__dirname, 'pnpm-local-overrides.json');

let loaded = false;
let enabled = false;
let overrides = {};

function loadOverrides(context) {
  if (loaded) return;
  loaded = true;

  if (!fs.existsSync(localOverridePath)) {
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(localOverridePath, 'utf8'));
    enabled = config?.enabled === true;
    overrides = config?.overrides && typeof config.overrides === 'object' ? config.overrides : {};

    if (enabled && Object.keys(overrides).length > 0) {
      context.log(`Local pnpm overrides enabled from ${path.basename(localOverridePath)}.`);
      selfHealMissingTarballs(context);
    }
  } catch (error) {
    context.log(`Failed to parse ${path.basename(localOverridePath)}: ${error.message}`);
  }
}

/**
 * pnpm runs the readPackage hook before dependency resolution. If we rewrite
 * a dep to `file:.qti-components-packs/<sha>/<pkg>.tgz` and that tarball isn't
 * on disk yet (fresh clone, branch switch, cleared cache), resolution fails
 * with ENOENT *before* the lifecycle `preinstall` script can bootstrap.
 *
 * Detect missing tarballs at hook-load time and synchronously run the sync
 * script to materialize them. This runs once per pnpm install (loaded flag).
 * Re-reads pnpm-local-overrides.json after sync because sync rewrites it.
 */
function selfHealMissingTarballs(context) {
  const fileOverrides = Object.values(overrides).filter(v => typeof v === 'string' && v.startsWith('file:'));
  const missing = fileOverrides.filter(spec => {
    const localPart = spec.replace(/^file:/, '');
    const resolved = path.isAbsolute(localPart) ? localPart : path.join(__dirname, localPart);
    return !fs.existsSync(resolved);
  });
  if (missing.length === 0) return;

  context.log(`${missing.length} pinned tarball(s) missing — running qti-overrides:sync...`);
  const result = spawnSync('node', [path.join(__dirname, 'scripts/qti-local-overrides-sync.mjs'), 'sync'], {
    cwd: __dirname,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('qti-overrides sync failed — see output above.');
  }

  const config = JSON.parse(fs.readFileSync(localOverridePath, 'utf8'));
  overrides = config?.overrides && typeof config.overrides === 'object' ? config.overrides : {};
}

function applyOverrides(deps) {
  if (!deps) return;

  for (const [name, overrideValue] of Object.entries(overrides)) {
    if (Object.prototype.hasOwnProperty.call(deps, name)) {
      deps[name] = normalizeOverrideValue(overrideValue);
    }
  }
}

function normalizeOverrideValue(value) {
  if (typeof value !== 'string') return value;

  // Ensure local tarball paths resolve from repo root, not individual workspace package dirs.
  if (value.startsWith('file:.qti-components-packs/')) {
    return `file:${path.join(__dirname, value.slice('file:'.length))}`;
  }

  return value;
}

function readPackage(pkg, context) {
  loadOverrides(context);

  if (!enabled || Object.keys(overrides).length === 0) {
    return pkg;
  }

  applyOverrides(pkg.dependencies);
  applyOverrides(pkg.devDependencies);
  applyOverrides(pkg.optionalDependencies);
  applyOverrides(pkg.peerDependencies);

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
