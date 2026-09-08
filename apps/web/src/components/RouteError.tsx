import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unexpected error';

  return (
    <div className="grid min-h-full place-items-center p-8">
      <div className="mtow-panel max-w-lg p-8 text-center">
        <h1 className="font-display text-2xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 text-ink-muted">{message}</p>
        <Link
          to="/"
          className="mtow-focus mt-6 inline-block rounded-chip bg-blueteam-600 px-6 py-2.5 font-bold text-white"
        >
          Back to start
        </Link>
      </div>
    </div>
  );
}
