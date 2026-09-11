import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const ROLES = [
  { to: '/host', key: 'teacher', accent: 'bg-blueteam-600' },
  { to: '/arena', key: 'classroom', accent: 'bg-rope' },
  { to: '/play', key: 'student', accent: 'bg-redteam-600' },
] as const;

export function LandingRoute() {
  const { t } = useTranslation('common');

  return (
    <div className="grid min-h-full place-items-center p-6">
      <main className="w-full max-w-3xl">
        <header className="text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            <Trans
              i18nKey="landing.title"
              components={{ 1: <span className="text-blueteam-600" /> }}
            />
          </h1>
          <p className="mt-3 text-ink-muted">{t('landing.subtitle')}</p>
        </header>

        <nav className="mt-8 grid gap-4 sm:grid-cols-3">
          {ROLES.map((role) => (
            <Link
              key={role.to}
              to={role.to}
              className="bt-panel bt-focus group flex flex-col p-5 transition-transform hover:-translate-y-0.5"
            >
              <span className={`h-2 w-10 rounded-chip ${role.accent}`} />
              <span className="mt-4 font-display text-xl font-extrabold">
                {t(`landing.${role.key}.title`)}
              </span>
              <span className="mt-1 text-sm text-ink-muted">{t(`landing.${role.key}.blurb`)}</span>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
