<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_active',
        'role_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    /**
     * Get the fournisseur associated with the user.
     */
    public function fournisseur(): HasOne
    {
        return $this->hasOne(Fournisseur::class);
    }

    /**
     * Get the responsable_marche associated with the user.
     */
    public function responsableMarche(): HasOne
    {
        return $this->hasOne(ResponsableMarche::class);
    }

    /**
     * Get the notifications for the user.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get the activity logs for the user.
     */
    public function logsActivites(): HasMany
    {
        return $this->hasMany(LogActivite::class);
    }

    /**
     * Get the documents uploaded by the user.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Get the role that owns the user.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
    /**
     * Check if the user is an Admin.
     */
    public function isAdmin(): bool
    {
        return $this->role && $this->role->name === 'ADMIN';
    }

    /**
     * Check if the user is a Responsable de Marché.
     */
    public function isResponsableMarche(): bool
    {
        return $this->role && $this->role->name === 'RESPONSABLE_MARCHE';
    }

    /**
     * Check if the user is a Fournisseur.
     */
    public function isFournisseur(): bool
    {
        return $this->role && $this->role->name === 'FOURNISSEUR';
    }
}