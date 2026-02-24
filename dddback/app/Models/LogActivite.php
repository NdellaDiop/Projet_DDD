<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogActivite extends Model
{
    use HasFactory;

    protected $table = 'logs_activites';

    protected $fillable = [
        'user_id',
        'action',
        'details',
        'ip_address',
    ];

    /**
     * Get the user that performed the activity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}