import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { Router } from '@angular/router';
import { ProjetRecrutementService } from '../../services/projet-recrutement.service';
import { DirectionService } from '../../../directions/services/direction.service';
import { TokenService } from '../../../../core/services/TokenService';
import { NotificationService } from '../../../../core/services/NotificationService';
import { RoleName } from '../../../roles/models/role-name.enum';
import {
  ProjetRecrutementSummaryResponse,
  ProjetRecrutementResponse,
  ProjetRecrutementSearchDto,
  UpdateObjetCandidatureRequest,
  STATUT_PROJET_OPTIONS,
  StatutProjet,
  statutProjetLabel,
  statutProjetSeverity
} from '../../models/projet-recrutement.models';
import { DirectionResponse, DirectionSearchRequest } from '../../../directions/models/direction.models';
import { PageResponse } from '../../../../core/models/pagination.models';
import {NgClass} from "@angular/common";

// ── Constants ───────────────────────────────────────────────────────────────
const DIRECTION_PAGE_SIZE = 15;
const SCROLL_THRESHOLD_PX = 80;
const SCROLL_ATTACH_DELAY = 50;
const DROPDOWN_SCROLL_SEL = '.p-dropdown-items-wrapper';

@Component({
  selector: 'app-projet-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    DialogModule,
    DividerModule,
    PaginatorModule,
    ConfirmDialogModule,
    InputTextModule,
    NgClass,
  ],
  providers: [ConfirmationService],
  templateUrl: './projet-list.component.html',
})
export class ProjetListComponent implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly service          = inject(ProjetRecrutementService);
  private readonly directionService = inject(DirectionService);
  private readonly tokenService     = inject(TokenService);
  private readonly notification     = inject(NotificationService);
  private readonly confirmService   = inject(ConfirmationService);
  private readonly router           = inject(Router);
  private readonly cdr              = inject(ChangeDetectorRef);
  private readonly destroyRef       = inject(DestroyRef);

  // ── List state ───────────────────────────────────────────────────────────
  projets:      ProjetRecrutementSummaryResponse[] = [];
  totalRecords  = 0;
  loading       = false;

  readonly filtersForm = new FormGroup({
    directionId: new FormControl<number | null>(null),
    statut:      new FormControl<StatutProjet | null>(null),
  });

  readonly statutOptions = STATUT_PROJET_OPTIONS;

  currentRequest: ProjetRecrutementSearchDto = {
    page: 0, size: 9, sortBy: 'createdAt', direction: 'desc',
  };

  // ── Role helpers ─────────────────────────────────────────────────────────
  readonly isDrhOrAdmin = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);

  // ── Direction lazy dropdown ──────────────────────────────────────────────
  directions:         DirectionResponse[] = [];
  directionLoading    = false;
  directionPage       = 0;
  directionTotalPages = 1;

  private directionKeyword      = '';
  private directionScrollEl:    Element       | null = null;
  private directionScrollBound: EventListener | null = null;
  private readonly directionFilter$ = new Subject<string>();

  // ── Objet candidature — inline edit (DRH/ADMIN) ─────────────────────────
  editingObjetId: number | null = null;
  editObjetCtrl   = new FormControl<string>('', { nonNullable: true });
  savingObjet     = false;

  // ── Detail dialog ────────────────────────────────────────────────────────
  showDetailDialog  = false;
  detailProjet:     ProjetRecrutementSummaryResponse | null = null;
  detailFull:       ProjetRecrutementResponse        | null = null;
  loadingDetail     = false;

  // ── Pure helpers ─────────────────────────────────────────────────────────
  readonly statutProjetLabel    = statutProjetLabel;
  readonly statutProjetSeverity = statutProjetSeverity;

  // ── Enum exposée au template (typage strict) ─────────────────────────────
  readonly StatutProjet = StatutProjet;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.subscriptions();
    this.loadProjets();
  }

  private subscriptions(): void {
    this.service.projets$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<ProjetRecrutementSummaryResponse> | null) => {
        if (!res) return;
        this.projets      = res.content;
        this.totalRecords = res.page.totalElements;
        this.cdr.markForCheck();
      });

    this.service.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    this.directionFilter$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(keyword => {
      this.directionKeyword = keyword;
      this.resetAndLoadDirections();
    });
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  private loadProjets(): void {
    const { directionId, statut } = this.filtersForm.value;
    this.currentRequest = {
      ...this.currentRequest,
      directionId: directionId ?? undefined,
      statut:      statut      ?? undefined,
    };
    this.service.loadProjets(this.currentRequest);
  }

  // ── Filter actions ───────────────────────────────────────────────────────
  onFilterChange(): void {
    this.currentRequest = { ...this.currentRequest, page: 0 };
    this.loadProjets();
  }

  onClearFilters(): void {
    this.filtersForm.reset({ directionId: null, statut: null });
    this.currentRequest = { ...this.currentRequest, page: 0 };
    this.loadProjets();
  }

  onPageChange(event: PaginatorState): void {
    this.currentRequest = {
      ...this.currentRequest,
      page: event.page ?? 0,
      size: event.rows ?? 9,
    };
    this.loadProjets();
  }

  get hasActiveFilters(): boolean {
    const { statut, directionId } = this.filtersForm.value;
    return !!(statut || directionId != null);
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
        next: result => {
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
  openDetail(projet: ProjetRecrutementSummaryResponse): void {
    this.detailProjet     = projet;
    this.detailFull       = null;
    this.showDetailDialog = true;
    this.loadingDetail    = true;
    this.cdr.markForCheck();

    this.service.getById(projet.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: full => {
          this.detailFull    = full;
          this.loadingDetail = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingDetail = false;
          this.cdr.markForCheck();
        }
      });
  }

  closeDetail(): void {
    this.showDetailDialog = false;
    this.detailProjet     = null;
    this.detailFull       = null;
    this.cdr.markForCheck();
  }

  // ── Fermer un projet ─────────────────────────────────────────────────────
  confirmFermer(projet: ProjetRecrutementSummaryResponse): void {
    this.confirmService.confirm({
      message:                `Voulez-vous fermer le projet <b>${projet.ficheDePosteIntitule}</b> ? Cette action est irréversible.`,
      header:                 'Fermer le projet',
      icon:                   'fa fa-lock',
      acceptLabel:            'Confirmer',
      rejectLabel:            'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.fermer(projet.id).subscribe({
          next: () => {
            this.notification.success('Projet de recrutement fermé avec succès');
            this.loadProjets();
          }
        });
      }
    });
  }

  // ── Objet candidature — inline edit ──────────────────────────────────────

  openEditObjet(projet: ProjetRecrutementSummaryResponse): void {
    this.editingObjetId = projet.id;
    this.editObjetCtrl.setValue(projet.objetCandidature);
    this.cdr.markForCheck();
  }

  cancelEditObjet(): void {
    this.editingObjetId = null;
    this.editObjetCtrl.reset('');
    this.cdr.markForCheck();
  }

  saveObjet(projet: ProjetRecrutementSummaryResponse): void {
    const trimmed = this.editObjetCtrl.value.trim();
    if (!trimmed || trimmed === projet.objetCandidature) {
      this.cancelEditObjet();
      return;
    }

    this.savingObjet = true;
    this.cdr.markForCheck();

    const request: UpdateObjetCandidatureRequest = { objetCandidature: trimmed };
    this.service.updateObjetCandidature(projet.id, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          projet.objetCandidature = updated.objetCandidature;
          this.editingObjetId = null;
          this.editObjetCtrl.reset('');
          this.savingObjet    = false;
          this.notification.success('Objet de candidature mis à jour');
          this.cdr.markForCheck();
        },
        error: () => {
          this.savingObjet = false;
          this.cdr.markForCheck();
        }
      });
  }

  copyObjet(objet: string): void {
    navigator.clipboard.writeText(objet).then(() => {
      this.notification.success('Objet copié dans le presse-papier');
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackByProjet(_: number, p: ProjetRecrutementSummaryResponse): number { return p.id; }

  goToOffre(projet: ProjetRecrutementSummaryResponse): void {
    this.router.navigate(['/projets-recrutement', projet.id, 'offre']);
  }

  goToCandidatures(projetId: number): void {
    this.router.navigate(['/projets-recrutement', projetId, 'candidatures']);
  }
}



