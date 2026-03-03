<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .header {
            background-color: #004d40; /* Couleur Dakar Dem Dikk ou similaire */
            color: white;
            padding: 10px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            padding: 20px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 0.8em;
            color: #777;
        }
        .btn {
            display: inline-block;
            background-color: #004d40;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Bienvenue sur le Portail des Marchés Publics</h2>
        </div>
        <div class="content">
            <p>Bonjour <strong>{{ $user->name }}</strong>,</p>
            
            <p>Nous avons le plaisir de vous informer que votre compte fournisseur pour l'entreprise <strong>{{ $user->fournisseur->nom_entreprise ?? '' }}</strong> a été validé par l'administration.</p>
            
            <p>Vous pouvez désormais vous connecter à votre espace, consulter les appels d'offres en cours et soumettre vos candidatures.</p>
            
            <p style="text-align: center;">
                <a href="{{ config('app.frontend_url', 'http://localhost:5173') }}/connexion" class="btn">Accéder à mon compte</a>
            </p>
            
            <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            {{ config('app.frontend_url', 'http://localhost:5173') }}/connexion</p>
        </div>
        <div class="footer">
            <p>Ceci est un message automatique, merci de ne pas y répondre.</p>
            <p>&copy; {{ date('Y') }} Dakar Dem Dikk. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
