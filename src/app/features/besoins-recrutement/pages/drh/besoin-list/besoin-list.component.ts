import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { Router } from '@angular/router';
import { BesoinRecrutementService } from '../../../services/besoin-recrutement.service';
import { DirectionService } from '../../../../directions/services/direction.service';
import {
  BesoinRecrutementSummaryResponse,
  BesoinRecrutementSearchDto,
  PRIORITE_BESOIN_OPTIONS,
  StatutBesoin,
  PrioriteBesoin,
  DecisionStatut,
  statutLabel,
  prioriteLabel,
  statutSeverity,
  prioriteSeverity
} from '../../../models/besoin-recrutement.models';
import { DirectionResponse, DirectionSearchRequest } from '../../../../directions/models/direction.models';
import { PageResponse } from '../../../../../core/models/pagination.models';
import { NotificationService } from '../../../../../core/services/NotificationService';
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {NgClass, TitleCasePipe} from "@angular/common";

// ── Constants ────────────────────────────────────────────────────────────────
const DIRECTION_PAGE_SIZE  = 15;
const SCROLL_THRESHOLD_PX  = 80;
const SCROLL_ATTACH_DELAY  = 50;
const DROPDOWN_SCROLL_SEL  = '.p-dropdown-items-wrapper';

@Component({
  selector: 'app-besoin-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    DialogModule,
    DividerModule,
    PaginatorModule,
    ConfirmDialogModule,
    NgClass,
    TitleCasePipe,
  ],
  providers: [],
  templateUrl: './besoin-list.component.html',
})
export class BesoinListComponent implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly service             = inject(BesoinRecrutementService);
  private readonly directionService    = inject(DirectionService);
  private readonly notification        = inject(NotificationService);
  private readonly router              = inject(Router);
  private readonly fb                  = inject(FormBuilder);
  private readonly cdr                 = inject(ChangeDetectorRef);
  private readonly destroyRef          = inject(DestroyRef);

  // ── Filter form ──────────────────────────────────────────────────────────
  readonly filterForm = this.fb.group({
    directionId: [null as number         | null],
    priorite:    [null as PrioriteBesoin | null],
  });

  // ── List state ───────────────────────────────────────────────────────────
  besoins:      BesoinRecrutementSummaryResponse[] = [];
  totalRecords  = 0;
  loading       = false;

  readonly prioriteOptions = PRIORITE_BESOIN_OPTIONS;

  // "Tous les besoins" = uniquement encours=true (les décidés vont dans l'archive)
  public currentRequest: BesoinRecrutementSearchDto = {
    page: 0, size: 9, sortBy: 'createdAt', direction: 'desc', encours: true,
  };

  // ── Direction lazy dropdown ──────────────────────────────────────────────
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

  // ── Detail dialog ────────────────────────────────────────────────────────
  showDetailDialog = false;
  detailBesoin:    BesoinRecrutementSummaryResponse | null = null;

  // ── Pure helpers exposés au template ────────────────────────────────────
  readonly statutLabel      = statutLabel;
  readonly prioriteLabel    = prioriteLabel;
  readonly statutSeverity   = statutSeverity;
  readonly prioriteSeverity = prioriteSeverity;
  readonly StatutBesoin     = StatutBesoin;
  readonly PrioriteBesoin   = PrioriteBesoin;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.subscribeToBesoins();
    this.subscribeToLoading();
    this.subscribeToFilters();
    this.subscribeToDirectionFilter();
    this.loadBesoins();
  }

  // ── Private subscriptions ────────────────────────────────────────────────
  private subscribeToBesoins(): void {
    this.service.besoins$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<BesoinRecrutementSummaryResponse> | null) => {
        if (!res) return;
        this.besoins      = res.content;
        this.totalRecords = res.page.totalElements;
        this.cdr.markForCheck();
      });
  }

  private subscribeToLoading(): void {
    this.service.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });
  }

  private subscribeToFilters(): void {
    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentRequest = { ...this.currentRequest, page: 0 };
        this.loadBesoins();
      });
  }

  private subscribeToDirectionFilter(): void {
    this.directionFilter$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(keyword => {
      this.directionKeyword = keyword;
      this.resetAndLoadDirections();
    });
  }

  // ── Besoins loading ──────────────────────────────────────────────────────
  private loadBesoins(): void {
    const { directionId, priorite } = this.filterForm.value;
    this.currentRequest = {
      ...this.currentRequest,
      directionId: directionId ?? undefined,
      priorite:    priorite    ?? undefined,
    };
    this.service.loadBesoins(this.currentRequest);
  }

  // ── Filter actions ───────────────────────────────────────────────────────
  onClearFilters(): void {
    this.filterForm.reset({ directionId: null, priorite: null });
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
    const { directionId, priorite } = this.filterForm.value;
    return !!(directionId || priorite);
  }

  // ── Direction lazy dropdown ──────────────────────────────────────────────
  onDirectionShow(): void {
    if (!this.directions.length || this.directionPage === 0) this.resetAndLoadDirections();
    setTimeout(() => this.attachDirectionScroll(), SCROLL_ATTACH_DELAY);
  }

  onDirectionHide(): void {
    this.detachDirectionScroll();
  }

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
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX;
    if (nearBottom) this.loadNextDirectionPage();
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
        error: () => {
          this.directionLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Detail dialog ────────────────────────────────────────────────────────
  openDetail(besoin: BesoinRecrutementSummaryResponse): void {
    this.detailBesoin     = besoin;
    this.showDetailDialog = true;
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.showDetailDialog = false;
    this.detailBesoin     = null;
    this.cdr.markForCheck();
  }

  // ── Decision dialog ──────────────────────────────────────────────────────
  openDecision(besoin: BesoinRecrutementSummaryResponse, decision: DecisionStatut): void {
    this.decisionTarget     = besoin;
    this.pendingDecision    = decision;
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
            this.pendingDecision === StatutBesoin.ACCEPTE ? 'Besoin accepté' : 'Besoin refusé'
          );
          this.submittingDecision = false;
          this.closeDecision();
          this.loadBesoins();
        },
        error: () => {
          this.submittingDecision = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Edit ────────────────────────────────────────────────────────────────
  goToEdit(besoin: BesoinRecrutementSummaryResponse): void {
    this.router.navigate(['/besoins-recrutement', besoin.id, 'edit']);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
