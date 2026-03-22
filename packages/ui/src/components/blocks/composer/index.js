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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _QtiComposer_instances, _QtiComposer_xmlUrl, _QtiComposer_xml, _QtiComposer_formattedXml, _QtiComposer_copyStatus, _QtiComposer_copyStatusTimer, _QtiComposer_setXmlUrl, _QtiComposer_revokeXmlUrl, _QtiComposer_clearXmlState, _QtiComposer_composeXml, _QtiComposer_copyXmlToClipboard, _QtiComposer_buildQtiPreviewUrl, _QtiComposer_openInQtiPreview, _QtiComposer_setCopyStatus, _QtiComposer_onLiveComposeToggle;
import { consume } from '@lit/context';
import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { buildAssessmentItemXml, extractResponseDeclarations, formatXml, } from '@qti-editor/qti-core/composer';
import { itemContext } from '@qti-editor/qti-editor-kit/item-context';
let QtiComposer = class QtiComposer extends LitElement {
    constructor() {
        super(...arguments);
        _QtiComposer_instances.add(this);
        Object.defineProperty(this, "itemContext", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "liveComposeEnabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        _QtiComposer_xmlUrl.set(this, '');
        _QtiComposer_xml.set(this, '');
        _QtiComposer_formattedXml.set(this, '');
        _QtiComposer_copyStatus.set(this, 'idle');
        _QtiComposer_copyStatusTimer.set(this, null);
    }
    createRenderRoot() {
        return this;
    }
    willUpdate(changedProperties) {
        super.willUpdate(changedProperties);
        if (changedProperties.has('liveComposeEnabled') && !this.liveComposeEnabled) {
            __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_clearXmlState).call(this);
            return;
        }
        if (!this.liveComposeEnabled) {
            return;
        }
        if (changedProperties.has('itemContext') || changedProperties.has('liveComposeEnabled')) {
            __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_composeXml).call(this);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_revokeXmlUrl).call(this);
        if (__classPrivateFieldGet(this, _QtiComposer_copyStatusTimer, "f") != null) {
            window.clearTimeout(__classPrivateFieldGet(this, _QtiComposer_copyStatusTimer, "f"));
            __classPrivateFieldSet(this, _QtiComposer_copyStatusTimer, null, "f");
        }
    }
    render() {
        return html `
      <section class="card border border-base-300/50 bg-base-100 p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold">Composer XML</h3>
          <label class="flex items-center gap-2 text-xs">
            <span class="font-medium">Live XML compose</span>
            <input
              class="toggle toggle-sm toggle-primary"
              type="checkbox"
              .checked=${this.liveComposeEnabled}
              @change=${__classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_onLiveComposeToggle)}
            />
          </label>
        </div>
        ${!this.liveComposeEnabled
            ? html `<p class="text-xs text-base-content/70">Live XML composing is off.</p>`
            : __classPrivateFieldGet(this, _QtiComposer_xmlUrl, "f")
                ? html `
                <div class="flex items-center gap-3">
                  <a
                    class="inline-block text-xs link link-primary"
                    href=${__classPrivateFieldGet(this, _QtiComposer_xmlUrl, "f")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open XML in new tab
                  </a>
                  <button class="btn btn-xs" type="button" @click=${__classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_openInQtiPreview)}>
                    Open in qti.citolab.nl
                  </button>
                  <button class="btn btn-xs" type="button" @click=${__classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_copyXmlToClipboard)}>
                    Copy
                  </button>
                  ${__classPrivateFieldGet(this, _QtiComposer_copyStatus, "f") === 'success'
                    ? html `<span class="text-xs text-success">Copied</span>`
                    : __classPrivateFieldGet(this, _QtiComposer_copyStatus, "f") === 'error'
                        ? html `<span class="text-xs text-error">Copy failed</span>`
                        : null}
                </div>
                <pre class="m-0 max-h-80 overflow-auto rounded-lg border border-base-300/40 bg-base-200 p-3 text-xs text-base-content">${__classPrivateFieldGet(this, _QtiComposer_formattedXml, "f")}</pre>
              `
                : html `<p class="text-xs text-base-content/70">No XML available.</p>`}
      </section>
    `;
    }
};
_QtiComposer_xmlUrl = new WeakMap();
_QtiComposer_xml = new WeakMap();
_QtiComposer_formattedXml = new WeakMap();
_QtiComposer_copyStatus = new WeakMap();
_QtiComposer_copyStatusTimer = new WeakMap();
_QtiComposer_instances = new WeakSet();
_QtiComposer_setXmlUrl = function _QtiComposer_setXmlUrl(xml) {
    __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_revokeXmlUrl).call(this);
    if (!xml.trim()) {
        __classPrivateFieldSet(this, _QtiComposer_xmlUrl, '', "f");
        return;
    }
    const xmlWithDeclaration = xml.startsWith('<?xml')
        ? xml
        : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    const xmlFile = new File([xmlWithDeclaration], 'assessment-item.xml', {
        type: 'application/xml',
    });
    __classPrivateFieldSet(this, _QtiComposer_xmlUrl, URL.createObjectURL(xmlFile), "f");
};
_QtiComposer_revokeXmlUrl = function _QtiComposer_revokeXmlUrl() {
    if (!__classPrivateFieldGet(this, _QtiComposer_xmlUrl, "f"))
        return;
    URL.revokeObjectURL(__classPrivateFieldGet(this, _QtiComposer_xmlUrl, "f"));
    __classPrivateFieldSet(this, _QtiComposer_xmlUrl, '', "f");
};
_QtiComposer_clearXmlState = function _QtiComposer_clearXmlState() {
    __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_revokeXmlUrl).call(this);
    __classPrivateFieldSet(this, _QtiComposer_xml, '', "f");
    __classPrivateFieldSet(this, _QtiComposer_formattedXml, '', "f");
};
_QtiComposer_composeXml = function _QtiComposer_composeXml() {
    if (!this.itemContext) {
        __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_clearXmlState).call(this);
        return;
    }
    const xml = buildAssessmentItemXml(this.itemContext);
    __classPrivateFieldSet(this, _QtiComposer_xml, xml, "f");
    __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_setXmlUrl).call(this, xml);
    __classPrivateFieldSet(this, _QtiComposer_formattedXml, formatXml(xml), "f");
};
_QtiComposer_copyXmlToClipboard = async function _QtiComposer_copyXmlToClipboard() {
    if (!__classPrivateFieldGet(this, _QtiComposer_formattedXml, "f").trim())
        return;
    try {
        await navigator.clipboard.writeText(__classPrivateFieldGet(this, _QtiComposer_formattedXml, "f"));
        __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_setCopyStatus).call(this, 'success');
    }
    catch {
        __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_setCopyStatus).call(this, 'error');
    }
};
_QtiComposer_buildQtiPreviewUrl = function _QtiComposer_buildQtiPreviewUrl(xml) {
    const bytes = new TextEncoder().encode(xml);
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    const base64 = window.btoa(binary);
    return `https://qti.citolab.nl/preview?sharedQti=${encodeURIComponent(base64)}`;
};
_QtiComposer_openInQtiPreview = function _QtiComposer_openInQtiPreview() {
    const xml = __classPrivateFieldGet(this, _QtiComposer_xml, "f").trim();
    if (!xml)
        return;
    const previewUrl = __classPrivateFieldGet(this, _QtiComposer_instances, "m", _QtiComposer_buildQtiPreviewUrl).call(this, xml);
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
};
_QtiComposer_setCopyStatus = function _QtiComposer_setCopyStatus(status) {
    __classPrivateFieldSet(this, _QtiComposer_copyStatus, status, "f");
    if (__classPrivateFieldGet(this, _QtiComposer_copyStatusTimer, "f") != null) {
        window.clearTimeout(__classPrivateFieldGet(this, _QtiComposer_copyStatusTimer, "f"));
    }
    if (status !== 'idle') {
        __classPrivateFieldSet(this, _QtiComposer_copyStatusTimer, window.setTimeout(() => {
            __classPrivateFieldSet(this, _QtiComposer_copyStatus, 'idle', "f");
            __classPrivateFieldSet(this, _QtiComposer_copyStatusTimer, null, "f");
            this.requestUpdate();
        }, 1500), "f");
    }
};
_QtiComposer_onLiveComposeToggle = function _QtiComposer_onLiveComposeToggle(event) {
    this.liveComposeEnabled = event.target.checked;
};
__decorate([
    consume({ context: itemContext, subscribe: true }),
    state()
], QtiComposer.prototype, "itemContext", void 0);
__decorate([
    state()
], QtiComposer.prototype, "liveComposeEnabled", void 0);
QtiComposer = __decorate([
    customElement('qti-composer')
], QtiComposer);
export { QtiComposer };
export { buildAssessmentItemXml, extractResponseDeclarations, formatXml };
