import { PageRequest } from '../../../core/models/pagination.models';

// ── Enums ──────────────────────────────────────────────────────────────────

/**
 * Décision DRH sur un besoin de recrutement.
 * Uniquement valorisé quand encours=false.
 */
export enum StatutBesoin {
  ACCEPTE = 'ACCEPTE',
  REFUSE  = 'REFUSE'
}

export enum PrioriteBesoin {
  HAUTE   = 'HAUTE',
  NORMALE = 'NORMALE',
  BASSE   = 'BASSE'
}

/** Sous-ensemble de StatutBesoin utilisable comme décision DRH. */
export type DecisionStatut = StatutBesoin.ACCEPTE | StatutBesoin.REFUSE;

export const STATUT_BESOIN_OPTIONS: { label: string; value: StatutBesoin }[] = [
  { label: 'Accepté', value: StatutBesoin.ACCEPTE },
  { label: 'Refusé',  value: StatutBesoin.REFUSE  }
];

export const PRIORITE_BESOIN_OPTIONS: { label: string; value: PrioriteBesoin }[] = [
  { label: 'Haute',   value: PrioriteBesoin.HAUTE   },
  { label: 'Normale', value: PrioriteBesoin.NORMALE },
  { label: 'Basse',   value: PrioriteBesoin.BASSE   }
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
  /** Utilisateur authentifié qui a exprimé le besoin */
  createdById: number;
  createdByNom: string;
  lieuAffectation: string;
  motif: string;
  nombrePostes: number;
  dateSouhaitee: string;
  priorite: PrioriteBesoin;
  /** true = en attente de décision, false = décision prise */
  encours: boolean;
  /** null si encours=true (aucune décision encore prise) */
  statut: StatutBesoin | null;
  createdAt: string;
  updatedAt: string;
}

export interface BesoinRecrutementSummaryResponse {
  id: number;
  ficheDePosteIntitule: string;
  directionNom: string;
  directeurNom: string;
  /** Utilisateur authentifié qui a exprimé le besoin */
  createdByNom: string;
  lieuAffectation: string;
  motif: string;
  nombrePostes: number;
  dateSouhaitee: string;
  priorite: PrioriteBesoin;
  /** true = en attente de décision, false = décision prise */
  encours: boolean;
  /** null si encours=true */
  statut: StatutBesoin | null;
  createdAt: string;
}

// ── Detail Response (page de détail) ──────────────────────────────────────

export interface FicheDePosteDetail {
  intitulePoste: string;
  missionPrincipale: string;
  activitesPrincipales: string;
  niveauEtudes: NiveauEtudes;
  domaineFormation: string;
  anneesExperience: number;
  competencesTechniques: string;
  competencesManageriales: string;
}

export interface BesoinRecrutementDetailResponse {
  id: number;
  ficheDePosteId: number;
  directionId: number;
  directionNom: string;
  directeurId: number;
  directeurNom: string;
  createdById: number;
  createdByNom: string;
  lieuAffectation: string;
  motif: string;
  nombrePostes: number;
  dateSouhaitee: string;
  priorite: PrioriteBesoin;
  encours: boolean;
  statut: StatutBesoin | null;
  createdAt: string;
  updatedAt: string;
  ficheDePoste: FicheDePosteDetail;
}

// ── Niveau études ──────────────────────────────────────────────────────────

export enum NiveauEtudes {
  PAS_IMPORTANT = 'PAS_IMPORTANT',
  NIVEAU_BAC    = 'NIVEAU_BAC',
  BAC           = 'BAC',
  BAC_PLUS_2    = 'BAC_PLUS_2',
  BAC_PLUS_3    = 'BAC_PLUS_3',
  BAC_PLUS_5    = 'BAC_PLUS_5',
  DOCTORAT      = 'DOCTORAT'
}

export function niveauEtudesLabel(n: NiveauEtudes): string {
  switch (n) {
    case NiveauEtudes.PAS_IMPORTANT: return 'Pas important';
    case NiveauEtudes.NIVEAU_BAC:    return 'Niveau Bac';
    case NiveauEtudes.BAC:           return 'Bac';
    case NiveauEtudes.BAC_PLUS_2:    return 'Bac+2';
    case NiveauEtudes.BAC_PLUS_3:    return 'Bac+3';
    case NiveauEtudes.BAC_PLUS_5:    return 'Bac+5';
    case NiveauEtudes.DOCTORAT:      return 'Doctorat';
  }
}

// ── Request DTOs ───────────────────────────────────────────────────────────

export interface BesoinRecrutementRequest {
  ficheDePosteId: number;
  lieuAffectation: string;
  motif: string;
  nombrePostes: number;
  dateSouhaitee: string;        // ISO date string yyyy-MM-dd
  priorite: PrioriteBesoin;
}

export interface DecisionBesoinRequest {
  statut: DecisionStatut;
}


// ── Search / filter ────────────────────────────────────────────────────────

export interface BesoinRecrutementSearchDto extends PageRequest {
  directionId?: number;
  ficheDePosteId?: number;
  statut?: StatutBesoin;
  priorite?: PrioriteBesoin;
  /** true = uniquement en attente, false = uniquement décidés, undefined = tous */
  encours?: boolean;
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

export function statutLabel(s: StatutBesoin | null): string {
  if (s === null) return 'En cours';
  return STATUT_BESOIN_OPTIONS.find(o => o.value === s)?.label ?? s;
}

export function prioriteLabel(p: PrioriteBesoin): string {
  return PRIORITE_BESOIN_OPTIONS.find(o => o.value === p)?.label ?? p;
}

/**
 * Severity PrimeNG pour l'affichage du statut.
 * Les besoins en attente (encours=true, statut=null) affichent 'info'.
 */
export function statutSeverity(
  encours: boolean,
  statut: StatutBesoin | null
): 'info' | 'success' | 'danger' {
  if (encours) return 'info';
  switch (statut) {
    case StatutBesoin.ACCEPTE: return 'success';
    case StatutBesoin.REFUSE:  return 'danger';
    default:                   return 'info';
  }
}

export function prioriteSeverity(p: PrioriteBesoin): 'danger' | 'warning' | 'success' {
  switch (p) {
    case PrioriteBesoin.HAUTE:   return 'danger';
    case PrioriteBesoin.NORMALE: return 'warning';
    case PrioriteBesoin.BASSE:   return 'success';
  }
}
