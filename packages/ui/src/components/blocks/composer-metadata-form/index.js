var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _QtiComposerMetadataForm_instances, _QtiComposerMetadataForm_onTitleInput, _QtiComposerMetadataForm_onIdentifierInput, _QtiComposerMetadataForm_emitChange;
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
let QtiComposerMetadataForm = class QtiComposerMetadataForm extends LitElement {
    constructor() {
        super(...arguments);
        _QtiComposerMetadataForm_instances.add(this);
        Object.defineProperty(this, "title", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ''
        });
        Object.defineProperty(this, "identifier", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ''
        });
    }
    createRenderRoot() {
        return this;
    }
    render() {
        return html `
      <section class="card border border-base-300/50 bg-base-100 p-4 space-y-3">
        <h3 class="text-sm font-semibold">Item Metadata</h3>
        <label class="form-control block">
          <span class="label-text text-xs">Title</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            .value=${this.title}
            @input=${__classPrivateFieldGet(this, _QtiComposerMetadataForm_instances, "m", _QtiComposerMetadataForm_onTitleInput)}
            placeholder="Enter title"
          />
        </label>
        <label class="form-control block">
          <span class="label-text text-xs">Identifier</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            .value=${this.identifier}
            @input=${__classPrivateFieldGet(this, _QtiComposerMetadataForm_instances, "m", _QtiComposerMetadataForm_onIdentifierInput)}
            placeholder="Enter identifier"
          />
        </label>
      </section>
    `;
    }
};
_QtiComposerMetadataForm_instances = new WeakSet();
_QtiComposerMetadataForm_onTitleInput = function _QtiComposerMetadataForm_onTitleInput(event) {
    this.title = event.target.value;
    __classPrivateFieldGet(this, _QtiComposerMetadataForm_instances, "m", _QtiComposerMetadataForm_emitChange).call(this);
};
_QtiComposerMetadataForm_onIdentifierInput = function _QtiComposerMetadataForm_onIdentifierInput(event) {
    this.identifier = event.target.value;
    __classPrivateFieldGet(this, _QtiComposerMetadataForm_instances, "m", _QtiComposerMetadataForm_emitChange).call(this);
};
_QtiComposerMetadataForm_emitChange = function _QtiComposerMetadataForm_emitChange() {
    this.dispatchEvent(new CustomEvent('metadata-change', {
        detail: {
            title: this.title,
            identifier: this.identifier,
        },
        bubbles: true,
        composed: true,
    }));
};
__decorate([
    property({ type: String })
], QtiComposerMetadataForm.prototype, "title", void 0);
__decorate([
    property({ type: String })
], QtiComposerMetadataForm.prototype, "identifier", void 0);
QtiComposerMetadataForm = __decorate([
    customElement('qti-composer-metadata-form')
], QtiComposerMetadataForm);
export { QtiComposerMetadataForm };
