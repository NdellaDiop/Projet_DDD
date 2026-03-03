<x-mail::message>
# Mise à jour de votre candidature

Bonjour {{ $candidature->fournisseur->user->name }},

Nous vous remercions de l'intérêt que vous portez à nos appels d'offres.

Après une analyse approfondie des dossiers reçus pour l'appel d'offres **{{ $candidature->appelOffre->titre }}**, nous avons le regret de vous informer que votre candidature n'a pas été retenue.

**Référence de l'appel d'offres :** {{ $candidature->appelOffre->reference }}

Nous vous encourageons à postuler à nos futurs appels d'offres.

<x-mail::button :url="config('app.frontend_url') . '/fournisseur/dashboard'">
Voir les appels d'offres disponibles
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
