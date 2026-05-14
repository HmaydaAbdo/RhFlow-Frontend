/**
 * Noms des rôles système — miroir exact des rôles seedés côté backend
 * (voir com.hrflow.seeders.DataSeeder).
 *
 * Utiliser ce `const` plutôt que des chaînes littérales dans les templates,
 * les guards, les `@PreAuthorize` côté front (route data.roles) et la logique métier.
 *
 * @example
 *   import { RoleName } from './features/roles/models/role-name.enum';
 *   data: { roles: [RoleName.ADMIN, RoleName.DRH] }
 */
export const RoleName = {
  ADMIN:     'ADMIN',
  DRH:       'DRH',
  DIRECTEUR: 'DIRECTEUR',
  DG:        'DG',
} as const;

export type RoleName = typeof RoleName[keyof typeof RoleName];



/**
 * Libellés français lisibles pour l'affichage.
 * Aligné avec les descriptions seedées côté backend.
 */
export const ROLE_NAME_LABELS: Record<RoleName, string> = {
  [RoleName.ADMIN]:     'Administrateur',
  [RoleName.DRH]:       'DRH',
  [RoleName.DIRECTEUR]: 'Directeur',
  [RoleName.DG]:        'Directeur Général',
};
