import { useEffect } from 'react';
import { DEFAULT_LANGUAGE, isGameLanguage } from '@braintug/shared';
import { useGameStore } from '../store/gameStore';
import { applyDocumentLanguage, i18n } from './index';

/**
 * When a client joins or reconnects to a match, the session config is the
 * source of truth for language and text direction.
 */
export function LanguageSync() {
  const sessionLanguage = useGameStore((state) => state.state?.config.language);

  useEffect(() => {
    const language =
      sessionLanguage && isGameLanguage(sessionLanguage) ? sessionLanguage : DEFAULT_LANGUAGE;
    if (i18n.language === language) {
      applyDocumentLanguage(language);
      return;
    }
    void i18n.changeLanguage(language).then(() => applyDocumentLanguage(language));
  }, [sessionLanguage]);

  return null;
}
