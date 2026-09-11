import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { GameLanguage } from '@braintug/shared';

import enCommon from './en/common.json';
import enGame from './en/game.json';
import enHost from './en/host.json';
import enStudent from './en/student.json';
import enErrors from './en/errors.json';
import arCommon from './ar/common.json';
import arGame from './ar/game.json';
import arHost from './ar/host.json';
import arStudent from './ar/student.json';
import arErrors from './ar/errors.json';

export const I18N_NAMESPACES = ['common', 'game', 'host', 'student', 'errors'] as const;
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

const resources = {
  en: {
    common: enCommon,
    game: enGame,
    host: enHost,
    student: enStudent,
    errors: enErrors,
  },
  ar: {
    common: arCommon,
    game: arGame,
    host: arHost,
    student: arStudent,
    errors: arErrors,
  },
} satisfies Record<GameLanguage, Record<I18nNamespace, Record<string, unknown>>>;

export function applyDocumentLanguage(language: GameLanguage): void {
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
}

export async function initI18n(language: GameLanguage = 'en'): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(language);
    applyDocumentLanguage(language);
    return i18n;
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...I18N_NAMESPACES],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  applyDocumentLanguage(language);
  return i18n;
}

export { i18n };
