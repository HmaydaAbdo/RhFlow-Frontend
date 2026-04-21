import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { RoleName } from '../roles/models/role-name.enum';

export const BESOINS_RECRUTEMENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/directeur/besoin-my-needs/besoin-my-needs.component')
        .then(c => c.BesoinMyNeedsComponent),
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/directeur/besoin-form/besoin-form-directeur.component')
        .then(c => c.BesoinFormDirecteurComponent),
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/directeur/besoin-form/besoin-form-directeur.component')
        .then(c => c.BesoinFormDirecteurComponent),
  },
  {
    path: 'validation',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH] },
    loadComponent: () =>
      import('./pages/drh/besoin-list/besoin-list.component')
        .then(c => c.BesoinListComponent),
  },
];
