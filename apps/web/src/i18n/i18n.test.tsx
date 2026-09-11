import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { applyDocumentLanguage, I18N_NAMESPACES, initI18n, i18n } from './index';
import arCommon from './ar/common.json';
import arErrors from './ar/errors.json';
import arGame from './ar/game.json';
import arHost from './ar/host.json';
import arStudent from './ar/student.json';
import enCommon from './en/common.json';
import enErrors from './en/errors.json';
import enGame from './en/game.json';
import enHost from './en/host.json';
import enStudent from './en/student.json';

const localeBundles = {
  en: { common: enCommon, game: enGame, host: enHost, student: enStudent, errors: enErrors },
  ar: { common: arCommon, game: arGame, host: arHost, student: arStudent, errors: arErrors },
} as const;

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}
import { LanguageSync } from './LanguageSync';
import { useGameStore } from '../store/gameStore';
import { makeState, resetStore } from '../test/fixtures';

describe('i18n', () => {
  beforeEach(async () => {
    resetStore();
    await initI18n('en');
  });

  it('sets document direction for Arabic', () => {
    applyDocumentLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    applyDocumentLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('syncs language from game state', async () => {
    useGameStore.getState().setState(makeState({ language: 'ar' as const }));

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSync />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(i18n.language).toBe('ar');
      expect(document.documentElement.dir).toBe('rtl');
    });
  });

  it.each(I18N_NAMESPACES)('has matching %s keys in Arabic', (namespace) => {
    const enKeys = flattenKeys(localeBundles.en[namespace]).sort();
    const arKeys = flattenKeys(localeBundles.ar[namespace]).sort();
    expect(arKeys).toEqual(enKeys);
  });

  it('renders Arabic language labels', async () => {
    await i18n.changeLanguage('ar');

    render(
      <I18nextProvider i18n={i18n}>
        <span>{i18n.t('common:language.label')}</span>
      </I18nextProvider>,
    );

    expect(screen.getByText('اللغة')).toBeDefined();
  });
});
