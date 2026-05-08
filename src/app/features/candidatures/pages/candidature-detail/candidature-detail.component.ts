import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { NgClass } from '@angular/common';

import { CandidatureService } from '../../services/candidature.service';
import { NotificationService } from '../../../../core/services/NotificationService';
import { TokenService } from '../../../../core/services/TokenService';
import { RoleName } from '../../../roles/models/role-name.enum';
import {
  CandidatureResponse,
  StatutCandidature,
  isPipelineRunning,
  recommandationLabel,
  recommandationSeverity,
  scoreSeverity,
  statutCandidatureLabel,
} from '../../models/candidature.models';

@Component({
  selector: 'app-candidature-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TagModule, TooltipModule, ConfirmDialogModule, NgClass],
  providers: [ConfirmationService],
  templateUrl: './candidature-detail.component.html',
})
export class CandidatureDetailComponent implements OnInit {

  private readonly service        = inject(CandidatureService);
  private readonly notification   = inject(NotificationService);
  private readonly tokenService   = inject(TokenService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly cdr            = inject(ChangeDetectorRef);
  private readonly destroyRef     = inject(DestroyRef);

  candidature: CandidatureResponse | null = null;
  loading       = true;
  actionLoading = false;
  projetId!: number;
  private candidatureId!: number;

  // ── Role helpers ──────────────────────────────────────────────────────────
  readonly isDrhOrAdmin = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);

  // ── Enums & helpers ───────────────────────────────────────────────────────
  readonly StatutCandidature      = StatutCandidature;
  readonly isPipelineRunning      = isPipelineRunning;
  readonly recommandationLabel    = recommandationLabel;
  readonly recommandationSeverity = recommandationSeverity;
  readonly scoreSeverity          = scoreSeverity;
  readonly statutCandidatureLabel = statutCandidatureLabel;

  ngOnInit(): void {
    this.candidatureId = Number(this.route.snapshot.paramMap.get('candidatureId'));
    this.projetId      = Number(this.route.snapshot.parent?.paramMap.get('projetId'));
    this.load();
  }

  // ── Chargement / Rafraîchissement manuel ──────────────────────────────────
  load(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service.getById(this.candidatureId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.candidature = c;
          this.loading     = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
          this.notification.error('Impossible de charger la candidature');
        },
      });
  }

  refresh(): void {
    this.load();
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  get canDecide(): boolean {
    return !!this.candidature && this.isDrhOrAdmin &&
           this.candidature.statut === StatutCandidature.EVALUE;
  }

  get canReevaluer(): boolean {
    return !!this.candidature &&
           (this.candidature.statut === StatutCandidature.EVALUE ||
            this.candidature.statut === StatutCandidature.ERREUR);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  retenir(): void {
    if (!this.candidature) return;
    this.actionLoading = true;
    this.cdr.markForCheck();
    this.service.changerStatut(this.candidature.id, { statut: StatutCandidature.RETENU })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.candidature = c; this.actionLoading = false; this.cdr.markForCheck(); this.notification.success('Candidature retenue'); },
        error: ()  => { this.actionLoading = false; this.cdr.markForCheck(); },
      });
  }

  rejeter(): void {
    if (!this.candidature) return;
    this.actionLoading = true;
    this.cdr.markForCheck();
    this.service.changerStatut(this.candidature.id, { statut: StatutCandidature.REJETE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.candidature = c; this.actionLoading = false; this.cdr.markForCheck(); this.notification.success('Candidature rejetée'); },
        error: ()  => { this.actionLoading = false; this.cdr.markForCheck(); },
      });
  }

  reevaluer(): void {
    if (!this.candidature) return;
    this.actionLoading = true;
    this.cdr.markForCheck();
    this.service.reevaluer(this.candidature.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.candidature  = c;
          this.actionLoading = false;
          this.cdr.markForCheck();
          this.notification.info('Ré-évaluation lancée — cliquez sur Rafraîchir pour voir le résultat.');
        },
        error: () => { this.actionLoading = false; this.cdr.markForCheck(); },
      });
  }

  ouvrirCv(): void {
    if (!this.candidature) return;
    this.service.getCvUrl(this.candidature.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => this.triggerDownload(url, this.candidature!.nomFichier),
        error: () => this.notification.error('Impossible d\'accéder au fichier CV'),
      });
  }

  confirmSupprimer(): void {
    if (!this.candidature) return;
    const nom = this.candidature.nomCandidat ?? this.candidature.nomFichier;
    this.confirmService.confirm({
      message:                `Supprimer la candidature de <b>${nom}</b> ? Cette action est irréversible.`,
      header:                 'Supprimer la candidature',
      icon:                   'fa fa-trash',
      acceptLabel:            'Supprimer',
      rejectLabel:            'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.supprimer(this.candidature!.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notification.success('Candidature supprimée');
              this.goBack();
            },
          });
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private triggerDownload(url: string, fileName: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName ?? 'cv';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  goBack(): void {
    this.router.navigate(['/projets-recrutement', this.projetId, 'candidatures']);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  gaugeArc(score: number): string {
    const r = 52, cx = 60, cy = 60;
    const startAngle = -225, sweep = 270;
    const filled = (score / 100) * sweep + startAngle;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(filled));
    const y2 = cy + r * Math.sin(toRad(filled));
    const large = (score / 100) * sweep > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  gaugeTrackArc(): string { return this.gaugeArc(100); }
}
