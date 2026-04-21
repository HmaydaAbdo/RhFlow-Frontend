import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { TokenService } from '../../core/services/TokenService';
import { RoleName } from '../../features/roles/models/role-name.enum';
import { filter } from 'rxjs';

interface NavItem {
  label: string;
  icon: string;
  routerLink?: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarModule, ButtonModule, RouterLink, RouterLinkActive, RippleModule, TooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {

  @Input()  visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  menuItems: NavItem[] = [];
  openGroups = new Set<string>();

  constructor(
    private tokenService: TokenService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buildMenu();
    // Close on navigation
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.close());
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onHide(): void {
    this.visibleChange.emit(false);
  }

  toggleGroup(label: string): void {
    this.openGroups.has(label)
      ? this.openGroups.delete(label)
      : this.openGroups.add(label);
  }

  isGroupOpen(label: string): boolean {
    return this.openGroups.has(label);
  }

  private buildMenu(): void {
    const items: NavItem[] = [
      { label: 'Tableau de bord', icon: 'fa fa-house', routerLink: '/dashboard' }
    ];

    // ── Recrutement (section unique, items selon rôles) ─────────────
    if (this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR])) {
      const recruitChildren: NavItem[] = [];

      // "Mes recrutements" visible pour tous (DIRECTEUR, et DRH/ADMIN qui ont aussi le rôle DIRECTEUR)
      recruitChildren.push({ label: 'Mes recrutements', icon: 'fa fa-bullhorn', routerLink: '/besoins-recrutement' });

      // "Toutes les demandes" uniquement pour ADMIN et DRH
      if (this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH]))
        recruitChildren.push({ label: 'Tous les demandes', icon: 'fa fa-list-check', routerLink: '/besoins-recrutement/validation' });

      // "Projets de recrutement" visible pour tous les rôles
      recruitChildren.push({ label: 'Projets de recrutement', icon: 'fa fa-briefcase', routerLink: '/projets-recrutement' });

      items.push({ label: 'Recrutement', icon: 'fa fa-bullhorn', children: recruitChildren });
    }

    // ── Référentiel RH ──────────────────────────────────────────────
    if (this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH, RoleName.DIRECTEUR])) {
      const rhChildren: NavItem[] = [];

      if (this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH])) {
        rhChildren.push({ label: 'Directions', icon: 'fa fa-building', routerLink: '/directions' });
      }

      rhChildren.push({ label: 'Fiches de poste', icon: 'fa fa-file-lines', routerLink: '/fiches-de-poste' });

      items.push({ label: 'Référentiel RH', icon: 'fa fa-folder-open', children: rhChildren });
    }


    // ── Administration ──────────────────────────────────────────────
    if (this.tokenService.hasAnyRole([RoleName.ADMIN, RoleName.DRH])) {
      items.push({
        label: 'Administration', icon: 'fa fa-gear',
        children: [
          { label: 'Utilisateurs', icon: 'fa fa-users',         routerLink: '/users' },
          { label: 'Rôles',        icon: 'fa fa-shield-halved', routerLink: '/roles' }
        ]
      });
    }

    this.menuItems = items;

    items.forEach(item => {
      if (item.children?.some(c => this.router.url.startsWith(c.routerLink!)))
        this.openGroups.add(item.label);
    });
  }
}
