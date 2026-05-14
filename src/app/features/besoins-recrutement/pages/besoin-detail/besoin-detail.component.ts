import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { BesoinRecrutementService } from '../../services/besoin-recrutement.service';

import {
  BesoinRecrutementDetailResponse,
  DecisionBesoinRequest,
  DecisionStatut,
  StatutBesoin,
  PrioriteBesoin,
  niveauEtudesLabel,
  prioriteLabel,
  prioriteSeverity,
  statutLabel,
  statutSeverity
} from '../../models/besoin-recrutement.models';
import {TokenService} from "../../../../core/services/TokenService";
import {NotificationService} from "../../../../core/services/NotificationService";
import {RoleName} from "../../../roles/models/role-name.enum";

@Component({
  selector: 'app-besoin-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonModule,
    TagModule,
    TooltipModule,
    DividerModule,
    DialogModule,
  ],
  templateUrl: './besoin-detail.component.html',
})
export class BesoinDetailComponent implements OnInit {

  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly service      = inject(BesoinRecrutementService);
  private readonly notification = inject(NotificationService);
  private readonly tokenService = inject(TokenService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  // State
  besoin: BesoinRecrutementDetailResponse | null = null;
  loading = true;

  // Decision dialog
  showDecisionDialog  = false;
  pendingDecision: DecisionStatut | null = null;
  submittingDecision  = false;

  // Role helpers
  readonly isDrhOrAdmin = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);

  // Pure helpers
  readonly statutLabel       = statutLabel;
  readonly prioriteLabel     = prioriteLabel;
  readonly statutSeverity    = statutSeverity;
  readonly prioriteSeverity  = prioriteSeverity;
  readonly niveauEtudesLabel = niveauEtudesLabel;
  readonly StatutBesoin      = StatutBesoin;
  readonly PrioriteBesoin    = PrioriteBesoin;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: b => {
          this.besoin  = b;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.notification.error('Besoin introuvable');
          this.router.navigate(['/besoins-recrutement']);
        }
      });
  }

  goToEdit(): void {
    this.router.navigate(['/besoins-recrutement', this.besoin!.id, 'edit']);
  }

  openDecision(decision: DecisionStatut): void {
    this.pendingDecision    = decision;
    this.showDecisionDialog = true;
    this.cdr.markForCheck();
  }

  closeDecision(): void {
    this.showDecisionDialog = false;
    this.pendingDecision    = null;
    this.cdr.markForCheck();
  }

  confirmDecision(): void {
    if (!this.besoin || !this.pendingDecision) return;
    this.submittingDecision = true;
    this.cdr.markForCheck();

    const req: DecisionBesoinRequest = { statut: this.pendingDecision };
    this.service.decision(this.besoin.id, req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success(
            this.pendingDecision === StatutBesoin.ACCEPTE ? 'Besoin accepte' : 'Besoin refuse'
          );
          this.submittingDecision = false;
          this.closeDecision();
          this.service.getById(this.besoin!.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(b => { this.besoin = b; this.cdr.markForCheck(); });
        },
        error: () => { this.submittingDecision = false; this.cdr.markForCheck(); }
      });
  }

  goBack(): void {
    this.router.navigate(['/besoins-recrutement']);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
