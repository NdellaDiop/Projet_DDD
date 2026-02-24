# Frontend - Projet DDD (Dakar Dem Dikk)

## 📋 Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Technologies utilisées](#technologies-utilisées)
- [Architecture](#architecture)
- [Installation](#installation)
- [Structure du projet](#structure-du-projet)
- [Pages et composants](#pages-et-composants)
- [Fonctionnalités développées](#fonctionnalités-développées)
- [Authentification](#authentification)
- [Dashboards par rôle](#dashboards-par-rôle)
- [Routing](#routing)

---

## 🎯 Vue d'ensemble

Application React/TypeScript pour la gestion des appels d'offres. Interface utilisateur avec trois dashboards selon les rôles (Admin, Responsable Marché, Fournisseur) et des pages publiques.

---

## 🛠 Technologies utilisées

- **React 18+** - Bibliothèque UI
- **TypeScript** - Typage statique
- **React Router DOM** - Routing
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Composants UI
- **Axios** - Client HTTP
- **Framer Motion** - Animations
- **Lucide React** - Icônes

---

## 🏗 Architecture

### Structure
- **Pages** : `src/pages/` - Pages principales
- **Components** : `src/components/` - Composants réutilisables
- **Context** : `src/context/` - Gestion d'état globale (AuthContext)
- **Hooks** : `src/hooks/` - Hooks personnalisés
- **Utils** : `src/lib/` - Utilitaires

### Pattern de design
- **Context API** : Gestion de l'authentification globale
- **Composants fonctionnels** : Hooks React
- **Composition** : Composants réutilisables

---

## 📦 Installation

### Prérequis
- Node.js >= 18
- npm ou yarn

### Étapes

1. **Installer les dépendances**
```bash
cd dddfront
npm install
```

2. **Configurer l'environnement**
Créer un fichier `.env` :
```env
VITE_API_BASE_URL=http://localhost:8000
```

3. **Démarrer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (ou le port indiqué)

4. **Build pour production**
```bash
npm run build
```

---

## 📁 Structure du projet

```
dddfront/
├── src/
│   ├── pages/                # Pages principales
│   │   ├── Index.tsx         # Page d'accueil
│   │   ├── Login.tsx         # Connexion
│   │   ├── Register.tsx      # Inscription
│   │   ├── AppelsOffres.tsx  # Liste publique des AO
│   │   ├── AppelOffreDetails.tsx # Détails d'un AO
│   │   ├── AdminDashboard.tsx    # Dashboard Admin
│   │   ├── ResponsableDashboard.tsx # Dashboard Responsable
│   │   └── FournisseurDashboard.tsx  # Dashboard Fournisseur
│   ├── components/
│   │   ├── layout/           # Header, Footer
│   │   ├── home/             # Composants page d'accueil
│   │   └── ui/               # Composants Shadcn/ui
│   ├── context/
│   │   └── AuthContext.tsx   # Contexte d'authentification
│   ├── hooks/                # Hooks personnalisés
│   └── lib/                  # Utilitaires
├── public/                   # Assets statiques
└── package.json
```

---

## 📄 Pages et composants

### Pages publiques

#### Index.tsx (Page d'accueil)
- **HeroSection** : Section hero avec CTA
- **FeaturesSection** : Présentation des fonctionnalités
- **ActiveTendersSection** : Affichage des 4 derniers appels d'offres actifs
- **HowItWorksSection** : Explication du processus
- **CTASection** : Appel à l'action

#### Login.tsx
- Formulaire de connexion
- Gestion des erreurs
- Redirection selon le rôle après connexion
- Lien vers "Mot de passe oublié"

#### Register.tsx
- Formulaire d'inscription avec sélection de rôle
- Validation côté client
- Champs spécifiques selon le rôle (Fournisseur/Responsable)
- Redirection après inscription

#### AppelsOffres.tsx
- Liste publique des appels d'offres publiés
- Recherche par titre/description/référence
- Affichage des statuts
- Lien vers les détails de chaque AO

#### AppelOffreDetails.tsx
- Affichage détaillé d'un appel d'offre
- Informations complètes (titre, description, dates, responsable)
- Section documents
- Bouton "Postuler" pour les fournisseurs (avec modal de soumission)
- Affichage du nombre de jours restants

#### ForgotPassword.tsx
- Formulaire de demande de réinitialisation
- Envoi d'email avec token

#### ResetPassword.tsx
- Formulaire de réinitialisation avec token
- Validation du nouveau mot de passe

#### CommentCaMarche.tsx
- Explication du processus en 4 étapes
- Avantages de la plateforme

### Dashboards

#### AdminDashboard.tsx
**Onglets :**
1. **Vue d'ensemble**
   - Statistiques globales (4 cartes)
   - Activités récentes
   - Fournisseurs en attente de validation

2. **Appels d'offres**
   - Liste de tous les appels d'offres
   - Recherche et filtres par statut
   - Bouton "Détails" pour voir les informations

3. **Fournisseurs**
   - Liste des fournisseurs
   - Actions : Valider/Rejeter
   - Bouton "Détails" pour voir le profil complet

4. **Responsables**
   - Liste des responsables en cartes
   - Actions : Créer, Modifier, Supprimer
   - Modal de création/édition

5. **Suggestions**
   - Liste de toutes les suggestions des fournisseurs
   - Gestion des statuts (dropdown)
   - Affichage du fournisseur et de la date

**Fonctionnalités :**
- Modale de création de responsable (formulaire 2 colonnes)
- Modale de modification de responsable
- Modale de détails fournisseur avec actions rapides
- Modale de détails appel d'offre
- Modale de paramètres (changement de mot de passe)
- Sidebar avec profil utilisateur
- Logout

#### ResponsableDashboard.tsx
**Onglets :**
1. **Mes Appels d'Offres**
   - Tableau des appels d'offres créés
   - Actions : Publier (si draft), Clôturer (si published), Voir candidatures
   - Affichage du nombre de candidatures

2. **Statistiques**
   - 4 cartes de statistiques :
     - Total appels d'offres
     - En cours de publication
     - Candidatures reçues
     - Marchés clôturés
   - Aperçu rapide des 3 derniers AO

**Fonctionnalités :**
- Modale de création d'appel d'offre (formulaire 2 colonnes)
- Modale de consultation des candidatures
  - Liste des candidatures avec informations fournisseur
  - Actions : Retenir/Rejeter (si statut = submitted)
  - Affichage du montant proposé
- Modale de paramètres (changement de mot de passe)
- Sidebar avec profil utilisateur
- Logout

#### FournisseurDashboard.tsx
**Onglets :**
1. **Vue d'ensemble**
   - 4 cartes de statistiques :
     - Candidatures totales
     - En cours
     - Acceptées
     - Documents
   - Liste des 5 dernières candidatures

2. **Mes candidatures**
   - Liste de toutes les candidatures
   - Affichage des détails (AO, dates, montant, statut)
   - Bouton "Modifier" (si statut = submitted)
   - Bouton "Voir les offres disponibles"
   - Modale de modification de candidature

3. **Documents légaux**
   - Upload de documents (RCCM, NINEA, Quitus Fiscal)
   - Liste des documents uploadés
   - Actions : Voir, Supprimer
   - Indicateur visuel (Uploadé/Manquant)

4. **Boîte à idées**
   - Formulaire d'envoi de suggestion
   - Historique des suggestions envoyées
   - Affichage du statut de chaque suggestion

5. **Mon profil**
   - Affichage des informations entreprise
   - Bouton "Modifier" ouvrant une modale
   - Modale d'édition (formulaire 2 colonnes)
   - Identifiants légaux (NINEA, RCCM, Quitus Fiscal)

**Fonctionnalités :**
- Modale de modification de profil
- Modale de modification de candidature
- Sidebar avec profil utilisateur
- Logout

### Composants réutilisables

#### Header.tsx
- Navigation principale
- Affichage conditionnel selon l'authentification
- Lien "Mon Espace" vers le dashboard approprié
- Menu mobile responsive

#### Footer.tsx
- Pied de page avec liens et informations

#### ActiveTendersSection.tsx
- Récupération des appels d'offres publiés depuis l'API
- Affichage des 4 plus récents
- Liens vers les détails

---

## ✨ Fonctionnalités développées

### 🔐 Authentification
- **Connexion** : Formulaire avec validation
- **Inscription** : Formulaire multi-rôles
- **Déconnexion** : Nettoyage du contexte et redirection
- **Mot de passe oublié** : Flux complet avec email
- **Changement de mot de passe** : Pour utilisateurs authentifiés
- **Redirection automatique** : Selon le rôle après connexion

### 📋 Appels d'Offres

#### Public
- Consultation de la liste des AO publiés
- Recherche par titre/description/référence
- Affichage des détails complets
- Postulation pour les fournisseurs (modal avec montant)

#### Responsable
- Création d'appels d'offres (brouillon)
- Publication
- Clôture
- Consultation des candidatures reçues
- Statistiques sur ses AO

### 📝 Candidatures

#### Fournisseur
- Soumission de candidature avec montant proposé
- Modification de candidature (si soumise)
- Consultation de l'historique
- Suivi des statuts (Soumise, En évaluation, Acceptée, Rejetée)

#### Responsable
- Consultation des candidatures par AO
- Acceptation/Rejet de candidatures
- Affichage des informations fournisseur

### 🏢 Gestion Fournisseur

#### Profil
- Consultation des informations
- Modification (nom entreprise, adresse, téléphone, email)
- Gestion des identifiants légaux

#### Documents
- Upload de documents légaux (RCCM, NINEA, Quitus Fiscal)
- Consultation de la liste
- Suppression de documents
- Indicateurs visuels (Uploadé/Manquant)

### 👨‍💼 Gestion Admin

#### Responsables
- Création de comptes responsables
- Modification des informations
- Suppression de responsables
- Affichage en cartes avec statistiques

#### Fournisseurs
- Liste de tous les fournisseurs
- Validation/Rejet de comptes
- Consultation des détails
- Filtrage par statut

#### Suggestions
- Consultation de toutes les suggestions
- Gestion des statuts (En attente, Lue, Prise en compte, Rejetée)
- Affichage du fournisseur et de la date

### 💡 Système de Suggestions (Fournisseur)
- Envoi de suggestions avec sujet et message
- Historique des suggestions envoyées
- Suivi des statuts

### 📊 Dashboards

#### Admin
- Vue d'ensemble avec statistiques
- Activités récentes
- Fournisseurs en attente
- Navigation par onglets

#### Responsable
- Gestion des appels d'offres
- Statistiques sur les candidatures
- Interface claire et intuitive

#### Fournisseur
- Vue d'ensemble des candidatures
- Gestion du profil et documents
- Boîte à idées
- Navigation par onglets

---

## 🔄 Routing

### Routes publiques
- `/` - Page d'accueil
- `/connexion` - Connexion
- `/inscription` - Inscription
- `/appels-offres` - Liste publique
- `/appels-offres/:id` - Détails d'un AO
- `/comment-ca-marche` - Page explicative
- `/contact` - Contact
- `/mot-de-passe-oublie` - Forgot password
- `/reset-password` - Reset password (avec token)

### Routes protégées
- `/admin` - Dashboard Admin
- `/fournisseur/dashboard` - Dashboard Fournisseur
- `/responsable/dashboard` - Dashboard Responsable

### Protection des routes
- Vérification de l'authentification
- Vérification du rôle
- Redirection vers `/connexion` si non authentifié

---

## 🎨 UI/UX

### Design System
- **Shadcn/ui** : Composants cohérents
- **Tailwind CSS** : Styling utilitaire
- **Couleurs** : Palette cohérente avec badges de statut
- **Icônes** : Lucide React

### Responsive
- Design mobile-first
- Menu hamburger sur mobile
- Tableaux adaptatifs
- Modales responsive

### Animations
- **Framer Motion** : Transitions fluides
- Animations d'apparition
- Feedback visuel sur les actions

### Feedback utilisateur
- **Toasts** : Notifications d'actions
- Messages d'erreur clairs
- États de chargement
- Validation en temps réel

---

## 🔧 Context API (AuthContext)

### Fonctionnalités
- Gestion de l'état d'authentification global
- Client API configuré avec intercepteurs
- Méthodes : `login`, `logout`, `register`
- Propriétés : `user`, `isAuthenticated`, `loading`, `api`

### Utilisation
```typescript
const { user, isAuthenticated, api, login, logout } = useAuth();
```

---

## 📱 Responsive Design

- **Mobile** : Menu hamburger, cartes empilées
- **Tablet** : Layout adaptatif
- **Desktop** : Sidebar fixe, tableaux complets

---

## 🚀 Optimisations

- **Lazy loading** : Chargement à la demande
- **Code splitting** : Séparation des bundles
- **Memoization** : Optimisation des re-renders
- **API caching** : Réduction des appels API

---

## 📝 Notes importantes

- Les dashboards utilisent une sidebar fixe pour la navigation
- Les modales sont utilisées pour les formulaires d'édition
- Les statuts sont affichés avec des badges colorés
- Les dates sont formatées en français
- Les montants sont affichés en FCFA

---

## 🐛 Gestion des erreurs

- Affichage des erreurs API dans les toasts
- Validation côté client avant soumission
- Messages d'erreur explicites
- Gestion des cas limites (données vides, erreurs réseau)

---

## 🔐 Sécurité

- Tokens stockés dans localStorage
- Headers d'authentification automatiques
- Protection CSRF via Sanctum
- Validation des données côté client et serveur

---

## 📞 Support

Pour toute question ou problème, consultez la documentation React ou contactez l'équipe de développement.
