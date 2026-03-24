const fs = require('node:fs');
const path = require('node:path');

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
    }
  } catch (error) {
    context.log(`Failed to parse ${path.basename(localOverridePath)}: ${error.message}`);
  }
}

function applyOverrides(deps) {
  if (!deps) return;

  for (const [name, overrideValue] of Object.entries(overrides)) {
    if (Object.prototype.hasOwnProperty.call(deps, name)) {
      deps[name] = overrideValue;
    }
  }
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
