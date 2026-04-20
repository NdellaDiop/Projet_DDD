<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactMessageNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ContactMessage $contactMessage)
    {
    }

    public function build(): self
    {
        $replyName = $this->contactMessage->nom ?: $this->contactMessage->email;

        return $this
            ->replyTo($this->contactMessage->email, $replyName)
            ->subject('[Portail appels d\'offres] '.$this->contactMessage->sujet)
            ->view('emails.contact-message');
    }
}
