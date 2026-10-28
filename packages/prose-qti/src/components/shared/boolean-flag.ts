/**
 * QTI boolean flags the editor writes only when true: `shuffle` on interactions, `fixed` on choices.
 *
 * Absent and `"false"` mean the same to QTI, so a node the editor creates leaves a false flag out.
 * An imported item that spelled the flag out keeps that spelling, though: the node records that the
 * source had the attribute, in a companion attr next to the flag (`shuffleExplicit`,
 * `fixedExplicit`), and writes `"false"` back only then. Without it, a tool that compares an item
 * before and after a save — to decide whether the editor can hold it — sees a lost attribute on
 * every item from a bank that always writes these flags.
 *
 * The flag itself stays a plain boolean, so the attributes panel still renders it as a checkbox.
 */
export function writeBooleanFlag(
  attrs: Record<string, string>,
  name: string,
  value: unknown,
  explicit: unknown,
): void {
  if (value) attrs[name] = 'true';
  else if (explicit) attrs[name] = 'false';
}
