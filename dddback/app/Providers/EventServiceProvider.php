<?php

namespace App\Providers;

use App\Models\AppelOffre;
use App\Models\Candidature;
use App\Models\Fournisseur;
use App\Models\ResponsableMarche;
use App\Models\User;
use App\Observers\AuditObserver;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        AppelOffre::observe(AuditObserver::class);
        Candidature::observe(AuditObserver::class);
        Fournisseur::observe(AuditObserver::class);
        ResponsableMarche::observe(AuditObserver::class);
        User::observe(AuditObserver::class);
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
