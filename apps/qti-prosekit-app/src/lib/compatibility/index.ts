/**
 * COMPATIBILITY PIPELINE INVARIANTS
 *
 * 1. No silent drops — every mutation a step makes must be logged via
 *    `context.addChange`. Callers rely on the change log to surface warnings.
 *
 * 2. Unknown content is preserved, not discarded — when a step encounters data
 *    it cannot map to the current schema it must call `context.preserve` and
 *    emit an `UNKNOWN_NODE_PRESERVED` or `UNKNOWN_ATTRIBUTE_PRESERVED` change.
 *    Use `jsonPreserveUnknownAttrs` from helpers.ts.
 *
 * 3. Steps are strictly version-ordered — each `MigrationStep` declares
 *    `fromVersion` and `toVersion`. `migrateDocument` walks the chain in order.
 *    When no step bridges exactly from the current version it skips forward to the
 *    next registered step, warning as it goes. That is a recovery path for a
 *    document whose stored version marker is corrupt, NOT a design allowance: the
 *    JSON ladder is expected to bridge every version from 1 to
 *    `CURRENT_SCHEMA_VERSION` with no gaps, and `ladder.browser.test.ts` asserts it.
 *
 * 4. Version is detected before migration — `detectVersion` is called first;
 *    if it returns null the pipeline falls back to `fallbackVersion` (default 1)
 *    and emits a `VERSION_ASSUMED` warning so callers know the version was guessed.
 *
 * 5. Steps are deterministic and composable — each step's output document is
 *    the next step's input. Side effects (logging, preservation) accumulate
 *    across steps into a single `MigrationResult`.
 */

import type {
  CompatibilityChange,
  CompatibilityMetadata,
  MigrateDocumentOptions,
  MigrationContext,
  MigrationResult,
  MigrationStep,
  PreservedFragment,
} from '@citolab/prose-qti/interfaces';

class CompatibilityContext implements MigrationContext {
  constructor(
    readonly sourceVersion: number,
    readonly targetVersion: number,
    readonly metadata: CompatibilityMetadata,
    private readonly changes: CompatibilityChange[],
    private readonly preservedFragments: PreservedFragment[],
  ) {}

  addChange(change: CompatibilityChange): void {
    this.changes.push(change);
  }

  preserve(fragment: PreservedFragment): void {
    this.preservedFragments.push(fragment);
  }

}

/** A bound migration pipeline for a specific document type and target version. */
export interface MigrationRegistry<TDocument> {
  readonly targetVersion: number;
  readonly steps: readonly MigrationStep<TDocument>[];
  detectVersion(document: TDocument, options?: Partial<MigrateDocumentOptions>): number | null | undefined;
  migrate(
    document: TDocument,
    options?: Omit<Partial<MigrateDocumentOptions>, 'targetVersion'>,
  ): MigrationResult<TDocument>;
}

export interface CreateMigrationRegistryOptions<TDocument> {
  /** The version all documents should reach after migration. */
  targetVersion: number;
  steps: readonly MigrationStep<TDocument>[];
  /**
   * Optional version detector. Return the document's source version, or
   * `null`/`undefined` to trigger the `fallbackVersion` path.
   */
  detectVersion?: (document: TDocument, options?: Partial<MigrateDocumentOptions>) => number | null | undefined;
}

/**
 * Creates a reusable migration registry for a given document type.
 *
 * Steps are sorted by `fromVersion` at creation time, so declaration order
 * does not matter. Call `.migrate(document)` to run the full chain.
 *
 * ```ts
 * const registry = createMigrationRegistry<NodeJSON>({
 *   targetVersion: CURRENT_VERSION,
 *   detectVersion: (doc) => doc.schemaVersion ?? null,
 *   steps: [
 *     composeJsonStep({ id: 'v1-to-v2', fromVersion: 1, toVersion: 2, transforms: [...] }),
 *   ],
 * });
 *
 * const result = registry.migrate(rawDoc, { source: 'json' });
 * ```
 */
export function createMigrationRegistry<TDocument>(
  options: CreateMigrationRegistryOptions<TDocument>,
): MigrationRegistry<TDocument> {
  const sortedSteps = [...options.steps].sort((a, b) => {
    if (a.fromVersion !== b.fromVersion) return a.fromVersion - b.fromVersion;
    return a.toVersion - b.toVersion;
  });

  return {
    targetVersion: options.targetVersion,
    steps: sortedSteps,
    detectVersion(document, migrateOptions) {
      return options.detectVersion?.(document, migrateOptions);
    },
    migrate(document, migrateOptions = {}) {
      return migrateDocument(document, {
        ...migrateOptions,
        targetVersion: options.targetVersion,
        source: migrateOptions.source ?? 'unknown',
      }, sortedSteps, options.detectVersion);
    },
  };
}

export * from './helpers.js';
export * from './migrations/index.js';
export * from './json.js';
export * from './report.js';

