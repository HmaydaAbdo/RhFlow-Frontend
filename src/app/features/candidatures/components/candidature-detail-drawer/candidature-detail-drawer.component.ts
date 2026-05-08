import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
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
  selector: 'app-candidature-detail-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SidebarModule, ButtonModule, TagModule, TooltipModule, NgClass],
  templateUrl: './candidature-detail-drawer.component.html',
})
export class CandidatureDetailDrawerComponent {

  @Input() candidature: CandidatureResponse | null = null;
  @Input()  visible = false;
  @Output() visibleChange    = new EventEmitter<boolean>();
  /** Demande au parent de recharger la liste (après action). */
  @Output() refreshList      = new EventEmitter<void>();
  /** Demande au parent d'ouvrir la boite de confirmation de suppression. */
  @Output() supprimerDemande = new EventEmitter<CandidatureResponse>();

  private readonly service      = inject(CandidatureService);
  private readonly notification = inject(NotificationService);
  private readonly tokenService = inject(TokenService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  actionLoading = false;

  readonly isDrhOrAdmin = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);

  // ── Enums & helpers exposés au template ──────────────────────────────────
  readonly StatutCandidature      = StatutCandidature;
  readonly isPipelineRunning      = isPipelineRunning;
  readonly recommandationLabel    = recommandationLabel;
  readonly recommandationSeverity = recommandationSeverity;
  readonly scoreSeverity          = scoreSeverity;
  readonly statutCandidatureLabel = statutCandidatureLabel;

  // ── Visibility ────────────────────────────────────────────────────────────
  onHide(): void {
    this.visibleChange.emit(false);
  }

  // ── Computed guards ───────────────────────────────────────────────────────
  get canDecide(): boolean {
    if (!this.candidature || !this.isDrhOrAdmin) return false;
    return this.candidature.statut === StatutCandidature.EVALUE;
  }

  get canReevaluer(): boolean {
    if (!this.candidature) return false;
    return (
      this.candidature.statut === StatutCandidature.EVALUE ||
      this.candidature.statut === StatutCandidature.ERREUR
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  retenir(): void {
    if (!this.candidature) return;
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.service.changerStatut(this.candidature.id, { statut: StatutCandidature.RETENU })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.candidature   = updated;
          this.actionLoading = false;
          this.cdr.markForCheck();
          this.notification.success('Candidature retenue');
          this.refreshList.emit();
        },
        error: () => {
          this.actionLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  rejeter(): void {
    if (!this.candidature) return;
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.service.changerStatut(this.candidature.id, { statut: StatutCandidature.REJETE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.candidature   = updated;
          this.actionLoading = false;
          this.cdr.markForCheck();
          this.notification.success('Candidature rejetée');
          this.refreshList.emit();
        },
        error: () => {
          this.actionLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  reevaluer(): void {
    if (!this.candidature) return;
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.service.reevaluer(this.candidature.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.candidature   = updated;
          this.actionLoading = false;
          this.cdr.markForCheck();
          this.notification.info('Ré-évaluation lancée — résultat dans quelques instants');
          this.refreshList.emit();
        },
        error: () => {
          this.actionLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  ouvrirCv(): void {
    if (!this.candidature) return;
    this.service.getCvUrl(this.candidature.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => window.open(url, '_blank'),
        error: () => this.notification.error('Impossible d\'accéder au fichier CV'),
      });
  }

  supprimer(): void {
    if (this.candidature) this.supprimerDemande.emit(this.candidature);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
