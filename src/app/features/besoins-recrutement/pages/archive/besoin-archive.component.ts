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
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { BesoinRecrutementService } from '../../services/besoin-recrutement.service';
import { DirectionService } from '../../../directions/services/direction.service';
import {
  BesoinRecrutementSummaryResponse,
  BesoinRecrutementSearchDto,
  STATUT_BESOIN_OPTIONS,
  PRIORITE_BESOIN_OPTIONS,
  StatutBesoin,
  PrioriteBesoin,
  DecisionStatut,
  statutLabel,
  prioriteLabel,
  statutSeverity,
  prioriteSeverity
} from '../../models/besoin-recrutement.models';
import { DirectionResponse, DirectionSearchRequest } from '../../../directions/models/direction.models';
import {AuthService} from "../../../../core/services/AuthService";
import {NotificationService} from "../../../../core/services/NotificationService";
import {PageResponse} from "../../../../core/models/pagination.models";

const DIRECTION_PAGE_SIZE = 15;
const SCROLL_THRESHOLD_PX = 80;
const SCROLL_ATTACH_DELAY  = 50;
const DROPDOWN_SCROLL_SEL  = '.p-dropdown-items-wrapper';

@Component({
  selector: 'app-besoin-archive',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    DialogModule,
    ConfirmDialogModule,
    PaginatorModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './besoin-archive.component.html',
  styleUrl:    './besoin-archive.component.scss',
})
export class BesoinArchiveComponent implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly service             = inject(BesoinRecrutementService);
  private readonly directionService    = inject(DirectionService);
  private readonly authService         = inject(AuthService);
  private readonly notification        = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb                  = inject(FormBuilder);
  private readonly cdr                 = inject(ChangeDetectorRef);
  private readonly destroyRef          = inject(DestroyRef);

  // ── Role ─────────────────────────────────────────────────────────────────
  readonly isDrhOrAdmin = this.authService.hasRole('DRH') || this.authService.hasRole('ADMIN');

  // ── Filter form ──────────────────────────────────────────────────────────
  readonly filterForm = this.fb.group({
    directionId: [null as number         | null],   // DRH seulement
    statut:      [null as StatutBesoin   | null],
    priorite:    [null as PrioriteBesoin | null],
  });

  // ── List state ───────────────────────────────────────────────────────────
  besoins:      BesoinRecrutementSummaryResponse[] = [];
  totalRecords  = 0;
  loading       = false;

  readonly statutOptions   = STATUT_BESOIN_OPTIONS;
  readonly prioriteOptions = PRIORITE_BESOIN_OPTIONS;

  // Archive = encours=false ; mineOnly selon le rôle
  public currentRequest: BesoinRecrutementSearchDto = {
    page:     0,
    size:     9,
    sortBy:   'updatedAt',
    direction: 'desc',
    encours:  false,
    mineOnly: !this.isDrhOrAdmin,
  };

  // ── Direction lazy dropdown (DRH seulement) ──────────────────────────────
  directions:         DirectionResponse[] = [];
  directionLoading    = false;
  directionPage       = 0;
  directionTotalPages = 1;

  private directionKeyword      = '';
  private directionScrollEl:    Element       | null = null;
  private directionScrollBound: EventListener | null = null;
  private readonly directionFilter$ = new Subject<string>();

  // ── Decision dialog ──────────────────────────────────────────────────────
  showDecisionDialog = false;
  decisionTarget:    BesoinRecrutementSummaryResponse | null = null;
  pendingDecision:   DecisionStatut                   | null = null;
  submittingDecision = false;

  // ── Delete state ─────────────────────────────────────────────────────────
  deletingId: number | null = null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  readonly statutLabel      = statutLabel;
  readonly prioriteLabel    = prioriteLabel;
  readonly statutSeverity   = statutSeverity;
  readonly prioriteSeverity = prioriteSeverity;
  readonly StatutBesoin     = StatutBesoin;
  readonly PrioriteBesoin   = PrioriteBesoin;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.service.besoins$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<BesoinRecrutementSummaryResponse> | null) => {
        if (!res) return;
        this.besoins      = res.content;
        this.totalRecords = res.page.totalElements;
        this.cdr.markForCheck();
      });

    this.service.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => { this.loading = loading; this.cdr.markForCheck(); });

    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentRequest = { ...this.currentRequest, page: 0 };
        this.loadBesoins();
      });

    this.directionFilter$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(keyword => {
      this.directionKeyword = keyword;
      this.resetAndLoadDirections();
    });

    this.loadBesoins();
  }

  // ── Besoins loading ──────────────────────────────────────────────────────
  private loadBesoins(): void {
    const { directionId, statut, priorite } = this.filterForm.value;
    this.currentRequest = {
      ...this.currentRequest,
      directionId: directionId ?? undefined,
      statut:      statut      ?? undefined,
      priorite:    priorite    ?? undefined,
    };
    this.service.loadBesoins(this.currentRequest);
  }

  onClearFilters(): void {
    this.filterForm.reset({ directionId: null, statut: null, priorite: null });
  }

  onPageChange(event: PaginatorState): void {
    this.currentRequest = {
      ...this.currentRequest,
      page: event.page ?? 0,
      size: event.rows ?? 9,
    };
    this.loadBesoins();
  }

  get hasActiveFilters(): boolean {
    const { directionId, statut, priorite } = this.filterForm.value;
    return !!(directionId || statut || priorite);
  }

  // ── Direction lazy dropdown ──────────────────────────────────────────────
  onDirectionShow(): void {
    if (!this.directions.length || this.directionPage === 0) this.resetAndLoadDirections();
    setTimeout(() => this.attachDirectionScroll(), SCROLL_ATTACH_DELAY);
  }

  onDirectionHide(): void { this.detachDirectionScroll(); }

  onDirectionFilter(event: { filter: string }): void {
    this.directionFilter$.next(event.filter ?? '');
  }

  private attachDirectionScroll(): void {
    this.directionScrollEl = document.querySelector(DROPDOWN_SCROLL_SEL);
    if (!this.directionScrollEl) return;
    this.directionScrollBound = this.onDirectionScroll.bind(this);
    this.directionScrollEl.addEventListener('scroll', this.directionScrollBound);
  }

  private detachDirectionScroll(): void {
    if (!this.directionScrollEl || !this.directionScrollBound) return;
    this.directionScrollEl.removeEventListener('scroll', this.directionScrollBound);
    this.directionScrollEl    = null;
    this.directionScrollBound = null;
  }

  private onDirectionScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX) {
      this.loadNextDirectionPage();
    }
  }

  private resetAndLoadDirections(): void {
    this.directions    = [];
    this.directionPage = 0;
    this.loadNextDirectionPage();
  }

  private loadNextDirectionPage(): void {
    if (this.directionLoading) return;
    if (this.directionPage > 0 && this.directionPage >= this.directionTotalPages) return;

    this.directionLoading = true;
    this.cdr.markForCheck();

    const request: DirectionSearchRequest = {
      page:      this.directionPage,
      size:      DIRECTION_PAGE_SIZE,
      sortBy:    'nom',
      direction: 'asc',
      nom:       this.directionKeyword || undefined,
    };

    this.directionService.loadDirectionsPage(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: PageResponse<DirectionResponse>) => {
          this.directions          = [...this.directions, ...result.content];
          this.directionTotalPages = result.page.totalPages;
          this.directionPage++;
          this.directionLoading    = false;
          this.cdr.markForCheck();
        },
        error: () => { this.directionLoading = false; this.cdr.markForCheck(); },
      });
  }

  // ── Changer décision (DRH/ADMIN seulement) ───────────────────────────────
  openChangerDecision(besoin: BesoinRecrutementSummaryResponse): void {
    // Propose la décision inverse de celle déjà prise
    const nouvelleDecision: DecisionStatut =
      besoin.statut === StatutBesoin.ACCEPTE ? StatutBesoin.REFUSE : StatutBesoin.ACCEPTE;

    this.decisionTarget     = besoin;
    this.pendingDecision    = nouvelleDecision;
    this.showDecisionDialog = true;
    this.cdr.markForCheck();
  }

  closeDecision(): void {
    this.showDecisionDialog = false;
    this.decisionTarget     = null;
    this.pendingDecision    = null;
    this.cdr.markForCheck();
  }

  confirmDecision(): void {
    if (!this.decisionTarget || !this.pendingDecision) return;

    this.submittingDecision = true;
    this.cdr.markForCheck();

    this.service.decision(this.decisionTarget.id, { statut: this.pendingDecision })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success(
            this.pendingDecision === StatutBesoin.ACCEPTE ? 'Décision changée → Accepté' : 'Décision changée → Refusé'
          );
          this.submittingDecision = false;
          this.closeDecision();
          this.loadBesoins();
        },
        error: () => { this.submittingDecision = false; this.cdr.markForCheck(); },
      });
  }

  // ── CSS-class helpers (statut banner & pills) ────────────────────────────
  bannerClass(besoin: BesoinRecrutementSummaryResponse): string {
    return besoin.statut === StatutBesoin.ACCEPTE ? 'bs-banner--accepte' : 'bs-banner--refuse';
  }

  statusPillClass(besoin: BesoinRecrutementSummaryResponse): string {
    return besoin.statut === StatutBesoin.ACCEPTE ? 'bs-status--accepte' : 'bs-status--refuse';
  }

  statusIcon(besoin: BesoinRecrutementSummaryResponse): string {
    return besoin.statut === StatutBesoin.ACCEPTE ? 'fa fa-circle-check' : 'fa fa-circle-xmark';
  }

  priorityPillClass(besoin: BesoinRecrutementSummaryResponse): string {
    if (besoin.priorite === PrioriteBesoin.HAUTE)   return 'bs-prio--haute';
    if (besoin.priorite === PrioriteBesoin.NORMALE) return 'bs-prio--normale';
    return 'bs-prio--faible';
  }

  // ── Change-decision button helpers ───────────────────────────────────────
  changeDecisionIcon(besoin: BesoinRecrutementSummaryResponse): string {
    return besoin.statut === StatutBesoin.ACCEPTE ? 'fa fa-circle-xmark' : 'fa fa-circle-check';
  }

  changeDecisionSeverity(besoin: BesoinRecrutementSummaryResponse):  "success" | "info" | "warning" | "danger" | "help" | "primary" | "secondary" | "contrast" | null | undefined {
    return besoin.statut === StatutBesoin.ACCEPTE ? 'danger' : 'success';
  }

  changeDecisionTooltip(besoin: BesoinRecrutementSummaryResponse): string {
    return besoin.statut === StatutBesoin.ACCEPTE ? 'Changer → Refuser' : 'Changer → Accepter';
  }

  // ── Decision dialog helpers ───────────────────────────────────────────────
  get decisionDialogHeader(): string {
    return this.pendingDecision === StatutBesoin.ACCEPTE ? 'Changer → Accepter' : 'Changer → Refuser';
  }

  get decisionConfirmLabel(): string {
    return this.pendingDecision === StatutBesoin.ACCEPTE ? 'Confirmer → Accepté' : 'Confirmer → Refusé';
  }

  get decisionConfirmIcon(): string {
    if (this.submittingDecision) return 'fa fa-spinner fa-spin';
    return this.pendingDecision === StatutBesoin.ACCEPTE ? 'fa fa-circle-check' : 'fa fa-circle-xmark';
  }

  get decisionConfirmSeverity():  "success" | "info" | "warning" | "danger" | "help" | "primary" | "secondary" | "contrast" | null | undefined {
    return this.pendingDecision === StatutBesoin.ACCEPTE ? 'success' : 'danger';
  }

  // ── Delete (DRH/ADMIN uniquement, archive seulement) ────────────────────
  deleteBesoin(besoin: BesoinRecrutementSummaryResponse): void {
    this.confirmationService.confirm({
      message:  `Supprimer définitivement le besoin <strong>${besoin.ficheDePosteIntitule}</strong> ?<br>
                 <span class="text-sm text-color-secondary">Cette action est irréversible.</span>`,
      header:   'Confirmer la suppression',
      icon:     'fa fa-triangle-exclamation text-red-500',
      acceptLabel:        'Supprimer',
      rejectLabel:        'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.deletingId = besoin.id;
        this.cdr.markForCheck();

        this.service.delete(besoin.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notification.success('Besoin supprimé');
              this.deletingId = null;
              this.loadBesoins();
            },
            error: () => {
              this.deletingId = null;
              this.cdr.markForCheck();
            },
          });
      },
    });
  }

  isDeleting(besoin: BesoinRecrutementSummaryResponse): boolean {
    return this.deletingId === besoin.id;
  }

  // ── Helper ───────────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
