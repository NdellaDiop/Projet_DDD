<x-mail::message>
# Félicitations !

Bonjour {{ $candidature->fournisseur->user->name }},

Nous avons le plaisir de vous informer que votre candidature pour l'appel d'offres **{{ $candidature->appelOffre->titre }}** a été **retenue**.

**Référence de l'appel d'offres :** {{ $candidature->appelOffre->reference }}

Le responsable du marché prendra contact avec vous prochainement pour les prochaines étapes.

<x-mail::button :url="config('app.frontend_url') . '/fournisseur/dashboard'">
Voir ma candidature
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
