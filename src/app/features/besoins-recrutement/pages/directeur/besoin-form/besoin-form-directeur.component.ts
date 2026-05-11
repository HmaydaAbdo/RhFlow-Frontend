import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { DividerModule } from 'primeng/divider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { BesoinRecrutementService } from '../../../services/besoin-recrutement.service';
import { FichePosteService } from '../../../../fiches-poste/services/fiche-poste.service';
import {
  PRIORITE_BESOIN_OPTIONS,
  PrioriteBesoin
} from '../../../models/besoin-recrutement.models';
import { FichePosteSummaryResponse } from '../../../../fiches-poste/models/fiche-poste.models';
import { NotificationService } from '../../../../../core/services/NotificationService';
import { TokenService } from '../../../../../core/services/TokenService';
import { RoleName } from '../../../../roles/models/role-name.enum';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-besoin-form-directeur',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CalendarModule,
    DividerModule,
    SelectButtonModule,
    NgClass
  ],
  templateUrl: './besoin-form-directeur.component.html',
})
export class BesoinFormDirecteurComponent implements OnInit {

  private readonly fb            = inject(FormBuilder);
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);
  private readonly service       = inject(BesoinRecrutementService);
  private readonly ficheService  = inject(FichePosteService);
  private readonly notification  = inject(NotificationService);
  private readonly tokenService  = inject(TokenService);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly destroyRef    = inject(DestroyRef);

  /** ADMIN et DRH peuvent choisir n'importe quelle fiche de poste.
   *  Un DIRECTEUR ne voit que les fiches de sa propre direction. */
  readonly isAdminOrDrh = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);

  // ── Form ─────────────────────────────────────────────────────────────────
  form = this.fb.group({
    ficheDePosteId:  [null as number | null, Validators.required],
    lieuAffectation: ['', [Validators.required, Validators.maxLength(200)]],
    motif:           ['', [Validators.required, Validators.maxLength(2000)]],
    nombrePostes:    [null as number | null, [Validators.required, Validators.min(1), Validators.max(999)]],
    dateSouhaitee:   [null as Date | null, Validators.required],
    priorite:        [null as PrioriteBesoin | null, Validators.required]
  });

  // ── Options ───────────────────────────────────────────────────────────────
  readonly prioriteOptions = PRIORITE_BESOIN_OPTIONS;
  ficheOptions: FichePosteSummaryResponse[] = [];

  // ── State ─────────────────────────────────────────────────────────────────
  editId: number | null = null;
  loadingData = false;
  submitting  = false;

  get isEdit(): boolean   { return this.editId !== null; }
  get pageTitle(): string { return this.isEdit ? 'Modifier le besoin' : 'Nouveau besoin en recrutement'; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.editId = +idParam;
      this.loadForEdit(this.editId);
    } else {
      this.loadFiches();
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadFiches(): void {
    this.loadingData = true;
    this.cdr.markForCheck();

    this.ficheService.getAllForDropdown()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: fiches => {
          this.ficheOptions = fiches;
          this.loadingData  = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadForEdit(id: number): void {
    this.loadingData = true;
    this.cdr.markForCheck();

    forkJoin({
      besoin: this.service.getById(id),
      fiches: this.ficheService.getAllForDropdown()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ besoin, fiches }) => {
        this.ficheOptions = fiches;
        this.form.patchValue({
          ficheDePosteId:  besoin.ficheDePosteId,
          lieuAffectation: besoin.lieuAffectation,
          motif:           besoin.motif,
          nombrePostes:    besoin.nombrePostes,
          dateSouhaitee:   new Date(besoin.dateSouhaitee),
          priorite:        besoin.priorite
        });
        this.loadingData = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notification.error('Besoin introuvable');
        this.router.navigate(['/besoins-recrutement']);
      }
    });
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.cdr.markForCheck(); return; }

    this.submitting = true;
    this.cdr.markForCheck();

    const v = this.form.value;
    const request = {
      ficheDePosteId:  v.ficheDePosteId!,
      lieuAffectation: v.lieuAffectation!,
      motif:           v.motif!,
      nombrePostes:    v.nombrePostes!,
      dateSouhaitee:   this.toIsoDate(v.dateSouhaitee as Date),
      priorite:        v.priorite as PrioriteBesoin
    };

    const call$ = this.isEdit
      ? this.service.update(this.editId!, request)
      : this.service.create(request);

    call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notification.success(
          this.isEdit ? 'Besoin modifié avec succès' : 'Besoin créé avec succès'
        );
        this.router.navigate(['/besoins-recrutement']);
      },
      error: () => { this.submitting = false; this.cdr.markForCheck(); }
    });
  }

  onCancel(): void { this.router.navigate(['/besoins-recrutement']); }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
