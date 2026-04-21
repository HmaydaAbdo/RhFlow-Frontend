import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.models';
import { TokenService } from './TokenService';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = `${environment.apiUrl}/auth`;

  private loggedInSubject$ = new BehaviorSubject<boolean>(this.tokenService.isLoggedIn());
  private emailSubject$ = new BehaviorSubject<string | null>(this.tokenService.getEmail());
  private fullNameSubject$ = new BehaviorSubject<string | null>(this.tokenService.getFullName());
  private rolesSubject$ = new BehaviorSubject<string[]>(this.tokenService.getRoles());

  isLoggedIn$ = this.loggedInSubject$.asObservable();
  email$ = this.emailSubject$.asObservable();
  fullName$ = this.fullNameSubject$.asObservable();
  roles$ = this.rolesSubject$.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenService: TokenService
  ) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, request).pipe(
      tap(response => {
        this.tokenService.setTokens(response.accessToken, response.refreshToken);
        this.tokenService.setFullName(response.fullName);
        this.loggedInSubject$.next(true);
        this.emailSubject$.next(response.email);
        this.fullNameSubject$.next(response.fullName);
        this.rolesSubject$.next(response.roles);
      })
    );
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.tokenService.getRefreshToken();
    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        this.tokenService.setTokens(response.accessToken, response.refreshToken);
        this.tokenService.setFullName(response.fullName);
        this.emailSubject$.next(response.email);
        this.fullNameSubject$.next(response.fullName);
        this.rolesSubject$.next(response.roles);
      })
    );
  }

  logout(): void {
    this.tokenService.clearTokens();
    this.loggedInSubject$.next(false);
    this.emailSubject$.next(null);
    this.fullNameSubject$.next(null);
    this.rolesSubject$.next([]);
    this.router.navigate(['/landing']);
  }

  hasRole(role: string): boolean {
    return this.tokenService.hasRole(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.tokenService.hasAnyRole(roles);
  }
}
