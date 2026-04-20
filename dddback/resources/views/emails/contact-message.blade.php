<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouveau message — Portail appels d'offres</title>
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1e293b; max-width: 640px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 1.25rem; margin: 0 0 16px;">Nouveau message depuis le portail</h1>
    <p style="margin: 0 0 16px; color: #64748b;">Un visiteur a envoyé un message via le formulaire de contact. Vous pouvez répondre directement à cette adresse e-mail.</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; width: 120px; color: #64748b;">Nom</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{{ $contactMessage->nom ?: '—' }}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">E-mail</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><a href="mailto:{{ $contactMessage->email }}">{{ $contactMessage->email }}</a></td>
        </tr>
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Sujet</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{{ $contactMessage->sujet }}</td>
        </tr>
    </table>

    <h2 style="font-size: 1rem; margin: 24px 0 8px;">Message</h2>
    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; white-space: pre-wrap;">{{ $contactMessage->message }}</div>

    <p style="margin-top: 24px; font-size: 0.875rem; color: #94a3b8;">
        @if($contactMessage->id)
            Référence interne : message #{{ $contactMessage->id }}@if($contactMessage->created_at)
                — {{ $contactMessage->created_at->format('d/m/Y H:i') }}
            @endif
        @else
            Référence interne : non attribuée (envoi de test hors enregistrement en base).
        @endif
    </p>
</body>
</html>
