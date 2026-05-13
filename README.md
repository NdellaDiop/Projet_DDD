# Portail des appels d’offres — Projet DDD (Dakar Dem Dikk)

Documentation **globale** du dépôt : backend API (`dddback`), interface web (`dddfront`). Elle sert de base pour une **modélisation** (domaine, cas d’usage, diagrammes) et pour la rédaction d’un **mémoire de stage**.

---

## 1. Vision métier

Application web permettant à un **organisme public** (contexte type **Dakar Dem Dikk**) de :

- **Publier** des **appels d’offres** (avis, cahier des charges, annexes) ;
- Indiquer les **modalités de dépôt physique** des plis (lieu, horaires, contact du service des marchés) ;
- Laisser les **fournisseurs** consulter les marchés, **télécharger** les pièces (dont le **cahier des charges**, payant ou gratuit selon le marché), préparer leur dossier **hors ligne** et **déposer les plis en présentiel** ;
- Confier la gestion opérationnelle à des **personnes responsables des marchés (PRM)** et à des **administrateurs**.

Le portail **ne remplace pas** la procédure juridique complète des marchés publics : il **informe**, **trace** certains échanges (documents, notifications, historiques utiles) et **facilite** l’accès aux pièces et au guichet.

---

## 2. Architecture logicielle du dépôt

| Couche | Dossier | Rôle |
|--------|---------|------|
| **API REST** | `dddback/` | Laravel 10, PHP ≥ 8.1, authentification **Laravel Sanctum**, logique HTTP, règles d’accès, persistance (Eloquent). |
| **Client SPA** | `dddfront/` | React 18, **Vite 5**, **TypeScript**, UI **shadcn/ui** + **Tailwind**, appels API via **Axios**. |

Les deux projets se déploient **séparément** (souvent : API sur un sous-domaine ou chemin `/api`, front sur un hébergement statique ou derrière Nginx). La variable d’environnement front `VITE_API_BASE_URL` (ou équivalent dans `src/lib/utils`) pointe vers l’URL de l’API.

> **Note « DDD »** : le nom de dossier *DDD* évoque une démarche **Domain-Driven Design**. L’implémentation actuelle suit surtout une **architecture en couches classique Laravel** (contrôleurs, modèles, services, policies), **sans** séparer strictement domaine / infrastructure (pas de couche « Domain » isolée en PHP). Pour le mémoire, vous pouvez **reconstruire** une vision DDD (contextes, agrégats) **à partir** des concepts métier et des modèles ci-dessous.

---

## 3. Acteurs et rôles

Les comptes utilisateurs sont des `users` reliés à un `roles` (`ADMIN`, `RESPONSABLE_MARCHE`, `FOURNISSEUR`).

| Rôle | Profil métier | Points clés dans l’app |
|------|----------------|-------------------------|
| **ADMIN** | Administrateur SI / marchés | Tableaux de bord globaux, gestion des PRM, validation des fournisseurs, audit, assignation d’AO à un PRM, création d’AO. |
| **RESPONSABLE_MARCHE** | PRM | Création / publication / clôture des AO dont il est responsable, consultation des candidatures reçues (si flux activé), ajout de documents sur les AO, modalités de dépôt. |
| **FOURNISSEUR** | Entreprise candidate | Inscription, dépôt des **documents légaux**, consultation des AO publiés, paiement du **cahier** si requis, téléchargements, notifications, assistant conversationnel (option IA). |

Les **visiteurs non connectés** peuvent consulter la liste des AO publiés et une partie des informations ; le téléchargement du **cahier payant** ou certaines pièces nécessite un compte fournisseur et parfois un paiement.

---

## 4. Concepts métier principaux (pour modélisation)

### 4.1 Appel d'offres (`AppelOffre`)

**Cycle de vie** (`statut`) : `draft` → `published` → `closed` ; éventuellement `archived`.

**Données métier notables** :

- **Référence**, **titre**, **description**, **source de financement** (`fonds_propres`, `etat`, `financement_exterieure`) ;
- **Dates** : publication, limite de dépôt ;
- **Modalités de soumission physique** (`modalites_soumission_physique`) : texte libre saisi par PRM / admin, affiché sur la fiche publique (pas d’adresse codée en dur) ;
- **Cahier payant** : `cahier_paiement_requis`, `cahier_prix_xof` (FCFA) ;
- **Lien** : `responsable_marche_id` (peut être null si AO créé par l’admin sans assignation immédiate).

**Règles métier (extraits)** : publication refusée si documents obligatoires manquants, si cahier payant sans prix, ou si **modalités de dépôt physique** vides (selon implémentation actuelle).

### 4.2 Document (`Document`)

