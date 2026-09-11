import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { GameResult } from '@braintug/shared';

export function getResultReasonLabel(result: GameResult, t: TFunction<'game'>): string {
  if (result.reason === 'target_reached') {
    return t(`modes.${result.mode}.targetReached`);
  }
  if (result.reason === 'questions_exhausted') {
    return t('results.questionsExhausted');
  }
  return t('results.endedByTeacher');
}

export function getResultWonBy(result: GameResult, t: TFunction<'game'>): string {
  if (result.reason === 'target_reached') {
    return t(`modes.${result.mode}.wonBy`);
  }
  if (result.reason === 'questions_exhausted') {
    return t('results.ledAfterQuestions');
  }
  return t('results.ledWhenEnded');
}

export function useResultReasonLabel(result: GameResult): string {
  const { t } = useTranslation('game');
  return getResultReasonLabel(result, t);
}

export function useResultWonBy(result: GameResult): string {
  const { t } = useTranslation('game');
  return getResultWonBy(result, t);
}
