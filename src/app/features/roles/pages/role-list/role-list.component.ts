import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';

import { RoleService } from '../../services/role.service';
import { RoleResponse, RoleSearchRequest } from '../../models/role.models';
import { PageResponse } from '../../../../core/models/pagination.models';
import { NotificationService } from '../../../../core/services/NotificationService';
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";


@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './role-list.component.html',
})
export class RoleListComponent implements OnInit {


  private destroyRef = inject(DestroyRef);

  roles: RoleResponse[] = [];
  totalRecords = 0;
  loading = false;

  readonly filtersForm = new FormGroup({
    keyword: new FormControl<string>('', { nonNullable: true }),
  });



  private currentRequest: RoleSearchRequest = {
    page: 0,
    size: 10,
    sortBy: 'id',
    direction: 'asc',
  };


  constructor(
    private roleService: RoleService,
    private notification: NotificationService,
    private confirmation: ConfirmationService,
  ) {}

  // ==========================================================================
  //  LIFECYCLE
  // ==========================================================================

  ngOnInit(): void {

    this.roleService.roles$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: PageResponse<RoleResponse> | null) => {
        if (res) {
          this.roles = res.content;
          this.totalRecords = res.page.totalElements;
        }
      });

    this.roleService.loading$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => (this.loading = loading));

    this.filtersForm.controls.keyword.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((keyword) => {
        this.currentRequest.page = 0;
        this.currentRequest.keyword = keyword || undefined;
        this.roleService.loadRoles(this.currentRequest);
      });
  }



  // ==========================================================================
  //  TABLE
  // ==========================================================================

  loadRoles(event?: TableLazyLoadEvent): void {
    if (event) {
      this.currentRequest.page = (event.first ?? 0) / (event.rows ?? 10);
      this.currentRequest.size = event.rows ?? 10;

      if (event.sortField) {
        this.currentRequest.sortBy = event.sortField as string;
        this.currentRequest.direction = event.sortOrder === 1 ? 'asc' : 'desc';
      }
    }
    this.currentRequest.keyword = this.filtersForm.controls.keyword.value ;
    this.roleService.loadRoles(this.currentRequest);
  }

  onClearFilters(): void {
    this.filtersForm.reset({ keyword: '' });
  }

  get hasActiveFilter(): boolean {
    return !!this.filtersForm.controls.keyword.value;
  }

  // ==========================================================================
  //  ACTIONS
  // ==========================================================================


  confirmDelete(role: RoleResponse): void {
    this.confirmation.confirm({
      message: `Supprimer le rôle <b>${role.roleName}</b> ?`,
      header: 'Confirmation',
      icon: 'fa fa-triangle-exclamation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.roleService.deleteRole(role.roleId).subscribe({
          next: () => {
            this.notification.success('Rôle supprimé');
            this.loadRoles();
          },
        });
      },
    });
  }

}
