import { defaultRoundtripTransforms, importItemFromString } from '@citolab/prose-qti/item-roundtrip';
import { createEditor, union } from 'prosekit/core';

import { defineBasicExtension } from '../extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../extensions/qti-interactions-extension.js';

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
  const doc = importItemFromString(cleanedXml, qtiImportSchema, {
    transforms: [...defaultRoundtripTransforms],
  });

  // Extract metadata
  const metadata = extractMetadata(cleanedXml);

  return {
    json: doc.toJSON(),
    metadata,
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

export function importRoundtripXml(): Promise<Node> {
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
          const doc = importItemFromString(reader.result as string, qtiImportSchema, {
            transforms: [...defaultRoundtripTransforms],
          });
          resolve(doc);
        } catch {
          reject(new Error('Invalid roundtrip XML'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