/**
 * Low-level migration runner. Prefer `createMigrationRegistry` for most use
 * cases — this is exposed for formats that build their own registry wrappers.
 *
 * Never throws for a missing version bridge — it skips forward and warns, per invariant 3. The
 * previous line of this comment claimed it threw; it never did.
 */
export function migrateDocument<TDocument>(
  document: TDocument,
  options: MigrateDocumentOptions,
  steps: readonly MigrationStep<TDocument>[],
  detectVersion?: (document: TDocument, options?: Partial<MigrateDocumentOptions>) => number | null | undefined,
): MigrationResult<TDocument> {
  const changes: CompatibilityChange[] = [];
  const preservedFragments: PreservedFragment[] = [];
  const sourceVersion = resolveSourceVersion(document, options, detectVersion, changes);
  const metadata: CompatibilityMetadata = {
    source: options.source,
    documentVersion: options.sourceVersion ?? sourceVersion,
    ...(options.metadata ?? {}),
  };

  let currentDocument = document;
  let currentVersion = sourceVersion;
  const appliedStepIds: string[] = [];

  while (currentVersion < options.targetVersion) {
    const nextStep = steps.find(step => step.fromVersion === currentVersion);
    if (!nextStep) {
      /*
       * No step bridges exactly from currentVersion, so skip forward to the next registered one.
       *
       * This is a recovery path, not a feature. It used to be one — HTML stopped at v2 while JSON
       * continued, so a gap was normal and logged as `info` — but the HTML ladder is gone and a gap
       * in the JSON ladder is now unambiguously a bug: a document at that version passes through
       * untransformed. `ladder.browser.test.ts` asserts the chain is unbroken, so the only way to
       * reach this in practice is a stored version marker that is corrupt or from the future.
       *
       * It skips rather than throwing because `readPersistedDoc` promises to be safe with untrusted
       * input, and `schemaVersion: 0` in localStorage should still open the document. Hence the
       * `warning`: recovery happened, and the user is told.
       */
      const forwardStep = steps.find(step => step.fromVersion > currentVersion);
      if (!forwardStep) {
        currentVersion = options.targetVersion;
        break;
      }
      changes.push({
        code: 'VERSION_DETECTED',
        severity: 'warning',
        message: `No migration step for version ${currentVersion}; skipping forward to ${forwardStep.fromVersion}.`,
        fromVersion: currentVersion,
        toVersion: forwardStep.fromVersion,
        data: { detection: 'skip-forward' },
      });
      currentVersion = forwardStep.fromVersion;
      continue;
    }

    const context = new CompatibilityContext(
        sourceVersion,
        options.targetVersion,
        metadata,
        changes,
        preservedFragments,
      );

      currentDocument = nextStep.migrate(currentDocument, context);
    appliedStepIds.push(nextStep.id);
    changes.push({
      code: 'STEP_APPLIED',
      severity: 'info',
      message: nextStep.description
        ? `Applied migration step ${nextStep.id}: ${nextStep.description}`
        : `Applied migration step ${nextStep.id}`,
      fromVersion: nextStep.fromVersion,
      toVersion: nextStep.toVersion,
      data: { stepId: nextStep.id },
    });
    currentVersion = nextStep.toVersion;
  }

  return {
    document: currentDocument,
    sourceVersion,
    targetVersion: options.targetVersion,
    changes,
    preservedFragments,
    appliedStepIds,
    metadata,
  };
}

function resolveSourceVersion<TDocument>(
  document: TDocument,
  options: MigrateDocumentOptions,
  detectVersion: ((document: TDocument, options?: Partial<MigrateDocumentOptions>) => number | null | undefined) | undefined,
  changes: CompatibilityChange[],
): number {
  const explicitVersion = options.sourceVersion;
  if (typeof explicitVersion === 'number') {
    changes.push({
      code: 'VERSION_DETECTED',
      severity: 'info',
      message: `Using explicit source version ${explicitVersion}.`,
      fromVersion: explicitVersion,
      data: { source: options.source, detection: 'explicit' },
    });
    return explicitVersion;
  }

  const detectedVersion = detectVersion?.(document, options);
  if (typeof detectedVersion === 'number') {
    changes.push({
      code: 'VERSION_DETECTED',
      severity: 'info',
      message: `Detected source version ${detectedVersion}.`,
      fromVersion: detectedVersion,
      data: { source: options.source, detection: 'detected' },
    });
    return detectedVersion;
  }

  const fallbackVersion = options.fallbackVersion ?? 1;
  changes.push({
    code: 'VERSION_ASSUMED',
    severity: 'warning',
    message: `Could not detect source version. Falling back to version ${fallbackVersion}.`,
    fromVersion: fallbackVersion,
    data: { source: options.source, detection: 'fallback' },
  });
  return fallbackVersion;
}
