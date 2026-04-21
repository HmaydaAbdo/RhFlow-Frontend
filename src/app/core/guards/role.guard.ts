import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import {TokenService} from "../services/TokenService";

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (tokenService.hasAnyRole(requiredRoles)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
