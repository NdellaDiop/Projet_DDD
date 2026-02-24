<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\LogActivite;

class AdminUserController extends Controller
{
    public function index()
    {
        return response()->json(User::with('role')->get());
    }

    public function activate(User $user)
    {
        $user->update(['is_active' => true]);

        $this->log('activate_user', "Activation user #{$user->id}");

        return response()->json(['message' => 'Compte activé.']);
    }

    public function deactivate(User $user)
    {
        $user->update(['is_active' => false]);

        $this->log('deactivate_user', "Désactivation user #{$user->id}");

        return response()->json(['message' => 'Compte désactivé.']);
    }

    private function log(string $action, string $details): void
    {
        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'details' => $details,
            'ip_address' => request()->ip(),
        ]);
    }
}