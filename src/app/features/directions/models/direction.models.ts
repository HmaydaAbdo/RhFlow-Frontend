// src/app/features/directions/models/direction.models.ts
import { PageRequest } from '../../../core/models/pagination.models';

export interface DirectionResponse {
  id: number;
  nom: string;
  directeurId: number;
  directeurNom: string;
  fichesDePosteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DirectionRequest {
  nom: string;
  directeurId: number ;
}

export interface DirectionSearchRequest extends PageRequest {
  nom?: string;
  directeurId?: number;
}
