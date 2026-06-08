<?php

use Illuminate\Support\Facades\Route;

// Importez tous les contrôleurs nécessaires
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminResponsableController;
use App\Http\Controllers\AdminAffectationController;
use App\Http\Controllers\AppelOffreController;
use App\Http\Controllers\AdminLogController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\CandidatureController;
use App\Http\Controllers\ResponsableCandidatureController;
use App\Http\Controllers\FournisseurCandidatureController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\LogActiviteController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminDashboardController; 
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\SuggestionController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CandidatureCommentController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\FournisseurChatController;
use App\Http\Controllers\FournisseurDirectoryController;
use App\Http\Controllers\CahierPaiementController;
use App\Http\Controllers\CahierPaiementSimulationController;
use App\Http\Controllers\Webhooks\OrangeMoneyCahierWebhookController;
use App\Http\Controllers\Webhooks\WaveCahierWebhookController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ========== ROUTES PUBLIQUES (sans authentification) ==========

// Authentification
Route::post('register', [AuthController::class, 'register']);
// Inscription fournisseur en guichet unique (infos entreprise + compte + pièces légales).
// Création conditionnée à la complétude du dossier ; validation administrateur ensuite.
Route::post('register-fournisseur', [\App\Http\Controllers\FournisseurRegistrationController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail']);
Route::post('reset-password', [ForgotPasswordController::class, 'resetPassword']);
// Routes publiques pour consulter les appels d'offres
// PUBLIC
Route::get('appels-offres', [AppelOffreController::class, 'index']);
Route::get('appels-offres/{appel_offre}', [AppelOffreController::class, 'show']);

// Contact (accessible à tous)
Route::post('contact', [ContactController::class, 'store']);

// Webhooks prestataires de paiement (pas d’auth Sanctum — signature / secret)
Route::post('webhooks/wave/cahier', [WaveCahierWebhookController::class, 'handle']);
Route::post('webhooks/orange-money/cahier', [OrangeMoneyCahierWebhookController::class, 'handle']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::apiResource('notifications', NotificationController::class)->only(['index','show','update','destroy']);
    Route::put('update-password', [AuthController::class, 'updatePassword']);

    // APPELS D'OFFRES (RESPONSABLE + ADMIN)
    Route::middleware('role:RESPONSABLE_MARCHE,ADMIN')->group(function () {
        Route::get('responsable/dashboard-advanced-stats', [AdminDashboardController::class, 'getResponsableAdvancedStats']);
        Route::post('appels-offres', [AppelOffreController::class, 'store']);
        Route::post('appels-offres/with-documents', [AppelOffreController::class, 'storeWithDocuments']);
        Route::put('appels-offres/{appel_offre}', [AppelOffreController::class, 'update']);
        Route::post('appels-offres/{appel_offre}/publish', [AppelOffreController::class, 'publish']);
        Route::post('appels-offres/{appel_offre}/close', [AppelOffreController::class, 'close']);
        Route::post('appels-offres/{appel_offre}/attribution', [AppelOffreController::class, 'attribuer']);
        Route::post('appels-offres/{appel_offre}/attribution/annuler', [AppelOffreController::class, 'annulerAttribution']);
        Route::get('responsable/mes-appels-offres', [AppelOffreController::class, 'indexForResponsable']);
        Route::get('responsable/appels-offres/{appel_offre}/candidatures-recues', [AppelOffreController::class, 'getCandidatures'])->middleware('candidature.enabled');
        Route::get('responsable/candidatures/{candidature}/documents-legaux', [DocumentController::class, 'getFournisseurLegalDocuments'])->middleware('candidature.enabled');

        // Annuaire fournisseurs (lecture) + documents légaux par fournisseur — accessible aux PRM et admin.
        // Permet, lors du dépôt physique au siège, de consulter les pièces légales du fournisseur.
        Route::get('fournisseurs-directory', [FournisseurDirectoryController::class, 'index']);
        Route::get('fournisseurs/{fournisseur}/documents-legaux', [DocumentController::class, 'getDocumentsLegauxFournisseur']);
        
        // Profil responsable
        Route::get('responsable/profile', [ResponsableCandidatureController::class, 'showProfile']);
        Route::put('responsable/profile', [ResponsableCandidatureController::class, 'updateProfile']);
    });

    // Assignation / retours arrière statut AO (Admin uniquement)
    Route::post('appels-offres/{appel_offre}/assign', [AppelOffreController::class, 'assign'])->middleware('role:ADMIN');
    Route::post('appels-offres/{appel_offre}/reopen', [AppelOffreController::class, 'reopen'])->middleware('role:ADMIN');
    Route::post('appels-offres/{appel_offre}/unpublish', [AppelOffreController::class, 'unpublish'])->middleware('role:ADMIN');

    // CANDIDATURES
    Route::post('appels-offres/{appel_offre}/candidatures', [CandidatureController::class, 'store'])->middleware(['role:FOURNISSEUR', 'candidature.enabled']);
    Route::get('appels-offres/{appel_offre}/cahier/paiement/preview', [CahierPaiementController::class, 'preview'])
        ->middleware('role:FOURNISSEUR');
    Route::post('appels-offres/{appel_offre}/cahier/paiement/initier', [CahierPaiementController::class, 'initier'])
        ->middleware('role:FOURNISSEUR');
    Route::get('paiements/cahier/simulation/preview', [CahierPaiementSimulationController::class, 'preview'])
        ->middleware('role:FOURNISSEUR');
    Route::post('paiements/cahier/simulation/confirmer', [CahierPaiementSimulationController::class, 'confirmer'])
        ->middleware('role:FOURNISSEUR');
    Route::get('appels-offres/{appel_offre}/cahier/paiement/statut', [CahierPaiementController::class, 'statut'])
        ->middleware('role:FOURNISSEUR');
    Route::post('appels-offres/{appel_offre}/cahier/paiement/verifier-wave', [CahierPaiementController::class, 'verifierSessionWave'])
        ->middleware('role:FOURNISSEUR');
    Route::put('candidatures/{candidature}', [CandidatureController::class, 'update'])->middleware(['role:FOURNISSEUR', 'candidature.enabled']);
    Route::get('candidatures', [CandidatureController::class, 'index'])->middleware('candidature.enabled');
    Route::get('candidatures/{candidature}', [CandidatureController::class, 'show'])->middleware('candidature.enabled');
    Route::post('candidatures/{candidature}/accept', [CandidatureController::class, 'accept'])->middleware(['role:RESPONSABLE_MARCHE,ADMIN', 'candidature.enabled']);
    Route::post('candidatures/{candidature}/reject', [CandidatureController::class, 'reject'])->middleware(['role:RESPONSABLE_MARCHE,ADMIN', 'candidature.enabled']);
    
    // COMMENTAIRES SUR CANDIDATURES
    Route::get('candidatures/{candidature}/comments', [CandidatureCommentController::class, 'index'])->middleware('candidature.enabled');
    Route::post('candidatures/{candidature}/comments', [CandidatureCommentController::class, 'store'])->middleware('candidature.enabled');
    Route::get('candidatures/{candidature}/comments/{comment}', [CandidatureCommentController::class, 'show'])->middleware('candidature.enabled');
    Route::put('candidatures/{candidature}/comments/{comment}', [CandidatureCommentController::class, 'update'])->middleware('candidature.enabled');
    Route::delete('candidatures/{candidature}/comments/{comment}', [CandidatureCommentController::class, 'destroy'])->middleware('candidature.enabled');

    // DOCUMENTS
    Route::post('documents', [DocumentController::class, 'store']);
    Route::get('documents', [DocumentController::class, 'index']);
    Route::get('documents/{document}', [DocumentController::class, 'show']);
    Route::get('documents/{document}/download', [DocumentController::class, 'download']);
    Route::delete('documents/{document}', [DocumentController::class, 'destroy']);

    // ADMIN
    Route::middleware('role:ADMIN')->prefix('admin')->group(function () {
        Route::get('users', [AdminUserController::class, 'index']);
        Route::post('users/{user}/activate', [AdminUserController::class, 'activate']);
        Route::post('users/{user}/deactivate', [AdminUserController::class, 'deactivate']);
        Route::get('logs', [AdminLogController::class, 'index']);
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/{id}', [AuditLogController::class, 'show']);
        Route::post('responsables', [AdminResponsableController::class, 'store']);
        Route::delete('responsables/{id}', [AdminResponsableController::class, 'destroy']);
        Route::put('responsables/{id}', [AdminResponsableController::class, 'update']);
        Route::get('dashboard-stats', [AdminDashboardController::class, 'getDashboardStats']);
        Route::get('dashboard-advanced-stats', [AdminDashboardController::class, 'getAdvancedStats']);
        Route::get('appels-offres-dashboard', [AdminDashboardController::class, 'getAppelsOffres']);
        Route::get('fournisseurs-dashboard', [AdminDashboardController::class, 'getFournisseurs']);
        Route::get('responsables-dashboard', [AdminDashboardController::class, 'getResponsables']);
        Route::get('recent-activities', [AdminDashboardController::class, 'getRecentActivities']);
        Route::post('fournisseurs/{fournisseur}/validate', [AdminDashboardController::class, 'validateFournisseur']);
        Route::post('fournisseurs/{fournisseur}/reject', [AdminDashboardController::class, 'rejectFournisseur']);
        
        // Gestion des suggestions
        Route::get('suggestions', [SuggestionController::class, 'indexAdmin']);
        Route::put('suggestions/{suggestion}', [SuggestionController::class, 'updateStatus']);
        
        // Gestion des messages de contact
        Route::get('contact', [ContactController::class, 'index']);
        Route::put('contact/{contactMessage}/read', [ContactController::class, 'markAsRead']);
        Route::put('contact/{contactMessage}/archive', [ContactController::class, 'archive']);
    });
    // FOURNISSEUR (uniquement pour les fournisseurs)
    Route::middleware('role:FOURNISSEUR')->group(function () {
        Route::get('fournisseur/profile', [FournisseurCandidatureController::class, 'showProfile']);
        Route::put('fournisseur/profile', [FournisseurCandidatureController::class, 'updateProfile']);
        Route::get('fournisseur/candidatures', [FournisseurCandidatureController::class, 'getOwnCandidatures']);
        Route::get('fournisseur/mes-achats', [\App\Http\Controllers\FournisseurMesAchatsController::class, 'index']);
        Route::get('fournisseur/documents-legaux', [DocumentController::class, 'indexLegal']);
        Route::post('fournisseur/documents-legaux', [DocumentController::class, 'storeLegal']);
        Route::delete('fournisseur/documents-legaux/{document}', [DocumentController::class, 'destroyLegal']);
        
        // Chatbot IA fournisseur (rate-limit)
        Route::post('fournisseur/chat', [FournisseurChatController::class, 'chat'])->middleware('throttle:10,1');
        
        // Suggestions
        Route::get('suggestions', [SuggestionController::class, 'index']);
        Route::post('suggestions', [SuggestionController::class, 'store']);
        
    });
});