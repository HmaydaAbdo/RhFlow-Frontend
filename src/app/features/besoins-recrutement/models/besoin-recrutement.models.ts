import { PageRequest } from '../../../core/models/pagination.models';

// ── Enums ──────────────────────────────────────────────────────────────────

export enum StatutBesoin {
  EN_COURS = 'EN_COURS',
  ACCEPTE  = 'ACCEPTE',
  REFUSE   = 'REFUSE',
  ARCHIVE  = 'ARCHIVE'
}

export enum PrioriteBesoin {
  HAUTE = 'HAUTE',
  NORMALE = 'NORMALE',
  BASSE = 'BASSE'
}

/** Sous-ensemble de StatutBesoin utilisable comme décision DRH (accepter / refuser). */
export type DecisionStatut = StatutBesoin.ACCEPTE | StatutBesoin.REFUSE;
export const STATUT_BESOIN_OPTIONS: { label: string; value: StatutBesoin }[] = [
  { label: 'En cours',  value: StatutBesoin.EN_COURS },
  { label: 'Accepté',   value: StatutBesoin.ACCEPTE  },
  { label: 'Refusé',    value: StatutBesoin.REFUSE   },
  { label: 'Archivé',   value: StatutBesoin.ARCHIVE  }
];

export const PRIORITE_BESOIN_OPTIONS: { label: string; value: PrioriteBesoin }[] = [
  { label: 'Haute',    value: PrioriteBesoin.HAUTE   },
  { label: 'Normale',  value: PrioriteBesoin.NORMALE },
  { label: 'Basse',    value: PrioriteBesoin.BASSE   }
];

// ── Embedded references ────────────────────────────────────────────────────

export interface DirectionBrief {
  id: number;
  nom: string;
}

export interface FichePosteBrief {
  id: number;
  intitulePoste: string;
  direction: DirectionBrief;
}

export interface UserBrief {
  id: number;
  fullName: string;
  email: string;
}

// ── Response DTOs ──────────────────────────────────────────────────────────

export interface BesoinRecrutementResponse {
  id: number;
  ficheDePosteId: number;
  ficheDePosteIntitule: string;
  directionId: number;
  directionNom: string;
  directeurId: number;
  directeurNom: string;
  nombrePostes: number;
  dateSouhaitee: string;          // ISO date string
  justification: string;
  priorite: PrioriteBesoin;
  statut: StatutBesoin;
  motifRefus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BesoinRecrutementSummaryResponse {
  id: number;
  ficheDePosteIntitule: string;
  directionNom: string;
  directeurNom: string;
  nombrePostes: number;
  dateSouhaitee: string;
  priorite: PrioriteBesoin;
  statut: StatutBesoin;
  motifRefus: string | null;
  createdAt: string;
}

// ── Request DTOs ───────────────────────────────────────────────────────────

export interface BesoinRecrutementRequest {
  ficheDePosteId: number;
  nombrePostes: number;
  dateSouhaitee: string;          // ISO date string yyyy-MM-dd
  justification: string;
  priorite: PrioriteBesoin;
}

export interface DecisionBesoinRequest {
  statut: DecisionStatut;
  motifRefus?: string;
}

// ── Search / filter ────────────────────────────────────────────────────────

export interface BesoinRecrutementSearchDto extends PageRequest {
  directionId?: number;
  ficheDePosteId?: number;
  statut?: StatutBesoin;
  priorite?: PrioriteBesoin;
  mineOnly?: boolean;
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface StatParDirection {
  directionNom: string;
  total: number;
}

export interface StatParPriorite {
  priorite: PrioriteBesoin;
  total: number;
}

export interface BesoinStatsResponse {
  total: number;
  enCours: number;
  acceptes: number;
  refuses: number;
  parDirection: StatParDirection[];
  parPriorite: StatParPriorite[];
}

// ── UI helpers ─────────────────────────────────────────────────────────────

export function statutLabel(s: StatutBesoin): string {
  return STATUT_BESOIN_OPTIONS.find(o => o.value === s)?.label ?? s;
}

export function prioriteLabel(p: PrioriteBesoin): string {
  return PRIORITE_BESOIN_OPTIONS.find(o => o.value === p)?.label ?? p;
}

export function statutSeverity(s: StatutBesoin): 'info' | 'success' | 'danger' | 'secondary' {
  switch (s) {
    case StatutBesoin.EN_COURS: return 'info';
    case StatutBesoin.ACCEPTE:  return 'success';
    case StatutBesoin.REFUSE:   return 'danger';
    case StatutBesoin.ARCHIVE:  return 'secondary';
  }
}

export function prioriteSeverity(p: PrioriteBesoin): 'danger' | 'warning' | 'success' {
  switch (p) {
    case PrioriteBesoin.HAUTE:   return 'danger';
    case PrioriteBesoin.NORMALE: return 'warning';
    case PrioriteBesoin.BASSE:   return 'success';
  }
}