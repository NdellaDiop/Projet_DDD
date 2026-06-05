<?php

namespace App\Services\Paiement;

use App\Models\AppelOffre;
use App\Models\CahierAccesAchat;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Intégration générique Orange Money Web Payment : URL et corps configurés chez l’opérateur.
 * Ajustez ORANGE_MONEY_INIT_* selon la doc du marché (Sénégal, CI, etc.).
 */
class OrangeMoneyPaymentClient
{
    public function createPaymentUrl(CahierAccesAchat $achat, AppelOffre $appelOffre): string
    {
        $initUrl = config('paiement.orange_money.init_url');
        if (! $initUrl || ! filter_var($initUrl, FILTER_VALIDATE_URL)) {
            throw new RuntimeException(
                'Orange Money non configuré : renseignez ORANGE_MONEY_WEBPAY_ENABLED=true et ORANGE_MONEY_INIT_URL (URL d’initiation fournie par Orange).'
            );
        }

        $frontend = rtrim((string) config('paiement.frontend_url'), '/');

        $payload = [
            'merchant_reference' => 'cahier_'.$achat->id,
            'order_id' => (string) $achat->id,
            'amount' => (int) $achat->montant_xof,
            'currency' => 'XOF',
            'return_url' => $frontend.'/fournisseur/dashboard?tab=mes-achats&paiement=success&ao='.$appelOffre->id,
            'cancel_url' => $frontend.'/fournisseur/dashboard?tab=mes-achats&paiement=annule&ao='.$appelOffre->id,
            'notification_url' => url('/api/webhooks/orange-money/cahier'),
            'appel_offre_id' => $appelOffre->id,
            'user_id' => $achat->user_id,
        ];

        $headers = config('paiement.orange_money.headers', []);
        $authType = config('paiement.orange_money.auth.type', 'bearer');
        $token = config('paiement.orange_money.auth.token');
        if ($authType === 'bearer' && ! empty($token)) {
            $headers['Authorization'] = 'Bearer '.$token;
        }

        $method = config('paiement.orange_money.method', 'POST');
        $timeout = 30;

        $client = Http::timeout($timeout)->withHeaders($headers);

        $req = match ($method) {
            'GET' => $client->get($initUrl, $payload),
            default => $client->asJson()->post($initUrl, $payload),
        };

        if (! $req->successful()) {
            Log::warning('Orange Money init échec', ['status' => $req->status(), 'body' => $req->body()]);
            throw new RuntimeException('Orange Money a refusé la création de paiement ('.$req->status().').');
        }

        $json = $req->json();
        $urlKey = config('paiement.orange_money.response_payment_url_key', 'payment_url');
        $paymentUrl = data_get($json, $urlKey);

        if (! is_string($paymentUrl) || ! filter_var($paymentUrl, FILTER_VALIDATE_URL)) {
            Log::error('Orange Money réponse sans URL de paiement', ['json' => $json, 'key' => $urlKey]);
            throw new RuntimeException(
                'Réponse Orange Money invalide : aucune URL sous la clé « '.$urlKey.' ». Ajustez ORANGE_MONEY_RESPONSE_URL_KEY.'
            );
        }

        return $paymentUrl;
    }
}
