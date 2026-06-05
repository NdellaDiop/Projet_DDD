<?php

namespace App\Http\Requests;

use Illuminate\Http\UploadedFile;

class StoreAppelOffreWithDocumentsRequest extends StoreAppelOffreRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'avis' => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'cahier' => ['required', 'file', 'mimes:pdf,zip,doc,docx', 'max:10240'],
        ]);
    }

    public function messages(): array
    {
        return [
            'avis.required' => "L'avis d'appel d'offres est obligatoire.",
            'cahier.required' => 'Le cahier des charges est obligatoire.',
            'avis.max' => "L'avis ne doit pas dépasser 10 Mo.",
            'cahier.max' => 'Le cahier des charges ne doit pas dépasser 10 Mo.',
            'avis.uploaded' => "L'envoi de l'avis a échoué (fichier absent ou trop volumineux pour le serveur). Taille max : 10 Mo.",
            'cahier.uploaded' => "L'envoi du cahier a échoué (fichier absent ou trop volumineux pour le serveur). Taille max : 10 Mo.",
            'avis.mimes' => "L'avis doit être un fichier PDF.",
            'cahier.mimes' => 'Le cahier doit être un PDF, Word (.doc/.docx) ou une archive ZIP.',
            'avis.file' => "L'avis doit être un fichier valide.",
            'cahier.file' => 'Le cahier des charges doit être un fichier valide.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach (['avis' => "l'avis", 'cahier' => 'le cahier'] as $field => $label) {
                $file = $this->file($field);
                if (! $file instanceof UploadedFile || $file->isValid()) {
                    continue;
                }
                $message = match ($file->getError()) {
                    UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => "Le fichier pour {$label} dépasse la limite d'envoi du serveur (vérifiez qu'il fait moins de 10 Mo).",
                    UPLOAD_ERR_PARTIAL => "L'envoi de {$label} a été interrompu. Réessayez.",
                    UPLOAD_ERR_NO_FILE => "Aucun fichier reçu pour {$label}.",
                    default => "Échec de l'envoi de {$label}.",
                };
                $validator->errors()->add($field, $message);
            }
        });
    }
}
