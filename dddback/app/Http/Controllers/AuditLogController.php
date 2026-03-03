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

        if ($request->auditable_type && $request->auditable_id) {
            $query->where('auditable_type', $request->auditable_type)
                  ->where('auditable_id', $request->auditable_id);
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(20);

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
