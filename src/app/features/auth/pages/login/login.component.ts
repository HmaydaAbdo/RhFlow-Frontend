import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../../core/services/AuthService';
import { NotificationService } from '../../../../core/services/NotificationService';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ToastModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  emailFocused = false;
  passwordFocused = false;

  features = [
    {
      icon:  'fa fa-bullhorn',
      label: 'Besoins & projets de recrutement',
      desc:  'Exprimez, validez et pilotez chaque recrutement.'
    },
    {
      icon:  'fa fa-wand-magic-sparkles',
      label: 'Génération d\'offres par IA',
      desc:  'Annonces LinkedIn générées automatiquement.'
    },
    {
      icon:  'fa fa-file-lines',
      label: 'Fiches de poste & directions',
      desc:  'Référentiel centralisé pour toute l\'organisation.'
    },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.notification.success('Bienvenue!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.notification.error('Email ou mot de passe incorrect');
        }
      }
    });
  }
}
