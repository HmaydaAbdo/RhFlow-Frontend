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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { DividerModule } from 'primeng/divider';
import { FichePosteService } from '../../services/fiche-poste.service';
import { DirectionService } from '../../../directions/services/direction.service';
import {
  NIVEAU_ETUDES_OPTIONS,
  DirectionBrief,
  FichePosteRequest
} from '../../models/fiche-poste.models';
import { DirectionResponse, DirectionSearchRequest } from '../../../directions/models/direction.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import { TokenService } from '../../../../core/services/TokenService';
import { RoleName } from '../../../roles/models/role-name.enum';

// ── Constants ────────────────────────────────────────────────────────────────
const DIRECTION_PAGE_SIZE = 15;
const SCROLL_THRESHOLD_PX = 80;
const SCROLL_ATTACH_DELAY = 50;
const DROPDOWN_SCROLL_SEL = '.p-dropdown-items-wrapper';

// ── Local type ───────────────────────────────────────────────────────────────
type DirectionOption = Pick<DirectionResponse, 'id' | 'nom'>;

@Component({
  selector: 'app-fiche-poste-form',
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
  templateUrl: './fiche-poste-form.component.html',
  styleUrl:    './fiche-poste-form.component.scss',
})
export class FichePosteFormComponent implements OnInit {

  // ── DI ───────────────────────────────────────────────────────────────────
  private readonly fb                = inject(FormBuilder);
  private readonly route             = inject(ActivatedRoute);
  private readonly tokenService=inject(TokenService);
  private readonly router            = inject(Router);
  private readonly fichePosteService = inject(FichePosteService);
  private readonly directionService  = inject(DirectionService);
  private readonly notification      = inject(NotificationService);
  private readonly cdr               = inject(ChangeDetectorRef);
  private readonly destroyRef        = inject(DestroyRef);

  // ── Form ─────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    intitulePoste:           ['', [Validators.required]],
    directionId:             [null as number | null, Validators.required],
    niveauEtudes:            [null as string | null, Validators.required],
    domaineFormation:        ['', Validators.required],
    anneesExperience:        [null as number | null, [Validators.required, Validators.min(0)]],
    missionPrincipale:       ['',Validators.required],
    activitesPrincipales:    ['',Validators.required],
    competencesTechniques:   ['',Validators.required],
    competencesManageriales: ['',Validators.required],
  });

  readonly niveauEtudesOptions = NIVEAU_ETUDES_OPTIONS;

  editId:     number | null = null;
  loadingData = false;
  submitting  = false;

  get isEdit():    boolean { return this.editId !== null; }
  get pageTitle(): string  { return this.isEdit ? 'Modifier la fiche de poste' : 'Nouvelle fiche de poste'; }
  get breadcrumb(): string { return this.isEdit ? 'Modifier' : 'Nouvelle fiche'; }

  // ── Direction lazy dropdown ──────────────────────────────────────────────
  // DirectionOption = Pick<id | nom> — compatible avec DirectionBrief et DirectionResponse
  directions:         DirectionOption[] = [];
  directionLoading    = false;
  directionPage       = 0;
  directionTotalPages = 1;

  private directionKeyword      = '';
  private directionScrollEl:    Element       | null = null;
  private directionScrollBound: EventListener | null = null;
  private readonly directionFilter$ = new Subject<string>();

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.subscribeToDirectionFilter();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.editId = +idParam;
      this.loadFormData(this.editId);
    }
  }

  // ── Private subscriptions ────────────────────────────────────────────────
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

  // ── Data loading ─────────────────────────────────────────────────────────
  private loadFormData(id: number): void {
    this.loadingData = true;
    this.cdr.markForCheck();

    this.fichePosteService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: fiche => {
          // Pre-load selected direction — DirectionBrief satisfait DirectionOption
          this.directions = [{ id: fiche.direction.id, nom: fiche.direction.nom }];

          this.form.patchValue({
            intitulePoste:           fiche.intitulePoste,
            directionId:             fiche.direction.id,
            niveauEtudes:            fiche.niveauEtudes,
            domaineFormation:        fiche.domaineFormation,
            anneesExperience:        fiche.anneesExperience,
            missionPrincipale:       fiche.missionPrincipale,
            activitesPrincipales:    fiche.activitesPrincipales,
            competencesTechniques:   fiche.competencesTechniques,
            competencesManageriales: fiche.competencesManageriales,
          });

          this.loadingData = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.notification.error('Fiche de poste introuvable');
          this.router.navigate(['/fiches-de-poste']);
        },
      });
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
          // DirectionResponse satisfait DirectionOption (contient id et nom)
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

  // ── Form helpers ─────────────────────────────────────────────────────────
  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.cdr.markForCheck();

    const v = this.form.value;
    const request: FichePosteRequest = v as FichePosteRequest;
    const call$ = this.isEdit
      ? this.fichePosteService.update(this.editId!, request)
      : this.fichePosteService.create(request);

    call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notification.success(
          this.isEdit ? 'Fiche de poste modifiée avec succès' : 'Fiche de poste créée avec succès'
        );
        this.router.navigate(['/fiches-de-poste']);
      },
      error: () => {
        this.submitting = false;
        this.cdr.markForCheck();
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/fiches-de-poste']);
  }

  canEdit(): boolean {
    return this.tokenService.hasAnyRole([RoleName.DRH, RoleName.ADMIN]);
  }
}
