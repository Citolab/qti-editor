import { Fragment } from 'prosemirror-model';
import type { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec, Schema } from 'prosemirror-model';

type SelectPointWrapperAttrs = {
  responseIdentifier: string | null;
  maxChoices: number;
  minChoices: number;
  class: string | null;
};

function parseNumberAttribute(value: string | null): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isElementLike(node: unknown): node is HTMLElement {
  return (
    typeof node === 'object' &&
    node !== null &&
    'getAttribute' in node &&
    typeof node.getAttribute === 'function' &&
    'querySelector' in node &&
    typeof node.querySelector === 'function'
  );
}

function parseWrapperAttrs(node: HTMLElement): SelectPointWrapperAttrs {
  return {
    responseIdentifier: node.getAttribute('response-identifier'),
    maxChoices: parseNumberAttribute(node.getAttribute('max-choices')) ?? 0,
    minChoices: parseNumberAttribute(node.getAttribute('min-choices')) ?? 0,
    class: node.getAttribute('class') || null,
  };
}

function buildPromptNode(schema: Schema, node: HTMLElement): ProseMirrorNode | null {
  const qtiPromptType = schema.nodes.qtiPrompt;
  const paragraphType = schema.nodes.paragraph;
  if (!qtiPromptType || !paragraphType) return null;

  const promptElement = node.querySelector('qti-prompt');
  const promptText =
    promptElement?.textContent?.trim() || node.getAttribute('prompt')?.trim() || 'Mark the correct point on the image.';

  const paragraph = paragraphType.create(null, promptText ? schema.text(promptText) : null);
  return qtiPromptType.create(null, paragraph);
}

function buildImgSelectPointNode(schema: Schema, node: HTMLElement): ProseMirrorNode | null {
  const imgSelectPointType = schema.nodes.imgSelectPoint;
  if (!imgSelectPointType) return null;

  const customImage = node.querySelector('img-select-point');
  const legacyImage = node.querySelector('img');

  const imageSrc =
    customImage?.getAttribute('image-src') || node.getAttribute('image-src') || legacyImage?.getAttribute('src') || null;
  const imageAlt =
    customImage?.getAttribute('image-alt') || node.getAttribute('image-alt') || legacyImage?.getAttribute('alt') || null;
  const imageWidth =
    parseNumberAttribute(customImage?.getAttribute('image-width') || null) ??
    parseNumberAttribute(node.getAttribute('image-width')) ??
    parseNumberAttribute(legacyImage?.getAttribute('width') || null);
  const imageHeight =
    parseNumberAttribute(customImage?.getAttribute('image-height') || null) ??
    parseNumberAttribute(node.getAttribute('image-height')) ??
    parseNumberAttribute(legacyImage?.getAttribute('height') || null);

  const areaMappings =
    customImage?.getAttribute('area-mappings') || node.getAttribute('area-mappings') || '[]';
  const className = customImage?.getAttribute('class') || null;
  const correctResponse =
    customImage?.getAttribute('correct-response') || node.getAttribute('correct-response') || null;

  return imgSelectPointType.create({
    class: className,
    correctResponse,
    imageSrc,
    imageAlt,
    imageWidth,
    imageHeight,
    areaMappings,
  });
}

export const qtiSelectPointInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt imgSelectPoint',
  selectable: true,
  isolating: true,
  attrs: {
    responseIdentifier: { default: null },
    maxChoices: { default: 0 },
    minChoices: { default: 0 },
    class: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-select-point-interaction',
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        return parseWrapperAttrs(node);
      },
      getContent: (node, schema) => {
        if (!isElementLike(node)) return Fragment.empty;

        const promptNode = buildPromptNode(schema, node);
        const imageNode = buildImgSelectPointNode(schema, node);
        const children = [promptNode, imageNode].filter(Boolean) as ProseMirrorNode[];
        return Fragment.fromArray(children);
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      'max-choices': String(node.attrs.maxChoices ?? 0),
      'min-choices': String(node.attrs.minChoices ?? 0),
    };

    if (node.attrs.responseIdentifier) attrs['response-identifier'] = String(node.attrs.responseIdentifier);
    if (node.attrs.class) attrs.class = String(node.attrs.class);

    return ['qti-select-point-interaction', attrs, 0];
  },
};
