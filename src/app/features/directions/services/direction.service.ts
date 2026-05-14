// src/app/features/directions/services/direction.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/pagination.models';
import { DirectionRequest, DirectionResponse, DirectionSearchRequest } from '../models/direction.models';

@Injectable({ providedIn: 'root' })
export class DirectionService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/directions`;

  private readonly directionsSubject$ = new BehaviorSubject<PageResponse<DirectionResponse> | null>(null);
  private readonly loadingSubject$ = new BehaviorSubject<boolean>(false);

  readonly directions$ = this.directionsSubject$.asObservable();
  readonly loading$ = this.loadingSubject$.asObservable();

  loadDirections(request: DirectionSearchRequest): void {
    this.loadingSubject$.next(true);

    let params = new HttpParams()
      .set('page', request.page)
      .set('size', request.size)
      .set('sortBy', request.sortBy)
      .set('direction', request.direction);

    if (request.nom) params = params.set('nom', request.nom);
    if (request.directeurId) params = params.set('directeurId', request.directeurId);


    this.http.get<PageResponse<DirectionResponse>>(this.baseUrl, { params })
      .pipe(
      tap(page => this.directionsSubject$.next(page)),
      finalize(() => this.loadingSubject$.next(false))
    ).subscribe();
  }

  loadDirectionsPage(request: DirectionSearchRequest): Observable<PageResponse<DirectionResponse>> {
    let params = new HttpParams()
      .set('page', request.page)
      .set('size', request.size)
      .set('sortBy', request.sortBy)
      .set('direction', request.direction);

    if (request.nom) params = params.set('nom', request.nom);
    if (request.directeurId) params = params.set('directeurId', request.directeurId);


    return this.http.get<PageResponse<DirectionResponse>>(this.baseUrl, { params });
  }

  /** Directions gérées par le directeur connecté (rôle DIRECTEUR). */
  getMine(): Observable<DirectionResponse[]> {
    return this.http.get<DirectionResponse[]>(`${this.baseUrl}/mine`);
  }

  getById(id: number): Observable<DirectionResponse> {
    return this.http.get<DirectionResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: DirectionRequest): Observable<DirectionResponse> {
    return this.http.post<DirectionResponse>(this.baseUrl, request);
  }

  update(id: number, request: DirectionRequest): Observable<DirectionResponse> {
    return this.http.put<DirectionResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
