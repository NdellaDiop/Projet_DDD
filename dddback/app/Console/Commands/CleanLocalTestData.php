<?php

namespace App\Console\Commands;

use App\Models\AppelOffre;
use App\Models\AuditLog;
use App\Models\Candidature;
use App\Models\ContactMessage;
use App\Models\Document;
use App\Models\LogActivite;
use App\Models\Notification;
use App\Models\Suggestion;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanLocalTestData extends Command
{
    protected $signature = 'db:clean-local-data
                            {--force : Exécuter sans confirmation interactive}
                            {--keep-audit : Conserver la table audit_logs}';

    protected $description = 'Supprime les données de test (AO, candidatures, documents, messages, utilisateurs non-admin). Conserve les rôles et les comptes ADMIN. Réservé au développement local.';

    public function handle(): int
    {
        if (! app()->environment(['local', 'testing'])) {
            if (! $this->option('force')) {
                $this->error('Refusé : cette commande ne s\'exécute qu\'en environnement local ou testing. Pour forcer (ex. staging), utilisez --force.');

                return self::FAILURE;
            }
        }

        if (! $this->option('force')) {
            if (! $this->confirm('Supprimer toutes les données métier sauf les comptes ADMIN ?')) {
                return self::SUCCESS;
            }
        }

        $adminUserIds = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'ADMIN'))
            ->pluck('id');

        if ($adminUserIds->isEmpty()) {
            $this->error('Aucun utilisateur avec le rôle ADMIN trouvé. Annulation pour éviter une base sans accès admin.');

            return self::FAILURE;
        }

        $this->info('Comptes ADMIN conservés (ids) : '.$adminUserIds->implode(', '));

        $keepAudit = $this->option('keep-audit');

        DB::transaction(function () use ($adminUserIds, $keepAudit) {
            $c = Candidature::query()->delete();
            $this->line("Candidatures supprimées : {$c}");

            $ao = AppelOffre::query()->delete();
            $this->line("Appels d'offres supprimés : {$ao}");

            $doc = Document::query()->delete();
            $this->line("Documents supprimés : {$doc}");

            $cm = ContactMessage::query()->delete();
            $this->line("Messages de contact supprimés : {$cm}");

            $s = Suggestion::query()->delete();
            $this->line("Suggestions supprimées : {$s}");

            $la = LogActivite::query()->delete();
            $this->line("Logs d'activité supprimés : {$la}");

            $n = Notification::query()->whereNotIn('user_id', $adminUserIds)->delete();
            $this->line("Notifications (hors admin) supprimées : {$n}");

            if (! $keepAudit) {
                $a = AuditLog::query()->delete();
                $this->line("Entrées d'audit supprimées : {$a}");
            } else {
                $this->line('audit_logs conservés (--keep-audit).');
            }

            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereNotIn('tokenable_id', $adminUserIds)
                ->delete();

            $adminEmails = User::query()->whereIn('id', $adminUserIds)->pluck('email');
            DB::table('password_reset_tokens')
                ->whereNotIn('email', $adminEmails)
                ->delete();

            $deletedUsers = User::query()->whereNotIn('id', $adminUserIds)->delete();
            $this->line("Utilisateurs non-admin supprimés (profils fournisseur / responsable inclus par cascade) : {$deletedUsers}");
        });

        $this->info('Nettoyage terminé. Les rôles et la configuration Laravel (.env) sont inchangés.');

        return self::SUCCESS;
    }
}
