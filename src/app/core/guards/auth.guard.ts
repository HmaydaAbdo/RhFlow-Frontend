import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import {TokenService} from "../services/TokenService";

export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.isLoggedIn() && !tokenService.isTokenExpired()) {
    return true;
  }

  tokenService.clearTokens();
  return router.createUrlTree(['/landing']);
};
