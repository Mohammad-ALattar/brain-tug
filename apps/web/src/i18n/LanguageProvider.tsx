import { useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { DEFAULT_LANGUAGE } from '@braintug/shared';
import { applyDocumentLanguage, i18n, initI18n } from './index';
import { LanguageSync } from './LanguageSync';

export type LanguageProviderProps = {
  children: ReactNode;
};

/**
 * Boots i18next once, then keeps UI language aligned with the active game session.
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [ready, setReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      applyDocumentLanguage((i18n.language as 'en' | 'ar') ?? DEFAULT_LANGUAGE);
      setReady(true);
      return;
    }

    void initI18n(DEFAULT_LANGUAGE).then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync />
      {children}
    </I18nextProvider>
  );
}
