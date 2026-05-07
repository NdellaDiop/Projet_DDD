<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\CahierAccesAchat;
use App\Services\Paiement\CahierAccesPaiementService;
use App\Services\Paiement\WaveWebhookVerifier;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WaveCahierWebhookController extends Controller
{
    public function __construct(
        private readonly WaveWebhookVerifier $verifier,
        private readonly CahierAccesPaiementService $cahierPaiement
    ) {}

    public function handle(Request $request): Response
    {
        $secret = config('paiement.wave.webhook_secret');
        if (empty($secret)) {
            Log::warning('Webhook Wave reçu mais WAVE_WEBHOOK_SECRET est vide');
            return response('Webhook non configuré', 503);
        }

        $raw = $request->getContent();
        $sig = $request->header('Wave-Signature');
        if (! $this->verifier->verify($raw, $sig, $secret)) {
            return response('Signature invalide', 401);
        }

        $json = json_decode($raw, true);
        if (! is_array($json)) {
            return response('Body invalide', 400);
        }

        $type = $json['type'] ?? null;
        if ($type === 'checkout.session.payment_failed') {
            $this->handleFailed($json);

            return response('OK', 200);
        }

        if ($type !== 'checkout.session.completed') {
            return response('OK', 200);
        }

        $data = $json['data'] ?? null;
        if (! is_array($data)) {
            return response('OK', 200);
        }

        $clientRef = $data['client_reference'] ?? null;
        $sessionId = $data['id'] ?? null;
        $paymentStatus = $data['payment_status'] ?? null;
        $checkoutStatus = $data['checkout_status'] ?? null;

        if ($paymentStatus !== 'succeeded' && $checkoutStatus !== 'complete') {
            return response('OK', 200);
        }

        if ($clientRef === null || $clientRef === '') {
            Log::warning('Wave webhook sans client_reference', ['data' => $data]);

            return response('OK', 200);
        }

        $achat = CahierAccesAchat::query()
            ->where('id', (int) $clientRef)
            ->where('provider', CahierAccesAchat::PROVIDER_WAVE)
            ->first();

        if (! $achat) {
            Log::warning('Wave webhook : achat introuvable', ['client_reference' => $clientRef]);

            return response('OK', 200);
        }

        $expected = (int) $achat->montant_xof;
        $amount = isset($data['amount']) ? (int) $data['amount'] : 0;
        if ($expected > 0 && $amount > 0 && $amount !== $expected) {
            Log::warning('Wave webhook : montant incohérent', [
                'achat_id' => $achat->id,
                'attendu' => $expected,
                'reçu' => $amount,
            ]);

            return response('OK', 200);
        }

        $this->cahierPaiement->marquerCommePaye($achat, is_string($sessionId) ? $sessionId : null);

        return response('OK', 200);
    }

    private function handleFailed(array $json): void
    {
        $data = $json['data'] ?? null;
        if (! is_array($data)) {
            return;
        }
        $clientRef = $data['client_reference'] ?? null;
        if ($clientRef === null || $clientRef === '') {
            return;
        }
        $achat = CahierAccesAchat::query()
            ->where('id', (int) $clientRef)
            ->where('provider', CahierAccesAchat::PROVIDER_WAVE)
            ->where('statut', CahierAccesAchat::STATUT_PENDING)
            ->first();
        if ($achat) {
            $this->cahierPaiement->marquerEchec($achat);
        }
    }
}
