<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Models\Fournisseur;
use App\Models\ResponsableMarche;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $role = Role::where('name', $request->role_name)->firstOrFail();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $role->id,
            'is_active' => $request->role_name === 'FOURNISSEUR' ? false : true,
        ]);

        // Créer l'entrée correspondante dans Fournisseur ou ResponsableMarche
        if ($request->role_name === 'FOURNISSEUR') {
            Fournisseur::create([
                'user_id' => $user->id,
                'nom_entreprise' => $request->nom_entreprise, 
                'adresse' => $request->adresse,             
                'telephone' => $request->telephone,         
                'email_contact' => $request->email,
            ]);
        } elseif ($request->role_name === 'RESPONSABLE_MARCHE') {
            ResponsableMarche::create([
                'user_id' => $user->id,
                // Ajoutez d'autres champs par défaut si nécessaire
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Utilisateur enregistré avec succès.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('role'),
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Identifiants invalides.'
            ], 401);
        }

        $user = Auth::user();

        if ($user->is_active === false) {
            return response()->json([
                'message' => 'Compte non activé. Veuillez contacter l\'administrateur.'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('role'),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnecté avec succès.'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('role'));
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mot de passe actuel incorrect.'], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json(['message' => 'Mot de passe mis à jour avec succès.']);
    }
}