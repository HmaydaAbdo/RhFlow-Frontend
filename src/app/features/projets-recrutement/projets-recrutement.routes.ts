import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { RoleName } from '../roles/models/role-name.enum';

export const PROJETS_RECRUTEMENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('./pages/projet-list/projet-list.component')
        .then(c => c.ProjetListComponent),
  },
  {
    path: ':projetId/offre',
    canActivate: [roleGuard],
    data: { roles: [RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR] },
    loadComponent: () =>
      import('../offres/pages/offre-view/offre-view.component')
        .then(c => c.OffreViewComponent),
  },
];
