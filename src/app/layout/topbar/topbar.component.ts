import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/AuthService';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {

  @Output() toggleSidebar = new EventEmitter<void>();

  fullName = '';
  email = '';
  roles:string [] = [];
  isDark = true;
  userMenuItems: MenuItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authService.fullName$.pipe(takeUntil(this.destroy$))
      .subscribe(name => this.fullName = name ?? '');

    this.authService.email$.pipe(takeUntil(this.destroy$))
      .subscribe(email => this.email = email ?? '');

    this.authService.roles$.pipe(takeUntil(this.destroy$))
      .subscribe(roles => this.roles = roles);

    this.themeService.isDarkMode$.pipe(takeUntil(this.destroy$))
      .subscribe(dark => this.isDark = dark);

    this.userMenuItems = [
      {
        label: 'Se déconnecter',
        icon: 'fa fa-right-from-bracket',
        command: () => this.logout()
      }
    ];
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.authService.logout();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
