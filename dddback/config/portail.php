<?php

return [

    /*
    | Soumission / candidature en ligne (dépôt des offres via le portail).
    | Par défaut false : la procédure métier prévoit un dépôt physique des plis ;
    | mettre à true uniquement pour tests ou si le processus évolue.
    */
    'candidature_en_ligne' => env('CANDIDATURE_EN_LIGNE', false),

];
