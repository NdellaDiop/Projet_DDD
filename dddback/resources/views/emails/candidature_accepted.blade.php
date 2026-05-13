@extends('emails.layout-transactional')

@section('body')
    <h2>Félicitations !</h2>
    <p>Bonjour {{ $candidature->fournisseur->user->name }},</p>
    <p>Nous avons le plaisir de vous informer que votre dossier pour l'appel d'offres <strong>{{ $candidature->appelOffre->titre }}</strong> a été <strong>retenu</strong>.</p>
    <p class="muted"><strong>Référence de l'appel d'offres :</strong> {{ $candidature->appelOffre->reference }}</p>
    <p>Les suites du marché (dont la remise définitive des plis et la <strong>soumission en présentiel</strong>) se poursuivent selon les modalités indiquées dans l&apos;avis d&apos;appel d&apos;offres. La personne responsable du marché (PRM) peut vous contacter ; vous recevez aussi une notification dans le portail.</p>
    <div class="btn-wrap">
        <a class="btn" href="{{ config('app.frontend_url') }}/fournisseur/dashboard" target="_blank" rel="noopener">Voir mon espace fournisseur</a>
    </div>
    <p style="margin-top: 24px;">Cordialement,<br><strong>{{ config('mail.from.name', 'Dakar Dem Dikk') }}</strong></p>
@endsection
