/**
 * @citolab/prose-ai
 *
 * AI-related extensions for ProseKit. Vendored from upstream @prosekit/ai.
 */

export {
  AI_DIFF_CHANGE_INDEX_ATTR,
  AI_DIFF_ID_ATTR,
  aiDiffPluginKey,
  defineAiDiff,
  type AddAiDiffOptions,
  type AiDiffExtension,
  type AiDiffState,
} from './ai-diff';
export {
  parseHtmlToDoc,
  parseHtmlToSlice,
  serializeDocToHtml,
  serializeRangeToHtml,
  serializeSelectionToHtml,
} from './html-bridge';
export {
  createStreamingPlugin,
  DEFAULT_FLUSH_TAGS,
  streamContent,
  streamContentCommand,
  streamingPluginKey,
  type StreamContentOptions,
} from './stream-content-command';
