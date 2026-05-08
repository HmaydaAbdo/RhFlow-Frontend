import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { RoleName } from '../roles/models/role-name.enum';

export const CANDIDATURES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/candidature-list/candidature-list.component')
        .then(c => c.CandidatureListComponent),
  },
  {
    path: ':candidatureId',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/candidature-detail/candidature-detail.component')
        .then(c => c.CandidatureDetailComponent),
  },
];
