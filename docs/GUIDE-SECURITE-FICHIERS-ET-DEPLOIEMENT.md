# Guide — Sécurisation des fichiers et mise à jour sur le serveur

Ce guide complète le déploiement sur **https://pmp.demdikk.sn** après le changement :
- les fichiers ne sont **plus** accessibles via `/storage/...` ;
- tous les téléchargements passent par **`/api/documents/{id}/download`** (connexion + droits).

---

## 1. Comportement attendu (après mise à jour)

| Action | Visiteur non connecté | Fournisseur connecté | Admin / PRM |
|--------|----------------------|----------------------|-------------|
| Voir la liste des AO | Oui | Oui | Oui |
| Télécharger l’avis (gratuit) | Non — « Se connecter » | Oui (si compte actif + règles) | Oui |
| Télécharger le cahier payant | Non | Après paiement / règles | Oui |
| URL directe `/storage/documents/...` | **403 interdit** | **403** | **403** |

L’acteur **Visiteur** n’est **pas obligatoire** dans le mémoire : seuls **Administrateur**, **Responsable des marchés** et **Fournisseur** téléchargent des fichiers.

---

## 2. Sur votre PC — envoyer le code sur GitHub

```bash
cd /home/ndella/Documents/Projet_DDD/DDD

git status
git add -A
git commit -m "fix: fichiers hors /storage public, téléchargements via API protégée"
git push origin main
```

---

## 3. Sur le serveur (SSH) — mettre à jour l’application

Connectez-vous :

```bash
ssh -i ~/.ssh/cle_stage_entreprise ubuntu@54.221.143.23
```

Puis :

```bash
cd /var/www/ddd
git pull origin main

cd dddback
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

cd ../dddfront
npm ci
npm run build
```

Vérifiez les permissions (si erreur log Laravel) :

```bash
cd /var/www/ddd/dddback
sudo chown -R ubuntu:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

---

## 4. Apache — bloquer `/storage` (étape indispensable)

### 4.1 Vérifier si un Alias existe

```bash
grep -R "Alias /storage" /etc/apache2/sites-enabled/
```

Si une ligne apparaît, il faut la **supprimer** ou commenter (`#`).

### 4.2 Éditer le vhost HTTPS (certbot)

```bash
sudo nano /etc/apache2/sites-available/pmp-le-ssl.conf
```

**Supprimez** toute ligne du type :

```apache
Alias /storage /var/www/ddd/dddback/public/storage
```

**Ajoutez** (dans le `<VirtualHost *:443>`, avant la fin) :

```apache
    # Interdit l'accès direct aux anciens fichiers publics
    <Location "/storage">
        Require all denied
    </Location>
```

Faites la même chose dans `/etc/apache2/sites-available/pmp.conf` (port 80) si le bloc existe.

Un exemple complet est dans le dépôt : `deploy/apache/pmp.conf.example`.

### 4.3 Tester et recharger Apache

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## 5. Tests de validation (à faire dans l’ordre)

### Test A — `/storage` doit être bloqué

Sur le serveur ou votre PC :

```bash
curl -I https://pmp.demdikk.sn/storage/
```

Attendu : **403 Forbidden** (ou 404), **pas** 200.

### Test B — API download sans connexion

```bash
curl -I https://pmp.demdikk.sn/api/documents/1/download
```

Attendu : **401 Unauthorized** (ou 302 vers login), **pas** le fichier.

### Test C — Dans le navigateur

1. **Navigation privée** → `https://pmp.demdikk.sn` → ouvrir un AO publié.  
   - Les pièces affichent **« Se connecter pour télécharger »** (normal).
2. **Connexion fournisseur actif** → télécharger l’avis : **OK**.
3. **Connexion admin** → télécharger une pièce légale fournisseur : **OK**.

---

## 6. Anciens fichiers déjà uploadés

Les fichiers créés **avant** cette mise à jour peuvent encore être sur le disque `public`. Le code essaie d’abord le disque **`local`** (privé), puis **`public`** (ancien).

- Les **nouveaux** uploads vont uniquement dans `storage/app/documents` (privé).
- Pour une sécurité maximale : bloquer `/storage` sur Apache (section 4) — même les anciens liens directs ne fonctionneront plus.
- Téléchargement normal : toujours via l’API (utilisateurs autorisés).

---

## 7. Mémoire / acteurs (rappel)

Dans le chapitre analyse des besoins, vous pouvez lister **3 acteurs** :

1. **Administrateur**
2. **Responsable des marchés (PRM)**
3. **Fournisseur**

Pas besoin d’un acteur **Visiteur** si vous précisez : *« la consultation publique des appels d’offres est possible sans compte ; le téléchargement des documents nécessite une authentification. »*

---

## 8. En cas de problème

| Symptôme | Piste |
|----------|--------|
| Téléchargement 401 alors que connecté | Reconnexion ; `php artisan config:cache` ; vérifier token Sanctum / cookies HTTPS |
| 404 document | Fichier absent ; re-uploader la pièce |
| 500 au download | `tail -50 /var/www/ddd/dddback/storage/logs/laravel.log` |
| `/storage` encore accessible | Alias pas retiré → refaire section 4 |

---

*Dernière mise à jour : sécurisation téléchargements — stockage `local`, blocage Apache `/storage`.*
