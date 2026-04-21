import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/pagination.models';
import {
  BesoinRecrutementRequest,
  BesoinRecrutementResponse,
  BesoinRecrutementSearchDto,
  BesoinRecrutementSummaryResponse,
  BesoinStatsResponse,
  DecisionBesoinRequest
} from '../models/besoin-recrutement.models';

@Injectable({ providedIn: 'root' })
export class BesoinRecrutementService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/besoins-recrutement`;

  // ── List state (shared observable for list components) ──────────────────
  private readonly besoinsSubject$ = new BehaviorSubject<PageResponse<BesoinRecrutementSummaryResponse> | null>(null);
  private readonly loadingSubject$ = new BehaviorSubject<boolean>(false);

  readonly besoins$  = this.besoinsSubject$.asObservable();
  readonly loading$  = this.loadingSubject$.asObservable();

  // ── Queries ─────────────────────────────────────────────────────────────

  loadBesoins(request: BesoinRecrutementSearchDto): void {
    this.loadingSubject$.next(true);

    let params = new HttpParams()
      .set('page',      request.page)
      .set('size',      request.size)
      .set('sortBy',    request.sortBy)
      .set('direction', request.direction);

    if (request.directionId    != null) params = params.set('directionId',    request.directionId);
    if (request.ficheDePosteId != null) params = params.set('ficheDePosteId', request.ficheDePosteId);
    if (request.statut)                 params = params.set('statut',         request.statut);
    if (request.priorite)               params = params.set('priorite',       request.priorite);
    if (request.mineOnly)               params = params.set('mineOnly',       'true');

    this.http
      .get<PageResponse<BesoinRecrutementSummaryResponse>>(this.baseUrl, { params })
      .pipe(
        tap(page => this.besoinsSubject$.next(page)),
        finalize(() => this.loadingSubject$.next(false))
      )
      .subscribe();
  }

  getById(id: number): Observable<BesoinRecrutementResponse> {
    return this.http.get<BesoinRecrutementResponse>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<BesoinStatsResponse> {
    return this.http.get<BesoinStatsResponse>(`${this.baseUrl}/stats`);
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  create(request: BesoinRecrutementRequest): Observable<BesoinRecrutementResponse> {
    return this.http.post<BesoinRecrutementResponse>(this.baseUrl, request);
  }

  update(id: number, request: BesoinRecrutementRequest): Observable<BesoinRecrutementResponse> {
    return this.http.put<BesoinRecrutementResponse>(`${this.baseUrl}/${id}`, request);
  }

  decision(id: number, request: DecisionBesoinRequest): Observable<BesoinRecrutementResponse> {
    return this.http.patch<BesoinRecrutementResponse>(`${this.baseUrl}/${id}/decision`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
