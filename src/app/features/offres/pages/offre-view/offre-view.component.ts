import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService } from 'primeng/api';

import { OffreService } from '../../services/offre.service';
import { OffreResponse } from '../../models/offre.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import { TokenService } from '../../../../core/services/TokenService';
import { RoleName } from '../../../roles/models/role-name.enum';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-offre-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    TooltipModule,
    ConfirmDialogModule,
    TextareaModule,
    MarkdownPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './offre-view.component.html',
})
export class OffreViewComponent implements OnInit {

  // ── DI ─────────────────────────────────────────────────────────────────────
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly offreService = inject(OffreService);
  private readonly notification = inject(NotificationService);
  private readonly confirmSvc   = inject(ConfirmationService);
  private readonly tokenService = inject(TokenService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  // ── State ───────────────────────────────────────────────────────────────────
  projetId!: number;
  offre:     OffreResponse | null = null;

  loading    = false;   // chargement initial
  generating = false;   // appel IA en cours
  saving     = false;   // sauvegarde édition manuelle
  editMode   = false;

  readonly editCtrl = new FormControl<string>('', { nonNullable: true });

  // ── Role ────────────────────────────────────────────────────────────────────
  readonly isDrhOrAdmin = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.projetId = Number(this.route.snapshot.paramMap.get('projetId'));
    this.loadOffre();
  }

  // ── Load ────────────────────────────────────────────────────────────────────
  private loadOffre(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.offreService.getByProjetId(this.projetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: offre => {
          this.offre   = offre;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          // 404 = pas encore d'offre → état vide, pas une erreur
          if (err.status !== 404) {
            this.notification.error('Impossible de charger l\'offre');
          }
          this.offre   = null;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ── Générer ─────────────────────────────────────────────────────────────────
  generer(): void {
    if (this.offre) {
      this.confirmSvc.confirm({
        message:                'Une offre existe déjà. Voulez-vous la <b>régénérer</b> ? Le contenu actuel sera remplacé.',
        header:                 'Régénérer l\'offre',
        icon:                   'fa fa-rotate-right',
        acceptLabel:            'Régénérer',
        rejectLabel:            'Annuler',
        acceptButtonStyleClass: 'p-button-warning',
        accept: () => this.doGenerer(),
      });
    } else {
      this.doGenerer();
    }
  }

  private doGenerer(): void {
    this.generating = true;
    this.editMode   = false;
    this.cdr.markForCheck();

    this.offreService.generer(this.projetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: offre => {
          this.offre      = offre;
          this.generating = false;
          this.notification.success('Offre générée avec succès');
          this.cdr.markForCheck();
        },
        error: () => {
          this.generating = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ── Édition manuelle ────────────────────────────────────────────────────────
  openEdit(): void {
    this.editCtrl.setValue(this.offre?.contenu ?? '');
    this.editMode = true;
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editCtrl.reset('');
    this.cdr.markForCheck();
  }

  saveEdit(): void {
    const contenu = this.editCtrl.value.trim();
    if (!contenu) return;

    this.saving = true;
    this.cdr.markForCheck();

    this.offreService.update(this.projetId, { contenu })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: offre => {
          this.offre    = offre;
          this.editMode = false;
          this.saving   = false;
          this.editCtrl.reset('');
          this.notification.success('Offre mise à jour');
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ── Copier ──────────────────────────────────────────────────────────────────
  copyMarkdown(): void {
    if (!this.offre) return;
    navigator.clipboard.writeText(this.offre.contenu).then(() => {
      this.notification.success('Offre copiée dans le presse-papier');
    });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/projets-recrutement']);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
