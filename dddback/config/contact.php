<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Destinataire des messages du formulaire « Contact » du portail
    |--------------------------------------------------------------------------
    |
    | Chaque envoi depuis /api/contact est enregistré en base et un e-mail
    | est envoyé à cette adresse pour que l’entreprise puisse répondre.
    |
    */

    'mail_to' => env('MAIL_CONTACT_ADDRESS', 'appel.offre@demdikk.sn'),

];
