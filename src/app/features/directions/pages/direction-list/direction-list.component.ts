// src/app/features/directions/pages/direction-list/direction-list.component.ts
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmationService } from 'primeng/api';
import { DirectionService } from '../../services/direction.service';
import { DirectionResponse, DirectionSearchRequest } from '../../models/direction.models';
import { PageResponse } from '../../../../core/models/pagination.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import { UserService } from '../../../users/services/user.service';
import { UserResponse } from '../../../users/models/user.models';

// ── Constants ────────────────────────────────────────────────────────────────
const DIRECTOR_PAGE_SIZE  = 15;
const SCROLL_THRESHOLD_PX = 80;
const SCROLL_ATTACH_DELAY = 50;
const DROPDOWN_SCROLL_SEL = '.p-dropdown-items-wrapper';

@Component({
  selector: 'app-direction-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
    DropdownModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './direction-list.component.html',
})
export class DirectionListComponent implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly directionService    = inject(DirectionService);
  private readonly userService         = inject(UserService);
  private readonly notification        = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router              = inject(Router);
  private readonly fb                  = inject(FormBuilder);
  private readonly cdr                 = inject(ChangeDetectorRef);
  private readonly destroyRef          = inject(DestroyRef);

  // ── Filter form ──────────────────────────────────────────────────────────
  readonly filterForm = this.fb.group({
    nom:         [''],
    directeurId: [null as number | null],
  });

  get hasActiveFilters(): boolean {
    const { nom, directeurId } = this.filterForm.value;
    return !!(nom || directeurId);
  }

  // ── Table state ──────────────────────────────────────────────────────────
  directions:   DirectionResponse[] = [];
  totalRecords  = 0;
  loading       = false;

  private currentRequest: DirectionSearchRequest = {
    page:      0,
    size:      10,
    sortBy:    'id',
    direction: 'asc',
  };

  // ── Director lazy dropdown ───────────────────────────────────────────────
  directors:         UserResponse[] = [];
  directorLoading    = false;
  directorPage       = 0;
  directorTotalPages = 1;

  private directorKeyword  = '';
  private scrollEl:    Element       | null = null;
  private scrollBound: EventListener | null = null;
  private readonly directorFilter$ = new Subject<string>();

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.subscribeToDirections();
    this.subscribeToLoading();
    this.subscribeToFilterForm();
    this.subscribeToDirectorFilter();
  }

  // ── Private subscriptions ────────────────────────────────────────────────
  private subscribeToDirections(): void {
    this.directionService.directions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<DirectionResponse> | null) => {
        if (!res) return;
        this.directions   = res.content;
        this.totalRecords = res.page.totalElements;
        this.cdr.markForCheck();
      });
  }

  private subscribeToLoading(): void {
    this.directionService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });
  }

  private subscribeToFilterForm(): void {
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) =>
        a.nom === b.nom && a.directeurId === b.directeurId
      ),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(values => {
      this.currentRequest = {
        ...this.currentRequest,
        page:        0,
        nom:         values.nom         || undefined,
        directeurId: values.directeurId ?? undefined,
      };
      this.directionService.loadDirections(this.currentRequest);
    });
  }

  private subscribeToDirectorFilter(): void {
    this.directorFilter$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(keyword => {
      this.directorKeyword = keyword;
      this.resetAndLoadDirectors();
    });
  }

  // ── Table events ─────────────────────────────────────────────────────────
  onTableLazyLoad(event: TableLazyLoadEvent): void {
    this.currentRequest = {
      ...this.currentRequest,
      page:      (event.first ?? 0) / (event.rows ?? 10),
      size:      event.rows ?? 10,
      sortBy:    event.sortField ? (event.sortField as string) : this.currentRequest.sortBy,
      direction: event.sortField ? (event.sortOrder === 1 ? 'asc' : 'desc') : this.currentRequest.direction,
    };
    this.directionService.loadDirections(this.currentRequest);
  }

  // ── Filter actions ───────────────────────────────────────────────────────
  onClearFilters(): void {
    this.filterForm.reset();
  }

  // ── Director dropdown ────────────────────────────────────────────────────
  onDirectorShow(): void {
    if (!this.directors.length || this.directorPage === 0) {
      this.resetAndLoadDirectors();
    }
    setTimeout(() => this.attachScrollListener(), SCROLL_ATTACH_DELAY);
  }

  onDirectorHide(): void {
    this.detachScrollListener();
  }

  onDirectorFilter(event: { filter: string }): void {
    this.directorFilter$.next(event.filter ?? '');
  }

  private attachScrollListener(): void {
    this.scrollEl = document.querySelector(DROPDOWN_SCROLL_SEL);
    if (!this.scrollEl) return;
    this.scrollBound = this.onPanelScroll.bind(this);
    this.scrollEl.addEventListener('scroll', this.scrollBound);
  }

  private detachScrollListener(): void {
    if (!this.scrollEl || !this.scrollBound) return;
    this.scrollEl.removeEventListener('scroll', this.scrollBound);
    this.scrollEl    = null;
    this.scrollBound = null;
  }

  private onPanelScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX;
    if (nearBottom) this.loadNextDirectorPage();
  }

  private resetAndLoadDirectors(): void {
    this.directors    = [];
    this.directorPage = 0;
    this.loadNextDirectorPage();
  }

  private loadNextDirectorPage(): void {
    if (this.directorLoading) return;
    if (this.directorPage > 0 && this.directorPage >= this.directorTotalPages) return;

    this.directorLoading = true;
    this.cdr.markForCheck();

    this.userService
      .getDirectorsPage({ page: this.directorPage, size: DIRECTOR_PAGE_SIZE, keyword: this.directorKeyword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.directors          = [...this.directors, ...result.content];
          this.directorTotalPages = result.page.totalPages;
          this.directorPage++;
          this.directorLoading    = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.directorLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  goToCreate(): void {
    this.router.navigate(['/directions/new']);
  }

  goToEdit(direction: DirectionResponse): void {
    this.router.navigate(['/directions', direction.id, 'edit']);
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  confirmDelete(direction: DirectionResponse): void {
    this.confirmationService.confirm({
      message:                `Voulez-vous supprimer la direction <b>${direction.nom}</b> ?`,
      header:                 'Confirmation de suppression',
      icon:                   'fa fa-triangle-exclamation',
      acceptLabel:            'Supprimer',
      rejectLabel:            'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept:                 () => this.deleteDirection(direction),
    });
  }

  private deleteDirection(direction: DirectionResponse): void {
    this.directionService.delete(direction.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('Direction supprimée');
          this.directionService.loadDirections(this.currentRequest);
        },
      });
  }

  // ── Track by ─────────────────────────────────────────────────────────────
  trackByDirection(_: number, d: DirectionResponse): number {
    return d.id;
  }
}
