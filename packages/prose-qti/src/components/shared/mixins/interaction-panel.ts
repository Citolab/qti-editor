import { state } from 'lit/decorators.js';

import { Interaction } from '../components/interaction.js';

export abstract class InteractionPanel extends Interaction {
  @state()
  protected _panelOpen = false;

  protected shouldOpenPanelOnPointerDown(): boolean {
    return true;
  }

  protected shouldOpenPanelOnFocusIn(): boolean {
    return true;
  }

  protected shouldOpenPanelOnSelectionChange(): boolean {
    return true;
  }

  protected panelContainsNode(node: Node | null): boolean {
    return !!node && this.contains(node);
  }

  protected setPanelOpen(open: boolean) {
    if (this._panelOpen === open) return;
    this._panelOpen = open;
    this.onPanelOpenChanged(open);
  }

  protected onPanelOpenChanged(_open: boolean) {}

  protected openPanel = () => this.setPanelOpen(true);

  protected closePanel = () => this.setPanelOpen(false);

  protected togglePanel = () => this.setPanelOpen(!this._panelOpen);

  private readonly _handlePanelPointerDown = (event: PointerEvent) => {
    if (this.shouldOpenPanelOnPointerDown() && event.composedPath().includes(this)) {
      this.openPanel();
    }

    if (!this._panelOpen) return;
    if (event.composedPath().includes(this)) return;
    this.closePanel();
  };

  private readonly _handlePanelFocusIn = () => {
    if (this.shouldOpenPanelOnFocusIn()) {
      this.openPanel();
    }
  };

  private readonly _handlePanelSelectionChange = () => {
    if (!this.shouldOpenPanelOnSelectionChange()) return;
    const selection = document.getSelection();
    if (this.panelContainsNode(selection?.anchorNode ?? null)) {
      this.openPanel();
    }
  };

  private readonly _handlePanelKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this._panelOpen) {
      this.closePanel();
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('focusin', this._handlePanelFocusIn);
    document.addEventListener('pointerdown', this._handlePanelPointerDown);
    document.addEventListener('selectionchange', this._handlePanelSelectionChange);
    document.addEventListener('keydown', this._handlePanelKeyDown);
  }

  override disconnectedCallback() {
    this.removeEventListener('focusin', this._handlePanelFocusIn);
    document.removeEventListener('pointerdown', this._handlePanelPointerDown);
    document.removeEventListener('selectionchange', this._handlePanelSelectionChange);
    document.removeEventListener('keydown', this._handlePanelKeyDown);
    super.disconnectedCallback();
  }
}
