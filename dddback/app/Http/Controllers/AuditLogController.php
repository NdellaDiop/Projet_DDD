<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request)
    {
        // Seuls les admins peuvent voir tous les logs
        if (!auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $query = AuditLog::with('user');

        if ($request->has('auditable_type')) {
            $query->where('auditable_type', $request->auditable_type);
        }
        
        if ($request->has('auditable_id')) {
            $query->where('auditable_id', $request->auditable_id);
        }

        $perPage = $request->input('per_page', 20);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($logs);
    }

    public function show($id)
    {
        // Seuls les admins peuvent voir les détails des logs
        if (!auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $log = AuditLog::with('user')->findOrFail($id);
        return response()->json($log);
    }
}
