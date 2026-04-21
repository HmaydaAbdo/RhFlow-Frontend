import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmationService } from 'primeng/api';
import { BesoinRecrutementService } from '../../../services/besoin-recrutement.service';
import {
  BesoinRecrutementSearchDto,
  BesoinRecrutementSummaryResponse,
  STATUT_BESOIN_OPTIONS,
  PRIORITE_BESOIN_OPTIONS,
  StatutBesoin,
  PrioriteBesoin,
  statutLabel,
  prioriteLabel,
  statutSeverity,
  prioriteSeverity
} from '../../../models/besoin-recrutement.models';
import { PageResponse } from '../../../../../core/models/pagination.models';
import { NotificationService } from '../../../../../core/services/NotificationService';

@Component({
  selector: 'app-besoin-my-needs-directeur',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    PaginatorModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './besoin-my-needs.component.html',
  styleUrl: './besoin-myNeeds.component.scss'
})
export class BesoinMyNeedsComponent implements OnInit {

  private readonly service             = inject(BesoinRecrutementService);
  private readonly notification        = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router              = inject(Router);
  private readonly cdr                 = inject(ChangeDetectorRef);
  private readonly destroyRef          = inject(DestroyRef);

  // ── State ────────────────────────────────────────────────────────────────
  besoins: BesoinRecrutementSummaryResponse[] = [];
  totalRecords = 0;
  loading      = false;

  selectedStatut:   StatutBesoin   | null = null;
  selectedPriorite: PrioriteBesoin | null = null;

  readonly statutOptions   = STATUT_BESOIN_OPTIONS;
  readonly prioriteOptions = PRIORITE_BESOIN_OPTIONS;

  currentRequest: BesoinRecrutementSearchDto = {
    page: 0, size: 9, sortBy: 'createdAt', direction: 'desc', mineOnly: true
  };


  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.service.besoins$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<BesoinRecrutementSummaryResponse> | null) => {
        if (res) {
          this.besoins      = res.content;
          this.totalRecords = res.page.totalElements;
          this.cdr.markForCheck();
        }
      });

    this.service.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => { this.loading = loading; this.cdr.markForCheck(); });

    this.loadBesoins();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  loadBesoins(): void {
    this.currentRequest.statut   = this.selectedStatut   ?? undefined;
    this.currentRequest.priorite = this.selectedPriorite ?? undefined;
    this.service.loadBesoins(this.currentRequest);
  }

  onStatutFilterChange(): void  { this.currentRequest.page = 0; this.loadBesoins(); }
  onPrioriteFilterChange(): void { this.currentRequest.page = 0; this.loadBesoins(); }

  onClearFilters(): void {
    this.selectedStatut   = null;
    this.selectedPriorite = null;
    this.currentRequest.page = 0;
    this.loadBesoins();
  }

  onPageChange(event: PaginatorState): void {
    this.currentRequest.page = event.page ?? 0;
    this.currentRequest.size = event.rows ?? 9;
    this.loadBesoins();
  }

  goToCreate(): void { this.router.navigate(['/besoins-recrutement/new']); }

  goToEdit(besoin: BesoinRecrutementSummaryResponse): void {
    this.router.navigate(['/besoins-recrutement', besoin.id, 'edit']);
  }




  // ── Helpers ──────────────────────────────────────────────────────────────

  get hasActiveFilters(): boolean {
    return !!(this.selectedStatut || this.selectedPriorite);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackByBesoin(_: number, b: BesoinRecrutementSummaryResponse): number { return b.id; }

  // ── Enums & helpers exposés au template ──────────────────────────────────
  readonly StatutBesoin     = StatutBesoin;
  readonly PrioriteBesoin   = PrioriteBesoin;
  readonly statutLabel      = statutLabel;
  readonly prioriteLabel    = prioriteLabel;
  readonly statutSeverity   = statutSeverity;
  readonly prioriteSeverity = prioriteSeverity;
}
