import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const APP_ROUTES: Routes = [

  // ── Public: Landing page (entry point for unauthenticated users)
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/landing.component').then(c => c.LandingComponent)
  },

  // ── Public: Auth (login at /auth/login)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(r => r.AUTH_ROUTES)
  },

  // ── Protected: App shell
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(c => c.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(r => r.DASHBOARD_ROUTES)
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then(r => r.USERS_ROUTES)
      },
      {
        path: 'roles',
        loadChildren: () => import('./features/roles/roles.routes').then(r => r.ROLES_ROUTES)
      },
      {
        path: 'directions',
        loadChildren: () => import('./features/directions/directions.routes').then(r => r.DIRECTIONS_ROUTES)
      },
      {
        path: 'fiches-de-poste',
        loadChildren: () => import('./features/fiches-poste/fiches-poste.routes').then(r => r.FICHES_POSTE_ROUTES)
      },
      {
        path: 'besoins-recrutement',
        loadChildren: () =>
          import('./features/besoins-recrutement/besoins-recrutement.routes')
            .then(r => r.BESOINS_RECRUTEMENT_ROUTES)
      },
      {
        path: 'projets-recrutement',
        loadChildren: () =>
          import('./features/projets-recrutement/projets-recrutement.routes')
            .then(r => r.PROJETS_RECRUTEMENT_ROUTES)
      }
    ]
  },

  // ── Fallback: unknown routes → landing
  { path: '**', redirectTo: 'landing' }
];
