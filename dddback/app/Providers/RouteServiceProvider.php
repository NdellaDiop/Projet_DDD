<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            /*
             * Le front (SPA) enchaîne plusieurs appels au chargement (dashboard fournisseur :
             * liste + détails par candidature, documents, etc.). 60/min/User déclenchait
             * facilement du 429 (Too Many Requests).
             */
            $authenticated = $request->user() !== null;
            $perMinute = $authenticated
                ? max(60, min((int) env('API_RATE_LIMIT_PER_MINUTE', 400), 5000))
                : max(60, min((int) env('API_RATE_LIMIT_GUEST_PER_MINUTE', 150), 2000));

            $key = $authenticated
                ? 'api:user:'.$request->user()->id
                : 'api:ip:'.$request->ip();

            return Limit::perMinute($perMinute)->by($key);
        });

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}
