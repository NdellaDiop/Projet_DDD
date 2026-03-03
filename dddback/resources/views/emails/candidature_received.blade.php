<x-mail::message>
# Nouvelle candidature reçue

Bonjour,

Une nouvelle candidature a été soumise pour l'appel d'offres **{{ $candidature->appelOffre->titre }}**.

**Fournisseur :** {{ $candidature->fournisseur->nom_entreprise }}  
**Date de soumission :** {{ \Carbon\Carbon::parse($candidature->created_at)->format('d/m/Y H:i') }}

Vous pouvez consulter cette candidature en cliquant sur le bouton ci-dessous.

<x-mail::button :url="config('app.frontend_url') . '/responsable/dashboard'">
Voir la candidature
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
