import { Fragment } from 'prosemirror-model';
import type { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec, Schema } from 'prosemirror-model';

type SelectPointWrapperAttrs = {
  responseIdentifier: string | null;
  maxChoices: number;
  minChoices: number;
  class: string | null;
  areaMappings: string;
  correctResponse: string | null;
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
    areaMappings: node.getAttribute('area-mappings') || '[]',
    correctResponse: node.getAttribute('correct-response') || null,
  };
}

function buildPromptNode(schema: Schema, node: HTMLElement): ProseMirrorNode | null {
  const qtiPromptType = schema.nodes.qtiPrompt;
  const promptParagraphType = schema.nodes.qtiPromptParagraph;
  if (!qtiPromptType || !promptParagraphType) return null;

  const promptElement = node.querySelector('qti-prompt');
  const promptText = promptElement?.textContent?.trim() || 'Mark the correct point on the image.';

  const paragraph = promptParagraphType.create(null, promptText ? schema.text(promptText) : null);
  return qtiPromptType.create(null, paragraph);
}

function buildImgSelectPointNode(schema: Schema, node: HTMLElement): ProseMirrorNode | null {
  const imgSelectPointType = schema.nodes.imgSelectPoint;
  if (!imgSelectPointType) return null;

  const image = node.querySelector('img');
  const imageSrc = image?.getAttribute('src') || null;
  const imageAlt = image?.getAttribute('alt') || null;
  const imageWidth = parseNumberAttribute(image?.getAttribute('width') || null);
  const imageHeight = parseNumberAttribute(image?.getAttribute('height') || null);

  return imgSelectPointType.create({
    imageSrc,
    imageAlt,
    imageWidth,
    imageHeight,
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
    areaMappings: { default: '[]' },
    correctResponse: { default: null },
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
    if (node.attrs.areaMappings) attrs['area-mappings'] = String(node.attrs.areaMappings);
    if (node.attrs.correctResponse) attrs['correct-response'] = String(node.attrs.correctResponse);

    return ['qti-select-point-interaction', attrs, 0];
  },
};
