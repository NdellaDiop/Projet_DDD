<?php

namespace App\Http\Controllers;

use App\Mail\ContactMessageNotification;
use App\Models\ContactMessage;
use App\Models\LogActivite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    /**
     * Envoyer un message de contact
     * Accessible à tous (authentifiés ou non)
     */
    public function store(Request $request)
    {
        $request->validate([
            'nom' => 'nullable|string|max:255',
            'email' => 'required|email|max:255',
            'sujet' => 'required|string|max:255',
            'message' => 'required|string|min:10',
        ]);

        $data = [
            'email' => $request->email,
            'sujet' => $request->sujet,
            'message' => $request->message,
            'statut' => 'nouveau',
        ];

        // Si l'utilisateur est authentifié, utiliser ses informations
        if (auth()->check()) {
            $user = auth()->user();
            $data['user_id'] = $user->id;
            $data['nom'] = $request->nom ?? $user->name;
            $data['email'] = $request->email ?? $user->email;
        } else {
            $data['nom'] = $request->nom;
        }

        $contactMessage = ContactMessage::create($data);

        $recipient = config('contact.mail_to');
        if (is_string($recipient) && $recipient !== '') {
            try {
                Mail::to($recipient)->send(new ContactMessageNotification($contactMessage));
            } catch (\Throwable $e) {
                Log::error('Échec envoi e-mail message contact', [
                    'contact_message_id' => $contactMessage->id,
                    'recipient' => $recipient,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Logger l'activité si l'utilisateur est authentifié
        if (auth()->check()) {
            LogActivite::create([
                'user_id' => auth()->id(),
                'action' => 'send_contact_message',
                'details' => "Message de contact envoyé: {$contactMessage->sujet}",
                'ip_address' => $request->ip(),
            ]);
        }

        return response()->json([
            'message' => 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
            'data' => $contactMessage
        ], 201);
    }

    /**
     * Récupérer tous les messages de contact (Admin uniquement)
     */
    public function index()
    {
        // Vérifier que l'utilisateur est admin
        if (!auth()->user() || !auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $messages = ContactMessage::with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($messages);
    }

    /**
     * Marquer un message comme lu
     */
    public function markAsRead(ContactMessage $contactMessage)
    {
        // Vérifier que l'utilisateur est admin
        if (!auth()->user() || !auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $contactMessage->update(['statut' => 'lu']);

        return response()->json(['message' => 'Message marqué comme lu.', 'data' => $contactMessage]);
    }

    /**
     * Archiver un message
     */
    public function archive(ContactMessage $contactMessage)
    {
        // Vérifier que l'utilisateur est admin
        if (!auth()->user() || !auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $contactMessage->update(['statut' => 'archive']);

        return response()->json(['message' => 'Message archivé.', 'data' => $contactMessage]);
    }
}
