<x-mail::message>
# Bonjour {{ $responsable->name }},

Un nouvel appel d'offres vous a été assigné par l'administrateur.

**Titre :** {{ $appelOffre->titre }}  
**Référence :** {{ $appelOffre->reference }}  
**Date limite :** {{ \Carbon\Carbon::parse($appelOffre->date_limite_depot)->format('d/m/Y H:i') }}

Vous pouvez consulter les détails et gérer cet appel d'offres en cliquant sur le bouton ci-dessous.

<x-mail::button :url="config('app.frontend_url') . '/responsable/dashboard'">
Voir l'appel d'offres
</x-mail::button>

Cordialement,<br>
L'équipe {{ config('app.name') }}
</x-mail::message>
