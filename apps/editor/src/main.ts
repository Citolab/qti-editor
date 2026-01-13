/**
 * QTI ProseKit Editor - Main Application
 *
 * Entry point for the QTI editor application.
 * Demonstrates the modular plugin architecture with ProseKit.
 * This app acts as the plugin orchestrator, registering plugins as needed.
 */

// Import ProseKit styles
import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import './style.css';
import '@qti-editor/plugin-toolbar/toolbar.css';
import '@qti-editor/plugin-slash-menu/components/QtiSlashMenu';
import '@qti-editor/plugin-side-panel/style.css';

import type { Editor } from 'prosekit/core';

// Import core editor and components
import { QtiProsekitEditor } from '@qti-editor/core';
import { allQtiComponentsExtension } from '@qti-editor/plugin-qti-components';
import { qtiSidePanelExtension } from '@qti-editor/plugin-side-panel';
import { qtiSlashMenuExtension } from '@qti-editor/plugin-slash-menu';
import { createToolbar } from '@qti-editor/plugin-toolbar';
import { toolbarNodeNames } from '@qti-editor/plugin-qti-components/shared/generated-prosemirror-schema';


// Or import individual components:
// import { choiceInteractionExtension } from "@qti-editor/plugin-qti-components/choice-interaction";
// import { orderInteractionExtension } from "@qti-editor/plugin-qti-components/order-interaction";

/**
 * Plugin Configuration
 *
 * Enable or disable plugins by commenting/uncommenting entries in this array.
 * Each plugin exports an extension that can be registered with the editor.
 */
const enabledPlugins = [
  {
    name: 'qti-components',
    extension: allQtiComponentsExtension(),
    uiComponent: null,
  },
  {
    name: 'slash-menu',
    extension: qtiSlashMenuExtension(),
    uiComponent: 'qti-slash-menu',
  },
  {
    name: 'side-panel',
    extension: qtiSidePanelExtension(),
    uiComponent: null,
  },
  // Add more plugins here as needed
  // {
  //   name: "qti-import",
  //   extension: qtiImportExtension(),
  //   uiComponent: null,
  // },

  // Example: Register only specific QTI components instead of all
  // {
  //   name: "choice-interaction",
  //   extension: choiceInteractionExtension(),
  //   uiComponent: null,
  // },
];

// Initialize the demo application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 QTI Editor initializing...');
  console.log('📦 Enabled plugins:', enabledPlugins.map((p) => p.name).join(', '));

  const app = document.querySelector<HTMLDivElement>('#app')!;
  if (!app) {
    console.error('❌ Could not find #app element');
    return;
  }

  // Clear the app container
  app.innerHTML = '';

  // Create elements programmatically to ensure proper initialization
  const container = document.createElement('div');
  container.className = 'app-container';

  const main = document.createElement('main');
  main.className = 'app-main';

  // Toolbar container
  const toolbarContainer = document.createElement('div');
  toolbarContainer.className = 'app-toolbar';
  main.appendChild(toolbarContainer);

  // Body wrapper to host editor + side panel
  const bodyContainer = document.createElement('div');
  bodyContainer.className = 'app-body';
  main.appendChild(bodyContainer);

  // Create editor container
  const editorContainer = document.createElement('div');
  editorContainer.className = 'editor-host';
  bodyContainer.appendChild(editorContainer);

  // Create side panel container (not added to DOM yet - will be added when needed)
  const sidePanel = document.createElement('aside');
  sidePanel.className = 'side-panel';

  // Initialize the editor
  new QtiProsekitEditor({
    container: editorContainer,
    extensions: enabledPlugins.map((plugin) => plugin.extension),
    content:
      '<p>Welcome to the QTI Editor!</p><p>Press Enter to start a new line, then type / to open the slash menu.</p>',
    onReady: (editorInstance: Editor) => {
      createToolbar({
        editor: editorInstance,
        container: toolbarContainer,
      });

      addQtiDropdown(toolbarContainer, editorInstance);

      setupSidePanel(bodyContainer, sidePanel, editorInstance);
    },
  });

  console.log('📝 Editor created with plugins');

  // Add plugin UI components (like slash menu)
  enabledPlugins.forEach((plugin) => {
    if (plugin.uiComponent) {
      const pluginComponent = document.createElement(plugin.uiComponent);
      main.appendChild(pluginComponent);
      console.log(`✅ Added plugin UI component: ${plugin.uiComponent}`);
    }
  });

  // Assemble the structure
  app.appendChild(main);

  console.log('✅ QTI Editor initialized');
});

