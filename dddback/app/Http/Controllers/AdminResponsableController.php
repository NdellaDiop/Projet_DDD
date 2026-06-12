<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\ResponsableMarche;
use App\Models\LogActivite;
use App\Rules\SenegalPhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class AdminResponsableController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', Rules\Password::defaults()],
            'direction' => 'required|string|max:255',
            'fonction' => 'required|string|max:255',
            'telephone' => ['required', 'string', 'max:30', new SenegalPhoneNumber()],
        ]);

        $telephone = SenegalPhoneNumber::normalize($request->telephone);
        $role = Role::where('name', 'RESPONSABLE_MARCHE')->first();
        if (!$role) {
            return response()->json(['message' => 'Rôle RESPONSABLE_MARCHE introuvable.'], 500);
        }

        // 1. Créer le User
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $role->id,
            'is_active' => true, // Actif par défaut
        ]);

        // 2. Créer le ResponsableMarche
        $responsable = ResponsableMarche::create([
            'user_id' => $user->id,
            'direction' => $request->direction,
            'fonction' => $request->fonction,
            'telephone' => $telephone,
        ]);

        // 3. Logger l'activité
        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => 'create_responsable',
            'details' => "Création responsable #{$responsable->id} ({$user->email})",
            'ip_address' => $request->ip(),
        ]);

        return response()->json($responsable->load('user'), 201);
    }

    public function destroy(string $id)
    {
        $responsable = ResponsableMarche::findOrFail($id);
        
        // On supprime d'abord le user associé (cascade ou manuel)
        if ($responsable->user) {
            $responsable->user->delete();
        }
        
        // Puis le responsable (si pas cascade)
        $responsable->delete();

        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => 'delete_responsable',
            'details' => "Suppression responsable #{$id}",
            'ip_address' => request()->ip(),
        ]);

        return response()->json(['message' => 'Responsable supprimé avec succès.']);
    }
    public function update(Request $request, string $id)
    {
        $responsable = ResponsableMarche::findOrFail($id);
        $user = $responsable->user;

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id, // On ignore l'email actuel du user
            'direction' => 'required|string|max:255',
            'fonction' => 'required|string|max:255',
            'telephone' => ['required', 'string', 'max:30', new SenegalPhoneNumber()],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
        ]);

        $telephone = SenegalPhoneNumber::normalize($request->telephone);

        // Mise à jour User
        $userData = [
            'name' => $request->name,
            'email' => $request->email,
        ];

        if ($request->filled('password')) {
            $userData['password'] = Hash::make($request->password);
        }

        $user->update($userData);

        // Mise à jour Responsable
        $responsable->update([
            'direction' => $request->direction,
            'fonction' => $request->fonction,
            'telephone' => $telephone,
        ]);

        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => 'update_responsable',
            'details' => "Mise à jour responsable #{$responsable->id}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Responsable mis à jour avec succès.']);
    }
}