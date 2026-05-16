// ── Enums — miroir exact du backend ───────────────────────────────────────

export enum StatutCandidature {
  RECU     = 'RECU',
  EN_COURS = 'EN_COURS',
  EVALUE   = 'EVALUE',
  ERREUR   = 'ERREUR',
  RETENU   = 'RETENU',
  REJETE   = 'REJETE',
}

export enum RecommandationIA {
  A_CONVOQUER       = 'A_CONVOQUER',
  A_ETUDIER         = 'A_ETUDIER',
  NE_CORRESPOND_PAS = 'NE_CORRESPOND_PAS',
}

// ── UI option arrays ───────────────────────────────────────────────────────

export const STATUT_CANDIDATURE_OPTIONS: { label: string; value: StatutCandidature }[] = [
  { label: 'Reçu',     value: StatutCandidature.RECU      },
  { label: 'En cours', value: StatutCandidature.EN_COURS  },
  { label: 'Évalué',   value: StatutCandidature.EVALUE    },
  { label: 'Erreur',   value: StatutCandidature.ERREUR    },
  { label: 'Retenu',   value: StatutCandidature.RETENU    },
  { label: 'Rejeté',   value: StatutCandidature.REJETE    },
];

export const RECOMMANDATION_OPTIONS: { label: string; value: RecommandationIA }[] = [
  { label: 'À convoquer',       value: RecommandationIA.A_CONVOQUER       },
  { label: 'À étudier',         value: RecommandationIA.A_ETUDIER         },
  { label: 'Ne correspond pas', value: RecommandationIA.NE_CORRESPOND_PAS },
];

// ── Parcours candidat — extrait du CV par l'IA (miroir backend) ────────────

/** Formation / diplôme extrait du CV. Champs null si l'IA ne les a pas trouvés. */
export interface Formation {
  titre:         string | null;
  ecole:         string | null;
  dateObtention: string | null;   // texte brut ("2020", "Juin 2021"…)
}

/** Expérience professionnelle extraite du CV. Champs null si non trouvés. */
export interface ExperienceProfessionnelle {
  titre:      string | null;
  entreprise: string | null;
  periode:    string | null;      // texte brut ("2019 - 2021", "depuis 2022"…)
}

// ── Response DTO ───────────────────────────────────────────────────────────

export interface CandidatureResponse {
  id:                  number;
  projetRecrutementId: number;
  nomPoste:            string;

  // Fichier
  nomFichier:    string;
  typeFichier:   string;
  tailleFichier: number;

  // Identité candidat — null si pipeline pas encore terminé
  nomCandidat:       string | null;
  emailCandidat:     string | null;
  telephoneCandidat: string | null;

  // Parcours candidat — listes vides tant que le pipeline n'a pas extrait le CV
  formations:  Formation[];
  experiences: ExperienceProfessionnelle[];

  // Évaluation IA — null si non encore évalué
  scoreMatching:       number | null;
  pointsForts:         string[];
  pointsManquants:     string[];
  recommandation:      RecommandationIA | null;
  justificationIa:     string | null;
  questionsEntretien:  string[];

  // Statut & dates
  statut:    StatutCandidature;
  deposeLe:  string;            // ISO LocalDateTime
  evalueLe:  string | null;
}

// ── Search / filter ────────────────────────────────────────────────────────

export interface CandidatureSearchDto {
  statut?:         StatutCandidature;
  recommandation?: RecommandationIA;
  scoreMin?:       number;
}

// ── Requests ───────────────────────────────────────────────────────────────

/** Seuls RETENU et REJETE sont acceptés côté backend */
export type DecisionCandidature = StatutCandidature.RETENU | StatutCandidature.REJETE;

export interface StatutUpdateRequest {
  statut: DecisionCandidature;
}

// ── UI helpers ─────────────────────────────────────────────────────────────

export function statutCandidatureLabel(s: StatutCandidature): string {
  return STATUT_CANDIDATURE_OPTIONS.find(o => o.value === s)?.label ?? s;
}

export function recommandationLabel(r: RecommandationIA): string {
  return RECOMMANDATION_OPTIONS.find(o => o.value === r)?.label ?? r;
}

export function scoreSeverity(score: number): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | undefined {
  if (score >= 75) return 'success';
  if (score >= 45) return 'warning';
  return 'danger';
}

export function recommandationSeverity(r: RecommandationIA): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | undefined {
  switch (r) {
    case RecommandationIA.A_CONVOQUER:       return 'success';
    case RecommandationIA.A_ETUDIER:         return 'warning';
    case RecommandationIA.NE_CORRESPOND_PAS: return 'danger';
  }
}

export function statutCandidatureSeverity(
  s: StatutCandidature
): 'info' | 'success' | 'danger' | 'secondary' | 'warn' {
  switch (s) {
    case StatutCandidature.RECU:     return 'info';
    case StatutCandidature.EN_COURS: return 'info';
    case StatutCandidature.EVALUE:   return 'secondary';
    case StatutCandidature.ERREUR:   return 'danger';
    case StatutCandidature.RETENU:   return 'success';
    case StatutCandidature.REJETE:   return 'danger';
  }
}

/**
 * Vrai si la candidature est encore dans le pipeline IA (RECU ou EN_COURS).
 * Utilisé par le composant pour décider d'activer le polling.
 */
export function isPipelineRunning(s: StatutCandidature): boolean {
  return s === StatutCandidature.RECU || s === StatutCandidature.EN_COURS;
}
