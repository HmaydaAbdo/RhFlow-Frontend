import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/pagination.models';
import { FichePosteRequest, FichePosteResponse, FichePosteSummaryResponse, FichePosteSearchRequest } from '../models/fiche-poste.models';

@Injectable({ providedIn: 'root' })
export class FichePosteService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/fiches-de-poste`;

  private readonly fichesSubject$ = new BehaviorSubject<PageResponse<FichePosteSummaryResponse> | null>(null);
  private readonly loadingSubject$ = new BehaviorSubject<boolean>(false);

  readonly fiches$ = this.fichesSubject$.asObservable();
  readonly loading$ = this.loadingSubject$.asObservable();

  loadFiches(request: FichePosteSearchRequest): void {
    this.loadingSubject$.next(true);

    let params = new HttpParams()
      .set('page', request.page)
      .set('size', request.size)
      .set('sortBy', request.sortBy)
      .set('direction', request.direction);

    if (request.intitulePoste) params = params.set('intitulePoste', request.intitulePoste);
    if (request.directionId != null) params = params.set('directionId', request.directionId);
    if (request.niveauEtudes) params = params.set('niveauEtudes', request.niveauEtudes);

    this.http.get<PageResponse<FichePosteSummaryResponse>>(this.baseUrl, { params }).pipe(
      tap(page => this.fichesSubject$.next(page)),
      finalize(() => this.loadingSubject$.next(false))
    ).subscribe();
  }

  getById(id: number): Observable<FichePosteResponse> {
    return this.http.get<FichePosteResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: FichePosteRequest): Observable<FichePosteResponse> {
    return this.http.post<FichePosteResponse>(this.baseUrl, request);
  }

  update(id: number, request: FichePosteRequest): Observable<FichePosteResponse> {
    return this.http.put<FichePosteResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** Returns all fiches as a flat list — useful for dropdowns in forms. */
  getAllForDropdown(): Observable<FichePosteSummaryResponse[]> {
    const params = new HttpParams()
      .set('page', 0)
      .set('size', 500)
      .set('sortBy', 'intitulePoste')
      .set('direction', 'asc');
    return this.http.get<PageResponse<FichePosteSummaryResponse>>(this.baseUrl, { params }).pipe(
      map(page => page.content)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
