@extends('emails.layout-transactional')

@section('body')
    <h2>Bienvenue sur le portail</h2>
    <p>Bonjour <strong>{{ $user->name }}</strong>,</p>
    <p>Nous avons le plaisir de vous informer que votre compte fournisseur pour l'entreprise <strong>{{ $user->fournisseur->nom_entreprise ?? '' }}</strong> a été validé par l'administration.</p>
    <p>Vous pouvez désormais vous connecter à votre espace, consulter les appels d'offres en cours et soumettre vos candidatures.</p>
    <div class="btn-wrap">
        <a class="btn" href="{{ config('app.frontend_url') }}/connexion" target="_blank" rel="noopener">Accéder à mon compte</a>
    </div>
    <p class="muted" style="margin-top: 18px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>{{ config('app.frontend_url') }}/connexion</p>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
