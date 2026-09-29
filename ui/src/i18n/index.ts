import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales, type SupportedLocale } from "./locales";

const LOCALE_STORAGE_KEY = "paperclip.ui.locale";

function readStoredLocale(): SupportedLocale | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return value && supportedLocales.includes(value) ? (value as SupportedLocale) : null;
}

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: readStoredLocale() ?? DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

export function changeLocale(locale: SupportedLocale) {
  if (!supportedLocales.includes(locale)) return;
  void i18n.changeLanguage(locale);
  if (typeof window !== "undefined") window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function getLocale(): SupportedLocale {
  const current = i18n.resolvedLanguage ?? i18n.language;
  return supportedLocales.includes(current) ? (current as SupportedLocale) : DEFAULT_LOCALE;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== LOCALE_STORAGE_KEY || !event.newValue) return;
    if (!supportedLocales.includes(event.newValue)) return;
    void i18n.changeLanguage(event.newValue);
    document.documentElement.lang = event.newValue;
  });
}

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
