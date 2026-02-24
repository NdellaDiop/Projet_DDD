<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateCandidatureRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // L'autorisation est gérée par la politique CandidaturePolicy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'appel_offre_id' => 'sometimes|required|exists:appels_offres,id',
            'date_soumission' => 'sometimes|required|date',
            'statut' => 'sometimes|required|in:soumise,en_evaluation,acceptee,refusee',
            'commentaires' => 'nullable|string',
        ];
    }
}