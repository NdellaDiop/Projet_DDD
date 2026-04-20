@extends('emails.layout-transactional')

@section('body')
    <h2>Nouvelle candidature reçue</h2>
    <p>Bonjour,</p>
    <p>Une nouvelle candidature a été soumise pour l'appel d'offres <strong>{{ $candidature->appelOffre->titre }}</strong>.</p>
    <p class="muted">
        <strong>Fournisseur :</strong> {{ $candidature->fournisseur->nom_entreprise }}<br>
        <strong>Date de soumission :</strong> {{ \Carbon\Carbon::parse($candidature->created_at)->format('d/m/Y H:i') }}
    </p>
    <p>Vous pouvez consulter cette candidature depuis votre espace responsable.</p>
    <div class="btn-wrap">
        <a class="btn" href="{{ config('app.frontend_url') }}/responsable/dashboard" target="_blank" rel="noopener">Voir la candidature</a>
    </div>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
