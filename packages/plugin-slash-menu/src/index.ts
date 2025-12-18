/**
 * QTI Slash Menu Plugin
 *
 * Provides modular slash menu functionality with QTI-specific commands.
 * Uses a simplified event-based approach since ProseKit autocomplete may not be available.
 */

import { defineKeyDownHandler, type Extension } from "prosekit/core";
import type { EditorView } from "prosekit/pm/view";

// QTI Slash Menu Items Configuration
export interface SlashMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  command: string;
  keywords: string[];
  category: "qti" | "basic";
}

export const qtiSlashItems: SlashMenuItem[] = [
  // QTI Interactions
  {
    id: "choice_interaction",
    label: "Multiple Choice",
    description: "A question with selectable options",
    icon: "☑️",
    command: "insertChoiceInteraction",
    keywords: ["choice", "multiple", "select", "option", "quiz"],
    category: "qti",
  },
  {
    id: "order_interaction",
    label: "Order Interaction",
    description: "Put items in the correct sequence",
    icon: "🔢",
    command: "insertOrderInteraction",
    keywords: ["order", "sequence", "sort", "arrange", "rank"],
    category: "qti",
  },
  {
    id: "text_entry_interaction",
    label: "Text Entry",
    description: "Fill-in-the-blank text input",
    icon: "📝",
    command: "insertTextEntryInteraction",
    keywords: ["text", "input", "blank", "fill", "type"],
    category: "qti",
  },
  {
    id: "qti_prompt",
    label: "Question Prompt",
    description: "Add a question or instruction",
    icon: "❓",
    command: "insertPrompt",
    keywords: ["prompt", "question", "instruction", "ask"],
    category: "qti",
  },
  {
    id: "qti_simple_choice",
    label: "Answer Choice",
    description: "Add a single answer option",
    icon: "⚪",
    command: "insertSimpleChoice",
    keywords: ["choice", "option", "answer", "select"],
    category: "qti",
  },
];

export const basicSlashItems: SlashMenuItem[] = [
  // Basic formatting
  {
    id: "paragraph",
    label: "Text",
    description: "Plain text paragraph",
    icon: "📄",
    command: "setParagraph",
    keywords: ["text", "paragraph", "p"],
    category: "basic",
  },
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    command: "setHeading1",
    keywords: ["heading", "h1", "title", "#"],
    category: "basic",
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    command: "setHeading2",
    keywords: ["heading", "h2", "subtitle", "##"],
    category: "basic",
  },
  {
    id: "bullet_list",
    label: "Bullet List",
    description: "Unordered list with bullets",
    icon: "•",
    command: "wrapInBulletList",
    keywords: ["list", "bullet", "ul", "-"],
    category: "basic",
  },
  {
    id: "ordered_list",
    label: "Numbered List",
    description: "Ordered list with numbers",
    icon: "1.",
    command: "wrapInOrderedList",
    keywords: ["list", "numbered", "ordered", "ol", "1."],
    category: "basic",
  },
];

// Combine all slash menu items
export const allSlashItems = [...qtiSlashItems, ...basicSlashItems];

// Filter slash items based on query
export function filterSlashItems(
  query: string,
  items: SlashMenuItem[] = allSlashItems
): SlashMenuItem[] {
  if (!query || query === "/") {
    return items;
  }

  const searchQuery = query.replace("/", "").toLowerCase();

  return items.filter((item) => {
    const labelMatch = item.label.toLowerCase().includes(searchQuery);
    const keywordMatch = item.keywords.some((keyword) =>
      keyword.toLowerCase().includes(searchQuery)
    );
    const descriptionMatch = item.description
      ?.toLowerCase()
      .includes(searchQuery);

    return labelMatch || keywordMatch || descriptionMatch;
  });
}

// Get slash item by command name
export function getSlashItem(command: string): SlashMenuItem | undefined {
  return allSlashItems.find((item) => item.command === command);
}

// Track current slash state
let slashState: { active: boolean; query: string; pos: number } = {
  active: false,
  query: "",
  pos: 0,
};

// Store view reference for slash text clearing
let editorView: EditorView | null = null;

