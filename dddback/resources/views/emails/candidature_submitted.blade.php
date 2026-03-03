<x-mail::message>
# Confirmation de réception

Bonjour {{ $candidature->fournisseur->user->name }},

Nous avons bien reçu votre candidature pour l'appel d'offres **{{ $candidature->appelOffre->titre }}**.

**Référence de l'appel d'offres :** {{ $candidature->appelOffre->reference }}  
**Date de soumission :** {{ \Carbon\Carbon::parse($candidature->created_at)->format('d/m/Y H:i') }}  
**Montant proposé :** {{ number_format($candidature->montant_propose, 0, ',', ' ') }} FCFA

Votre dossier est en cours de traitement. Vous serez notifié de l'évolution de votre candidature.

Vous pouvez suivre l'état de vos candidatures sur votre tableau de bord.

<x-mail::button :url="config('app.frontend_url') . '/fournisseur/dashboard'">
Voir mes candidatures
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
