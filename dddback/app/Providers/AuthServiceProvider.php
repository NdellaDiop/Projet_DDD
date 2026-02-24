<?php

namespace App\Providers;

use App\Models\AppelOffre;
use App\Policies\AppelOffrePolicy;
use App\Models\Candidature;
use App\Policies\CandidaturePolicy;
use App\Models\Document;
use App\Policies\DocumentPolicy;
use App\Models\ResponsableMarche; // N'oubliez pas d'importer le modèle
use App\Policies\ResponsableMarchePolicy;
use App\Models\Notification;
use App\Policies\NotificationPolicy;
use App\Models\LogActivite;
use App\Policies\LogActivitePolicy;
// ... other models and policies ...

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        AppelOffre::class => AppelOffrePolicy::class,
        Candidature::class => CandidaturePolicy::class,
        Document::class => DocumentPolicy::class,
        ResponsableMarche::class => ResponsableMarchePolicy::class,
        Notification::class => NotificationPolicy::class,
        LogActivite::class => LogActivitePolicy::class,
        \App\Models\AppelOffre::class => \App\Policies\AppelOffrePolicy::class,
        \App\Models\Candidature::class => \App\Policies\CandidaturePolicy::class,
        \App\Models\Document::class => \App\Policies\DocumentPolicy::class,
        \App\Models\ResponsableMarche::class => \App\Policies\ResponsableMarchePolicy::class,
        \App\Models\Notification::class => \App\Policies\NotificationPolicy::class,
        \App\Models\LogActivite::class => \App\Policies\LogActivitePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        // ... existing boot method code ...
    }
}