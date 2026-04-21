import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, ToastModule, SidebarComponent, TopbarComponent],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  sidebarVisible = false;

  onToggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }
}
