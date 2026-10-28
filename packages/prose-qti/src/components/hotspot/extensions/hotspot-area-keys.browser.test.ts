import { describe, expect, test } from 'vitest';

import { KEY_MOVE_STEP, KEY_SHIFT_STEP, hotspotAreaKeyCommand } from './hotspot-area-keys.js';

describe('hotspotAreaKeyCommand', () => {
  test('Alt + arrow keys move one step, with Shift the larger one', () => {
    expect(hotspotAreaKeyCommand({ key: 'ArrowRight', altKey: true })).toEqual({ kind: 'move', dx: KEY_MOVE_STEP, dy: 0 });
    expect(hotspotAreaKeyCommand({ key: 'ArrowUp', altKey: true, shiftKey: true })).toEqual({ kind: 'move', dx: 0, dy: -KEY_SHIFT_STEP });
    expect(KEY_MOVE_STEP).toBe(1);
    expect(KEY_SHIFT_STEP).toBe(10);
  });

  test('plain arrow keys are left to ProseMirror, which selects the next area', () => {
    expect(hotspotAreaKeyCommand({ key: 'ArrowRight' })).toBeNull();
    expect(hotspotAreaKeyCommand({ key: 'ArrowRight', shiftKey: true })).toBeNull();
  });

  test('+ and − resize, with Shift by the larger step; = and _ count, and so does the keypad', () => {
    expect(hotspotAreaKeyCommand({ key: '=' })).toEqual({ kind: 'grow', delta: 1 });
    expect(hotspotAreaKeyCommand({ key: '+', shiftKey: true })).toEqual({ kind: 'grow', delta: 10 });
    expect(hotspotAreaKeyCommand({ key: '-' })).toEqual({ kind: 'grow', delta: -1 });
    expect(hotspotAreaKeyCommand({ key: '_', shiftKey: true })).toEqual({ kind: 'grow', delta: -10 });
    expect(hotspotAreaKeyCommand({ key: '+', code: 'NumpadAdd' })).toEqual({ kind: 'grow', delta: 1 });
    expect(hotspotAreaKeyCommand({ key: 'Subtract', code: 'NumpadSubtract' })).toEqual({ kind: 'grow', delta: -1 });
  });

  test('nothing with Ctrl or Cmd: Ctrl/Cmd + / − zoom the page, Ctrl + arrows are the OS', () => {
    expect(hotspotAreaKeyCommand({ key: '=', ctrlKey: true })).toBeNull();
    expect(hotspotAreaKeyCommand({ key: '-', metaKey: true })).toBeNull();
    expect(hotspotAreaKeyCommand({ key: 'ArrowLeft', altKey: true, ctrlKey: true })).toBeNull();
  });

  test('other keys are not area keys', () => {
    expect(hotspotAreaKeyCommand({ key: 'a' })).toBeNull();
    expect(hotspotAreaKeyCommand({ key: 'Delete' })).toBeNull();
    expect(hotspotAreaKeyCommand({ key: 'Escape' })).toBeNull();
  });
});
