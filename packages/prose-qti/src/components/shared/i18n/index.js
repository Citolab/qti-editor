import { defaultQtiMessages } from './messages.js';
const DEFAULT_QTI_LANG = 'en';
const qtiMessages = new Map(Object.entries(defaultQtiMessages));
const qtiI18nListeners = new Set();
function normalizeLang(lang) {
    return lang?.trim().toLowerCase() || DEFAULT_QTI_LANG;
}
function getLangCandidates(lang) {
    const normalized = normalizeLang(lang);
    const base = normalized.split('-')[0] || DEFAULT_QTI_LANG;
    return Array.from(new Set([normalized, base, DEFAULT_QTI_LANG]));
}
function interpolate(template, params) {
    if (!params)
        return template;
    return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}
function resolveMessage(lang, key) {
    for (const candidate of getLangCandidates(lang)) {
        const message = qtiMessages.get(candidate)?.[key];
        if (message)
            return message;
    }
    return null;
}
export function notifyQtiI18nChanged() {
    qtiI18nListeners.forEach(listener => listener());
}
export function registerQtiMessages(lang, messages) {
    const normalizedLang = normalizeLang(lang);
    const existing = qtiMessages.get(normalizedLang) ?? {};
    qtiMessages.set(normalizedLang, { ...existing, ...messages });
    notifyQtiI18nChanged();
}
export function subscribeQtiI18n(listener) {
    qtiI18nListeners.add(listener);
    return () => {
        qtiI18nListeners.delete(listener);
    };
}
export function resolveQtiLang(target, fallbackLang) {
    if (fallbackLang?.trim())
        return normalizeLang(fallbackLang);
    if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
        if (target.lang.trim())
            return normalizeLang(target.lang);
        const closestWithLang = target.closest('[lang]');
        if (closestWithLang?.lang.trim())
            return normalizeLang(closestWithLang.lang);
    }
    if (typeof document !== 'undefined' && document.documentElement.lang.trim()) {
        return normalizeLang(document.documentElement.lang);
    }
    return DEFAULT_QTI_LANG;
}
export function translateQti(key, options = {}) {
    const lang = resolveQtiLang(options.target, options.lang);
    const message = resolveMessage(lang, key);
    if (typeof message === 'function')
        return message(options.params);
    if (typeof message === 'string')
        return interpolate(message, options.params);
    return options.fallback ?? key;
}
export class QtiI18nController {
    constructor(host) {
        this.host = host;
        this.unsubscribe = null;
        host.addController(this);
    }
    hostConnected() {
        this.unsubscribe = subscribeQtiI18n(() => this.host.requestUpdate());
    }
    hostDisconnected() {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }
    t(key, params, fallback) {
        return translateQti(key, {
            target: this.host,
            params,
            fallback,
        });
    }
}
