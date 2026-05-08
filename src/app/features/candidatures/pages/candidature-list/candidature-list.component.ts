import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { NgClass } from '@angular/common';

import { UploadCvDialogComponent } from '../../components/upload-cv-dialog/upload-cv-dialog.component';
import { CandidatureService } from '../../services/candidature.service';
import { ProjetRecrutementService } from '../../../projets-recrutement/services/projet-recrutement.service';
import { TokenService } from '../../../../core/services/TokenService';
import { NotificationService } from '../../../../core/services/NotificationService';
import { RoleName } from '../../../roles/models/role-name.enum';
import {
  CandidatureResponse,
  CandidatureSearchDto,
  RecommandationIA,
  StatutCandidature,
  STATUT_CANDIDATURE_OPTIONS,
  RECOMMANDATION_OPTIONS,
  isPipelineRunning,
  recommandationLabel,
  recommandationSeverity,
  scoreSeverity,
  statutCandidatureLabel,
} from '../../models/candidature.models';
import { PageResponse } from '../../../../core/models/pagination.models';

const PAGE_SIZE = 12;

const SCORE_MIN_OPTIONS: { label: string; value: number }[] = [
  { label: 'Score >= 45  (A etudier +)', value: 45 },
  { label: 'Score >= 75  (A convoquer)', value: 75 },
];

@Component({
  selector: 'app-candidature-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    PaginatorModule,
    ConfirmDialogModule,
    NgClass,
    UploadCvDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './candidature-list.component.html',
})
export class CandidatureListComponent implements OnInit {

  // -- DI -------------------------------------------------------------------
  private readonly service        = inject(CandidatureService);
  private readonly projetService  = inject(ProjetRecrutementService);
  private readonly tokenService   = inject(TokenService);
  private readonly notification   = inject(NotificationService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly cdr            = inject(ChangeDetectorRef);
  private readonly destroyRef     = inject(DestroyRef);

  // -- Route param ----------------------------------------------------------
  projetId!: number;
  nomPoste  = '';

  // -- List state -----------------------------------------------------------
  candidatures: CandidatureResponse[] = [];
  totalRecords  = 0;
  loading       = false;
  currentPage   = 0;

  // -- Filters --------------------------------------------------------------
  readonly filtersForm = new FormGroup({
    statut:         new FormControl<StatutCandidature | null>(null),
    recommandation: new FormControl<RecommandationIA | null>(null),
    scoreMin:       new FormControl<number | null>(null),
  });

  readonly statutOptions      = STATUT_CANDIDATURE_OPTIONS;
  readonly recommandationOpts = RECOMMANDATION_OPTIONS;
  readonly scoreMinOptions    = SCORE_MIN_OPTIONS;

  get currentSearch(): CandidatureSearchDto {
    const { statut, recommandation, scoreMin } = this.filtersForm.value;
    return {
      statut:         statut         ?? undefined,
      recommandation: recommandation ?? undefined,
      scoreMin:       scoreMin       ?? undefined,
    };
  }

  get hasActiveFilters(): boolean {
    const { statut, recommandation, scoreMin } = this.filtersForm.value;
    return !!(statut || recommandation || scoreMin != null);
  }

  get hasPipelineRunning(): boolean {
    return this.candidatures.some(c => isPipelineRunning(c.statut));
  }

  // -- Role helpers ---------------------------------------------------------
  readonly isDrhOrAdmin = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);

  // -- Dialog ---------------------------------------------------------------
  showUploadDialog                            = false;
  selectedCandidature: CandidatureResponse | null = null;

  // -- Enums & helpers exposes au template ----------------------------------
  readonly StatutCandidature      = StatutCandidature;
  readonly isPipelineRunning      = isPipelineRunning;
  readonly recommandationLabel    = recommandationLabel;
  readonly recommandationSeverity = recommandationSeverity;
  readonly scoreSeverity          = scoreSeverity;
  readonly statutCandidatureLabel = statutCandidatureLabel;
  readonly PAGE_SIZE              = PAGE_SIZE;

  // -- Lifecycle ------------------------------------------------------------
  ngOnInit(): void {
    this.projetId = Number(this.route.snapshot.paramMap.get('projetId'));

    this.destroyRef.onDestroy(() => this.service.reset());

    this.subscribeToList();
    this.loadProjetInfo();
    this.loadList();
  }

  private subscribeToList(): void {
    this.service.candidatures$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((page: PageResponse<CandidatureResponse> | null) => {
        if (!page) return;
        this.candidatures = page.content;
        this.totalRecords = page.page.totalElements;
        this.cdr.markForCheck();
      });

    this.service.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });
  }

  private loadProjetInfo(): void {
    this.projetService.getById(this.projetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: projet => {
          this.nomPoste = projet.ficheDePosteIntitule;
          this.cdr.markForCheck();
        },
      });
  }

  // -- Loading --------------------------------------------------------------
  loadList(): void {
    this.service.loadCandidatures(this.projetId, this.currentSearch, this.currentPage, PAGE_SIZE);
  }

  // -- Filters --------------------------------------------------------------
  onFilterChange(): void {
    this.currentPage = 0;
    this.loadList();
  }

  onClearFilters(): void {
    this.filtersForm.reset({ statut: null, recommandation: null, scoreMin: null });
    this.currentPage = 0;
    this.loadList();
  }

  onPageChange(event: PaginatorState): void {
    this.currentPage = event.page ?? 0;
    this.loadList();
  }

  // -- Navigation vers la page de détail ------------------------------------
  openDetail(candidature: CandidatureResponse): void {
    this.router.navigate([candidature.id], { relativeTo: this.route });
  }

  // -- Upload dialog --------------------------------------------------------
  openUpload(): void {
    this.showUploadDialog = true;
    this.cdr.markForCheck();
  }

  onUploadDone(): void {
    this.showUploadDialog = false;
    this.loadList();
  }

  // -- Telecharger CV -------------------------------------------------------
  openCv(candidature: CandidatureResponse): void {
    this.service.getCvUrl(candidature.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => this.triggerDownload(url, candidature.nomFichier),
        error: () => this.notification.error("Impossible d'acceder au fichier CV"),
      });
  }

  private triggerDownload(url: string, fileName: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName ?? 'cv';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // -- Suppression ----------------------------------------------------------
  confirmSupprimer(candidature: CandidatureResponse): void {
    const nom = candidature.nomCandidat ?? candidature.nomFichier;
    this.confirmService.confirm({
      message:                `Supprimer la candidature de <b>${nom}</b> ? Cette action est irreversible.`,
      header:                 'Supprimer la candidature',
      icon:                   'fa fa-trash',
      acceptLabel:            'Supprimer',
      rejectLabel:            'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.service.supprimer(candidature.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notification.success('Candidature supprimee');
              this.loadList();
            },
          });
      },
    });
  }

  // -- Navigation -----------------------------------------------------------
  goBack(): void {
    this.router.navigate(['/projets-recrutement']);
  }

  // -- Helpers --------------------------------------------------------------
  formatDate(iso: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  trackById(_: number, c: CandidatureResponse): number { return c.id; }
}
