import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { GameLanguage } from '@braintug/shared';
import { initI18n, i18n } from '../i18n';

export async function initTestI18n(language: GameLanguage = 'en'): Promise<void> {
  await initI18n(language);
}

export function renderWithI18n(
  ui: ReactElement,
  options?: RenderOptions & { language?: GameLanguage },
) {
  const { language = 'en', ...renderOptions } = options ?? {};
  void i18n.changeLanguage(language);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>, renderOptions);
}

export function getGameT(language: GameLanguage = 'en') {
  void i18n.changeLanguage(language);
  return i18n.getFixedT(language, 'game');
}
