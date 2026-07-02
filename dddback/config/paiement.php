<?php

return [

    /*
    | URL du front (Vite) pour les retours Wave / Orange après paiement.
    | Exemple : https://app.example.com ou http://localhost:5173
    */
    'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost')),

    /**
     * Paiement simulé (démo / soutenance / en attendant Wave–Orange).
     * Aucun débit réel : accès cahier marqué payé après confirmation sur la page front dédiée.
     *
     * - Si `CAHIER_PAIEMENT_SIMULATION` est défini dans `.env`, il prime (true/false).
     * - Sinon : activé par défaut en `APP_ENV=local` ou `development` ; désactivé en production.
     */
    'simulation_enabled' => $simulationEnabled = (static function (): bool {
        $raw = env('CAHIER_PAIEMENT_SIMULATION');
        if ($raw !== null && $raw !== '') {
            return filter_var($raw, FILTER_VALIDATE_BOOLEAN);
        }

        return in_array((string) env('APP_ENV', 'production'), ['local', 'development'], true);
    })(),

    /** API Orange Money réelle (sans simulation). */
    'orange_money_api_enabled' => $orangeMoneyApiEnabled = filter_var(
        env('ORANGE_MONEY_WEBPAY_ENABLED', false),
        FILTER_VALIDATE_BOOLEAN
    ),

    /** Orange Money affiché à l’UI (API WebPay ou parcours simulé pour démo / soutenance). */
    'orange_money_ui_enabled' => $orangeMoneyApiEnabled || $simulationEnabled,

    'wave' => [
        'enabled' => env('WAVE_CHECKOUT_ENABLED', false),
        'api_base' => rtrim(env('WAVE_API_BASE', 'https://api.wave.com'), '/'),
        /** Clé API Checkout (Bearer wave_sn_prod_...) — Portail Wave Business */
        'api_key' => env('WAVE_API_KEY'),
        /** Secret de signature des requêtes sortantes (optionnel, si activé sur la clé) */
        'signing_secret' => env('WAVE_SIGNING_SECRET'),
        /** Secret webhook (wave_sn_WHS_...) — différent de la clé API */
        'webhook_secret' => env('WAVE_WEBHOOK_SECRET'),
        /** Permet POST /verifier-wave pour finaliser si webhook pas encore reçu (dev / secours) */
        'allow_sync_verify' => env('WAVE_ALLOW_SYNC_VERIFY', false),
    ],

    /*
    | Orange Money Web Payment varie selon le pays / contrat Orange.
    | On expose une intégration HTTP générique : vous renseignez l’URL d’initiation
    | et le chemin JSON vers l’URL de redirection dans la réponse.
    */
    'orange_money' => [
        'enabled' => $orangeMoneyApiEnabled,
        'init_url' => env('ORANGE_MONEY_INIT_URL'),
        'method' => strtoupper(env('ORANGE_MONEY_INIT_METHOD', 'POST')),
        'headers' => [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ],
        'auth' => [
            'type' => env('ORANGE_MONEY_AUTH_TYPE', 'bearer'),
            'token' => env('ORANGE_MONEY_API_TOKEN'),
        ],
        /** Clé du champ contenant l’URL de paiement dans le JSON (ex: payment_url, pay_url) */
        'response_payment_url_key' => env('ORANGE_MONEY_RESPONSE_URL_KEY', 'payment_url'),
        'webhook_secret' => env('ORANGE_MONEY_WEBHOOK_SECRET'),
    ],
];
