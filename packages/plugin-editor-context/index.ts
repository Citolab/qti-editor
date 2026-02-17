import { createContext } from '@lit/context';

export interface QtiContextNodeDetail {
  type: string;
  attrs: Record<string, any>;
  pos: number;
}

export interface QtiContextAttributesDetail {
  nodes: QtiContextNodeDetail[];
  activeNode: QtiContextNodeDetail | null;
  open: boolean;
}

export interface QtiContextCodeDetail {
  json: Record<string, unknown>;
  html: string;
  xml: string;
  timestamp: number;
}

export interface QtiContextEditorView {
  state: any;
  dispatch: (tr: any) => void;
  dom?: ParentNode | null;
}

export interface QtiEditorContextValue {
  attributes: QtiContextAttributesDetail;
  code: QtiContextCodeDetail | null;
  editorView: QtiContextEditorView | null;
}

export const EMPTY_QTI_ATTRIBUTES_DETAIL: QtiContextAttributesDetail = {
  nodes: [],
  activeNode: null,
  open: false,
};

export const qtiEditorContext = createContext<QtiEditorContextValue>('qti-editor/context');
