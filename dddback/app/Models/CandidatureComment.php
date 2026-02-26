<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CandidatureComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidature_id',
        'user_id',
        'message',
        'document_id',
    ];

    /**
     * Get the candidature that owns the comment.
     */
    public function candidature(): BelongsTo
    {
        return $this->belongsTo(Candidature::class);
    }

    /**
     * Get the user who wrote the comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the document this comment is about (if any).
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
