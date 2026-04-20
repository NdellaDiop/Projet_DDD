@extends('emails.layout-transactional')

@section('body')
    <h2>Mise à jour de votre candidature</h2>
    <p>Bonjour {{ $candidature->fournisseur->user->name }},</p>
    <p>Nous vous remercions de l'intérêt que vous portez à nos appels d'offres.</p>
    <p>Après une analyse approfondie des dossiers reçus pour l'appel d'offres <strong>{{ $candidature->appelOffre->titre }}</strong>, nous avons le regret de vous informer que votre candidature n'a pas été retenue.</p>
    <p class="muted"><strong>Référence de l'appel d'offres :</strong> {{ $candidature->appelOffre->reference }}</p>
    <p>Nous vous encourageons à postuler à nos futurs appels d'offres.</p>
    <div class="btn-wrap">
        <a class="btn" href="{{ config('app.frontend_url') }}/fournisseur/dashboard" target="_blank" rel="noopener">Voir les appels d'offres disponibles</a>
    </div>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
