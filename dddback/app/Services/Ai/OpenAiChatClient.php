<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class OpenAiChatClient
{
    /**
     * @return array{content:string,raw:mixed}
     * @throws RequestException
     */
    public function chat(array $messages, array $options = []): array
    {
        $baseUrl = rtrim((string) config('ai.openai.base_url'), '/');
        $apiKey = (string) config('ai.openai.api_key');
        $model = (string) config('ai.openai.model');

        $payload = [
            'model' => $model,
            // OpenAI Chat Completions compatible payload
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? (float) config('ai.temperature'),
            'max_tokens' => $options['max_tokens'] ?? (int) config('ai.max_tokens'),
        ];

        $timeout = (int) ($options['timeout_seconds'] ?? config('ai.timeout_seconds', 20));

        $response = Http::timeout($timeout)
            ->withToken($apiKey)
            ->acceptJson()
            ->asJson()
            ->post($baseUrl . '/chat/completions', $payload);

        $response->throw();

        $json = $response->json();
        $content = data_get($json, 'choices.0.message.content', '');

        return [
            'content' => is_string($content) ? $content : '',
            'raw' => $json,
        ];
    }
}

