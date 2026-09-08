import { createBrowserRouter } from 'react-router-dom';
import { LandingRoute } from './features/landing/LandingRoute';
import { RouteError } from './components/RouteError';

/**
 * Each role is a separate lazily-loaded route so a phone never downloads the
 * 16:9 classroom bundle and the classroom display never downloads the host UI.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingRoute />,
    errorElement: <RouteError />,
  },
  {
    path: '/host',
    lazy: () => import('./features/host/HostRoute'),
    errorElement: <RouteError />,
  },
  {
    path: '/arena/:roomCode?',
    lazy: () => import('./features/arena/ArenaRoute'),
    errorElement: <RouteError />,
  },
  {
    path: '/play/:roomCode?',
    lazy: () => import('./features/student/StudentRoute'),
    errorElement: <RouteError />,
  },
]);
