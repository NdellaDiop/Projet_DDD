@extends('emails.layout-transactional')

@section('body')
    <h2>Confirmation de réception</h2>
    <p>Bonjour {{ $candidature->fournisseur->user->name }},</p>
    <p>Nous avons bien reçu votre candidature pour l'appel d'offres <strong>{{ $candidature->appelOffre->titre }}</strong>.</p>
    <p class="muted">
        <strong>Référence :</strong> {{ $candidature->appelOffre->reference }}<br>
        <strong>Date de soumission :</strong> {{ \Carbon\Carbon::parse($candidature->created_at)->format('d/m/Y H:i') }}<br>
        <strong>Montant proposé :</strong> {{ number_format($candidature->montant_propose, 0, ',', ' ') }} FCFA
    </p>
    <p>Votre dossier est en cours de traitement. Vous serez notifié de l'évolution de votre candidature.</p>
    <div class="btn-wrap">
        <a class="btn" href="{{ config('app.frontend_url') }}/fournisseur/dashboard" target="_blank" rel="noopener">Voir mes candidatures</a>
    </div>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
