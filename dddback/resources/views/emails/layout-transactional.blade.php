<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $emailTitle ?? 'Portail appels d\'offres' }}</title>
    <style>
        body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; }
        .shell { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
        .card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08); }
        .brand { background: linear-gradient(135deg, hsl(172, 34%, 38%) 0%, hsl(208, 18%, 32%) 100%); color: #fff; padding: 22px 24px; }
        .brand h1 { margin: 0; font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; }
        .brand p { margin: 8px 0 0; font-size: 0.8125rem; opacity: 0.92; line-height: 1.4; }
        .inner { padding: 26px 24px 28px; }
        .inner h2 { margin: 0 0 14px; font-size: 1.2rem; color: #0f172a; font-weight: 700; }
        .inner p { margin: 0 0 12px; line-height: 1.55; font-size: 0.9375rem; color: #334155; }
        .btn-wrap { margin-top: 22px; }
        .btn { display: inline-block; background: hsl(172, 34%, 38%); color: #ffffff !important; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 0.9375rem; }
        .muted { color: #64748b; font-size: 0.875rem; }
        .footer { text-align: center; padding: 20px 12px 8px; font-size: 0.75rem; color: #64748b; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="shell">
        <div class="card">
            <div class="brand">
                <h1>{{ config('mail.from.name', 'Portail Marchés Publics DDD') }}</h1>
                <p>Dakar Dem Dikk — Portail officiel des appels d'offres</p>
            </div>
            <div class="inner">
                @yield('body')
            </div>
        </div>
        <div class="footer">
            © {{ date('Y') }} Dakar Dem Dikk. Tous droits réservés.<br>
            Ce message est envoyé automatiquement depuis le portail des appels d'offres.
        </div>
    </div>
</body>
</html>
