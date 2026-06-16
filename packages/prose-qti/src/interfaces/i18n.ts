export type QtiI18nPrimitive = string | number | boolean | null | undefined;

export type QtiI18nParams = Record<string, QtiI18nPrimitive>;

export type QtiI18nMessageValue =
  | string
  | ((params?: QtiI18nParams) => string);

export type QtiI18nMessages = Record<string, QtiI18nMessageValue>;

