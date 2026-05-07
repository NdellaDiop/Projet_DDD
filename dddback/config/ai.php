<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI provider configuration
    |--------------------------------------------------------------------------
    |
    | Keep all provider secrets in .env and call the AI from the backend to
    | avoid exposing keys in the browser.
    |
    */

    'provider' => env('AI_PROVIDER', 'openai'),

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'model' => env('AI_MODEL', 'gpt-4.1-mini'),
    ],

    'temperature' => (float) env('AI_TEMPERATURE', 0.2),
    'max_tokens' => (int) env('AI_MAX_TOKENS', 500),
    'timeout_seconds' => (int) env('AI_TIMEOUT_SECONDS', 20),
];