Fichiers liés soit à un **appel d'offres** (avis, cahier, règlement, annexe), soit à un **utilisateur** (documents légaux fournisseur), soit à une **candidature**. Catégories typées (ex. `AVIS_APPEL_OFFRES`, `CAHIER_DES_CHARGES`, etc.).

**Téléchargement côté fournisseur** : règles dans le modèle `Document` (ex. cahier payant seulement après enregistrement d’un **achat** complété — voir `CahierAccesAchat`).

### 4.3 Paiement du cahier des charges

- Entité **`CahierAccesAchat`** : trace l’**intention d’achat** / le **statut** (ex. payé) par `user` et `appel_offre`.
- **Prestataires** : **Wave** (Checkout), **Orange Money** (intégration HTTP générique), **simulation** (démo sans vrai débit) — configuration dans `config/paiement.php` et variables d’environnement.
- **Webhooks** : finalisation côté serveur (`webhooks/wave/cahier`, `webhooks/orange-money/cahier`).

### 4.4 Candidature (`Candidature`)

Lien **fournisseur** ↔ **appel d’offres**, avec statut, date de soumission, montant proposé optionnel, documents rattachés, **commentaires** (`CandidatureComment`).

**Paramètre portail** : `CANDIDATURE_EN_LIGNE` (`config/portail.php`) — si `false`, la **création** de candidature par le fournisseur via l’API est refusée (dépôt **physique** prioritaire) ; l’interface fournisseur l’explicite. Des écrans back-office peuvent toutefois lister d’éventuelles entrées (historique, saisie manuelle, tests).

### 4.5 Fournisseur (`Fournisseur`)

Données entreprise (raison sociale, contacts, pièces légales NINEA / RCCM / quitus, références professionnelles, etc.), statut de validation par l’admin.

### 4.6 Responsable des marchés (`ResponsableMarche`)

Extension métier liée à un `User` : département, fonction, téléphone, lien avec les AO.

### 4.7 Notifications et communication

- **`Notification`** : messages in-app (lecture / non lue).
- **`ContactMessage`** : formulaire contact public.
- **`Suggestion`** : boîte à idées utilisateurs.
- **Emails** : réinitialisation mot de passe, événements métier selon `NotificationService`.

### 4.8 Traçabilité

- **`LogActivite`** : actions métier (création AO, etc.).
- **`AuditLog`** : journalisation consultable par l’admin (route `admin/audit-logs`).

### 4.9 Assistant IA fournisseur

- **`FournisseurChatController`** + services **`Ai/`** (client OpenAI configurable, réponses FAQ locales `FournisseurFaqResponder`) : questions contextuelles, rate limiting.

---

## 5. Tables de base de données (aperçu)

Principales tables (voir `dddback/database/migrations/`) :

- `users`, `roles`, `password_reset_tokens`, `personal_access_tokens`
- `responsables_marche`, `fournisseurs`
- `appels_offres`
- `documents`
- `candidatures`, `candidature_comments`
- `notifications`
- `logs_activites`, `audit_logs`
- `suggestions`, `contact_messages`
- `cahier_acces_achats`

---

## 6. API REST (résumé)

Fichier source : `dddback/routes/api.php`.

- **Public** : `GET /api/appels-offres`, `GET /api/appels-offres/{id}`, auth (`login`, `register`), mot de passe oublié, `POST /api/contact`, webhooks paiement.
- **Authentifié (Sanctum)** : CRUD partiel selon rôle — AO (création / mise à jour / publish / close), documents, candidatures, notifications, profils PRM / fournisseur, admin (stats, utilisateurs, audit), paiement cahier, chat fournisseur.

Une liste détaillée des endpoints figure aussi dans `dddback/README.md`.

---

## 7. Interface web — routes principales

Fichier : `dddfront/src/App.tsx`.

| Chemin | Page |
|--------|------|
| `/` | Accueil |
| `/appels-offres` | Liste des marchés |
| `/appels-offres/:id` | Détail d’un AO (fiche avis, fichiers, modalités de dépôt, paiement cahier) |
| `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reset-password` | Authentification |
| `/comment-ca-marche`, `/contact` | Informations |
| `/admin` | Tableau de bord administrateur |
| `/responsable/dashboard` | Tableau de bord PRM (admin peut aussi y accéder selon garde front) |
| `/fournisseur/dashboard` | Espace fournisseur |
| `/paiement/cahier/simulation` | Paiement simulé (si activé côté API) |

---

## 8. Configuration importante (backend)

Fichiers dans `dddback/config/` et variables `.env` (voir `.env.example`) :

