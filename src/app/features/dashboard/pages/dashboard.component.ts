import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../core/services/AuthService';
import { TokenService } from '../../../core/services/TokenService';
import { RoleName } from '../../roles/models/role-name.enum';
import { BesoinStatsWidgetComponent } from '../../besoins-recrutement/components/besoin-stats-widget/besoin-stats-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BesoinStatsWidgetComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {

  fullName = '';
  today    = new Date();

  showBesoinWidget = false;

  private destroy$ = new Subject<void>();

  stats = [
    { label: 'Utilisateurs',      value: '—', icon: 'fa fa-users',         color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
    { label: 'Rôles',             value: '—', icon: 'fa fa-shield-halved', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)'  },
    { label: 'Départements',      value: '—', icon: 'fa fa-building',      color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { label: 'Demandes en cours', value: '—', icon: 'fa fa-clock',         color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)'  }
  ];

  constructor(
    private authService:  AuthService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    this.authService.fullName$
      .pipe(takeUntil(this.destroy$))
      .subscribe(name => this.fullName = name ?? '');

    // Show besoin stats widget for DRH and ADMIN (who can see /stats endpoint)
    this.showBesoinWidget = this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
