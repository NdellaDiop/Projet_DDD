@extends('emails.layout-transactional')

@section('body')
    <h2>Félicitations !</h2>
    <p>Bonjour {{ $candidature->fournisseur->user->name }},</p>
    <p>Nous avons le plaisir de vous informer que votre candidature pour l'appel d'offres <strong>{{ $candidature->appelOffre->titre }}</strong> a été <strong>retenue</strong>.</p>
    <p class="muted"><strong>Référence de l'appel d'offres :</strong> {{ $candidature->appelOffre->reference }}</p>
    <p>Le responsable du marché prendra contact avec vous prochainement pour les prochaines étapes.</p>
    <div class="btn-wrap">
        <a class="btn" href="{{ config('app.frontend_url') }}/fournisseur/dashboard" target="_blank" rel="noopener">Voir ma candidature</a>
    </div>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
