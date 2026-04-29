import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
    DropdownModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {

  private destroyRef=inject(DestroyRef)

  users: UserResponse[] = [];
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
        }
      });

    this.userService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => (this.loading = loading));

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
  //  HELPERS
  // ==========================================================================

  displayRole(roleName: string): string {
    return (this.roleLabels as Record<string, string>)[roleName] ?? roleName;
  }

  trackRole = (_: number, roleName: string): string => roleName;
}
