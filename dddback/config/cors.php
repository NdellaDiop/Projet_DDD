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

    'allowed_origins' => [
        'http://localhost:8081',
        'http://127.0.0.1:8081', 
        // 'https://votre-domaine-frontend.com', // N'oubliez pas d'ajouter votre domaine de PROD en HTTPS ici quand vous déploierez
        // 'https://www.votre-domaine-frontend.com',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // TRÈS IMPORTANT pour Laravel Sanctum et la protection CSRF via cookies
];