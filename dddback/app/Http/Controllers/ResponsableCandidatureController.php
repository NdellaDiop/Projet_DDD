<?php

namespace App\Http\Controllers;

use App\Models\ResponsableMarche;
use App\Models\LogActivite;
use Illuminate\Http\Request;

class ResponsableCandidatureController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }

    /**
     * Afficher le profil du responsable
     */
    public function showProfile()
    {
        $user = auth()->user();
        $responsable = $user->responsableMarche;

        if (!$responsable) {
            return response()->json(['message' => 'Profil responsable introuvable.'], 404);
        }

        return response()->json($responsable->load('user'));
    }

    /**
     * Mettre à jour le profil du responsable
     */
    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        $responsable = $user->responsableMarche;

        if (!$responsable) {
            return response()->json(['message' => 'Profil responsable introuvable.'], 404);
        }

        $request->validate([
            'departement' => 'required|string|max:255',
            'fonction' => 'required|string|max:255',
            'telephone' => 'required|string|max:20',
        ]);

        $data = $request->all();

        $responsable->update($data);
        
        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => 'update_responsable_profile',
            'details' => "Mise à jour profil responsable #{$responsable->id}",
            'ip_address' => request()->ip(),
        ]);

        return response()->json($responsable);
    }
}
