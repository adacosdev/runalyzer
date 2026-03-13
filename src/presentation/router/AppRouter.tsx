/**
 * Router - Runalyzer
 */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardPage } from '../pages/Dashboard';
import { SetupPage } from '../pages/Setup';
import { ActivityDetailPage } from '../pages/ActivityDetail';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    path: '/calibrate',
    element: <SetupPage />,
  },
  {
    path: '/activity/:id',
    element: <ActivityDetailPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
