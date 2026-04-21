import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import {TokenService} from "../services/TokenService";
import {AuthService} from "../services/AuthService";


let isRefreshing = false;
const refreshTokenSubject$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {

  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // skip auth endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  // attach token
  const token = tokenService.getAccessToken();
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        return handleTokenRefresh(authReq, next, authService, tokenService);
      }
      return throwError(() => error);
    })
  );
};

function handleTokenRefresh(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  tokenService: TokenService
): Observable<HttpEvent<any>> {

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject$.next(null);

    return authService.refreshToken().pipe(
      switchMap(response => {
        isRefreshing = false;
        refreshTokenSubject$.next(response.accessToken);

        // retry original request with new token
        const retryReq = req.clone({
          setHeaders: { Authorization: `Bearer ${response.accessToken}` }
        });
        return next(retryReq);
      }),
      catchError(err => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  // queue other requests while refreshing
  return refreshTokenSubject$.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => {
      const retryReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(retryReq);
    })
  );
}
