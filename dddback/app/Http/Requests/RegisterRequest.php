<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Tout le monde peut s'enregistrer pour l'instant
        // Vous pouvez ajouter une logique pour limiter l'enregistrement si nécessaire
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role_name' => 'required|string|in:FOURNISSEUR,RESPONSABLE_MARCHE',
            'nom_entreprise' => 'required_if:role_name,FOURNISSEUR|string|max:255', 
            'adresse' => 'required_if:role_name,FOURNISSEUR|string|max:255',   
            'telephone' => 'required_if:role_name,FOURNISSEUR|string|max:255', 
        ];
    }

    public function messages(): array
    {
        return [
            'nom_entreprise.required_if' => 'Le nom de l\'entreprise est obligatoire.',
            'adresse.required_if' => 'L\'adresse est obligatoire.',
            'telephone.required_if' => 'Le téléphone est obligatoire.',
        ];
    }
}