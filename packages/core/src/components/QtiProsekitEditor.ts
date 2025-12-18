/**
 * QTI ProseKit Editor
 *
 * Main editor component that combines ProseKit base functionality
 * with modular QTI plugins for a complete QTI editing experience.
 *
 * NOTE: This is a regular class, not a web component, to avoid Shadow DOM
 * style encapsulation issues with modular CSS.
 */

import { defineBasicExtension } from "prosekit/basic";
import {
  createEditor,
  type Editor,
  type Extension,
  union,
} from "prosekit/core";
import { DOMSerializer } from "prosekit/pm/model";

// Import editor styles (will be injected into document head)
import "./QtiProsekitEditor.css";

export interface QtiProsekitEditorOptions {
  container: HTMLElement;
  extensions?: Extension[];
  content?: string;
  readonly?: boolean;
  onReady?: (editor: Editor) => void;
}

export class QtiProsekitEditor {
  private editor?: Editor;
  private container: HTMLElement;
  private editorMount: HTMLDivElement;
  private extensions: Extension[];
  private content?: string;
  private onReady?: (editor: Editor) => void;

  private htmlPreview?: HTMLPreElement;

  constructor(options: QtiProsekitEditorOptions) {
    this.container = options.container;
    this.extensions = options.extensions || [];
    this.content = options.content;
    this.onReady = options.onReady;

    // Set up container structure
    this.container.className = "qti-editor-container";

    // Create editor mount element
    this.editorMount = document.createElement("div");
    this.editorMount.className = "qti-editor-mount";
    this.container.appendChild(this.editorMount);

    // Create HTML preview panel
    const previewPanel = document.createElement("div");
    previewPanel.className = "qti-html-preview-panel";

    const previewHeader = document.createElement("div");
    previewHeader.className = "qti-html-preview-header";
    previewHeader.textContent = "Generated HTML";

    this.htmlPreview = document.createElement("pre");
    this.htmlPreview.className = "qti-html-preview";

    previewPanel.appendChild(previewHeader);
    previewPanel.appendChild(this.htmlPreview);
    this.container.appendChild(previewPanel);

    this.initialize();
  }

  private initialize() {
    console.log("Initializing QTI ProseKit Editor...");

    try {
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (!this.editorMount) {
          console.error("Editor mount element not found");
          return;
        }

        // Create extension with basic functionality and user-provided extensions
        const extension = union([
          defineBasicExtension(),
          ...this.extensions,
        ]);

        console.log("Creating editor with extension...");

        this.editor = createEditor({
          extension,
          defaultContent:
            this.content || "<p>Welcome to the QTI Editor! Start typing...</p>",
        });

        console.log("Editor created, mounting...");

        // Mount the editor to the DOM element
        this.editor.mount(this.editorMount);

        console.log("Editor mounted successfully");

        if (this.onReady) {
          this.onReady(this.editor);
        }

        // Update HTML preview initially
        this.updateHtmlPreview();

        // Listen for document changes to update preview
        this.editor.view.state.doc;
        // Use a simple interval to update preview (ProseKit doesn't expose onChange easily)
        setInterval(() => {
          this.updateHtmlPreview();
        }, 500);
      });
    } catch (error) {
      console.error("Error initializing editor:", error);
    }
  }

  private updateHtmlPreview() {
    if (!this.editor || !this.htmlPreview) return;

    try {
      const state = this.editor.view.state;

      // Serialize to HTML using ProseMirror's DOMSerializer
      const serializer = DOMSerializer.fromSchema(state.schema);
      const fragment = serializer.serializeFragment(state.doc.content);
      const div = document.createElement("div");
      div.appendChild(fragment);
      const html = div.innerHTML;

      // Format HTML with simple indentation
      const formatted = this.formatHtml(html);

      this.htmlPreview.textContent = formatted;
    } catch (error) {
      console.error("Error updating HTML preview:", error);
    }
  }

  private formatHtml(html: string): string {
    // Simple HTML formatter with proper indentation
    let formatted = "";
    let indent = 0;
    const indentStr = "  ";

    // Split by tags
    const parts = html.split(/(<[^>]+>)/g).filter((part) => part.trim());

    for (const part of parts) {
      if (part.startsWith("</")) {
        // Closing tag - decrease indent before adding
        indent = Math.max(0, indent - 1);
        formatted += indentStr.repeat(indent) + part + "\n";
      } else if (part.startsWith("<") && !part.endsWith("/>")) {
        // Opening tag - add then increase indent
        formatted += indentStr.repeat(indent) + part + "\n";
        indent++;
      } else if (part.startsWith("<") && part.endsWith("/>")) {
        // Self-closing tag
        formatted += indentStr.repeat(indent) + part + "\n";
      } else {
        // Text content
        formatted += indentStr.repeat(indent) + part.trim() + "\n";
      }
    }

    return formatted.trim();
  }

  public destroy() {
    this.editor?.mount(null);
    this.editor = undefined;
    this.editorMount.remove();
  }

  public getEditor(): Editor | undefined {
    return this.editor;
  }

  public getHtml(): string {
    return this.editor?.view.dom.innerHTML || "";
  }
}
