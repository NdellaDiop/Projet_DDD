<?php

namespace App\Http\Requests;

use App\Models\AppelOffre;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppelOffreRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var AppelOffre $appelOffre */
        $appelOffre = $this->route('appel_offre');

        return $this->user()->can('update', $appelOffre);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var AppelOffre $appelOffre */
        $appelOffre = $this->route('appel_offre');
        $user = $this->user();

        // PRM : une fois l’AO publié, seules les modalités de dépôt physique peuvent être modifiées (pas le titre, dates, etc.).
        if (
            $appelOffre
            && $appelOffre->statut === AppelOffre::STATUS_PUBLISHED
            && $user
            && $user->isResponsableMarche()
            && ! $user->isAdmin()
        ) {
            return [
                'modalites_soumission_physique' => 'required|string|max:20000',
            ];
        }

        return [
            'titre' => 'sometimes|required|string|max:255',
            'reference' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('appels_offres', 'reference')->ignore($appelOffre->id),
            ],
            'source_financement' => [
                'sometimes',
                'required',
                'string',
                Rule::in([
                    AppelOffre::SOURCE_FONDS_PROPRES,
                    AppelOffre::SOURCE_ETAT,
                    AppelOffre::SOURCE_FINANCEMENT_EXTERIEURE,
                ]),
            ],
            'mode_passation' => 'sometimes|required|string|max:255',
            'type_marche' => [
                'sometimes',
                'required',
                'string',
                Rule::in(array_keys(AppelOffre::typesMarcheLabels())),
            ],
            'description' => 'sometimes|required|string',
            'modalites_soumission_physique' => 'nullable|string|max:20000',
            'date_publication' => 'sometimes|required|date',
            'date_limite_depot' => 'sometimes|required|date|after:date_publication',
            'cahier_paiement_requis' => 'sometimes|boolean',
            'cahier_prix_xof' => ['nullable', 'integer', 'min:1', 'max:50000000', Rule::requiredIf(fn () => $this->boolean('cahier_paiement_requis'))],
        ];
    }
}
