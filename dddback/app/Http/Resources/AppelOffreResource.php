<?php

namespace App\Http\Resources;

use App\Support\ApiUserResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class AppelOffreResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'source_financement' => $this->source_financement,
            'source_financement_label' => $this->source_financement
                ? (\App\Models\AppelOffre::sourceFinancementLabels()[$this->source_financement] ?? $this->source_financement)
                : null,
            'mode_passation' => $this->mode_passation,
            'type_marche' => $this->type_marche,
            'type_marche_label' => $this->type_marche
                ? (\App\Models\AppelOffre::typesMarcheLabels()[$this->type_marche] ?? $this->type_marche)
                : null,
            'titre' => $this->titre,
            'description' => $this->description,
            'modalites_soumission_physique' => $this->modalites_soumission_physique,
            'date_publication' => $this->date_publication,
            'date_limite_depot' => $this->date_limite_depot,
            'statut' => $this->statut,
            'attribution' => [
                'statut' => $this->attribution_statut ?? 'non_attribue',
                'attributaire_nom' => $this->attributaire_nom,
                'attributaire_ninea' => $this->attributaire_ninea,
                'montant_xof' => isset($this->attribution_montant_xof) ? (int) $this->attribution_montant_xof : null,
                'date' => $this->attribution_date,
                'commentaire' => $this->attribution_commentaire,
            ],
            'cahier_paiement_requis' => (bool) ($this->cahier_paiement_requis ?? false),
            'cahier_prix_xof' => $this->when(isset($this->cahier_prix_xof), (int) ($this->cahier_prix_xof ?? 0)),
            'acquisition_cahier_autorisee' => $this->acquisitionCahierAutorisee(),
            'paiement_wave_active' => (bool) config('paiement.wave.enabled'),
            'paiement_orange_money_active' => (bool) config('paiement.orange_money_ui_enabled'),
            'paiement_orange_money_api' => (bool) config('paiement.orange_money_api_enabled'),
            'cahier_simulation_active' => (bool) config('paiement.simulation_enabled'),
            'criteres_eligibilite' => $this->criteres_eligibilite,
            'responsable_marche_id' => $this->responsable_marche_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'candidatures_count' => $this->whenCounted('candidatures'),
            'pieces_ao_manquantes' => $this->when(
                auth()->check() && in_array(auth()->user()?->role?->name, ['ADMIN', 'RESPONSABLE_MARCHE'], true),
                fn () => $this->piecesAoManquantes()
            ),
            'pieces_ao_completes' => $this->when(
                auth()->check() && in_array(auth()->user()?->role?->name, ['ADMIN', 'RESPONSABLE_MARCHE'], true),
                fn () => $this->piecesAoCompletes()
            ),
            'documents' => $this->whenLoaded('documents', function () use ($request) {
                $user = ApiUserResolver::forDocumentAccess($request);

                return $this->documents->map(function ($doc) use ($user) {
                    $canDownload = $user
                        ? Gate::forUser($user)->allows('view', $doc)
                        : false;

                    $blocagePaiement = $doc->categorie === 'CAHIER_DES_CHARGES'
                        && (bool) ($this->cahier_paiement_requis ?? false)
                        && (int) ($this->cahier_prix_xof ?? 0) > 0
                        && $this->acquisitionCahierAutorisee()
                        && !$canDownload;

                    return [
                        'id' => $doc->id,
                        'nom_fichier' => $doc->nom_fichier,
                        'categorie' => $doc->categorie,
                        // Chemin relatif : le front appelle l'API avec auth (pas de lien /storage public).
                        'download_url' => $canDownload ? "/api/documents/{$doc->id}/download" : null,
                        'telechargement_bloque' => !$canDownload,
                        'blocage_paiement_cahier' => $blocagePaiement,
                        'created_at' => $doc->created_at,
                    ];
                })->values();
            }),
            'responsable' => $this->whenLoaded('responsableMarche', function () {
                if (!$this->responsableMarche) {
                    return null;
                }
                $user = $this->responsableMarche->user;

                return [
                    'id' => $this->responsableMarche->id,
                    'user_id' => $this->responsableMarche->user_id,
                    'name' => $user?->name,
                    'email' => $user?->email,
                    'direction' => $this->responsableMarche->direction,
                    'fonction' => $this->responsableMarche->fonction,
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ] : null,
                ];
            }),
        ];
    }
}
