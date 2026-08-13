<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffAccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;

    public string $plainPassword;

    public string $roleLabel;

    public string $dashboardUrl;

    public function __construct(User $user, string $plainPassword, string $roleLabel, string $dashboardUrl)
    {
        $this->user = $user;
        $this->plainPassword = $plainPassword;
        $this->roleLabel = $roleLabel;
        $this->dashboardUrl = $dashboardUrl;
    }

    public function build()
    {
        return $this->subject("Votre compte {$this->roleLabel} — Dakar Dem Dikk")
            ->view('emails.staff_account_created');
    }
}
