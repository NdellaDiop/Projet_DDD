<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Fournisseur;
use App\Models\LogActivite;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class FournisseurValidationService
{
    public function __construct(
        private readonly NotificationService $notificationService
    ) {}

    /**
     * @return list<string>
     */
    public function piecesManquantes(Fournisseur $fournisseur): array
    {
        if (! $fournisseur->user) {
            return Document::LEGAL_CATEGORIES;
        }

        $presentes = Document::query()
            ->where('user_id', $fournisseur->user->id)
            ->whereIn('categorie', Document::LEGAL_CATEGORIES)
            ->pluck('categorie')
            ->unique()
            ->values()
            ->all();

        return array_values(array_diff(Document::LEGAL_CATEGORIES, $presentes));
    }

    public function dossierComplet(Fournisseur $fournisseur): bool
    {
        return $this->piecesManquantes($fournisseur) === [];
    }

    /**
     * Valide un fournisseur (admin ou automatique) si le dossier est complet.
     *
     * @return array{
     *     validated: bool,
     *     message: string,
     *     pieces_manquantes?: list<string>,
     *     libelles_manquantes?: list<string>
     * }
     */
    public function valider(Fournisseur $fournisseur, string $source = 'admin'): array
    {
        $fournisseur->loadMissing('user');

        if (! $fournisseur->user) {
            return [
                'validated' => false,
                'message' => 'Utilisateur associé introuvable pour ce fournisseur.',
            ];
        }

        if ($fournisseur->statut === 'actif' && $fournisseur->user->is_active) {
            return [
                'validated' => true,
                'message' => 'Ce fournisseur est déjà actif.',
            ];
        }

        $manquantes = $this->piecesManquantes($fournisseur);
        if ($manquantes !== []) {
            $labels = Document::legalCategoryLabels();
            $libelles = array_map(fn ($c) => $labels[$c] ?? $c, $manquantes);

            return [
                'validated' => false,
                'message' => 'Dossier incomplet : impossible de valider tant que les pièces obligatoires ne sont pas présentes.',
                'pieces_manquantes' => $manquantes,
                'libelles_manquantes' => $libelles,
            ];
        }

        $fournisseur->user->is_active = true;
        $fournisseur->user->save();

        $fournisseur->statut = 'actif';
        $fournisseur->save();

        $this->journaliser('validate_fournisseur', "Validation fournisseur #{$fournisseur->id} (source: {$source})");

        try {
            $this->notificationService->notifyUser(
                $fournisseur->user->id,
                'Votre compte a été validé. Vous pouvez maintenant accéder à la plateforme.'
            );
            $this->notificationService->sendAccountValidatedEmail($fournisseur->user);
        } catch (\Throwable $e) {
            Log::error('Erreur notification validation fournisseur: '.$e->getMessage());
        }

        if ($source !== 'admin') {
            $this->notifierAdminsAutoValidation($fournisseur, $source);
        }

        return [
            'validated' => true,
            'message' => $source === 'admin'
                ? 'Fournisseur validé avec succès.'
                : 'Compte fournisseur activé automatiquement (dossier complet).',
        ];
    }

    /**
     * Tente une validation automatique si activée dans la configuration.
     */
    public function tenterAutoValidation(Fournisseur $fournisseur, string $source): ?array
    {
        if (! config('fournisseur.auto_validation')) {
            return null;
        }

        $fournisseur->refresh();

        if ($fournisseur->statut !== 'en_attente' || ! $this->dossierComplet($fournisseur)) {
            return null;
        }

        $result = $this->valider($fournisseur, $source);

        return $result['validated'] ? $result : null;
    }

    /**
     * Valide en lot les fournisseurs en attente dont le dossier est complet.
     *
     * @return array{validated: int, skipped: int}
     */
    public function validerEnAttenteComplets(string $source = 'cron'): array
    {
        if (! config('fournisseur.auto_validation')) {
            return ['validated' => 0, 'skipped' => 0];
        }

        $validated = 0;
        $skipped = 0;

        Fournisseur::query()
            ->where('statut', 'en_attente')
            ->with('user')
            ->orderBy('id')
            ->chunkById(50, function ($fournisseurs) use ($source, &$validated, &$skipped) {
                foreach ($fournisseurs as $fournisseur) {
                    if (! $this->dossierComplet($fournisseur)) {
                        $skipped++;

                        continue;
                    }

                    $result = $this->valider($fournisseur, $source);
                    if ($result['validated']) {
                        $validated++;
                    } else {
                        $skipped++;
                    }
                }
            });

        return ['validated' => $validated, 'skipped' => $skipped];
    }

    private function notifierAdminsAutoValidation(Fournisseur $fournisseur, string $source): void
    {
        $adminIds = User::whereHas('role', function ($q) {
            $q->where('name', 'ADMIN');
        })->pluck('id');

        if ($adminIds->isEmpty()) {
            return;
        }

        $labels = [
            'inscription' => 'inscription',
            'upload_document' => 'dépôt de pièce',
            'cron' => 'tâche planifiée',
        ];
        $libelleSource = $labels[$source] ?? $source;

        $message = "Compte fournisseur validé automatiquement : « {$fournisseur->nom_entreprise} » "
            ."(#{$fournisseur->id}, via {$libelleSource}). Vous pouvez toujours rejeter le compte si nécessaire.";

        foreach ($adminIds as $id) {
            $this->notificationService->notifyUser((int) $id, $message);
        }
    }

    private function journaliser(string $action, string $details): void
    {
        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'details' => $details,
            'ip_address' => request()->ip(),
        ]);
    }
}
