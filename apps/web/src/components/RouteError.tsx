import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function RouteError() {
  const { t } = useTranslation('common');
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : t('routeError.unexpected');

  return (
    <div className="grid min-h-full place-items-center p-8">
      <div className="bt-panel max-w-lg p-8 text-center">
        <h1 className="font-display text-2xl font-extrabold">{t('routeError.title')}</h1>
        <p className="mt-2 text-ink-muted">{message}</p>
        <Link
          to="/"
          className="bt-focus mt-6 inline-block rounded-chip bg-blueteam-600 px-6 py-2.5 font-bold text-white"
        >
          {t('routeError.back')}
        </Link>
      </div>
    </div>
  );
}