| Domaine | Fichier / variables |
|---------|---------------------|
| Base de données | `DB_*` |
| Sanctum / URL app | `APP_URL`, sessions |
| Portail | `CANDIDATURE_EN_LIGNE` → `config/portail.php` |
| Paiement cahier | `FRONTEND_URL`, `CAHIER_PAIEMENT_SIMULATION`, clés Wave / Orange Money, webhooks |
| Assistant IA | clés provider (ex. OpenAI), configuration dans `config/` dédiée si présente |

Le front utilise typiquement une URL d’API absolue pour Axios (`API_BASE_URL` / `VITE_*`).

### 8.1 Paiement cahier — mode simulation (soutenance)

Sans clés **Wave** ni **Orange Money**, vous pouvez tout de même montrer le **parcours complet** (bouton paiement → page « PAYER » simulée → téléchargement du cahier) :

1. Dans `dddback/.env`, **`FRONTEND_URL`** doit être l’URL du front Vite (par défaut dans ce projet : port **8080**, cf. `dddfront/vite.config.ts`).
2. **`CAHIER_PAIEMENT_SIMULATION=true`** dans `.env`, **ou** laisser `APP_ENV=local` : la simulation est alors **activée par défaut** si la variable n’est pas renseignée (`config/paiement.php`).
3. Après modification du `.env` : `php artisan config:clear` (ou `php artisan config:cache` sur serveur une fois les valeurs figées).

### 8.2 Déploiement — vue d’ensemble

- **Backend** : PHP + Laravel sur un serveur (ou conteneur) ; exposer `public/` comme racine web ou avec **PHP-FPM + Nginx** ; variables `.env` de production (`APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, base `DB_*`, `FRONTEND_URL`, paiements).
- **Frontend** : `npm run build` dans `dddfront/` ; servir le dossier **`dist/`** en statique (Nginx, CDN, S3, etc.).
- **CORS / cookies** : si domaines différents pour API et front, ajuster **Sanctum** (`SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`) selon votre hébergement.
- **HTTPS** : obligatoire en production pour les paiements réels et les cookies sécurisés.

---

## 9. Installation et exécution locale

### Backend (`dddback`)

```bash
cd dddback
composer install
cp .env.example .env   # puis éditer DB_*, APP_URL, etc.
php artisan key:generate
php artisan migrate
php artisan serve        # http://127.0.0.1:8000
```

### Frontend (`dddfront`)

```bash
cd dddfront
npm install
# Configurer l’URL de l’API (variable Vite selon le projet)
npm run dev              # dans ce dépôt : http://127.0.0.1:8080 (voir vite.config.ts)
```

Build production :

```bash
cd dddfront && npm run build   # sortie dans dist/
```

---

## 10. Pistes pour la modélisation (mémoire)

### 10.1 Contextes délimités (bounded contexts) possibles

- **Publication des marchés** : AO, documents officiels, workflow brouillon → publié → clôturé, modalités de dépôt.
- **Accès aux pièces** : droits de téléchargement, **achat du cahier**, intégration paiement.
- **Relation acheteur–fournisseurs** : inscription / validation fournisseur, documents légaux.
- **Soumission / instruction des offres** : selon votre périmètre — soit **uniquement présentiel** (hors système), soit extension **candidature en ligne** si activée.
- **Notifications et réclamations** : notifications, contact, suggestions.
- **Gouvernance** : audit, logs d’activité, administration des comptes.

### 10.2 Langage ubiquitaire (exemples)

| Terme | Sens dans ce projet |
|-------|---------------------|
| Appel d'offres | Marché consultatif publié avec pièces jointes et dates limites. |
| Cahier des charges | Document téléchargeable ; peut être payant et débloqué après paiement. |
| Dépôt des plis | Action **physique** au siège ; modalités décrites dans `modalites_soumission_physique`. |
| PRM | Responsable désigné pour un AO. |
| Candidature | Enregistrement optionnel **en ligne** si la fonctionnalité est activée ; sinon parcours présentiel uniquement. |

### 10.3 Diagrammes utiles pour un mémoire

- Diagramme de **cas d’utilisation** par acteur (visiteur, fournisseur, PRM, admin).
- Diagramme de **classes** ou **modèle de données** dérivé des migrations.
- **Séquence** : paiement du cahier → webhook → téléchargement.
- **Machine à états** : cycle de vie de `AppelOffre`.

---

## 11. Documentation complémentaire

- `dddback/README.md` — détail API, modèles, installation backend.
- `dddfront/README.md` — si présent : stack front et scripts.

---

## 12. Licence et contexte académique

Projet réalisé dans un cadre de **stage / mémoire** autour de la gestion des marchés publics et du portail d’information des appels d’offres. Adapter la formulation juridique et institutionnelle du mémoire aux sources officielles en vigueur (code des marchés publics, guides ARMP, etc.).

---

*Dernière mise à jour du README : structure du dépôt et concepts alignés sur le code à la date de rédaction.*
