<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use App\Models\Notification;
use App\Models\User;
use App\Models\AppelOffre;
use App\Models\Candidature;
use App\Mail\AccountValidated;
use App\Mail\AppelOffreAssigned;
use App\Mail\CandidatureReceived;
use App\Mail\CandidatureSubmitted;
use App\Mail\CandidatureAccepted;
use App\Mail\CandidatureRejected;

class NotificationService
{
    public function sendEmail(string $to, string $subject, string $message): void
    {
        Mail::raw($message, function ($mail) use ($to, $subject) {
            $mail->to($to)->subject($subject);
        });
    }

    public function sendAccountValidatedEmail(User $user): void
    {
        Mail::to($user->email)->send(new AccountValidated($user));
    }

    public function sendAppelOffreAssignedEmail(User $responsable, AppelOffre $appelOffre): void
    {
        Mail::to($responsable->email)->send(new AppelOffreAssigned($appelOffre, $responsable));
    }

    public function sendCandidatureReceivedEmail(User $responsable, Candidature $candidature): void
    {
        Mail::to($responsable->email)->send(new CandidatureReceived($candidature));
    }

    public function sendCandidatureSubmittedEmail(User $fournisseurUser, Candidature $candidature): void
    {
        Mail::to($fournisseurUser->email)->send(new CandidatureSubmitted($candidature));
    }

    public function sendCandidatureAcceptedEmail(User $fournisseurUser, Candidature $candidature): void
    {
        Mail::to($fournisseurUser->email)->send(new CandidatureAccepted($candidature));
    }

    public function sendCandidatureRejectedEmail(User $fournisseurUser, Candidature $candidature): void
    {
        Mail::to($fournisseurUser->email)->send(new CandidatureRejected($candidature));
    }

    public function notifyUser(int $userId, string $message): void
    {
        Notification::create([
            'user_id' => $userId,
            'message' => $message,
            'is_read' => false,
        ]);
    }
}
