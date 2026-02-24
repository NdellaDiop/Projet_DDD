<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\UpdateNotificationRequest;

class NotificationController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->authorizeResource(Notification::class, 'notification');
    }

    /**
     * Display a listing of the resource (current user's notifications).
     */
    public function index()
    {
        $user = Auth::user();
        $notifications = $user->notifications()->latest()->get(); // Les notifications de l'utilisateur actuel
        return response()->json($notifications);
    }

    /**
     * Store a newly created resource in storage.
     * Les notifications sont généralement créées par le système, pas par l'utilisateur directement.
     * Cette méthode peut être omise ou utilisée par un système interne.
     */
    public function store(Request $request)
    {
        return response()->json(['message' => 'La création directe de notifications n\'est pas autorisée via cette API.'], 403);
    }

    /**
     * Display the specified resource.
     */
    public function show(Notification $notification)
    {
        return response()->json($notification);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateNotificationRequest $request, Notification $notification)
    {
        $notification->update($request->validated());
        return response()->json($notification);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Notification $notification)
    {
        $notification->delete();
        return response()->json(null, 204);
    }
}