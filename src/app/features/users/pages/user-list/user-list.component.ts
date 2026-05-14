import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {  debounceTime, distinctUntilChanged } from 'rxjs';

import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';

import { UserService } from '../../services/user.service';
import { UserResponse, UserSearchRequest } from '../../models/user.models';
import { PageResponse } from '../../../../core/models/pagination.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import { ROLE_NAME_LABELS } from '../../../roles/models/role-name.enum';
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

interface EnabledOption {
  label: string;
  value: boolean | null;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
    DropdownModule,
    DialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit, OnDestroy {

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr        = inject(ChangeDetectorRef);

  @ViewChild('signatureInput') signatureInput!: ElementRef<HTMLInputElement>;

  users: UserResponse[] = [];

  /** Utilisateur ciblé pour l'upload de signature. */
  signatureTargetUser: UserResponse | null = null;
  /** ID de l'utilisateur dont la signature est en cours de traitement. */
  signatureProcessingId: number | null = null;

  /** Prévisualisation signature */
  signaturePreviewVisible = false;
  signaturePreviewUrl: string | null = null;
  signaturePreviewName: string | null = null;
  signaturePreviewLoading = false;
  totalRecords = 0;
  loading = false;

  /** Barre de recherche/filtre — Reactive. */
  readonly filtersForm = new FormGroup({
    keyword: new FormControl<string>('', { nonNullable: true }),
    enabled: new FormControl<boolean | null>(null),
  });

  readonly enabledOptions: EnabledOption[] = [
    { label: 'Tous', value: null },
    { label: 'Actifs', value: true },
    { label: 'Inactifs', value: false },
  ];

  readonly roleLabels = ROLE_NAME_LABELS;

  private currentRequest: UserSearchRequest = {
    page: 0,
    size: 10,
    sortBy: 'id',
    direction: 'asc',
  };


  constructor(
    private userService: UserService,
    private notification: NotificationService,
    private confirmation: ConfirmationService,
  ) {}

  // ==========================================================================
  //  LIFECYCLE
  // ==========================================================================

  ngOnInit(): void {
    this.userService.users$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<UserResponse> | null) => {
        if (res) {
          this.users = res.content;
          this.totalRecords = res.page.totalElements;
          this.cdr.markForCheck();
        }
      });

    this.userService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    // Recherche temps réel + filtre statut, debounced.
    this.filtersForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(this.filterEquals), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentRequest.page = 0;
        this.applyFiltersToRequest();
        this.userService.loadUsers(this.currentRequest);
      });
  }


  // ==========================================================================
  //  TABLE
  // ==========================================================================

  loadUsers(event?: TableLazyLoadEvent): void {
    if (event) {
      this.currentRequest.page = (event.first ?? 0) / (event.rows ?? 10);
      this.currentRequest.size = event.rows ?? 10;

      if (event.sortField) {
        this.currentRequest.sortBy = event.sortField as string;
        this.currentRequest.direction = event.sortOrder === 1 ? 'asc' : 'desc';
      }
    }
    this.applyFiltersToRequest();
    this.userService.loadUsers(this.currentRequest);
  }

  onClearFilters(): void {
    this.filtersForm.reset({ keyword: '', enabled: null });
  }

  get hasActiveFilter(): boolean {
    const v = this.filtersForm.value;
    return !!v.keyword || v.enabled !== null;
  }

  private applyFiltersToRequest(): void {
    const { keyword, enabled } = this.filtersForm.value;
    this.currentRequest.keyword = keyword || undefined;
    this.currentRequest.enabled = enabled ?? undefined;
  }

  private filterEquals = (
    a: Partial<{ keyword: string | null; enabled: boolean | null }>,
    b: Partial<{ keyword: string | null; enabled: boolean | null }>,
  ): boolean => a.keyword === b.keyword && a.enabled === b.enabled;

  // ==========================================================================
  //  INLINE ACTIONS
  // ==========================================================================

  onToggleEnabled(user: UserResponse): void {
    const newState = !user.enabled;
    this.userService.setEnabled(user.id, newState).subscribe({
      next: () => {
        this.notification.success(
          newState ? 'Utilisateur activé' : 'Utilisateur désactivé',
        );
        this.loadUsers();
      },
    });
  }

  confirmDelete(user: UserResponse): void {
    this.confirmation.confirm({
      message: `Supprimer l'utilisateur <b>${user.fullName}</b> ?`,
      header: 'Confirmation',
      icon: 'fa fa-triangle-exclamation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.notification.success('Utilisateur supprimé');
            this.loadUsers();
          },
        });
      },
    });
  }

  // ==========================================================================
  //  SIGNATURE
  // ==========================================================================

  openSignaturePreview(user: UserResponse): void {
    this.signaturePreviewName = user.fullName;
    this.signaturePreviewLoading = true;
    this.signaturePreviewVisible = true;
    this.cdr.markForCheck();

    this.userService.getSignatureBlob(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          if (this.signaturePreviewUrl) {
            URL.revokeObjectURL(this.signaturePreviewUrl);
          }
          this.signaturePreviewUrl = URL.createObjectURL(blob);
          this.signaturePreviewLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.signaturePreviewVisible = false;
          this.signaturePreviewLoading = false;
          this.notification.error('Impossible de charger la signature');
          this.cdr.markForCheck();
        },
      });
  }

  closeSignaturePreview(): void {
    this.signaturePreviewVisible = false;
    if (this.signaturePreviewUrl) {
      URL.revokeObjectURL(this.signaturePreviewUrl);
      this.signaturePreviewUrl = null;
    }
    this.signaturePreviewName = null;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.signaturePreviewUrl) {
      URL.revokeObjectURL(this.signaturePreviewUrl);
    }
  }

  openSignatureUpload(user: UserResponse): void {
    this.signatureTargetUser = user;
    this.signatureInput.nativeElement.value = '';
    this.signatureInput.nativeElement.click();
  }

  onSignatureFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file || !this.signatureTargetUser) return;

    const userId = this.signatureTargetUser.id;
    this.signatureProcessingId = userId;
    this.cdr.markForCheck();

    this.userService.uploadSignature(userId, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('Signature enregistrée');
          this.signatureProcessingId = null;
          this.signatureTargetUser   = null;
          this.loadUsers();
        },
        error: () => {
          this.notification.error('Erreur lors de l\'upload de la signature');
          this.signatureProcessingId = null;
          this.cdr.markForCheck();
        },
      });
  }

  confirmDeleteSignature(user: UserResponse): void {
    this.confirmation.confirm({
      message: `Supprimer la signature de <b>${user.fullName}</b> ?`,
      header: 'Confirmation',
      icon: 'fa fa-triangle-exclamation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.signatureProcessingId = user.id;
        this.cdr.markForCheck();
        this.userService.deleteSignature(user.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notification.success('Signature supprimée');
              this.signatureProcessingId = null;
              this.loadUsers();
            },
            error: () => {
              this.notification.error('Erreur lors de la suppression');
              this.signatureProcessingId = null;
              this.cdr.markForCheck();
            },
          });
      },
    });
  }

  // ==========================================================================
  //  HELPERS
  // ==========================================================================

  displayRole(roleName: string): string {
    return (this.roleLabels as Record<string, string>)[roleName] ?? roleName;
  }

  trackRole = (_: number, roleName: string): string => roleName;
}
