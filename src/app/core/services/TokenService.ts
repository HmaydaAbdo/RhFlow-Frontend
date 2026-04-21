import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const FULL_NAME_KEY = 'fullName';

@Injectable({ providedIn: 'root' })
export class TokenService {

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setFullName(fullName: string): void {
    localStorage.setItem(FULL_NAME_KEY, fullName);
  }

  getFullName(): string | null {
    return localStorage.getItem(FULL_NAME_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(FULL_NAME_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  /** Email is stored as the JWT subject */
  getEmail(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    const decoded = this.decodeToken(token);
    return decoded?.sub ?? null;
  }

  getRoles(): string[] {
    const token = this.getAccessToken();
    if (!token) return [];
    const decoded = this.decodeToken(token);
    const roles = decoded?.roles ?? '';
    return roles ? roles.split(' ') : [];
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some(role => userRoles.includes(role));
  }
}
