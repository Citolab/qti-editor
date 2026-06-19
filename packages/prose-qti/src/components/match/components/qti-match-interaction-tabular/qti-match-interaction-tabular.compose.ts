import { composeMatchInteractionElement } from '../qti-match-interaction/qti-match-interaction.compose.js';
import { exportTabularClassList } from './qti-match-interaction-tabular.schema.js';

import type { InteractionComposeResult } from '@citolab/prose-qti/components/shared/composer/types.js';

export function composeMatchInteractionTabularElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const normalizedSource = xmlDoc.createElementNS(sourceElement.namespaceURI || null, 'qti-match-interaction');

  for (const attr of Array.from(sourceElement.attributes)) {
    normalizedSource.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
  }
  normalizedSource.setAttribute('class', exportTabularClassList(sourceElement.getAttribute('class')));

  for (const child of Array.from(sourceElement.childNodes)) {
    normalizedSource.appendChild(xmlDoc.importNode(child, true));
  }

  return composeMatchInteractionElement(normalizedSource, xmlDoc);
}
