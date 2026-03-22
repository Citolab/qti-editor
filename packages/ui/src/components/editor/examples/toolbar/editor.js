import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import '../../ui/toolbar/index'

import { html, LitElement } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { createEditor } from 'prosekit/core'

import { sampleUploader } from '../../sample/sample-uploader'

import { defineExtension } from './extension'

export class LitEditor extends LitElement {
  static properties = {
    editor: {
      state: true,
      attribute: false
    },
  };

  constructor() {
    super()

    const extension = defineExtension()
    this.editor = createEditor({ extension })
    this.ref = createRef()
  }

  createRenderRoot() {
    return this
  }

  disconnectedCallback() {
    this.editor.unmount()
    super.disconnectedCallback()
  }

  updated(changedProperties) {
    super.updated(changedProperties)
    this.editor.mount(this.ref.value)
  }

  render() {
    return html`<div class="box-border h-full w-full min-h-36 overflow-y-hidden overflow-x-hidden rounded-md border border-solid border-gray-200 dark:border-gray-700 shadow-sm flex flex-col bg-white dark:bg-gray-950 text-black dark:text-white">
      <lit-editor-toolbar
        .editor=${this.editor}
        .uploader=${sampleUploader}
      ></lit-editor-toolbar>
      <div class="relative w-full flex-1 box-border overflow-y-auto">
        <div ${ref(this.ref)} class="ProseMirror box-border min-h-full px-[max(4rem,calc(50%-20rem))] py-8 outline-hidden outline-0 [&_span[data-mention=user]]:text-blue-500 [&_span[data-mention=tag]]:text-violet-500"></div>
      </div>
    </div>`;
  }
}

export function registerLitEditor() {
  if (customElements.get('lit-editor-example-toolbar')) return
  customElements.define('lit-editor-example-toolbar', LitEditor)
}
