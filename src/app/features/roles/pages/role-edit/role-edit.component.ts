import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';

import { RoleService } from '../../services/role.service';
import { RoleRequest, RoleResponse } from '../../models/role.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

/**
 * Page d'édition unifiée d'un rôle.
 *
 * Modes :
 *  - création : route `/roles/new` — pas d'`id` dans l'URL.
 *  - édition  : route `/roles/:id` — infos + suppression inline.
 *
 * Les rôles système (`RoleName.ADMIN`, `DRH`, `DIRECTEUR`) sont marqués
 * comme non-supprimables côté UI — en plus du garde-fou backend.
 */
@Component({
  selector: 'app-role-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './role-edit.component.html',
})
export class RoleEditComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr        = inject(ChangeDetectorRef);

  isCreateMode = false;
  role: RoleResponse | null = null;
  loading = true;
  saving = false;

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private notification: NotificationService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      roleName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(300)]],
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    this.isCreateMode = idParam === null;

    if (this.isCreateMode) {
      this.loading = false;
    } else {
      this.loadRole(+idParam!);
    }
  }



  // ==========================================================================
  //  LOAD
  // ==========================================================================

  private loadRole(id: number): void {
    this.loading = true;
    this.roleService.getRoleById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (role) => {
        this.role = role;
        this.form.patchValue({
          roleName: role.roleName,
          description: role.description ?? '',
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notification.error('Rôle introuvable');
        this.router.navigate(['/roles']);
      },
    });
  }

  // ==========================================================================
  //  SAVE
  // ==========================================================================

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.value as RoleRequest;
    this.saving = true;

    if (this.isCreateMode) {
      this.roleService.createRole(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
        next: (created) => {
          this.notification.success('Rôle créé avec succès');
          this.saving = false;
          this.cdr.markForCheck();
          this.router.navigate(['/roles']);
        },
        error: () => { this.saving = false; this.cdr.markForCheck(); },
      });
    } else if (this.role) {
      this.roleService.updateRole(this.role.roleId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
        next: (updated) => {
          this.role = updated;
          this.notification.success('Rôle mis à jour');
          this.saving = false;
          this.cdr.markForCheck();
          this.router.navigate(['/roles']);
        },
        error: () => { this.saving = false; this.cdr.markForCheck(); },
      });
    }
  }


  // ==========================================================================
  //  HELPERS
  // ==========================================================================


  goBack(): void {
    this.router.navigate(['/roles']);
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

}
