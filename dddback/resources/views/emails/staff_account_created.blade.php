@extends('emails.layout-transactional')

@section('body')
    <h2>Votre compte a été créé</h2>
    <p>Bonjour <strong>{{ $user->name }}</strong>,</p>
    <p>
        Un compte <strong>{{ $roleLabel }}</strong> a été créé pour vous sur le portail des marchés publics
        de Dakar Dem Dikk.
    </p>
    <p>Voici vos identifiants de connexion :</p>
    <p>
        <strong>E-mail :</strong> {{ $user->email }}<br>
        <strong>Mot de passe temporaire :</strong> {{ $plainPassword }}
    </p>
    <p class="muted">
        Pour votre sécurité, changez ce mot de passe dès votre première connexion
        (Paramètres / Mon compte).
    </p>
    <div class="btn-wrap">
        <a class="btn" href="{{ $dashboardUrl }}" target="_blank" rel="noopener">Accéder à mon espace</a>
    </div>
    <p class="muted" style="margin-top: 18px;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>{{ $dashboardUrl }}
    </p>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
