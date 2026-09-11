import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { RejectionReason } from '@braintug/shared';

export function useRejectionLabel() {
  const { t } = useTranslation('errors');
  return useCallback((reason: RejectionReason) => t(`rejection.${reason}`), [t]);
}
