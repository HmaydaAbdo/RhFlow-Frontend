import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { RoleName } from './models/role-name.enum';


export const ROLES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN,RoleName.DRH] },
    loadComponent: () =>
      import('./pages/role-list/role-list.component').then(c => c.RoleListComponent),
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN,RoleName.DRH] },
    loadComponent: () =>
      import('./pages/role-edit/role-edit.component').then(c => c.RoleEditComponent),
  },
  {
    path: ':id',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN,RoleName.DRH] },
    loadComponent: () =>
      import('./pages/role-edit/role-edit.component').then(c => c.RoleEditComponent),
  },
];
