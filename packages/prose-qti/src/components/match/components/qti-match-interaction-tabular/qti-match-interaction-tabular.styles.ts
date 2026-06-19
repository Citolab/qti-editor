const styles = /* css */ `
  :host {
    display: block;
    margin: 0.5rem 0;
  }

  .grid {
    /* grid-template-columns/rows set inline from JS; never touches the host. */
    display: grid;
    border: 1px solid var(--qti-border-color, #ddd6c7);
    border-radius: 10px;
    overflow: hidden;
    background: var(--qti-background, #fff);
    font-size: 0.92rem;
  }

  .corner {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    color: var(--qti-muted-foreground, #6b4226);
    font-weight: 600;
    border-bottom: 1px solid var(--qti-subtle-border, #ece6d8);
    border-right: 1px solid var(--qti-subtle-border, #ece6d8);
  }

  /* Subgrid wrappers own header placement: each spans the header strip of the
     parent grid, then exposes those tracks via subgrid so the slotted choices
     auto-flow into them without any per-choice grid placement. */
  .cols-wrap {
    grid-column: 2 / -1;
    grid-row: 1;
    display: grid;
    grid-template-columns: subgrid;
  }

  .rows-wrap {
    grid-column: 1;
    grid-row: 2 / -1;
    display: grid;
    grid-template-rows: subgrid;
  }

  /* Slot boxes never become grid items themselves. */
  slot { display: contents; }

  /* The slotted match-set vanishes so its choices become real grid items of
     the surrounding subgrid wrapper. */
  ::slotted(qti-simple-match-set) { display: contents; }

  /* Style the slotted choices via shadow CSS where we can (this matches the
     direct slotted match-set, not its descendants — see lightdom rules below
     for choice-level styling). */

  .checkbox-grid {
    grid-column: 2 / -1;
    grid-row: 2 / -1;
    display: grid;
    grid-template-columns: subgrid;
    grid-template-rows: subgrid;
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--qti-subtle-border, #ece6d8);
    border-right: 1px solid var(--qti-subtle-border, #ece6d8);
  }

  input[type='radio'],
  input[type='checkbox'] {
    width: 17px;
    height: 17px;
    accent-color: var(--qti-border-active, #7a4a2f);
    cursor: pointer;
    margin: 0;
  }
`;

export default styles;
