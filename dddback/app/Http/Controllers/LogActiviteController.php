<?php

namespace App\Http\Controllers;

use App\Models\LogActivite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LogActiviteController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->authorizeResource(LogActivite::class, 'log_activite');
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->role->name === 'ADMIN') {
            $logs = LogActivite::with('user')->latest()->get();
        } else {
            // Un utilisateur ne voit que ses propres logs
            $logs = $user->logsActivites()->latest()->get();
        }

        return response()->json($logs);
    }

    /**
     * Store a newly created resource in storage.
     * Les logs sont créés par le système, pas par l'utilisateur directement.
     */
    public function store(Request $request)
    {
        return response()->json(['message' => 'La création de logs d\'activité n\'est pas autorisée via cette API.'], 403);
    }

    /**
     * Display the specified resource.
     */
    public function show(LogActivite $logActivite)
    {
        return response()->json($logActivite->load('user'));
    }

    /**
     * Update the specified resource in storage.
     * Les logs ne devraient pas être modifiés.
     */
    public function update(Request $request, LogActivite $logActivite)
    {
        return response()->json(['message' => 'La modification des logs d\'activité n\'est pas autorisée.'], 403);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(LogActivite $logActivite)
    {
        $logActivite->delete();
        return response()->json(null, 204);
    }
}