/**
 * Virtual Cursor Plugin
 *
 * ProseMirror plugin that provides a virtual cursor for better navigation
 * at mark boundaries. Helps users move between different formatting states.
 */
import { Plugin } from 'prosemirror-state';
export interface VirtualCursorOptions {
    /**
     * An array of ProseMirror mark names that should be ignored when checking the
     * [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive)
     * attribute. You can also set this to `true` to skip the warning altogether.
     */
    skipWarning?: string[] | true;
}
/**
 * Creates a virtual cursor plugin.
 *
 * @example
 * ```ts
 * const plugin = createVirtualCursor({ skipWarning: ['link'] });
 * ```
 */
export declare function createVirtualCursor(options?: VirtualCursorOptions): Plugin;
//# sourceMappingURL=virtual-cursor-plugin.d.ts.map