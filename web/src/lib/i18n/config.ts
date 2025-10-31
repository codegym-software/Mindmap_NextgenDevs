/**
 * Cấu hình i18next (Đa ngôn ngữ).
 * (File này trước đó trống)
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import viTranslation from './locales/vi.json';

// Tài nguyên ngôn ngữ
const resources = {
  en: {
    translation: enTranslation,
  },
  vi: {
    translation: viTranslation,
  },
};

i18n
  // Phát hiện ngôn ngữ trình duyệt
  .use(LanguageDetector)
  // Kết nối với React
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi', // Ngôn ngữ mặc định nếu không phát hiện được
    debug: import.meta.env.DEV, // Bật debug ở môi trường dev

    interpolation: {
      escapeValue: false, // React đã tự escape
    },
    
    // Cấu hình LanguageDetector
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'], // Lưu ngôn ngữ đã chọn vào localStorage
      lookupLocalStorage: 'mindmap_language', // Key (Tuân thủ User Story #settings)
    },
  });

export default i18n;
