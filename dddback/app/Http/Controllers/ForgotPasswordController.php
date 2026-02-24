<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use App\Models\User;
use Carbon\Carbon;

class ForgotPasswordController extends Controller
{
    // 1. Demande de réinitialisation (Envoi du lien par email)
    public function sendResetLinkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Pour des raisons de sécurité, on ne dit pas explicitement si l'email existe ou non
            return response()->json(['message' => 'Si cet email existe, un lien de réinitialisation a été envoyé.']);
        }

        // Créer un token
        $token = Str::random(60);

        // Stocker le token dans la table password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'email' => $request->email,
                'token' => Hash::make($token),
                'created_at' => Carbon::now()
            ]
        );

        // Lien vers le frontend (adaptez l'URL selon votre config React)
        $resetLink = env('FRONTEND_URL', 'http://localhost:8081') . "/reset-password?token={$token}&email={$request->email}";

        // Envoi de l'email (Version simple avec Mail::raw pour l'instant)
        // Idéalement, utilisez une classe Mailable dédiée
        try {
            Mail::raw("Cliquez ici pour réinitialiser votre mot de passe : {$resetLink}", function ($message) use ($user) {
                $message->to($user->email)
                        ->subject('Réinitialisation de votre mot de passe');
            });
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur lors de l\'envoi de l\'email.'], 500);
        }

        return response()->json(['message' => 'Si cet email existe, un lien de réinitialisation a été envoyé.']);
    }

    // 2. Réinitialisation effective du mot de passe
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        // Vérifier le token en base
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'Le lien de réinitialisation est invalide ou a expiré.'], 400);
        }

        // Vérifier si le token n'est pas trop vieux (ex: 1h)
        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
             DB::table('password_reset_tokens')->where('email', $request->email)->delete();
             return response()->json(['message' => 'Le lien a expiré.'], 400);
        }

        // Mettre à jour le mot de passe
        $user = User::where('email', $request->email)->first();
        if ($user) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        // Supprimer le token utilisé
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Votre mot de passe a été réinitialisé avec succès.']);
    }
}