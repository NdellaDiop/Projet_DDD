# Dem Dikk — Portail des marchés publics

Application web de gestion et de consultation des **appels d'offres** pour **Dakar Dem Dikk** (Projet DDD).

- **Production** : [https://pmp.demdikk.sn](https://pmp.demdikk.sn)
- **Dépôt** : monorepo `dddback/` (API Laravel) + `dddfront/` (SPA React)

Le portail **informe**, **trace** les échanges (documents, notifications, audit) et **facilite** l'accès aux pièces et au guichet. Le **dépôt des plis reste physique** au siège, selon les modalités indiquées sur chaque avis.

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Structure du dépôt](#structure-du-dépôt)
3. [Rôles et espaces](#rôles-et-espaces)
4. [Fonctionnalités principales](#fonctionnalités-principales)
5. [Installation locale](#installation-locale)
6. [Configuration](#configuration)
7. [Déploiement production](#déploiement-production)
8. [Routes frontend](#routes-frontend)
9. [API REST (aperçu)](#api-rest-aperçu)
10. [Documentation complémentaire](#documentation-complémentaire)

---

## Stack technique

| Couche | Technologies |
|--------|----------------|
| **Backend** | PHP 8.1+, Laravel 10, Laravel Sanctum, MySQL |
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui, Axios |
| **Auth** | Bearer token (Sanctum) |
| **Paiement cahier** | Wave, Orange Money, mode simulation (démo) |
| **Emails** | SMTP Laravel (notifications, contact, mot de passe oublié) |

---

## Structure du dépôt

```
DDD/
├── dddback/          # API REST Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   ├── Policies/
│   │   └── Services/
│   ├── config/
│   ├── database/migrations/
│   └── routes/api.php
├── dddfront/         # Interface React (build → dist/)
│   └── src/
│       ├── pages/
│       ├── components/
│       └── context/AuthContext.tsx
└── README.md         # Ce fichier
```

---

## Rôles et espaces

| Rôle | Code | Tableau de bord | Accès principal |
|------|------|-----------------|-----------------|
| **Administrateur** | `ADMIN` | `/admin` | Tous les AO, PRM, fournisseurs, audit, assignation PRM, attribution marché |
| **Responsable marché (PRM)** | `RESPONSABLE_MARCHE` | `/responsable/dashboard` | Ses AO (+ création), publication, clôture, réouverture |
| **Fournisseur** | `FOURNISSEUR` | `/fournisseur/dashboard` | Consultation AO, documents légaux, achat cahier, notifications |
| **Visiteur** | — | Pages publiques | Liste et fiches AO, formulaire contact |

> **À venir** : rôle **Gestionnaire** (vue globale sur les AO, sans gestion des comptes).

---

## Fonctionnalités principales

### Public

- Liste et fiche des appels d'offres publiés / clôturés
- Téléchargement des pièces jointes (avis, cahier selon règles d'accès)
- Formulaire **Contact** (`/contact`)
- Page **Comment ça marche**

### Fournisseur

- Inscription avec dépôt des **pièces légales** (NINEA, RCCM, quitus, etc.)
- Validation du compte par l'administrateur (ou auto-validation si activée)
- **Mes documents**, **Mes achats** (cahiers payés), **Notifications & avis**
- Paiement du cahier des charges (Wave / Orange Money / simulation)
- Boîte à idées, assistant conversationnel (IA configurable)

### PRM

- Création d'AO (brouillon → publication → clôture → réouverture)
- Modalités de dépôt des plis en présentiel
- Consultation de l'annuaire fournisseurs (pièces légales au guichet)
- Vue **Fiche** sur chaque AO

### Administrateur

- **Vue d'ensemble** : statistiques, fournisseurs en attente, activités récentes
- **Appels d'offres** : vue globale, assignation / changement de PRM, clôture, réouverture, retour brouillon
- **Fournisseurs** : validation (avec contrôle dossier complet), rejet, **suspension**, **réactivation**, remise en examen
- **PRM** : création, modification, **réinitialisation mot de passe**
- **Messages contact** : lire, marquer lu, archiver, répondre par e-mail
- **Suggestions**, **Historique audit**, **Attribution** du marché (AO clôturés)
- Export Excel / PDF sur plusieurs listes

### Notifications

- Messages in-app filtrés par rôle (`audience` : user / admin / prm)
- Exemples fournisseur : validation compte, clôture / réouverture AO, commentaires sur dossier
- Les alertes admin (validation dossiers tiers) ne s'affichent **pas** côté fournisseur

---

## Installation locale

### Prérequis

- PHP ≥ 8.1, Composer, MySQL
- Node.js ≥ 18, npm

### 1. Backend

```bash
cd dddback
composer install
cp .env.example .env
# Éditer .env : DB_*, APP_URL=http://127.0.0.1:8000, FRONTEND_URL=http://127.0.0.1:8080
php artisan key:generate
php artisan migrate
php artisan db:seed   # rôles + compte admin de démo (dev uniquement)
php artisan serve     # http://127.0.0.1:8000
```

### 2. Frontend

```bash
cd dddfront
npm install
# Créer .env avec :
# VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev           # http://127.0.0.1:8080 (voir vite.config.ts)
```

### 3. Vérification rapide

1. Ouvrir `http://127.0.0.1:8080`
2. Se connecter avec le compte admin créé par le seeder (voir `database/seeders/UserSeeder.php`)
3. Consulter `/appels-offres` sans connexion

---

## Configuration

### Backend (`dddback/.env`)

| Variable | Description |
|----------|-------------|
| `APP_URL` | URL publique de l'API |
| `FRONTEND_URL` | URL du front (retours paiement, liens) |
| `DB_*` | Connexion MySQL |
| `CANDIDATURE_EN_LIGNE` | `false` = dépôt physique uniquement (défaut) |
| `FOURNISSEUR_AUTO_VALIDATION` | Validation auto si dossier légal complet |
| `CAHIER_PAIEMENT_SIMULATION` | Paiement simulé sans Wave/OM |
| `WAVE_*` / `ORANGE_MONEY_*` | Paiement réel du cahier |
| `MAIL_*` | Envoi d'e-mails |
| `MAIL_CONTACT_ADDRESS` | Destinataire des messages du formulaire contact |
| `OPENAI_API_KEY` | Assistant IA fournisseur (optionnel) |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées (front en prod) |

Après modification : `php artisan config:cache` (production).

### Frontend (`dddfront/.env`)

```env
VITE_API_BASE_URL=https://votre-api.example.com
```

Build : `npm run build` → fichiers dans `dddfront/dist/`.

---

## Déploiement production

Exemple de workflow (serveur Linux, code dans `/var/www/ddd`) :

```bash
cd /var/www/ddd
git pull origin main

cd dddback
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache

cd ../dddfront
npm ci
npm run build
```

- Servir `dddfront/dist/` via Nginx (ou équivalent)
- Pointer l'API vers `dddback/public/`
- **HTTPS** obligatoire en production
- Ajuster `CORS_ALLOWED_ORIGINS` et `VITE_API_BASE_URL` pour le domaine prod

---

## Routes frontend

| Chemin | Description |
|--------|-------------|
| `/` | Accueil |
| `/appels-offres` | Liste des marchés |
| `/appels-offres/:id` | Fiche AO (avis, fichiers, modalités dépôt) |
| `/connexion`, `/inscription` | Authentification |
| `/mot-de-passe-oublie`, `/reset-password` | Mot de passe oublié |
| `/contact` | Formulaire contact public |
| `/comment-ca-marche` | Guide utilisateur |
| `/admin` | Dashboard administrateur |
| `/responsable/dashboard` | Dashboard PRM |
| `/fournisseur/dashboard` | Espace fournisseur |
| `/paiement/cahier` | Paiement cahier (fournisseur) |
| `/paiement/cahier/simulation` | Paiement simulé (démo) |

---

## API REST (aperçu)

Fichier source : `dddback/routes/api.php`

**Public**

- `GET /api/appels-offres`, `GET /api/appels-offres/{id}`
- `POST /api/login`, `POST /api/register`, `POST /api/contact`
- Webhooks : `/api/webhooks/wave/cahier`, `/api/webhooks/orange-money/cahier`

**Authentifié (Bearer token)**

- Fournisseur : profil, documents légaux, mes achats, paiement cahier, suggestions
- PRM / Admin : CRUD AO, publish, close, reopen (PRM sur ses AO ; admin global)
- Admin : `/api/admin/*` (stats, fournisseurs, PRM, contact, audit, validate/suspend/reactivate)

Liste détaillée : voir [`dddback/README.md`](dddback/README.md).

---

## Modèle de données (résumé)

Principales entités :

- `User`, `Role`, `Fournisseur`, `ResponsableMarche`
- `AppelOffre`, `Document`, `Candidature`, `CahierAccesAchat`
- `Notification`, `ContactMessage`, `Suggestion`
- `LogActivite`, `AuditLog`

Cycle de vie AO : `draft` → `published` → `closed` (réouverture possible → `published`).

---

## Documentation complémentaire

| Fichier | Contenu |
|---------|---------|
| [`dddback/README.md`](dddback/README.md) | API, modèles, installation backend |
| [`dddfront/README.md`](dddfront/README.md) | Stack front, variables Vite |

---

## Contexte académique

Projet réalisé dans le cadre d'un **stage / mémoire** sur la digitalisation des marchés publics. Adapter toute formulation juridique aux textes officiels en vigueur (code des marchés publics, guides ARMP, etc.).

---

## Licence

Usage interne / académique — voir le dépôt GitHub du projet pour l'historique des contributions.
