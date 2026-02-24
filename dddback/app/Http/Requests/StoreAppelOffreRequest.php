<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\ResponsableMarche;
use App\Models\User;

class StoreAppelOffreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User $user */
        $user = Auth::user();

        // Seuls les ADMINS et RESPONSABLES_MARCHE peuvent créer des appels d'offres
        return $user && ($user->role->name === 'ADMIN' || $user->role->name === 'RESPONSABLE_MARCHE');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'titre' => 'required|string|max:255',
            'description' => 'required|string',
            'date_publication' => 'nullable|date',
            'date_limite_depot' => 'required|date|after_or_equal:now',
            'responsable_marche_id' => 'required|exists:responsables_marche,id',
            'statut' => 'required|in:draft,published,closed,archived',
        ];
    }

    protected function prepareForValidation()
    {
        $mergeData = [];

        if (auth()->user()?->responsableMarche) {
            $mergeData['responsable_marche_id'] = auth()->user()->responsableMarche->id;
        }

        // Si date_publication n'est pas fournie, on met la date actuelle
        if (!$this->has('date_publication')) {
             $mergeData['date_publication'] = now();
        }

        if (!$this->has('statut')) {
             $mergeData['statut'] = \App\Models\AppelOffre::STATUS_DRAFT;
        }

        if (!empty($mergeData)) {
            $this->merge($mergeData);
        }
    }
}