import fs from 'node:fs';
import path from 'node:path';

const SOURCE_LINK_STATE_FILE = '.qti-components-local-link-state.json';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function findQtiPackageDirs(qtiComponentsRoot) {
  const packagesRoot = path.join(qtiComponentsRoot, 'packages');
  const result = {};

  function walk(absDir) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const absPath = path.join(absDir, entry.name);
      const manifestPath = path.join(absPath, 'package.json');
      if (exists(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (typeof manifest.name === 'string' && (manifest.name.startsWith('@qti-components/') || manifest.name === '@citolab/qti-components')) {
            result[manifest.name] = absPath;
            continue;
          }
        } catch {
          // Ignore malformed package.json while scanning.
        }
      }
      walk(absPath);
    }
  }

  if (exists(packagesRoot)) {
    walk(packagesRoot);
  }

  return result;
}

function resolveStyleEntry(srcDir, packageName) {
  const shortName = packageName.replace(/^@qti-components\//, '').replace(/^@citolab\//, '');
  const candidates = [
    path.join(srcDir, 'styles.ts'),
    path.join(srcDir, `${shortName}.styles.ts`),
    path.join(srcDir, `qti-${shortName}.styles.ts`),
  ];

  for (const candidate of candidates) {
    if (exists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function readSourceLinkState(editorRoot) {
  const statePath = path.join(editorRoot, SOURCE_LINK_STATE_FILE);
  if (!exists(statePath)) return null;

  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (state.mode !== 'source-link') return null;
    if (!state.qtiComponentsRoot || typeof state.qtiComponentsRoot !== 'string') return null;
    return state;
  } catch {
    return null;
  }
}

function buildAliases(qtiPackageDirs) {
  const aliases = [];

  for (const packageName of Object.keys(qtiPackageDirs).sort()) {
    const pkgDir = qtiPackageDirs[packageName];
    const srcDir = path.join(pkgDir, 'src');
    if (!exists(srcDir)) continue;

    const pkgRegex = escapeRegExp(packageName);

    const srcIndex = path.join(srcDir, 'index.ts');
    if (exists(srcIndex)) {
      aliases.push({ find: new RegExp(`^${pkgRegex}$`), replacement: srcIndex });
    }

    const registerEntry = path.join(srcDir, 'register.ts');
    if (exists(registerEntry)) {
      aliases.push({ find: new RegExp(`^${pkgRegex}/register$`), replacement: registerEntry });
    }

    const elementsEntry = path.join(srcDir, 'elements.ts');
    if (exists(elementsEntry)) {
      aliases.push({ find: new RegExp(`^${pkgRegex}/elements$`), replacement: elementsEntry });
    }

    const styleEntry = resolveStyleEntry(srcDir, packageName);
    if (styleEntry) {
      aliases.push({ find: new RegExp(`^${pkgRegex}/styles$`), replacement: styleEntry });
    }
  }

  const umbrellaDir = qtiPackageDirs['@citolab/qti-components'];
  if (umbrellaDir) {
    const srcDir = path.join(umbrellaDir, 'src');
    const subpaths = [
      ['qti-base', 'base.ts'],
      ['qti-elements', 'elements.ts'],
      ['qti-processing', 'processing.ts'],
      ['qti-interactions', 'interactions.ts'],
      ['qti-item', 'item.ts'],
      ['qti-test', 'test.ts'],
      ['qti-loader', 'loader.ts'],
      ['qti-transformers', 'transformers.ts'],
    ];

    for (const [subpath, sourceFile] of subpaths) {
      const target = path.join(srcDir, sourceFile);
      if (!exists(target)) continue;
      aliases.push({ find: new RegExp(`^@citolab/qti-components/${escapeRegExp(subpath)}$`), replacement: target });
    }
  }

  const themeDir = qtiPackageDirs['@qti-components/theme'];
  if (themeDir) {
    // Theme source uses PostCSS mixins; resolve to built dist CSS so runtime CSS is fully expanded.
    const itemCss = path.join(themeDir, 'dist', 'item.css');
    const nativeCss = path.join(themeDir, 'dist', 'native.css');
    if (exists(itemCss)) {
      aliases.push({ find: /^@qti-components\/theme\/item\.css$/, replacement: itemCss });
      aliases.push({ find: /^@citolab\/qti-components\/item\.css$/, replacement: itemCss });
    }
    if (exists(nativeCss)) {
      aliases.push({ find: /^@qti-components\/theme\/native\.css$/, replacement: nativeCss });
    }
  }

  return aliases;
}

export function getQtiComponentsSourceLinkConfig(editorRoot) {
  const state = readSourceLinkState(editorRoot);
  if (!state || !state.qtiComponentsRoot || !exists(state.qtiComponentsRoot)) {
    return {
      enabled: false,
      qtiComponentsRoot: null,
      aliases: [],
      optimizeDepsExclude: [],
      fsAllow: [],
    };
  }

  const qtiPackageDirs = findQtiPackageDirs(state.qtiComponentsRoot);
  const packageNames = Object.keys(qtiPackageDirs).sort();
  const aliases = buildAliases(qtiPackageDirs);

  return {
    enabled: true,
    qtiComponentsRoot: state.qtiComponentsRoot,
    aliases,
    optimizeDepsExclude: packageNames,
    fsAllow: [state.qtiComponentsRoot],
  };
}
