<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines which domains are allowed to access your
    | application via AJAX requests. You may pass array's of URLs or patterns.
    |
    | It's important to set 'supports_credentials' to true for Laravel Sanctum
    | when working with SPAs using cookies for CSRF protection.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register', 'me'],

    'allowed_methods' => ['*'],

    // Origines autorisées : configurables via CORS_ALLOWED_ORIGINS (CSV) dans .env.
    // Par défaut, on autorise les origines de dev local Vite/CRA.
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:8081,http://127.0.0.1:8081,http://localhost:5173,http://127.0.0.1:5173'
    ))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // TRÈS IMPORTANT pour Laravel Sanctum et la protection CSRF via cookies
];