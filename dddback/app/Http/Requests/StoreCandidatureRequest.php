<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class StoreCandidatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var User $user */
        $user = Auth::user();
        return $user && $user->isFournisseur() && $user->is_active === true;
    }

    public function rules(): array
    {
        return [
            'montant_propose' => 'required|numeric|min:0',
            'fournisseur_id' => 'required|exists:fournisseurs,id',
            'statut' => 'required|string',
            'date_soumission' => 'required|date',
        ];
    }

    protected function prepareForValidation(): void
    {
        /** @var User $user */
        $user = Auth::user();

        if ($user && $user->isFournisseur() && $user->fournisseur) {
            $this->merge([
                'fournisseur_id' => $user->fournisseur->id,
                'date_soumission' => now(),
                'statut' => \App\Models\Candidature::STATUS_SUBMITTED,
            ]);
        }
    }
}