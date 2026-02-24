# Backend - Projet DDD (Dakar Dem Dikk)

## 📋 Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Technologies utilisées](#technologies-utilisées)
- [Architecture](#architecture)
- [Installation](#installation)
- [Structure du projet](#structure-du-projet)
- [Modèles de données](#modèles-de-données)
- [Fonctionnalités développées](#fonctionnalités-développées)
- [API Routes](#api-routes)
- [Authentification et autorisation](#authentification-et-autorisation)
- [Services et logique métier](#services-et-logique-métier)

---

## 🎯 Vue d'ensemble

Backend Laravel pour la gestion des appels d'offres. Il gère l'authentification, les rôles (Admin, Responsable Marché, Fournisseur), les appels d'offres, les candidatures, les documents et les notifications.

---

## 🛠 Technologies utilisées

- **Laravel 11.x** - Framework PHP
- **Laravel Sanctum** - Authentification API
- **PostgreSQL** - Base de données
- **Eloquent ORM** - ORM Laravel
- **Laravel Mail** - Envoi d'emails (réinitialisation de mot de passe)

---

## 🏗 Architecture

### Structure MVC
- **Models** : `app/Models/` - Modèles Eloquent
- **Controllers** : `app/Http/Controllers/` - Logique des endpoints
- **Requests** : `app/Http/Requests/` - Validation des données
- **Resources** : `app/Http/Resources/` - Formatage des réponses API
- **Services** : `app/Services/` - Logique métier réutilisable
- **Policies** : `app/Policies/` - Autorisations

### Middleware
- `auth:sanctum` - Authentification via tokens
- `role:ADMIN|RESPONSABLE_MARCHE|FOURNISSEUR` - Vérification des rôles

---

## 📦 Installation

### Prérequis
- PHP >= 8.2
- Composer
- PostgreSQL
- Node.js (pour les assets frontend)

### Étapes

1. **Cloner le projet**
```bash
cd dddback
```

2. **Installer les dépendances**
```bash
composer install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
php artisan key:generate
```

4. **Configurer la base de données dans `.env`**
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ddd_db
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

5. **Exécuter les migrations**
```bash
php artisan migrate
php artisan db:seed
```

6. **Démarrer le serveur**
```bash
php artisan serve
```

Le serveur sera accessible sur `http://localhost:8000`

---

## 📁 Structure du projet

```
dddback/
├── app/
│   ├── Http/
│   │   ├── Controllers/      # Contrôleurs API
│   │   ├── Middleware/       # Middleware personnalisés
│   │   ├── Requests/         # Form Requests (validation)
│   │   └── Resources/        # API Resources (formatage)
│   ├── Models/               # Modèles Eloquent
│   ├── Policies/             # Policies d'autorisation
│   └── Services/             # Services métier
├── database/
│   ├── migrations/           # Migrations de base de données
│   └── seeders/              # Seeders pour données initiales
├── routes/
│   └── api.php               # Routes API
└── config/                   # Fichiers de configuration
```

---

## 🗄 Modèles de données

### User
- Gestion des utilisateurs avec rôles
- Authentification Sanctum
- Statut actif/inactif

### Role
- ADMIN
- RESPONSABLE_MARCHE
- FOURNISSEUR

### ResponsableMarche
- Lié à un User
- Département, fonction, téléphone
- Gère les appels d'offres

### Fournisseur
- Lié à un User
- Informations entreprise (nom, adresse, téléphone, email)
- Documents légaux (NINEA, RCCM, Quitus Fiscal)
- Statut : actif, en_attente, rejeté

### AppelOffre
- Titre, description, référence
- Dates : publication, limite de dépôt
- Statut : draft, published, closed, archived
- Lié à un ResponsableMarche

### Candidature
- Lié à un AppelOffre et un Fournisseur
- Montant proposé
- Date de soumission
- Statut : submitted, under_review, accepted, rejected

### Document
- Documents légaux des fournisseurs
- Catégories : RCCM, NINEA, QUITUS_FISCAL
- Stockage des fichiers

### Suggestion
- Suggestions des fournisseurs
- Sujet, message
- Statut : pending, read, implemented, rejected

### Notification
- Notifications utilisateurs
- Liées aux actions importantes

### LogActivite
- Journal des activités
- Traçabilité des actions

---

## ✨ Fonctionnalités développées

### 🔐 Authentification
- **Inscription** : Création de compte avec rôles
- **Connexion** : Authentification via email/password
- **Réinitialisation de mot de passe** : Envoi d'email avec token
- **Changement de mot de passe** : Pour utilisateurs authentifiés
- **Déconnexion** : Révocation des tokens

### 👤 Gestion des utilisateurs (Admin)
- Liste des utilisateurs
- Activation/Désactivation de comptes
- Gestion des rôles

### 🏢 Gestion des Responsables Marché (Admin)
- **Création** : Création de comptes responsables
- **Modification** : Mise à jour des informations
- **Suppression** : Suppression de responsables
- Champs : nom, email, département, fonction, téléphone

### 📋 Gestion des Appels d'Offres

#### Responsable Marché
- **Création** : Création en brouillon
- **Publication** : Mise en ligne publique
- **Clôture** : Fermeture aux candidatures
- **Consultation** : Liste de ses appels d'offres
- **Candidatures reçues** : Consultation des candidatures par appel d'offre

#### Public
- **Consultation** : Liste des appels d'offres publiés
- **Détails** : Affichage détaillé d'un appel d'offre

### 📝 Gestion des Candidatures

#### Fournisseur
- **Soumission** : Postuler à un appel d'offre
- **Modification** : Modifier une candidature (si statut = submitted)
- **Consultation** : Liste de ses candidatures
- Contrainte : Un seul candidature par appel d'offre

#### Responsable Marché / Admin
- **Acceptation** : Accepter une candidature
- **Rejet** : Rejeter une candidature
- **Consultation** : Liste des candidatures par appel d'offre

### 🏪 Gestion des Fournisseurs (Admin)
- **Validation** : Valider un compte fournisseur
- **Rejet** : Rejeter un compte fournisseur
- **Consultation** : Liste des fournisseurs avec statuts
- **Détails** : Affichage détaillé d'un fournisseur

### 📄 Gestion des Documents (Fournisseur)
- **Upload** : Téléchargement de documents légaux
- **Consultation** : Liste des documents
- **Suppression** : Suppression de documents
- Types : RCCM, NINEA, QUITUS_FISCAL

### 💡 Système de Suggestions (Fournisseur → Admin)
- **Envoi** : Fournisseurs peuvent envoyer des suggestions
- **Consultation** : Admin voit toutes les suggestions
- **Gestion des statuts** : pending, read, implemented, rejected

### 📊 Dashboard Admin
- **Statistiques globales** :
  - Total fournisseurs (actifs, en attente)
  - Total appels d'offres (actifs, clôturés)
  - Total candidatures (en cours, retenues, rejetées)
  - Total responsables
- **Activités récentes** : Journal des dernières actions
- **Fournisseurs en attente** : Liste des comptes à valider

### 🔔 Notifications
- Système de notifications pour les utilisateurs
- Notifications lors d'actions importantes (acceptation/rejet candidature, validation compte, etc.)

---

## 🛣 API Routes

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/register` | Inscription |
| POST | `/api/login` | Connexion |
| POST | `/api/forgot-password` | Demande de réinitialisation |
| POST | `/api/reset-password` | Réinitialisation avec token |
| GET | `/api/appels-offres` | Liste des appels d'offres (public) |
| GET | `/api/appels-offres/{id}` | Détails d'un appel d'offre (public) |

### Routes authentifiées

#### Utilisateur
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/logout` | Déconnexion |
| GET | `/api/me` | Informations utilisateur connecté |
| PUT | `/api/update-password` | Changer le mot de passe |

#### Appels d'Offres (Responsable/Admin)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/appels-offres` | Créer un appel d'offre |
| PUT | `/api/appels-offres/{id}` | Modifier un appel d'offre |
| POST | `/api/appels-offres/{id}/publish` | Publier un appel d'offre |
| POST | `/api/appels-offres/{id}/close` | Clôturer un appel d'offre |
| GET | `/api/responsable/mes-appels-offres` | Liste des AO du responsable |
| GET | `/api/responsable/appels-offres/{id}/candidatures-recues` | Candidatures d'un AO |

#### Candidatures
| Méthode | Route | Description | Rôle |
|---------|-------|-------------|------|
| POST | `/api/appels-offres/{id}/candidatures` | Soumettre une candidature | FOURNISSEUR |
| PUT | `/api/candidatures/{id}` | Modifier une candidature | FOURNISSEUR |
| GET | `/api/candidatures` | Liste des candidatures | Tous |
| GET | `/api/candidatures/{id}` | Détails d'une candidature | Tous |
| POST | `/api/candidatures/{id}/accept` | Accepter une candidature | RESPONSABLE/ADMIN |
| POST | `/api/candidatures/{id}/reject` | Rejeter une candidature | RESPONSABLE/ADMIN |

#### Fournisseur
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/fournisseur/profile` | Profil du fournisseur |
| PUT | `/api/fournisseur/profile` | Modifier le profil |
| GET | `/api/fournisseur/candidatures` | Candidatures du fournisseur |
| GET | `/api/fournisseur/documents-legaux` | Documents légaux |
| POST | `/api/fournisseur/documents-legaux` | Uploader un document |
| DELETE | `/api/fournisseur/documents-legaux/{id}` | Supprimer un document |
| GET | `/api/suggestions` | Suggestions du fournisseur |
| POST | `/api/suggestions` | Envoyer une suggestion |

#### Admin
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/admin/users` | Liste des utilisateurs |
| POST | `/api/admin/users/{id}/activate` | Activer un utilisateur |
| POST | `/api/admin/users/{id}/deactivate` | Désactiver un utilisateur |
| GET | `/api/admin/logs` | Journal des activités |
| POST | `/api/admin/responsables` | Créer un responsable |
| PUT | `/api/admin/responsables/{id}` | Modifier un responsable |
| DELETE | `/api/admin/responsables/{id}` | Supprimer un responsable |
| GET | `/api/admin/dashboard-stats` | Statistiques du dashboard |
| GET | `/api/admin/appels-offres-dashboard` | Liste des AO pour dashboard |
| GET | `/api/admin/fournisseurs-dashboard` | Liste des fournisseurs |
| GET | `/api/admin/responsables-dashboard` | Liste des responsables |
| GET | `/api/admin/recent-activities` | Activités récentes |
| POST | `/api/admin/fournisseurs/{id}/validate` | Valider un fournisseur |
| POST | `/api/admin/fournisseurs/{id}/reject` | Rejeter un fournisseur |
| GET | `/api/admin/suggestions` | Toutes les suggestions |
| PUT | `/api/admin/suggestions/{id}` | Modifier le statut d'une suggestion |

---

## 🔒 Authentification et autorisation

### Sanctum
- Tokens d'authentification
- Middleware `auth:sanctum` pour protéger les routes
- Tokens stockés en base de données

### Rôles et permissions
- **ADMIN** : Accès complet
- **RESPONSABLE_MARCHE** : Gestion de ses appels d'offres
- **FOURNISSEUR** : Gestion de son profil et candidatures

### Policies
- `AppelOffrePolicy` : Autorisation sur les appels d'offres
- `CandidaturePolicy` : Autorisation sur les candidatures
- `DocumentPolicy` : Autorisation sur les documents

---

## 🔧 Services et logique métier

### AppelOffreService
- Logique de création/modification des appels d'offres
- Génération automatique de références uniques
- Gestion des statuts

### NotificationService
- Envoi de notifications aux utilisateurs
- Notifications par email (optionnel)
- Stockage en base de données

---

## 📝 Notes importantes

- Les fournisseurs sont créés avec `is_active = false` et doivent être validés par l'admin
- Les appels d'offres sont créés en statut `draft` et doivent être publiés
- Un fournisseur ne peut soumettre qu'une seule candidature par appel d'offre
- Les candidatures peuvent être modifiées uniquement si le statut est `submitted`
- Les références des appels d'offres sont générées automatiquement au format `AO-YYYY-XXXXX`

---

## 🚀 Commandes utiles

```bash
# Créer une migration
php artisan make:migration create_table_name

# Exécuter les migrations
php artisan migrate

# Créer un seeder
php artisan make:seeder SeederName

# Exécuter les seeders
php artisan db:seed

# Créer un contrôleur
php artisan make:controller ControllerName

# Créer un modèle avec migration
php artisan make:model ModelName -m
```

---

## 📞 Support

Pour toute question ou problème, consultez la documentation Laravel ou contactez l'équipe de développement.
