/**
 * Cấu hình i18next (Đa ngôn ngữ).
 * (File này trước đó trống)
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en.json';
import viTranslation from './locales/vi.json';

const resources = {
  en: { translation: enTranslation },
  vi: { translation: viTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    debug: import.meta.env.DEV,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mindmap_app_language',
    },
  });

export default i18n;