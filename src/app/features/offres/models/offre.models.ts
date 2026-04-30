// ── Response DTOs ──────────────────────────────────────────────────────────

export interface OffreResponse {
  id:                   number;
  contenu:              string;
  projetRecrutementId:  number;
  ficheDePosteIntitule: string;
  objetCandidature:     string;
  generatedAt:          string;
  updatedAt:            string;
}

// ── Request DTOs ───────────────────────────────────────────────────────────

export interface OffreUpdateRequest {
  contenu: string;
}
