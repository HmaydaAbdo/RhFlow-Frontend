import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface OfferResponse {
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiOfferService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ai`;

  /**
   * Requests a Markdown-formatted LinkedIn offer for the given accepted besoin.
   * The backend validates that statut === ACCEPTE before calling the AI.
   */
  generateOffer(besoinId: number): Observable<OfferResponse> {
    return this.http.get<OfferResponse>(`${this.baseUrl}/generate-offer/${besoinId}`);
  }
}
