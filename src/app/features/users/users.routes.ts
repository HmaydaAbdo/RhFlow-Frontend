import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { RoleName } from '../roles/models/role-name.enum';

/**
 * Users — gestion réservée à l'ADMIN (matche le @PreAuthorize backend).
 * DRH peut accéder en lecture (listing + fiche édition limitée en lecture).
 */
export const USERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH] },
    loadComponent: () =>
      import('./pages/user-list/user-list.component').then(c => c.UserListComponent),
  },
  {
    path: 'new',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN,RoleName.DRH] },
    loadComponent: () =>
      import('./pages/user-edit/user-edit.component').then(c => c.UserEditComponent),
  },
  {
    path: ':id',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH] },
    loadComponent: () =>
      import('./pages/user-edit/user-edit.component').then(c => c.UserEditComponent),
  },
];
