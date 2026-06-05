<?php

return [

    /**
     * Validation automatique des comptes fournisseur lorsque le dossier légal est complet.
     * Si true : inscription (dossier complet), upload de la dernière pièce, ou tâche planifiée.
     * L'administrateur peut toujours rejeter un compte a posteriori.
     */
    'auto_validation' => env('FOURNISSEUR_AUTO_VALIDATION', false),

];
