<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class StoreDocumentRequest extends FormRequest
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
            'fichier' => 'required|file|max:10240', // Max 10MB
            'nom_fichier' => 'nullable|string|max:255',
            'candidature_id' => 'nullable|exists:candidatures,id',
            'appel_offre_id' => 'nullable|exists:appels_offres,id',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation(): void
    {
        /** @var User $user */
        $user = Auth::user();

        // Enregistre l'ID de l'utilisateur qui télécharge le document
        if ($user) {
            $this->merge([
                'user_id' => $user->id,
            ]);
        }
    }
}