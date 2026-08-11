<?php

namespace App\Services\Paiement;

use App\Models\AppelOffre;
use App\Models\CahierAccesAchat;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Orange Money Web Payment (developer.orange.com).
 *
 * 1) OAuth2 client_credentials → access_token
 * 2) POST webpayment → payment_url + pay_token
 *
 * @see https://developer.orange.com/apis/om-webpay
 */
class OrangeMoneyPaymentClient
{
    /**
     * @return array{payment_url: string, pay_token: ?string}
     */
    public function createCheckout(CahierAccesAchat $achat, AppelOffre $appelOffre): array
    {
        $initUrl = (string) config('paiement.orange_money.init_url');
        $clientId = (string) config('paiement.orange_money.client_id');
        $clientSecret = (string) config('paiement.orange_money.client_secret');

        if ($initUrl === '' || ! filter_var($initUrl, FILTER_VALIDATE_URL)) {
            throw new RuntimeException(
                'Orange Money non configuré : renseignez ORANGE_MONEY_WEBPAY_ENABLED=true et ORANGE_MONEY_INIT_URL.'
            );
        }

        if ($clientId === '' || $clientSecret === '') {
            throw new RuntimeException(
                'Orange Money : renseignez ORANGE_MONEY_CLIENT_ID et ORANGE_MONEY_CLIENT_SECRET dans .env.'
            );
        }

        $accessToken = $this->accessToken();
        $frontend = rtrim((string) config('paiement.frontend_url'), '/');
        $merchantKey = (string) (config('paiement.orange_money.merchant_key') ?: $clientId);
        $orderId = 'cahier_'.$achat->id;

        $payload = [
            'merchant_key' => $merchantKey,
            'currency' => (string) config('paiement.orange_money.currency', 'OUV'),
            'order_id' => $orderId,
            'amount' => (int) $achat->montant_xof,
            'return_url' => $frontend.'/fournisseur/dashboard?tab=mes-achats&paiement=success&ao='.$appelOffre->id,
            'cancel_url' => $frontend.'/fournisseur/dashboard?tab=mes-achats&paiement=annule&ao='.$appelOffre->id,
            'notif_url' => url('/api/webhooks/orange-money/cahier'),
            'lang' => 'fr',
            'reference' => $orderId,
        ];

        $req = Http::timeout(30)
            ->acceptJson()
            ->withToken($accessToken)
            ->asJson()
            ->post($initUrl, $payload);

        if (! $req->successful()) {
            Log::warning('Orange Money webpayment échec', [
                'status' => $req->status(),
                'body' => $req->body(),
            ]);
            throw new RuntimeException('Orange Money a refusé la création de paiement ('.$req->status().').');
        }

        $json = $req->json();
        $paymentUrl = data_get($json, 'payment_url')
            ?? data_get($json, 'pay_url')
            ?? data_get($json, 'paymentUrl');

        if (! is_string($paymentUrl) || ! filter_var($paymentUrl, FILTER_VALIDATE_URL)) {
            Log::error('Orange Money réponse sans URL de paiement', ['json' => $json]);
            throw new RuntimeException('Réponse Orange Money invalide : aucune URL de paiement.');
        }

        $payToken = data_get($json, 'pay_token') ?? data_get($json, 'payToken');

        return [
            'payment_url' => $paymentUrl,
            'pay_token' => is_string($payToken) ? $payToken : null,
        ];
    }

    public function accessToken(): string
    {
        $cacheKey = 'orange_money_access_token';
        $cached = Cache::get($cacheKey);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $tokenUrl = (string) config('paiement.orange_money.token_url');
        $clientId = (string) config('paiement.orange_money.client_id');
        $clientSecret = (string) config('paiement.orange_money.client_secret');

        $req = Http::timeout(20)
            ->asForm()
            ->withBasicAuth($clientId, $clientSecret)
            ->post($tokenUrl, ['grant_type' => 'client_credentials']);

        if (! $req->successful()) {
            Log::warning('Orange Money OAuth échec', [
                'status' => $req->status(),
                'body' => $req->body(),
            ]);
            throw new RuntimeException('Impossible d’obtenir le jeton Orange Money ('.$req->status().').');
        }

        $token = $req->json('access_token');
        if (! is_string($token) || $token === '') {
            throw new RuntimeException('Réponse OAuth Orange Money sans access_token.');
        }

        $ttl = max(60, (int) ($req->json('expires_in') ?? 3600) - 60);
        Cache::put($cacheKey, $token, $ttl);

        return $token;
    }
}
