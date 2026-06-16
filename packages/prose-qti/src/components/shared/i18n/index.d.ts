import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { QtiI18nMessages, QtiI18nParams } from '@qti-editor/interfaces';
export declare function notifyQtiI18nChanged(): void;
export declare function registerQtiMessages(lang: string, messages: QtiI18nMessages): void;
export declare function subscribeQtiI18n(listener: () => void): () => void;
export declare function resolveQtiLang(target?: Element | null, fallbackLang?: string | null): string;
export declare function translateQti(key: string, options?: {
    lang?: string | null;
    target?: Element | null;
    params?: QtiI18nParams;
    fallback?: string;
}): string;
export declare class QtiI18nController implements ReactiveController {
    private readonly host;
    private unsubscribe;
    constructor(host: ReactiveControllerHost & Element);
    hostConnected(): void;
    hostDisconnected(): void;
    t(key: string, params?: QtiI18nParams, fallback?: string): string;
}
//# sourceMappingURL=index.d.ts.map