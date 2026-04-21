# RH Flow — Frontend

Frontend Angular de **RH Flow**, plateforme intelligente de gestion des ressources humaines (projet STAPORT SA — BTP, Casablanca).

Ce dépôt héberge uniquement la partie front (Angular 17). Le back (Spring Boot + PostgreSQL + MinIO + IA) est dans un dépôt séparé : `rh-erp-backend`.

## Stack

- **Angular 17.3** — standalone components, nouveau control flow (`@if` / `@for` / `@switch`), Reactive Forms
- **PrimeNG 17 + PrimeFlex** — design system UI
- **RxJS 7** + `DestroyRef` / `takeUntilDestroyed` pour la gestion des subscriptions
- **Chart.js** pour les visualisations
- **TypeScript 5.4**, SCSS
- **FontAwesome Free**

## Modules fonctionnels

| Module                 | Description                                                               |
|------------------------|---------------------------------------------------------------------------|
| `landing`              | Page publique de présentation                                             |
| `auth`                 | Authentification JWT (login)                                              |
| `dashboard`            | Tableau de bord par rôle (ADMIN / DRH / DIRECTEUR)                        |
| `users`                | Gestion des utilisateurs (création, édition, attribution des rôles)       |
| `roles`                | Gestion des rôles (ADMIN / DRH / DIRECTEUR)                               |
| `directions`           | Directions organisationnelles                                             |
| `fiches-poste`         | Fiches de poste                                                           |
| `besoins-recrutement`  | Besoins de recrutement (demande DIRECTEUR → validation DRH)               |
| `projets-recrutement`  | Projets de recrutement pilotés par le DRH                                 |

## Prérequis

- Node.js 18+ (ou 20 LTS recommandé)
- npm 9+
- Backend RH Flow démarré localement (par défaut `http://localhost:8080/rh`)

## Installation

```bash
npm install
```

## Configuration

Les URL backend sont dans `src/environments/` :

- `environment.ts` — dev local, pointe sur `http://localhost:8080/rh`
- `environment.prod.ts` — prod, chemin relatif `/rh` (servi derrière un reverse proxy)

Aucun secret côté front (le JWT est reçu du back et stocké en session).

## Lancer en dev

```bash
npm start
# ou
ng serve
```

Application disponible sur `http://localhost:4200/`.

## Build

```bash
ng build                      # build prod par défaut
ng build --configuration=development
```

Artifacts dans `dist/`.

## Tests

```bash
ng test          # tests unitaires Karma + Jasmine
```
