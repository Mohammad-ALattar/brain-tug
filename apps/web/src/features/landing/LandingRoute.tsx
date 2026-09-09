import { Link } from 'react-router-dom';

const ROLES = [
  {
    to: '/host',
    title: 'Teacher',
    blurb: 'Create a match, balance the teams and run the game.',
    accent: 'bg-blueteam-600',
  },
  {
    to: '/arena',
    title: 'Classroom display',
    blurb: 'The 16:9 tug-of-war arena for the projector or TV.',
    accent: 'bg-rope',
  },
  {
    to: '/play',
    title: 'Student',
    blurb: 'Join with a room code and answer on your phone.',
    accent: 'bg-redteam-600',
  },
] as const;

export function LandingRoute() {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <main className="w-full max-w-3xl">
        <header className="text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Math <span className="text-blueteam-600">Tug</span> of{' '}
            <span className="text-redteam-600">War</span>
          </h1>
          <p className="mt-3 text-ink-muted">Pick how you are joining this match.</p>
        </header>

        <nav className="mt-8 grid gap-4 sm:grid-cols-3">
          {ROLES.map((role) => (
            <Link
              key={role.to}
              to={role.to}
              className="bt-panel bt-focus group flex flex-col p-5 transition-transform hover:-translate-y-0.5"
            >
              <span className={`h-2 w-10 rounded-chip ${role.accent}`} />
              <span className="mt-4 font-display text-xl font-extrabold">{role.title}</span>
              <span className="mt-1 text-sm text-ink-muted">{role.blurb}</span>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
