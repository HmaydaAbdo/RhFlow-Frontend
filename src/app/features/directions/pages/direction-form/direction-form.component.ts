import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { DividerModule } from 'primeng/divider';
import { DirectionService } from '../../services/direction.service';
import { UserService } from '../../../users/services/user.service';
import { UserResponse } from '../../../users/models/user.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import {DirectionRequest} from "../../models/direction.models";

const PAGE_SIZE = 15;

@Component({
  selector: 'app-direction-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    DividerModule,
  ],
  templateUrl: './direction-form.component.html',
  styleUrl: './direction-form.component.scss',
})
export class DirectionFormComponent implements OnInit {

  private readonly fb               = inject(FormBuilder);
  private readonly route            = inject(ActivatedRoute);
  private readonly router           = inject(Router);
  private readonly directionService = inject(DirectionService);
  private readonly userService      = inject(UserService);
  private readonly notification     = inject(NotificationService);
  private readonly cdr              = inject(ChangeDetectorRef);
  private readonly destroyRef       = inject(DestroyRef);

  // ── Form ────────────────────────────────────────────
  form = this.fb.group({
    nom:         ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    directeurId: [null as number | null, Validators.required]
  });

  editId: number | null = null;
  loadingData = false;
  submitting  = false;

  get isEdit():    boolean { return this.editId !== null; }
  get pageTitle(): string  { return this.isEdit ? 'Modifier la direction' : 'Nouvelle direction'; }
  get breadcrumb():string  { return this.isEdit ? 'Modifier' : 'Nouveau'; }

  // ── Director lazy dropdown ──────────────────────────
  directors:           UserResponse[] = [];
  directorLoading      = false;
  directorPage         = 0;
  directorTotalPages   = 1;
  directorKeyword      = '';
  private scrollEl:    Element | null = null;
  private scrollBound: EventListener | null = null;
  private filterInput$ = new Subject<string>();

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.editId = +idParam;
      this.loadDirection(this.editId);
    }

    // Debounce filter input
    this.filterInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(kw => {
        this.directorKeyword = kw;
        this.resetAndLoad();
      });
  }

  // ── Direction load for edit ──────────────────────────
  private loadDirection(id: number): void {
    this.loadingData = true;
    this.cdr.markForCheck();

    this.directionService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: d => {
          this.form.patchValue({
            nom:         d.nom,
            directeurId: d.directeurId ,
          });
          // Pre-load the selected director so dropdown shows the name immediately
          if (d.directeurId) {
            this.directors = [{
              id:       d.directeurId,
              fullName: d.directeurNom ?? '',
              email:    '',
              gsm:      '',
              enabled:  true,
              roles:    [],
            }];
          }
          this.loadingData = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.notification.error('Direction introuvable');
          this.router.navigate(['/directions']);
        },
      });
  }

  // ── Dropdown lifecycle ───────────────────────────────

  /** Called when the dropdown panel opens */
  onDirectorShow(): void {
    // Reset list only if it's empty or was from a previous session
    if (this.directors.length === 0 || this.directorPage === 0) {
      this.resetAndLoad();
    }

    // Attach scroll listener after the panel is rendered
    setTimeout(() => {
      this.scrollEl = document.querySelector('.p-dropdown-items-wrapper');
      if (this.scrollEl) {
        this.scrollBound = this.onPanelScroll.bind(this);
        this.scrollEl.addEventListener('scroll', this.scrollBound);
      }
    }, 50);
  }

  /** Called when the dropdown panel closes */
  onDirectorHide(): void {
    this.detachScroll();
  }

  /** Handles filter input — debounced */
  onDirectorFilter(event: { filter: string }): void {
    this.filterInput$.next(event.filter ?? '');
  }

  /** Scroll event on the dropdown panel */
  private onPanelScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) {
      this.loadNextPage();
    }
  }

  // ── Data loading ─────────────────────────────────────

  private resetAndLoad(): void {
    this.directors    = [];
    this.directorPage = 0;
    this.loadNextPage();
  }

  private loadNextPage(): void {
    if (this.directorLoading) return;
    if (this.directorPage > 0 && this.directorPage >= this.directorTotalPages) return;

    this.directorLoading = true;
    this.cdr.markForCheck();

    this.userService
      .getDirectorsPage({ page: this.directorPage, size: PAGE_SIZE, keyword: this.directorKeyword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.directors      = [...this.directors, ...result.content];
          this.directorTotalPages = result.page.totalPages;
          this.directorPage++;
          this.directorLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.directorLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private detachScroll(): void {
    if (this.scrollEl && this.scrollBound) {
      this.scrollEl.removeEventListener('scroll', this.scrollBound);
      this.scrollEl   = null;
      this.scrollBound = null;
    }
  }

  // ── Form validation ──────────────────────────────────
  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  // ── Submit ───────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.cdr.markForCheck(); return; }

    this.submitting = true;
    this.cdr.markForCheck();

    const { nom, directeurId } = this.form.value;
    const request = {
      nom:         nom!,
      directeurId: directeurId ,
    } as DirectionRequest;

    const call$ = this.isEdit
      ? this.directionService.update(this.editId!, request)
      : this.directionService.create(request);

    call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notification.success(
          this.isEdit ? 'Direction modifiée avec succès' : 'Direction créée avec succès'
        );
        this.router.navigate(['/directions']);
      },
      error: () => { this.submitting = false; this.cdr.markForCheck(); },
    });
  }

  onCancel(): void {
    this.router.navigate(['/directions']);
  }
}
