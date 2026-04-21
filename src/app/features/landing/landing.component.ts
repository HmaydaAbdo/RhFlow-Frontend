import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Feature {
  icon:  string;
  title: string;
  desc:  string;
  badge?: string;
}

interface Stat {
  value: string;
  label: string;
  icon:  string;
}

interface WorkflowStep {
  icon:    string;
  title:   string;
  sub:     string;
  role:    string;
  roleIcon:string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {

  features: Feature[] = [
    {
      icon:  'fa fa-bullhorn',
      title: 'Besoins en recrutement',
      desc:  'Les directeurs expriment leurs besoins, le DRH décide — tout tracé, rien d\'oublié.'
    },
    {
      icon:  'fa fa-briefcase',
      title: 'Projets de recrutement',
      desc:  'Chaque besoin accepté génère automatiquement un projet ouvert, prêt à recevoir des candidatures.',
      badge: 'Nouveau'
    },
    {
      icon:  'fa fa-wand-magic-sparkles',
      title: 'Génération d\'offres par IA',
      desc:  'Transformez une fiche de poste en annonce LinkedIn professionnelle en un clic, grâce à l\'IA.',
      badge: 'IA'
    },
    {
      icon:  'fa fa-file-lines',
      title: 'Fiches de poste',
      desc:  'Centralisez missions, compétences et prérequis pour chaque poste de votre organisation.'
    },
    {
      icon:  'fa fa-sitemap',
      title: 'Directions & organigramme',
      desc:  'Gérez les directions, leurs responsables et la structure de votre entreprise en temps réel.'
    },
    {
      icon:  'fa fa-chart-pie',
      title: 'Tableaux de bord',
      desc:  'KPIs RH, répartition par direction, statuts des besoins — tout visible d\'un coup d\'œil.'
    },
  ];

  stats: Stat[] = [
    { value: '3',    label: 'Niveaux d\'accès',    icon: 'fa fa-shield-halved' },
    { value: 'IA',   label: 'Offres générées',      icon: 'fa fa-wand-magic-sparkles' },
    { value: '100%', label: 'Sans papier',           icon: 'fa fa-leaf' },
    { value: '∞',    label: 'Besoins tracés',        icon: 'fa fa-bullhorn' },
  ];

  workflow: WorkflowStep[] = [
    {
      icon:     'fa fa-pen-to-square',
      title:    'Besoin exprimé',
      sub:      'Le directeur soumet une demande de recrutement liée à une fiche de poste.',
      role:     'Directeur',
      roleIcon: 'fa fa-user-tie'
    },
    {
      icon:     'fa fa-scale-balanced',
      title:    'Décision DRH',
      sub:      'Le DRH examine la demande et l\'accepte ou la refuse avec un motif.',
      role:     'DRH',
      roleIcon: 'fa fa-user-check'
    },
    {
      icon:     'fa fa-briefcase',
      title:    'Projet créé',
      sub:      'L\'acceptation génère automatiquement un projet de recrutement ouvert.',
      role:     'Automatique',
      roleIcon: 'fa fa-bolt'
    },
    {
      icon:     'fa fa-wand-magic-sparkles',
      title:    'Offre générée par IA',
      sub:      'Une annonce LinkedIn est générée en un clic à partir de la fiche de poste.',
      role:     'Intelligence Artificielle',
      roleIcon: 'fa fa-microchip'
    },
    {
      icon:     'fa fa-users',
      title:    'Candidatures reçues',
      sub:      'Les candidats soumettent leurs CVs, les RH importent et évaluent les profils.',
      role:     'RH & Candidats',
      roleIcon: 'fa fa-people-group'
    },
  ];

  constructor(private router: Router) {}

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
