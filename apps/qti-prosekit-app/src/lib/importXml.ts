import { defaultRoundtripTransforms, itemBodyFromString, parseItemBody } from '@citolab/prose-qti/item-roundtrip';
import { findUnrepresentableElements, TRANSPARENT_WRAPPER_TAGS } from '@citolab/prose-qti/schema-recovery';
import { createEditor, union } from 'prosekit/core';

import { defineBasicExtension } from '../extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../extensions/qti-interactions-extension.js';

import type { SchemaGapOutcome } from '@citolab/prose-qti/schema-recovery';
import type { NodeJSON } from 'prosekit/core';
import type { Node } from 'prosekit/pm/model';

// The application editor has a locked top-level heading/paragraph/divider
// prefix. That is application chrome, not QTI vocabulary, so using its schema
// to parse an item makes ProseMirror coerce item content into the required
// heading. Parse with a neutral QTI document schema first, then let the caller
// add the locked prefix to the resulting JSON. Reuse the app's node definitions so
// JSON attribute types (notably ProseKit image width/height) stay compatible.
const qtiImportSchema = createEditor({
  extension: union(defineBasicExtension(), defineQtiInteractionsExtension()),
}).schema;

export interface ImportXmlResult {
  json: NodeJSON;
  metadata?: {
    title?: string;
    identifier?: string;
  };
  /**
   * What the schema could not represent in the file. Empty for a file the editor models fully.
   *
   * Present because the parse itself will not tell you: ProseMirror's `DOMParser` skips an element
   * no rule matches and parses its children in its place, silently, so importing an item that uses
   * anything outside this editor's vocabulary loses it without a word. Asking the schema first is
   * the only way to know.
   */
  gaps: SchemaGapOutcome;
}

/**
 * Clean XML text by removing BOM and invisible characters
 */
function cleanXmlText(xmlText: string): string {
  return xmlText
    .replace(/^\uFEFF/, '')  // BOM
    .replace(/^\u200B/, '')  // Zero-width space
    .replace(/^\u00A0/, '')  // Non-breaking space
    .trim();
}

/**
 * Extract metadata from QTI XML document
 */
function extractMetadata(xmlText: string): { title?: string; identifier?: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const assessmentItem = doc.querySelector('assessmentItem, qti-assessment-item');
  
  if (assessmentItem) {
    return {
      title: assessmentItem.getAttribute('title') || undefined,
      identifier: assessmentItem.getAttribute('identifier') || undefined,
    };
  }
  
  return {};
}

/**
 * Import QTI XML and convert to ProseMirror JSON
 */
export function importXmlFromText(xmlText: string): ImportXmlResult {
  // Clean the XML text
  let cleanedXml = cleanXmlText(xmlText);

  // Ensure it starts with '<'
  const firstLtIndex = cleanedXml.indexOf('<');
  if (firstLtIndex > 0) {
    cleanedXml = cleanedXml.substring(firstLtIndex);
  }

  // Use the same qti-transform-backed import path as the reference editors.
  // It applies the canonical interaction/item transforms, reduces to
  // qti-item-body, preserves empty custom elements, and parses with this schema.
  //
  // Split across `itemBodyFromString` / `parseItemBody` so the item body can be inspected in
  // between: after the transforms have run, so nothing the transforms consume is mistaken for lost
  // content, and before the parse, which is where the losing happens.
  const itemBody = itemBodyFromString(cleanedXml, {
    transforms: [...defaultRoundtripTransforms],
  });
  const gaps = findUnrepresentableElements(qtiImportSchema, itemBody.documentElement, {
    ignoreTags: TRANSPARENT_WRAPPER_TAGS,
  });
  const doc = parseItemBody(itemBody, qtiImportSchema);

  // Extract metadata
  const metadata = extractMetadata(cleanedXml);

  return {
    json: doc.toJSON(),
    metadata,
    gaps,
  };
}

/**
 * Import QTI XML from a File object
 */
export async function importXmlFromFile(file: File): Promise<ImportXmlResult> {
  const xmlText = await file.text();
  return importXmlFromText(xmlText);
}

/**
 * Open file picker and import QTI XML file
 */
export function openXmlFilePicker(): Promise<ImportXmlResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,application/xml,text/xml';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const result = await importXmlFromFile(file);
        resolve(result);
      } catch (error) {
        console.error('Failed to import XML:', error);
        reject(error);
      }
    };
    
    input.click();
  });
}

export interface ImportRoundtripXmlResult {
  doc: Node;
  gaps: SchemaGapOutcome;
}

export function importRoundtripXml(): Promise<ImportRoundtripXmlResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,application/xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const itemBody = itemBodyFromString(reader.result as string, {
            transforms: [...defaultRoundtripTransforms],
          });
          resolve({
            gaps: findUnrepresentableElements(qtiImportSchema, itemBody.documentElement, {
              ignoreTags: TRANSPARENT_WRAPPER_TAGS,
            }),
            doc: parseItemBody(itemBody, qtiImportSchema),
          });
        } catch {
          reject(new Error('Invalid roundtrip XML'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
