<?php

namespace App\Mail;

use App\Models\AppelOffre;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppelOffreAssigned extends Mailable
{
    use Queueable, SerializesModels;

    public $appelOffre;
    public $responsable;

    /**
     * Create a new message instance.
     */
    public function __construct(AppelOffre $appelOffre, User $responsable)
    {
        $this->appelOffre = $appelOffre;
        $this->responsable = $responsable;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouvel Appel d\'Offre Assigné',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.appel_offre_assigned',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
