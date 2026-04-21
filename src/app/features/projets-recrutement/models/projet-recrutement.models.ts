import { PageRequest } from '../../../core/models/pagination.models';

// ── Enums ──────────────────────────────────────────────────────────────────

export enum StatutProjet {
  OUVERT = 'OUVERT',
  FERME  = 'FERME'
}

export const STATUT_PROJET_OPTIONS: { label: string; value: StatutProjet }[] = [
  { label: 'Ouvert', value: StatutProjet.OUVERT },
  { label: 'Fermé',  value: StatutProjet.FERME  }
];

// ── Response DTOs ──────────────────────────────────────────────────────────

export interface ProjetRecrutementResponse {
  id:                   number;
  statut:               StatutProjet;
  nombrePostes:         number;
  ficheDePosteId:       number;
  ficheDePosteIntitule: string;
  directionId:          number;
  directionNom:         string;
  directeurNom:         string;
  besoinRecrutementId:  number;
  createdAt:            string;
  updatedAt:            string;
  closedAt:             string | null;
}

export interface ProjetRecrutementSummaryResponse {
  id:                   number;
  statut:               StatutProjet;
  nombrePostes:         number;
  ficheDePosteIntitule: string;
  directionNom:         string;
  directeurNom:         string;
  createdAt:            string;
  closedAt:             string | null;
}

// ── Search / filter ────────────────────────────────────────────────────────

export interface ProjetRecrutementSearchDto extends PageRequest {
  directionId?:    number;
  ficheDePosteId?: number;
  statut?:         StatutProjet;
}

// ── UI helpers ─────────────────────────────────────────────────────────────

export function statutProjetLabel(s: StatutProjet): string {
  return STATUT_PROJET_OPTIONS.find(o => o.value === s)?.label ?? s;
}

export function statutProjetSeverity(s: StatutProjet): 'success' | 'secondary' {
  switch (s) {
    case StatutProjet.OUVERT: return 'success';
    case StatutProjet.FERME:  return 'secondary';
  }
}
