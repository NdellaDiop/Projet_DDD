<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'titre' => $this->titre,
            'description' => $this->description,
            'date_publication' => $this->date_publication,
            'date_limite_depot' => $this->date_limite_depot,
            'statut' => $this->statut,
            'criteres_eligibilite' => $this->criteres_eligibilite,
            'responsable_marche_id' => $this->responsable_marche_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'candidatures_count' => $this->whenCounted('candidatures'),
            'documents' => $this->whenLoaded('documents', function () {
                return $this->documents->map(function ($doc) {
                    return [
                        'id' => $doc->id,
                        'nom_fichier' => $doc->nom_fichier,
                        'categorie' => $doc->categorie,
                        'download_url' => url("/api/documents/{$doc->id}/download"),
                        'created_at' => $doc->created_at,
                    ];
                })->values();
            }),
            'responsable' => $this->whenLoaded('responsableMarche', function () {
                if (!$this->responsableMarche) {
                    return null;
                }
                return [
                    'id' => $this->responsableMarche->id,
                    'user_id' => $this->responsableMarche->user_id,
                    'departement' => $this->responsableMarche->departement,
                    'fonction' => $this->responsableMarche->fonction,
                    'user' => $this->responsableMarche->user ? [
                        'id' => $this->responsableMarche->user->id,
                        'name' => $this->responsableMarche->user->name,
                        'email' => $this->responsableMarche->user->email,
                    ] : null,
                ];
            }),
        ];
    }
}
