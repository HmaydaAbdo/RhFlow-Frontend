import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/pagination.models';
import {
  UserResponse,
  CreateUserRequest,
  UserSearchRequest, UpdateUserRequest
} from '../models/user.models';
import { RoleName } from '../../roles/models/role-name.enum';

export interface DirectorPageRequest {
  page: number;
  size: number;
  keyword?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {

  private baseUrl = `${environment.apiUrl}/users`;

  private usersSubject$ = new BehaviorSubject<PageResponse<UserResponse> | null>(null);
  private loadingSubject$ = new BehaviorSubject<boolean>(false);

  users$ = this.usersSubject$.asObservable();
  loading$ = this.loadingSubject$.asObservable();

  constructor(private http: HttpClient) {}

  loadUsers(request: UserSearchRequest): void {
    this.loadingSubject$.next(true);

    let params = new HttpParams()
      .set('page', request.page)
      .set('size', request.size)
      .set('sortBy', request.sortBy)
      .set('direction', request.direction);

    if (request.keyword) params = params.set('keyword', request.keyword);
    if (request.enabled !== undefined && request.enabled !== null) params = params.set('enabled', request.enabled);
    if (request.role) params = params.set('role', request.role);

    this.http.get<PageResponse<UserResponse>>(this.baseUrl, { params }).pipe(
      tap(page => this.usersSubject$.next(page)),
      finalize(() => this.loadingSubject$.next(false))
    ).subscribe();
  }

  /** Paginated directors list — used for lazy-scroll dropdown */
  getDirectorsPage(req: DirectorPageRequest): Observable<PageResponse<UserResponse>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('size', req.size)
      .set('sortBy', 'fullName')
      .set('direction', 'asc')
      .set('role', RoleName.DIRECTEUR);
    if (req.keyword) params = params.set('keyword', req.keyword);
    return this.http.get<PageResponse<UserResponse>>(this.baseUrl, { params });
  }

  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  createUser(request: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.baseUrl, request);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  setEnabled(id: number, enabled: boolean): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}/enabled`, null, {
      params: new HttpParams().set('enabled', enabled)
    });
  }

  addRole(userId: number, roleId: number): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/${userId}/roles/${roleId}`, null);
  }

  removeRole(userId: number, roleId: number): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.baseUrl}/${userId}/roles/${roleId}`);
  }
}
