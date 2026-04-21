import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ConfirmationService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserService } from '../../services/user.service';
import { RoleService } from '../../../roles/services/role.service';
import { CreateUserRequest, UpdateUserRequest, UserResponse } from '../../models/user.models';
import { RoleResponse } from '../../../roles/models/role.models';
import { ROLE_NAME_LABELS, RoleName } from '../../../roles/models/role-name.enum';
import { NotificationService } from '../../../../core/services/NotificationService';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    DropdownModule,
    MultiSelectModule,
    ConfirmDialogModule,
    InputSwitchModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './user-edit.component.html',
})
export class UserEditComponent implements OnInit {

  private destroyRef = inject(DestroyRef);

  // ===== Mode =====
  isCreateMode = false;

  // ===== State =====
  user: UserResponse | null = null;
  loading = true;
  saving = false;
  showPassword = false;

  form!: FormGroup;

  readonly enabledControl = new FormControl<boolean>(true, { nonNullable: true });

  // ===== Roles =====
  allRoles: RoleResponse[] = [];
  readonly roleLabels = ROLE_NAME_LABELS;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private roleService: RoleService,
    private notification: NotificationService,
    private confirmation: ConfirmationService,
  ) {}

  // ==========================================================================
  //  LIFECYCLE
  // ==========================================================================

  ngOnInit(): void {
    this.loadAllRoles();

    const idParam = this.route.snapshot.paramMap.get('id');
    this.isCreateMode = idParam === null;

    this.buildForm();

    if (this.isCreateMode) {
      this.loading = false;
    } else {
      this.loadUser(+idParam!);
      this.wireEnabledSwitch();
    }
  }

  // ==========================================================================
  //  FORM
  // ==========================================================================

  private buildForm(): void {
    this.form = this.fb.group({
      email: [
        { value: '', disabled: !this.isCreateMode },
        this.isCreateMode ? [Validators.required, Validators.email] : [],
      ],
      fullName: ['', Validators.required],
      gsm: [''],
      password: [
        '',
        this.isCreateMode
          ? [Validators.required, Validators.minLength(8)]
          : [Validators.minLength(8)],  // optionnel en édition
      ],
      roleIds: [[] as number[], this.isCreateMode ? Validators.required : []],
    });
  }

  private wireEnabledSwitch(): void {
    this.enabledControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newState) => {
        if (!this.user || newState === this.user.enabled) return;
        this.userService.setEnabled(this.user.id, newState).subscribe({
          next: (updated) => {
            this.user = updated;
            this.notification.success(
              newState ? 'Utilisateur activé' : 'Utilisateur désactivé',
            );
          },
          error: () => {
            this.enabledControl.setValue(!newState, { emitEvent: false });
          },
        });
      });
  }

  // ==========================================================================
  //  LOADING
  // ==========================================================================

  private loadUser(id: number): void {
    this.loading = true;
    this.userService.getUserById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.form.patchValue({
            email: user.email,
            fullName: user.fullName,
            gsm: user.gsm ?? '',
            password: '',
            roleIds: this.allRoles
              .filter(r => user.roles.includes(r.roleName))
              .map(r => r.roleId),
          });
          this.enabledControl.setValue(user.enabled, { emitEvent: false });
          this.loading = false;
        },
        error: () => {
          this.notification.error('Utilisateur introuvable');
          this.router.navigate(['/users']);
        },
      });
  }

  private loadAllRoles(): void {
    this.roleService.loadRoles({ page: 0, size: 100, sortBy: 'id', direction: 'asc' });
    this.roleService.roles$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => {
        if (page) this.allRoles = page.content;
      });
  }

  // ==========================================================================
  //  SUBMIT
  // ==========================================================================

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isCreateMode ? this.submitCreate() : this.submitUpdate();
  }

  private submitCreate(): void {
    const payload: CreateUserRequest = this.form.getRawValue();
    this.saving = true;
    this.userService.createUser(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.notification.success('Utilisateur créé avec succès');
          this.saving = false;
          this.router.navigate(['/users', created.id]);
        },
        error: () => (this.saving = false),
      });
  }

  private submitUpdate(): void {
    if (!this.user) return;
    const raw = this.form.getRawValue();
    const payload: UpdateUserRequest = {
      fullName: raw.fullName,
      gsm: raw.gsm,
      password: raw.password || null,  // null = pas de changement côté backend
      roleIds: raw.roleIds,
    };
    this.saving = true;
    this.userService.updateUser(this.user.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.user = updated;
          this.form.patchValue({
            password: '',
            roleIds: this.allRoles
              .filter(r => updated.roles.includes(r.roleName))
              .map(r => r.roleId),
          });
          this.notification.success('Utilisateur mis à jour');
          this.saving = false;
        },
        error: () => (this.saving = false),
      });
  }

  // ==========================================================================
  //  DELETE
  // ==========================================================================

  confirmDelete(): void {
    if (!this.user) return;
    const target = this.user;
    this.confirmation.confirm({
      message: `Supprimer l'utilisateur <b>${target.fullName}</b> (${target.email}) ?`,
      header: 'Confirmation',
      icon: 'fa fa-triangle-exclamation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.userService.deleteUser(target.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notification.success('Utilisateur supprimé');
              this.router.navigate(['/users']);
            },
          });
      },
    });
  }

  // ==========================================================================
  //  HELPERS
  // ==========================================================================

  goBack(): void {
    this.router.navigate(['/users']);
  }

  displayRole(roleName: string): string {
    return (this.roleLabels as Record<string, string>)[roleName] ?? roleName;
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  protected readonly RoleName = RoleName;
}
