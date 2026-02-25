<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\DocumentResource;

class CandidatureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'statut' => $this->statut,
            'date_soumission' => $this->date_soumission,
            'montant_propose' => $this->montant_propose,
            'appel_offre' => $this->whenLoaded('appelOffre', function () {
                if (!$this->appelOffre) {
                    return null;
                }
                return [
                    'id' => $this->appelOffre->id,
                    'titre' => $this->appelOffre->titre,
                    'statut' => $this->appelOffre->statut,
                    'date_publication' => $this->appelOffre->date_publication,
                    'date_limite' => $this->appelOffre->date_limite_depot,
                    'numero_reference' => $this->appelOffre->reference,
                ];
            }),
            'fournisseur' => $this->whenLoaded('fournisseur', function () {
                return [
                    'id' => $this->fournisseur->id,
                    'nom_entreprise' => $this->fournisseur->nom_entreprise,
                    'user' => $this->fournisseur->user?->only(['id','name','email']),
                ];
            }),
            'documents' => $this->whenLoaded('documents', function () {
                return DocumentResource::collection($this->documents);
            }),
        ];
    }
}