/**
 * Block Select Plugin
 *
 * ProseMirror plugin for selecting entire block nodes.
 * Provides a custom NodeRangeSelection and mouse/keyboard handlers.
 */
import { Slice, type ResolvedPos, type Node as ProsemirrorNode } from 'prosemirror-model';
import { Plugin, Selection } from 'prosemirror-state';
/**
 * Custom Selection class that selects entire block nodes
 */
export declare class NodeRangeSelection extends Selection {
    readonly $anchorNode: ResolvedPos;
    readonly $headNode: ResolvedPos;
    constructor($anchorNode: ResolvedPos, $headNode?: ResolvedPos);
    map(doc: ProsemirrorNode, mapping: {
        map: (pos: number) => number;
    }): Selection;
    eq(other: Selection): boolean;
    toJSON(): {
        type: string;
        anchor: number;
        head: number;
    };
    static fromJSON(doc: ProsemirrorNode, json: {
        anchor: number;
        head: number;
    }): Selection;
    static create(doc: ProsemirrorNode, from: number, to?: number): NodeRangeSelection;
    getBookmark(): NodeRangeBookmark;
    content(): Slice;
}
declare class NodeRangeBookmark {
    readonly anchor: number;
    readonly head: number;
    constructor(anchor: number, head: number);
    map(mapping: {
        map: (pos: number) => number;
    }): NodeRangeBookmark;
    resolve(doc: ProsemirrorNode): NodeRangeSelection | Selection;
}
/**
 * The core ProseMirror Plugin for block selection.
 */
export declare const blockSelectPlugin: Plugin<{
    dragging: boolean;
    startPos: number | null;
}>;
export {};
//# sourceMappingURL=block-select-plugin.d.ts.map