// src/app/features/fiches-poste/fiches-poste.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { RoleName } from '../roles/models/role-name.enum';

export const FICHES_POSTE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/fiche-poste-list/fiche-poste-list.component').then(c => c.FichePosteListComponent),
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/fiche-poste-form/fiche-poste-form.component').then(c => c.FichePosteFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/fiche-poste-form/fiche-poste-form.component').then(c => c.FichePosteFormComponent),
  },
];
