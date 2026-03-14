import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { DashboardPage } from '../routes/Dashboard';
import { SetupPage } from '../../features/setup/routes/Setup';

// Root route with layout
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Index route (/)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

// Setup route (/setup)
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupPage,
});

// Calibrate route (/calibrate) - reuses SetupPage
const calibrateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calibrate',
  component: SetupPage,
});

// Activity detail route (/activity/:id) - lazy loaded
const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity/$id',
  component: () => import('../../features/activity/routes/ActivityDetail').then(m => m.ActivityDetailPage),
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  setupRoute,
  calibrateRoute,
  activityRoute,
]);

export const router = createRouter({ routeTree });

// Type declarations for TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
