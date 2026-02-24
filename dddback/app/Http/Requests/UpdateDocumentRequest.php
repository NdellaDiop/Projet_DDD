<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateDocumentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // L'autorisation est gérée par la politique DocumentPolicy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nom_fichier' => 'sometimes|required|string|max:255',
            // Pour un fichier, une mise à jour ne signifie généralement pas le remplacement du fichier existant, mais plutôt de ses métadonnées.
            // Si vous voulez permettre le remplacement du fichier, vous devrez ajouter 'fichier' ici et gérer la suppression de l'ancien.
            'candidature_id' => 'sometimes|nullable|exists:candidatures,id',
            'appel_offre_id' => 'sometimes|nullable|exists:appels_offres,id',
        ];
    }
}