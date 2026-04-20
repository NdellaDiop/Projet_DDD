@extends('emails.layout-transactional')

@section('body')
    <h2>Nouvel appel d'offres assigné</h2>
    <p>Bonjour {{ $responsable->name }},</p>
    <p>Un nouvel appel d'offres vous a été assigné par l'administrateur.</p>
    <p class="muted">
        <strong>Titre :</strong> {{ $appelOffre->titre }}<br>
        <strong>Référence :</strong> {{ $appelOffre->reference }}<br>
        <strong>Date limite :</strong> {{ \Carbon\Carbon::parse($appelOffre->date_limite_depot)->format('d/m/Y H:i') }}
    </p>
    <div class="btn-wrap">
        <a class="btn" href="{{ config('app.frontend_url') }}/responsable/dashboard" target="_blank" rel="noopener">Voir l'appel d'offres</a>
    </div>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
