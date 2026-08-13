<?php

namespace App\Http\Controllers;

use App\Models\LogActivite;
use App\Models\Role;
use App\Models\User;
use App\Mail\StaffAccountCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules;

class AdminGestionnaireController extends Controller
{
    public function index(Request $request)
    {
        $role = Role::where('name', 'GESTIONNAIRE')->first();
        if (! $role) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $perPage = (int) $request->get('per_page', 15);
        $search = trim((string) $request->get('search', ''));

        $query = User::query()
            ->where('role_id', $role->id)
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', Rules\Password::defaults()],
        ]);

        $role = Role::where('name', 'GESTIONNAIRE')->first();
        if (! $role) {
            return response()->json(['message' => 'Rôle GESTIONNAIRE introuvable.'], 500);
        }

        $plainPassword = $request->password;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($plainPassword),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => 'create_gestionnaire',
            'details' => "Création gestionnaire #{$user->id} ({$user->email})",
            'ip_address' => $request->ip(),
        ]);

        try {
            $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');
            Mail::to($user->email)->send(new StaffAccountCreated(
                $user,
                $plainPassword,
                'Gestionnaire',
                $frontend.'/connexion'
            ));
        } catch (\Throwable $e) {
            Log::warning('Échec envoi e-mail création gestionnaire', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($user->load('role'), 201);
    }

    public function update(Request $request, User $gestionnaire)
    {
        if (! $gestionnaire->isGestionnaire()) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,'.$gestionnaire->id,
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
        ]);

        $data = [
            'name' => $request->name,
            'email' => $request->email,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $gestionnaire->update($data);

        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => 'update_gestionnaire',
            'details' => "Mise à jour gestionnaire #{$gestionnaire->id}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json($gestionnaire->load('role'));
    }

    public function destroy(User $gestionnaire)
    {
        if (! $gestionnaire->isGestionnaire()) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        $id = $gestionnaire->id;
        $gestionnaire->delete();

        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => 'delete_gestionnaire',
            'details' => "Suppression gestionnaire #{$id}",
            'ip_address' => request()->ip(),
        ]);

        return response()->json(['message' => 'Gestionnaire supprimé avec succès.']);
    }
}
