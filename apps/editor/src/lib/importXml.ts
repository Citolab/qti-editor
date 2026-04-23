import { xmlToHTML } from '@qti-editor/prosekit-integration';
import { jsonFromHTML } from 'prosekit/core';

import type { Schema } from 'prosekit/pm/model';

export interface ImportXmlResult {
  json: ReturnType<typeof jsonFromHTML>;
  metadata?: {
    title?: string;
    identifier?: string;
  };
}

export interface ImportXmlOptions {
  schema: Schema;
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
export function importXmlFromText(xmlText: string, options: ImportXmlOptions): ImportXmlResult {
  // Clean the XML text
  let cleanedXml = cleanXmlText(xmlText);

  // Ensure it starts with '<'
  const firstLtIndex = cleanedXml.indexOf('<');
  if (firstLtIndex > 0) {
    cleanedXml = cleanedXml.substring(firstLtIndex);
  }

  // Convert XML to HTML
  const html = xmlToHTML(cleanedXml);

  // Convert HTML to ProseMirror JSON
  const json = jsonFromHTML(html, { schema: options.schema });

  // Extract metadata
  const metadata = extractMetadata(cleanedXml);

  return { json, metadata };
}

/**
 * Import QTI XML from a File object
 */
export async function importXmlFromFile(file: File, options: ImportXmlOptions): Promise<ImportXmlResult> {
  const xmlText = await file.text();
  return importXmlFromText(xmlText, options);
}

/**
 * Open file picker and import QTI XML file
 */
export function openXmlFilePicker(options: ImportXmlOptions): Promise<ImportXmlResult> {
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
        const result = await importXmlFromFile(file, options);
        resolve(result);
      } catch (error) {
        console.error('Failed to import XML:', error);
        reject(error);
      }
    };
    
    input.click();
  });
}