// Handle key down events for slash menu
function slashKeyHandler(view: EditorView, event: KeyboardEvent): boolean {
  // Store view reference for slash text clearing
  editorView = view;

  const { state } = view;
  const { selection } = state;

  console.log("🔑 Key pressed:", event.key, "slashState.active:", slashState.active);

  if (event.key === "/") {
    // Check if we're at the start of a line or after whitespace
    const $pos = selection.$from;
    const nodeBefore = $pos.nodeBefore;
    const textBefore = state.doc.textBetween(
      Math.max(0, selection.from - 10),
      selection.from
    );

    // Check if we're at the start of a paragraph/block
    const atBlockStart = $pos.parentOffset === 0;
    const atStart = atBlockStart || textBefore === "" || /\s$/.test(textBefore);

    console.log("📍 Position:", {
      from: selection.from,
      parentOffset: $pos.parentOffset,
      textBefore: JSON.stringify(textBefore),
      nodeBefore,
      atBlockStart,
      atStart,
      empty: selection.empty
    });

    if (atStart && selection.empty) {
      console.log("✅ Opening slash menu!");
      slashState = { active: true, query: "/", pos: selection.from };

      // Insert the slash character
      const tr = state.tr.insertText("/", selection.from);
      view.dispatch(tr);

      // Dispatch open event with cursor position
      setTimeout(() => {
        // Get cursor coordinates
        const coords = view.coordsAtPos(selection.from);

        const menuEvent = new CustomEvent("prosekit:slash-menu:open", {
          detail: {
            query: "/",
            items: filterSlashItems("/"),
            position: {
              top: coords.top,
              left: coords.left,
              bottom: coords.bottom,
              right: coords.right,
            },
          },
        });
        document.dispatchEvent(menuEvent);
        console.log("📤 Dispatched slash-menu:open event with position:", coords);
      }, 0);

      return true; // Prevent default behavior
    } else {
      console.log("❌ Not opening slash menu - conditions not met");
    }
  } else if (slashState.active) {
    if (event.key === "Escape") {
      slashState = { active: false, query: "", pos: 0 };
      document.dispatchEvent(new CustomEvent("prosekit:slash-menu:close"));
      return true;
    } else if (event.key === "Backspace") {
      if (slashState.query.length === 1) {
        slashState = { active: false, query: "", pos: 0 };
        document.dispatchEvent(new CustomEvent("prosekit:slash-menu:close"));
      } else {
        slashState.query = slashState.query.slice(0, -1);
        const menuEvent = new CustomEvent("prosekit:slash-menu:update", {
          detail: {
            query: slashState.query,
            items: filterSlashItems(slashState.query),
          },
        });
        document.dispatchEvent(menuEvent);
      }
    } else if (event.key.length === 1) {
      slashState.query += event.key;
      const menuEvent = new CustomEvent("prosekit:slash-menu:update", {
        detail: {
          query: slashState.query,
          items: filterSlashItems(slashState.query),
        },
      });
      document.dispatchEvent(menuEvent);
    }
  }

  return false;
}

// Export slash state for UI components
export function getSlashState() {
  return slashState;
}

export function clearSlashState() {
  slashState = { active: false, query: "", pos: 0 };
  document.dispatchEvent(new CustomEvent("prosekit:slash-menu:close"));
}

export function clearSlashText(view: EditorView) {
  if (!slashState.active) return;
  const currentPos = view.state.selection.from;
  const slashLength = slashState.query.length;
  const from = Math.max(0, currentPos - slashLength);
  if (from >= currentPos) return;
  view.dispatch(view.state.tr.delete(from, currentPos));
}

