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
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, merge, Subject } from 'rxjs';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmationService } from 'primeng/api';

// Services & Models
import { FichePosteService } from '../../services/fiche-poste.service';
import { DirectionService } from '../../../directions/services/direction.service';
import {
  FichePosteSummaryResponse,
  FichePosteSearchRequest,
  NIVEAU_ETUDES_OPTIONS,
  NiveauEtudes
} from '../../models/fiche-poste.models';
import { DirectionResponse, DirectionSearchRequest } from '../../../directions/models/direction.models';
import { PageResponse } from '../../../../core/models/pagination.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import { TokenService } from '../../../../core/services/TokenService';
import { RoleName } from '../../../roles/models/role-name.enum';

// Constantes pour le Lazy Loading du Dropdown
const DIRECTION_PAGE_SIZE = 15;
const SCROLL_THRESHOLD_PX = 80;
const SCROLL_ATTACH_DELAY = 50;
const DROPDOWN_SCROLL_SEL = '.p-dropdown-items-wrapper';

@Component({
  selector: 'app-fiche-poste-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
    PaginatorModule
  ],
  providers: [ConfirmationService],
  templateUrl: './fiche-poste-list.component.html',
})
export class FichePosteListComponent implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly fichePosteService   = inject(FichePosteService);
  private readonly tokenService = inject(TokenService);
  private readonly directionService    = inject(DirectionService);
  private readonly notification        = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router              = inject(Router);
  private readonly cdr                 = inject(ChangeDetectorRef);
  private readonly destroyRef          = inject(DestroyRef);

  // ── State: Fiches de Poste ───────────────────────────────────────────────
  fiches: FichePosteSummaryResponse[] = [];
  totalRecords = 0;
  loading = false;

  readonly niveauEtudesOptions = NIVEAU_ETUDES_OPTIONS;

  readonly filtersForm = new FormGroup({
    intitulePoste: new FormControl<string>('', { nonNullable: true }),
    directionId:   new FormControl<number | null>(null),
    niveauEtudes:  new FormControl<NiveauEtudes | null>(null),
  });

  currentRequest: FichePosteSearchRequest = {
    page: 0, size: 9, sortBy: 'id', direction: 'asc'
  };

  // ── State: Direction Lazy Dropdown (Filtre) ──────────────────────────────
  directions: DirectionResponse[] = [];
  directionLoading = false;
  directionPage = 0;
  directionTotalPages = 1;
  private directionKeyword = '';
  private directionScrollEl: Element | null = null;
  private directionScrollBound: EventListener | null = null;
  private readonly directionFilter$ = new Subject<string>();

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initFilterSub();
    this.initDirectionFilterSub();
    this.initDataStreamSub();

    // Chargement initial des données
    this.loadFiches();
    this.resetAndLoadDirections();
  }

  // ── Subscriptions ────────────────────────────────────────────────────────
  private initFilterSub(): void {
    // On écoute TOUT le formulaire d'un coup
    this.filtersForm.valueChanges.pipe(
      debounceTime(300), // Évite les doubles requêtes
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.currentRequest.page = 0; // Reset page à 0 lors d'un filtrage
      this.loadFiches();
    });
  }

  private initDirectionFilterSub(): void {
    this.directionFilter$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(keyword => {
      this.directionKeyword = keyword;
      this.resetAndLoadDirections();
    });
  }

  private initDataStreamSub(): void {
    // Écoute du store/service pour les fiches
    this.fichePosteService.fiches$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<FichePosteSummaryResponse> | null) => {
        if (res) {
          this.fiches = res.content;
          this.totalRecords = res.page.totalElements;
          this.cdr.markForCheck();
        }
      });

    // Écoute de l'état de chargement
    this.fichePosteService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });
  }

  // ── Fiche Poste Logic ────────────────────────────────────────────────────
  loadFiches(): void {
    this.applyFiltersToRequest();
    this.fichePosteService.loadFiches(this.currentRequest);
  }

  private applyFiltersToRequest(): void {
    const { intitulePoste, directionId, niveauEtudes } = this.filtersForm.value;
    this.currentRequest.intitulePoste = intitulePoste || undefined;
    this.currentRequest.directionId   = directionId   ?? undefined;
    this.currentRequest.niveauEtudes  = niveauEtudes  ?? undefined;
  }

  onClearFilters(): void {
    this.filtersForm.reset({ intitulePoste: '', directionId: null, niveauEtudes: null });
    this.currentRequest.page = 0;
    this.loadFiches();
  }

  onPageChange(event: PaginatorState): void {
    this.currentRequest.page = event.page ?? 0;
    this.currentRequest.size = event.rows ?? 9;
    this.loadFiches();
  }

  // ── Direction Lazy Dropdown Logic (Même logique que le formulaire) ───────
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
    this.directionScrollEl = null;
    this.directionScrollBound = null;
  }

  private onDirectionScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX;
    if (nearBottom) this.loadNextDirectionPage();
  }

  private resetAndLoadDirections(): void {
    this.directions = [];
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
          this.directions = [...this.directions, ...result.content];
          this.directionTotalPages = result.page.totalPages;
          this.directionPage++;
          this.directionLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.directionLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  goToCreate(): void { this.router.navigate(['/fiches-de-poste/new']); }

  goToEdit(fiche: FichePosteSummaryResponse): void {
    this.router.navigate(['/fiches-de-poste', fiche.id, 'edit']);
  }

  confirmDelete(fiche: FichePosteSummaryResponse): void {
    this.confirmationService.confirm({
      message: `Voulez-vous supprimer la fiche <b>${fiche.intitulePoste}</b> ?`,
      header: 'Confirmation de suppression',
      icon: 'fa fa-triangle-exclamation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.fichePosteService.delete(fiche.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notification.success('Fiche de poste supprimée');
              this.loadFiches();
            }
          });
      }
    });
  }

  getEtudesLabel(value: NiveauEtudes): string {
    return NIVEAU_ETUDES_OPTIONS.find(o => o.value === value)?.label ?? value;
  }

  get hasActiveFilters(): boolean {
    const { intitulePoste, directionId, niveauEtudes } = this.filtersForm.value;
    return !!(intitulePoste || directionId != null || niveauEtudes != null);
  }

  canCreate(): boolean {
    return this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR]);
  }

  canDelete(): boolean {
    return this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);
  }

}
