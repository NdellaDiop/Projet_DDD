<?php

namespace App\Http\Requests;

class StoreAppelOffreWithDocumentsRequest extends StoreAppelOffreRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'avis' => 'required|file|max:10240',
            'cahier' => 'required|file|max:10240',
        ]);
    }

    public function messages(): array
    {
        return [
            'avis.required' => "L'avis d'appel d'offres est obligatoire.",
            'cahier.required' => 'Le cahier des charges est obligatoire.',
            'avis.max' => "L'avis ne doit pas dépasser 10 Mo.",
            'cahier.max' => 'Le cahier des charges ne doit pas dépasser 10 Mo.',
        ];
    }
}
