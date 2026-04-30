import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OffreResponse, OffreUpdateRequest } from '../models/offre.models';

@Injectable({ providedIn: 'root' })
export class OffreService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/offres`;

  /**
   * Génère (ou régénère) l'offre IA pour un projet OUVERT.
   * POST /offres/projets/{projetId}/generer
   */
  generer(projetId: number): Observable<OffreResponse> {
    return this.http.post<OffreResponse>(
      `${this.baseUrl}/projets/${projetId}/generer`,
      {}
    );
  }

  /**
   * Récupère l'offre existante d'un projet.
   * GET /offres/projets/{projetId}
   */
  getByProjetId(projetId: number): Observable<OffreResponse> {
    return this.http.get<OffreResponse>(`${this.baseUrl}/projets/${projetId}`);
  }

  /**
   * Édition manuelle du contenu Markdown.
   * PUT /offres/projets/{projetId}
   */
  update(projetId: number, request: OffreUpdateRequest): Observable<OffreResponse> {
    return this.http.put<OffreResponse>(`${this.baseUrl}/projets/${projetId}`, request);
  }
}
