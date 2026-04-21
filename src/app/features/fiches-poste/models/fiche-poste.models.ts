import { PageRequest } from '../../../core/models/pagination.models';

export enum NiveauEtudes {
  PAS_IMPORTANT = 'PAS_IMPORTANT',
  NIVEAU_BAC = 'NIVEAU_BAC',
  BAC = 'BAC',
  BAC_PLUS_2 = 'BAC_PLUS_2',
  BAC_PLUS_3 = 'BAC_PLUS_3',
  BAC_PLUS_5 = 'BAC_PLUS_5',
  DOCTORAT = 'DOCTORAT'
}

export const NIVEAU_ETUDES_OPTIONS: { label: string; value: NiveauEtudes }[] = [
  { label: 'Pas important', value: NiveauEtudes.PAS_IMPORTANT },
  { label: 'Niveau Bac', value: NiveauEtudes.NIVEAU_BAC },
  { label: 'Bac', value: NiveauEtudes.BAC },
  { label: 'Bac+2', value: NiveauEtudes.BAC_PLUS_2 },
  { label: 'Bac+3', value: NiveauEtudes.BAC_PLUS_3 },
  { label: 'Bac+5', value: NiveauEtudes.BAC_PLUS_5 },
  { label: 'Doctorat', value: NiveauEtudes.DOCTORAT }
];

export interface DirectionBrief {
  id: number;
  nom: string;
}

export interface FichePosteResponse {
  id: number;
  intitulePoste: string;
  direction: DirectionBrief;
  missionPrincipale: string;
  activitesPrincipales: string;
  activitesSecondaires: string;
  niveauEtudes: NiveauEtudes;
  domaineFormation: string;
  anneesExperience: number;
  competencesTechniques: string;
  competencesManageriales: string;
  createdAt: string;
  updatedAt: string;
}

export interface FichePosteSummaryResponse {
  id: number;
  intitulePoste: string;
  directionNom: string;
  niveauEtudes: NiveauEtudes;
  domaineFormation: string;
  anneesExperience: number;
  createdAt: string;
  updatedAt: string;
}

export interface FichePosteRequest {
  intitulePoste: string;
  directionId: number;
  missionPrincipale: string;
  activitesPrincipales: string;
  activitesSecondaires: string;
  niveauEtudes: NiveauEtudes;
  domaineFormation: string;
  anneesExperience: number;
  competencesTechniques: string;
  competencesManageriales: string;
}

export interface FichePosteSearchRequest extends PageRequest {
  intitulePoste?: string;
  directionId?: number;
  niveauEtudes?: NiveauEtudes;
}
