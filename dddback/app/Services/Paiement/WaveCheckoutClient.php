<?php

namespace App\Services\Paiement;

use App\Models\AppelOffre;
use App\Models\CahierAccesAchat;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Client Checkout Wave {@see https://docs.wave.com/checkout}
 */
class WaveCheckoutClient
{
    public function createCheckoutSession(CahierAccesAchat $achat, AppelOffre $appelOffre): array
    {
        $base = config('paiement.wave.api_base');
        $apiKey = config('paiement.wave.api_key');
        if (! $base || ! $apiKey) {
            throw new RuntimeException('Wave non configuré : définissez WAVE_CHECKOUT_ENABLED, WAVE_API_BASE et WAVE_API_KEY.');
        }

        $frontend = rtrim((string) config('paiement.frontend_url'), '/');
        $amount = (string) max(1, (int) $achat->montant_xof);

        $payload = [
            'amount' => $amount,
            'currency' => 'XOF',
            'success_url' => $frontend.'/appels-offres/'.$appelOffre->id.'?paiement=wave&statut=success',
            'error_url' => $frontend.'/appels-offres/'.$appelOffre->id.'?paiement=wave&statut=erreur',
            'client_reference' => (string) $achat->id,
        ];

        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        $headers = [
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        $signingSecret = config('paiement.wave.signing_secret');
        if (! empty($signingSecret)) {
            $timestamp = (string) time();
            $signature = hash_hmac('sha256', $timestamp.$body, $signingSecret);
            $headers['Wave-Signature'] = 't='.$timestamp.',v1='.$signature;
        }

        /** @var Response $response */
        $response = Http::timeout(30)
            ->withHeaders($headers)
            ->withBody($body, 'application/json')
            ->post($base.'/v1/checkout/sessions');

        if (! $response->successful()) {
            Log::warning('Wave checkout session échec', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Wave a refusé la création de session ('.$response->status().').');
        }

        $data = $response->json();
        if (empty($data['wave_launch_url']) || empty($data['id'])) {
            Log::error('Wave réponse inattendue', ['json' => $data]);
            throw new RuntimeException('Réponse Wave invalide (wave_launch_url ou id manquant).');
        }

        return $data;
    }

    /**
     * Interroger une session (polling après redirection utilisateur).
     */
    public function getCheckoutSession(string $sessionId): array
    {
        $base = config('paiement.wave.api_base');
        $apiKey = config('paiement.wave.api_key');
        if (! $base || ! $apiKey) {
            throw new RuntimeException('Wave non configuré.');
        }

        $headers = [
            'Authorization' => 'Bearer '.$apiKey,
            'Accept' => 'application/json',
        ];

        $signingSecret = config('paiement.wave.signing_secret');
        if (! empty($signingSecret)) {
            $timestamp = (string) time();
            $signature = hash_hmac('sha256', $timestamp.'', $signingSecret);
            $headers['Wave-Signature'] = 't='.$timestamp.',v1='.$signature;
        }

        /** @var Response $response */
        $response = Http::timeout(30)->withHeaders($headers)->get($base.'/v1/checkout/sessions/'.$sessionId);

        if (! $response->successful()) {
            Log::warning('Wave get session échec', ['status' => $response->status(), 'body' => $response->body()]);
            throw new RuntimeException('Impossible de lire la session Wave.');
        }

        return $response->json();
    }
}
