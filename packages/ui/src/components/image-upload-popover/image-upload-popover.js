import 'prosekit/lit/popover'
import '../button/index'

import { html, LitElement, nothing } from 'lit';
import { subscribeQtiI18n, translateQti } from '@qti-editor/interaction-shared/i18n/index.js';

let imageUploadId = 0

class LitImageUploadPopover extends LitElement {
  static properties = {
    editor: {
      attribute: false
    },
    uploader: {
      attribute: false
    },
    tooltip: { type: String },
    disabled: { type: Boolean },
    icon: { type: String },
    labels: { attribute: false },
  };

  tooltip = ''
  disabled = false
  icon = ''

  open = false;
  url = '';
  file = null;
  ariaId = `lit-image-upload-${imageUploadId++}`;

  createRenderRoot() {
    return this
  }

  connectedCallback() {
    super.connectedCallback()
    this.removeI18nListener = subscribeQtiI18n(() => this.requestUpdate())
  }

  disconnectedCallback() {
    this.removeI18nListener?.()
    this.removeI18nListener = undefined
    super.disconnectedCallback()
  }

  t(key, fallback) {
    return this.labels?.[key] ?? translateQti(key, { target: this, fallback })
  }

  handleOpenChange = (event) => {
    const isOpen = event.detail

    if (!isOpen) {
      this.deferResetState()
    }

    this.open = isOpen
    this.requestUpdate()
  };

  handleFileChange = (event) => {
    const target = event.target
    const selectedFile = target.files?.[0]

    if (selectedFile) {
      this.file = selectedFile
      this.url = ''
    } else {
      this.file = null
    }

    this.requestUpdate()
  };

  handleUrlChange = (event) => {
    const target = event.target
    const inputUrl = target.value

    if (inputUrl) {
      this.url = inputUrl
      this.file = null
    } else {
      this.url = ''
    }

    this.requestUpdate()
  };

  deferResetState() {
    setTimeout(() => {
      this.url = ''
      this.file = null
      this.requestUpdate()
    }, 300)
  }

  handleSubmit = () => {
    const editor = this.editor
    if (!editor) return

    if (this.url) {
      editor.commands.insertImage({ src: this.url })
    } else if (this.file && this.uploader) {
      editor.commands.uploadImage({ file: this.file, uploader: this.uploader })
    }

    this.open = false
    this.deferResetState()
    this.requestUpdate()
  };

  render() {
    return html`
      <prosekit-popover-root
        .open=${this.open}
        @open-change=${this.handleOpenChange}
      >
        <prosekit-popover-trigger>
          <lit-editor-button
            .pressed=${this.open}
            .disabled=${this.disabled}
            .tooltip=${this.tooltip}
            .icon=${this.icon}
          ></lit-editor-button>
        </prosekit-popover-trigger>

        <prosekit-popover-positioner placement="bottom" class="z-10">
          <prosekit-popover-popup class="flex flex-col gap-y-4 p-6 text-sm w-sm box-border rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg not-data-state:hidden">
          ${
            !this.file
              ? html`
                <label for="id-link-${this.ariaId}">${this.t('imageUpload.embedLink', 'Embed Link')}</label>
                <input
                  id="id-link-${this.ariaId}"
                  class="flex h-9 rounded-md w-full bg-white dark:bg-gray-950 px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-500 transition border box-border border-gray-200 dark:border-gray-800 border-solid ring-0 ring-transparent focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-0 outline-hidden focus-visible:outline-hidden file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder=${this.t('imageUpload.pasteLinkPlaceholder', 'Paste the image link...')}
                  type="url"
                  .value=${this.url}
                  @input=${this.handleUrlChange}
                />
              `
              : nothing
          }

          ${
            !this.url
              ? html`
                <label for="id-upload-${this.ariaId}">${this.t('imageUpload.upload', 'Upload')}</label>
                <input
                  id="id-upload-${this.ariaId}"
                  class="flex h-9 rounded-md w-full bg-white dark:bg-gray-950 px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-500 transition border box-border border-gray-200 dark:border-gray-800 border-solid ring-0 ring-transparent focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-0 outline-hidden focus-visible:outline-hidden file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  accept="image/*"
                  type="file"
                  @change=${this.handleFileChange}
                />
              `
              : nothing
          }

          ${
            this.url
              ? html`
                <button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-0 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:bg-gray-900/90 dark:hover:bg-gray-50/90 h-10 px-4 py-2 w-full" @click=${this.handleSubmit}>
                  ${this.t('imageUpload.insertImage', 'Insert Image')}
                </button>
              `
              : nothing
          }

          ${
            this.file
              ? html`
                <button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-0 bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900 hover:bg-gray-900/90 dark:hover:bg-gray-50/90 h-10 px-4 py-2 w-full" @click=${this.handleSubmit}>
                  ${this.t('imageUpload.uploadImage', 'Upload Image')}
                </button>
              `
              : nothing
          }
          </prosekit-popover-popup>
        </prosekit-popover-positioner>
      </prosekit-popover-root>
    `;
  }
}

customElements.define('lit-editor-image-upload-popover', LitImageUploadPopover)
