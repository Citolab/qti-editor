import { property } from 'lit/decorators.js';
import { LitElement } from 'lit';

export abstract class Interaction extends LitElement {
  @property({ type: String, attribute: 'response-identifier' })
  accessor responseIdentifier = '';

  @property({ type: String, attribute: 'correct-response' })
  accessor correctResponse: string | string[] | null = null;
}