// Listen for slash menu select events
function setupSlashMenuListener() {
  document.addEventListener("prosekit:slash-menu:select", (event) => {
    const { item } = (event as CustomEvent).detail as { item: SlashMenuItem };
    console.log("📥 Slash menu item selected:", item);

    if (!editorView || !slashState.active) {
      console.warn("⚠️ Cannot execute command: editor view not available");
      return;
    }

    // Clear the slash text first
    clearSlashText(editorView);
    console.log("✅ Cleared slash text");

    // Execute the command associated with the item
    const { state, dispatch } = editorView;
    const commandName = item.command;

    console.log("🎯 Executing command:", commandName);

    // Map command names to actual command functions
    const commandMap: Record<string, () => boolean> = {
      insertChoiceInteraction: () => {
        const command = state.schema.nodes.qti_choice_interaction;
        if (!command) {
          console.error("❌ qti_choice_interaction node not found in schema");
          return false;
        }
        // Use the insertChoiceInteraction command from the plugin
        return executeInsertCommand(state, dispatch, "qti_choice_interaction");
      },
      insertOrderInteraction: () => {
        return executeInsertCommand(state, dispatch, "qti_order_interaction");
      },
      insertTextEntryInteraction: () => {
        return executeInsertCommand(state, dispatch, "qti_text_entry_interaction");
      },
      insertPrompt: () => {
        return executeInsertCommand(state, dispatch, "qti_prompt");
      },
      insertSimpleChoice: () => {
        return executeInsertCommand(state, dispatch, "qti_simple_choice");
      },
    };

    const commandFn = commandMap[commandName];
    if (commandFn) {
      const result = commandFn();
      if (result) {
        console.log("✅ Command executed successfully");
      } else {
        console.error("❌ Command execution failed");
      }
    } else {
      console.error(`❌ Unknown command: ${commandName}`);
    }
  });
}

// Helper function to execute insert commands
function executeInsertCommand(
  state: any,
  dispatch: any,
  nodeType: string
): boolean {
  const type = state.schema.nodes[nodeType];
  if (!type) {
    console.error(`❌ Node type ${nodeType} not found in schema`);
    return false;
  }

  // Create the node with default content based on type
  let node;
  const { schema } = state;

  switch (nodeType) {
    case "qti_choice_interaction": {
      const prompt = schema.nodes.qti_prompt.create(
        null,
        schema.nodes.paragraph.create(null, schema.text("Which option is correct?"))
      );
      const choices = [
        schema.nodes.qti_simple_choice.create(
          { identifier: "choice_A" },
          schema.nodes.paragraph.create(null, schema.text("Option A"))
        ),
        schema.nodes.qti_simple_choice.create(
          { identifier: "choice_B" },
          schema.nodes.paragraph.create(null, schema.text("Option B"))
        ),
        schema.nodes.qti_simple_choice.create(
          { identifier: "choice_C" },
          schema.nodes.paragraph.create(null, schema.text("Option C"))
        ),
      ];
      node = type.create(
        { responseIdentifier: `CHOICE_${Date.now()}`, maxChoices: 1 },
        [prompt, ...choices]
      );
      break;
    }
    case "qti_order_interaction": {
      const prompt = schema.nodes.qti_prompt.create(
        null,
        schema.nodes.paragraph.create(null, schema.text("Put these items in the correct order:"))
      );
      const choices = [
        schema.nodes.qti_simple_choice.create(
          { identifier: "order_1" },
          schema.nodes.paragraph.create(null, schema.text("First item"))
        ),
        schema.nodes.qti_simple_choice.create(
          { identifier: "order_2" },
          schema.nodes.paragraph.create(null, schema.text("Second item"))
        ),
        schema.nodes.qti_simple_choice.create(
          { identifier: "order_3" },
          schema.nodes.paragraph.create(null, schema.text("Third item"))
        ),
      ];
      node = type.create(
        { responseIdentifier: `ORDER_${Date.now()}` },
        [prompt, ...choices]
      );
      break;
    }
    case "qti_text_entry_interaction": {
      node = type.create({
        responseIdentifier: `TEXT_${Date.now()}`,
        expectedLength: 10,
        placeholderText: "Enter your answer...",
      });
      break;
    }
    case "qti_prompt": {
      node = type.create(
        null,
        schema.nodes.paragraph.create(null, schema.text("Enter your question here"))
      );
      break;
    }
    case "qti_simple_choice": {
      node = type.create(
        { identifier: `choice_${Date.now()}` },
        schema.nodes.paragraph.create(null, schema.text("Choice option"))
      );
      break;
    }
    default:
      return false;
  }

  if (node && dispatch) {
    dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
    return true;
  }

  return false;
}

// Initialize listener once
if (typeof document !== "undefined") {
  setupSlashMenuListener();
}

export function qtiSlashMenuExtension(): Extension {
  return defineKeyDownHandler(slashKeyHandler);
}
