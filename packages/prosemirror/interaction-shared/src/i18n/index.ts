import { defaultQtiMessages } from './messages.js';

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { QtiI18nMessages, QtiI18nParams } from '@qti-editor/interfaces';

const DEFAULT_QTI_LANG = 'en';
const qtiMessages = new Map<string, QtiI18nMessages>(Object.entries(defaultQtiMessages));
const qtiI18nListeners = new Set<() => void>();

function normalizeLang(lang?: string | null): string {
  return lang?.trim().toLowerCase() || DEFAULT_QTI_LANG;
}

function getLangCandidates(lang: string): string[] {
  const normalized = normalizeLang(lang);
  const base = normalized.split('-')[0] || DEFAULT_QTI_LANG;
  return Array.from(new Set([normalized, base, DEFAULT_QTI_LANG]));
}

function interpolate(template: string, params?: QtiI18nParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''));
}

function resolveMessage(lang: string, key: string): string | ((params?: QtiI18nParams) => string) | null {
  for (const candidate of getLangCandidates(lang)) {
    const message = qtiMessages.get(candidate)?.[key];
    if (message) return message;
  }
  return null;
}

export function notifyQtiI18nChanged() {
  qtiI18nListeners.forEach(listener => listener());
}

export function registerQtiMessages(lang: string, messages: QtiI18nMessages) {
  const normalizedLang = normalizeLang(lang);
  const existing = qtiMessages.get(normalizedLang) ?? {};
  qtiMessages.set(normalizedLang, { ...existing, ...messages });
  notifyQtiI18nChanged();
}

export function subscribeQtiI18n(listener: () => void): () => void {
  qtiI18nListeners.add(listener);
  return () => {
    qtiI18nListeners.delete(listener);
  };
}

export function resolveQtiLang(target?: Element | null, fallbackLang?: string | null): string {
  if (fallbackLang?.trim()) return normalizeLang(fallbackLang);
  if (target instanceof HTMLElement) {
    if (target.lang.trim()) return normalizeLang(target.lang);
    const closestWithLang = target.closest<HTMLElement>('[lang]');
    if (closestWithLang?.lang.trim()) return normalizeLang(closestWithLang.lang);
  }
  if (typeof document !== 'undefined' && document.documentElement.lang.trim()) {
    return normalizeLang(document.documentElement.lang);
  }
  return DEFAULT_QTI_LANG;
}

export function translateQti(
  key: string,
  options: {
    lang?: string | null;
    target?: Element | null;
    params?: QtiI18nParams;
    fallback?: string;
  } = {},
): string {
  const lang = resolveQtiLang(options.target, options.lang);
  const message = resolveMessage(lang, key);
  if (typeof message === 'function') return message(options.params);
  if (typeof message === 'string') return interpolate(message, options.params);
  return options.fallback ?? key;
}

export class QtiI18nController implements ReactiveController {
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly host: ReactiveControllerHost & Element) {
    host.addController(this);
  }

  hostConnected() {
    this.unsubscribe = subscribeQtiI18n(() => this.host.requestUpdate());
  }

  hostDisconnected() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  t(key: string, params?: QtiI18nParams, fallback?: string): string {
    return translateQti(key, {
      target: this.host,
      params,
      fallback,
    });
  }
}