function addQtiDropdown(container: HTMLElement, editor: Editor) {
  const wrapper = document.createElement('div');
  wrapper.className = 'qti-dropdown';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'qti-dropdown-toggle';
  toggle.textContent = 'QTI ▾';

  const menu = document.createElement('div');
  menu.className = 'qti-dropdown-menu';

  const addItem = (label: string, handler: () => void) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'qti-dropdown-item';
    item.textContent = label;
    item.addEventListener('click', () => {
      handler();
      editor.view.focus();
      menu.classList.remove('open');
    });
    menu.appendChild(item);
  };

  const cmds = editor.commands as Record<string, (...args: any[]) => any>;

  const allowedNodes = new Set(toolbarNodeNames);
  const items = [
    {
      node: 'qti_choice_interaction',
      label: 'Choice interaction',
      command: () => cmds?.insertChoiceInteraction?.(),
    },
    {
      node: 'qti_text_entry_interaction',
      label: 'Text entry',
      command: () => cmds?.insertTextEntryInteraction?.(),
    },
  ];

  items
    .filter((item) => allowedNodes.has(item.node))
    .forEach((item) => addItem(item.label, item.command));

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('open');
  });

  wrapper.appendChild(toggle);
  wrapper.appendChild(menu);
  container.appendChild(wrapper);
}

function setupSidePanel(body: HTMLElement, panel: HTMLElement, editor: Editor) {
  let currentDetail:
    | {
        type: string;
        attrs: Record<string, any>;
        pos: number;
      }[]
    | null = null;

  const title = document.createElement('div');
  title.className = 'side-panel-title';
  panel.appendChild(title);

  const form = document.createElement('div');
  form.className = 'side-panel-form';
  panel.appendChild(form);

  const emptyState = document.createElement('div');
  emptyState.className = 'side-panel-empty';
  emptyState.textContent = 'Select a QTI element to edit its attributes.';
  panel.appendChild(emptyState);

  const renderForm = () => {
    form.innerHTML = '';
    if (!currentDetail || currentDetail.length === 0) {
      // Remove panel from DOM when not active
      if (panel.parentElement) {
        panel.remove();
      }
      title.textContent = '';
      emptyState.style.display = 'block';
      return;
    }

    // Add panel to DOM when active
    if (!panel.parentElement) {
      body.appendChild(panel);
      // Trigger animation by adding class on next frame
      requestAnimationFrame(() => {
        panel.classList.add('open');
      });
    } else {
      panel.classList.add('open');
    }

    title.textContent = 'QTI Attributes';
    emptyState.style.display = 'none';

    currentDetail.forEach((detail, detailIndex) => {
      const section = document.createElement('div');
      section.className = 'side-panel-section';

      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'side-panel-section-title';
      sectionTitle.textContent = detail.type.replace(/^qti_/, '').replace(/_/g, ' ').toUpperCase();
      section.appendChild(sectionTitle);

      Object.entries(detail.attrs).forEach(([key, value]) => {
        const row = document.createElement('label');
        row.className = 'side-panel-row';

        const label = document.createElement('span');
        label.textContent = key;
        row.appendChild(label);

        const input = document.createElement('input');
        const type =
          typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text';
        input.type = type;
        if (type === 'checkbox') {
          input.checked = Boolean(value);
        } else {
          input.value = value ?? '';
        }

        input.addEventListener('change', () => {
          if (!currentDetail) return;
          const nextDetail = { ...currentDetail[detailIndex] };
          const attrs = { ...nextDetail.attrs };
          if (type === 'checkbox') {
            attrs[key] = (input as HTMLInputElement).checked;
          } else if (type === 'number') {
            const num = Number((input as HTMLInputElement).value);
            attrs[key] = Number.isFinite(num) ? num : null;
          } else {
            attrs[key] = (input as HTMLInputElement).value;
          }

          const tr = editor.view.state.tr.setNodeMarkup(nextDetail.pos, undefined, attrs);
          editor.view.dispatch(tr);
          currentDetail = currentDetail.map((item, idx) =>
            idx === detailIndex ? { ...item, attrs } : item,
          );
        });

        row.appendChild(input);
        section.appendChild(row);
      });

      form.appendChild(section);
    });
  };

  document.addEventListener('qti:side-panel:update', (event) => {
    const detail = (event as CustomEvent<any>).detail as { nodes: NonNullable<typeof currentDetail> };
    currentDetail = detail.nodes;
    renderForm();
  });
}
