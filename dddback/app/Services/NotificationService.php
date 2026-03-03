<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use App\Models\Notification;
use App\Models\User;
use App\Models\AppelOffre;
use App\Mail\AccountValidated;
use App\Mail\AppelOffreAssigned;

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

    public function notifyUser(int $userId, string $message): void
    {
        Notification::create([
            'user_id' => $userId,
            'message' => $message,
            'is_read' => false,
        ]);
    }
}
