import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/pagination.models';
import {
  ProjetRecrutementResponse,
  ProjetRecrutementSearchDto,
  ProjetRecrutementSummaryResponse,
  UpdateObjetCandidatureRequest
} from '../models/projet-recrutement.models';

@Injectable({ providedIn: 'root' })
export class ProjetRecrutementService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projets-recrutement`;

  // ── List state ──────────────────────────────────────────────────────────
  private readonly projetsSubject$ = new BehaviorSubject<PageResponse<ProjetRecrutementSummaryResponse> | null>(null);
  private readonly loadingSubject$ = new BehaviorSubject<boolean>(false);

  readonly projets$  = this.projetsSubject$.asObservable();
  readonly loading$  = this.loadingSubject$.asObservable();

  // ── Queries ─────────────────────────────────────────────────────────────

  loadProjets(request: ProjetRecrutementSearchDto): void {
    this.loadingSubject$.next(true);

    let params = new HttpParams()
      .set('page',      request.page)
      .set('size',      request.size)
      .set('sortBy',    request.sortBy)
      .set('direction', request.direction);

    if (request.directionId    != null) params = params.set('directionId',    request.directionId);
    if (request.ficheDePosteId != null) params = params.set('ficheDePosteId', request.ficheDePosteId);
    if (request.statut)                 params = params.set('statut',         request.statut);

    this.http
      .get<PageResponse<ProjetRecrutementSummaryResponse>>(this.baseUrl, { params })
      .pipe(
        tap(page => this.projetsSubject$.next(page)),
        finalize(() => this.loadingSubject$.next(false))
      )
      .subscribe();
  }

  getById(id: number): Observable<ProjetRecrutementResponse> {
    return this.http.get<ProjetRecrutementResponse>(`${this.baseUrl}/${id}`);
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  fermer(id: number): Observable<ProjetRecrutementResponse> {
    return this.http.patch<ProjetRecrutementResponse>(`${this.baseUrl}/${id}/fermer`, {});
  }

  updateObjetCandidature(id: number, request: UpdateObjetCandidatureRequest): Observable<ProjetRecrutementResponse> {
    return this.http.patch<ProjetRecrutementResponse>(`${this.baseUrl}/${id}/objet-candidature`, request);
  }
}
