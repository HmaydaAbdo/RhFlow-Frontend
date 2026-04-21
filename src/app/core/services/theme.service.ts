import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const THEME_KEY = 'rh-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private darkSubject$ = new BehaviorSubject<boolean>(this.loadSaved());
  readonly isDarkMode$ = this.darkSubject$.asObservable();

  constructor() { this.apply(this.darkSubject$.value); }

  toggle(): void {
    const next = !this.darkSubject$.value;
    this.darkSubject$.next(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    this.apply(next);
  }

  private apply(dark: boolean): void {
    const link = document.getElementById('app-theme') as HTMLLinkElement;
    if (link) link.href = dark ? 'theme-dark/theme.css' : 'theme-light/theme.css';
    document.documentElement.classList.toggle('dark-theme', dark);
  }

  private loadSaved(): boolean {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === 'dark' : false;
  }
}
