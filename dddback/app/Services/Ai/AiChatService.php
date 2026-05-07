<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Str;

class AiChatService
{
    public function __construct(private readonly OpenAiChatClient $openAi)
    {
    }

    /**
     * @param array<int,array{role:string,content:string}> $messages
     * @return array{answer:string,provider:string,model:string}
     */
    public function chat(array $messages): array
    {
        $provider = (string) config('ai.provider', 'openai');

        if ($provider !== 'openai') {
            return [
                'answer' => "Le provider IA configuré (« {$provider} ») n'est pas pris en charge pour le moment.",
                'provider' => $provider,
                'model' => '',
            ];
        }

        if (!is_string(config('ai.openai.api_key')) || trim((string) config('ai.openai.api_key')) === '') {
            return [
                'answer' => "L'IA n'est pas configurée sur le serveur (clé API manquante).",
                'provider' => $provider,
                'model' => (string) config('ai.openai.model'),
            ];
        }

        try {
            $res = $this->openAi->chat($messages);
            $text = trim((string) $res['content']);
            if ($text === '') {
                $text = "Je n'ai pas pu générer une réponse pour le moment. Réessayez dans quelques secondes.";
            }
            return [
                'answer' => $text,
                'provider' => $provider,
                'model' => (string) config('ai.openai.model'),
            ];
        } catch (RequestException $e) {
            $status = $e->response?->status();
            $safe = $status ? "Erreur provider IA (HTTP {$status})." : "Erreur provider IA.";
            return [
                'answer' => $safe . " Réessayez plus tard.",
                'provider' => $provider,
                'model' => (string) config('ai.openai.model'),
            ];
        }
    }

    public static function isOutOfScope(string $message): bool
    {
        $m = Str::lower($message);
        return Str::contains($m, [
            'mot de passe',
            'password',
            'token',
            'clé api',
            'api key',
            'xsrf',
            'cookie',
            'session',
            'carte bancaire',
            'cvv',
            'iban',
        ]);
    }
}

