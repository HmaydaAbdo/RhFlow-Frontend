// src/app/features/directions/directions.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { RoleName } from '../roles/models/role-name.enum';

export const DIRECTIONS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH] },
    loadComponent: () =>
      import('./pages/direction-list/direction-list.component').then(c => c.DirectionListComponent),
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH] },
    loadComponent: () =>
      import('./pages/direction-form/direction-form.component').then(c => c.DirectionFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH] },
    loadComponent: () =>
      import('./pages/direction-form/direction-form.component').then(c => c.DirectionFormComponent),
  },
];
