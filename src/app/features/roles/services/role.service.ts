import {inject, Injectable} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/pagination.models';
import { RoleResponse, RoleRequest, RoleSearchRequest } from '../models/role.models';

@Injectable({ providedIn: 'root' })
export class RoleService {

  private baseUrl = `${environment.apiUrl}/roles`;
  private  http=inject(HttpClient)

  private rolesSubject$ = new BehaviorSubject<PageResponse<RoleResponse> | null>(null);
  private loadingSubject$ = new BehaviorSubject<boolean>(false);

  roles$ = this.rolesSubject$.asObservable();
  loading$ = this.loadingSubject$.asObservable();


  loadRoles(request: RoleSearchRequest): void {
    this.loadingSubject$.next(true);

    let params = new HttpParams()
      .set('page', request.page)
      .set('size', request.size)
      .set('sortBy', request.sortBy)
      .set('direction', request.direction);

    if (request.keyword) {
      params = params.set('keyword', request.keyword);
    }

    this.http.get<PageResponse<RoleResponse>>(this.baseUrl, { params }).pipe(
      tap(page => this.rolesSubject$.next(page)),
      finalize(() => this.loadingSubject$.next(false))
    ).subscribe();
  }

  getRoleById(id: number): Observable<RoleResponse> {
    return this.http.get<RoleResponse>(`${this.baseUrl}/${id}`);
  }

  createRole(request: RoleRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(this.baseUrl, request);
  }

  updateRole(id: number, request: RoleRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
