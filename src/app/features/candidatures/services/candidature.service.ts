import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/pagination.models';
import {
  CandidatureResponse,
  CandidatureSearchDto,
  StatutUpdateRequest,
} from '../models/candidature.models';

@Injectable({ providedIn: 'root' })
export class CandidatureService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/candidatures`;

  // ── List state ──────────────────────────────────────────────────────────
  private readonly candidaturesSubject$ =
    new BehaviorSubject<PageResponse<CandidatureResponse> | null>(null);
  private readonly loadingSubject$ = new BehaviorSubject<boolean>(false);

  readonly candidatures$ = this.candidaturesSubject$.asObservable();
  readonly loading$      = this.loadingSubject$.asObservable();

  // ── Queries ─────────────────────────────────────────────────────────────

  /**
   * Charge la liste paginée des candidatures pour un projet.
   * Émet via candidatures$ — le composant gère le polling si EN_COURS détecté.
   */
  loadCandidatures(
    projetId: number,
    search: CandidatureSearchDto,
    page = 0,
    size = 20,
  ): void {
    this.loadingSubject$.next(true);

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (search.statut)         params = params.set('statut',         search.statut);
    if (search.recommandation) params = params.set('recommandation', search.recommandation);
    if (search.scoreMin != null) params = params.set('scoreMin',     search.scoreMin);

    this.http
      .get<PageResponse<CandidatureResponse>>(`${this.baseUrl}/projets/${projetId}`, { params })
      .pipe(
        tap(page => this.candidaturesSubject$.next(page)),
        finalize(() => this.loadingSubject$.next(false)),
      )
      .subscribe();
  }

  /**
   * Reload silencieux (pas de loading spinner) — utilisé par le polling.
   */

  getById(id: number): Observable<CandidatureResponse> {
    return this.http.get<CandidatureResponse>(`${this.baseUrl}/${id}`);
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  upload(projetId: number, file: File): Observable<CandidatureResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CandidatureResponse>(`${this.baseUrl}/projets/${projetId}`, formData);
  }

  changerStatut(id: number, request: StatutUpdateRequest): Observable<CandidatureResponse> {
    return this.http.patch<CandidatureResponse>(`${this.baseUrl}/${id}/statut`, request);
  }

  reevaluer(id: number): Observable<CandidatureResponse> {
    return this.http.post<CandidatureResponse>(`${this.baseUrl}/${id}/reevaluer`, {});
  }

  getCvUrl(id: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/${id}/cv`);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /** Remet le state à zéro à la destruction de la page. */
  reset(): void {
    this.candidaturesSubject$.next(null);
  }
}
