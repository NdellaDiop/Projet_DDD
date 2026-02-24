<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;
use App\Models\Notification;

class NotificationService
{
    public function sendEmail(string $to, string $subject, string $message): void
    {
        Mail::raw($message, function ($mail) use ($to, $subject) {
            $mail->to($to)->subject($subject);
        });
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
