export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ProfileResponse {
  email: string;
  fullName: string;
  gsm: string;
  roles: string[];
}
