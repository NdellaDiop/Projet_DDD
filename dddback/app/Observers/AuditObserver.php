<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Models\CahierAccesAchat;
use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditObserver
{
    public function created(Model $model)
    {
        $this->logActivity($model, 'created', [], $this->snapshot($model));
    }

    public function updated(Model $model)
    {
        // On ignore le champ 'updated_at' s'il est le seul à changer
        if ($model->isDirty('updated_at') && count($model->getDirty()) === 1) {
            return;
        }

        $oldValues = [];
        $newValues = [];

        foreach ($model->getDirty() as $key => $value) {
            $oldValues[$key] = $model->getOriginal($key);
            $newValues[$key] = $value;
        }

        $this->logActivity(
            $model,
            'updated',
            $this->filterAttributes($oldValues, $model),
            $this->filterAttributes($newValues, $model)
        );
    }

    public function deleted(Model $model)
    {
        $this->logActivity($model, 'deleted', $this->snapshot($model), []);
    }

    protected function snapshot(Model $model): array
    {
        return $this->filterAttributes($model->toArray(), $model);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function filterAttributes(array $data, Model $model): array
    {
        $exclude = match ($model::class) {
            User::class => ['password', 'remember_token'],
            Document::class => ['updated_at', 'created_at'],
            CahierAccesAchat::class => ['updated_at', 'created_at'],
            default => ['updated_at', 'created_at'],
        };

        return array_diff_key($data, array_flip($exclude));
    }

    protected function logActivity(Model $model, string $event, array $oldValues, array $newValues)
    {
        AuditLog::create([
            'user_id' => Auth::id(), // null si webhook / tâche système
            'event' => $event,
            'auditable_type' => $model::class,
            'auditable_id' => $model->getKey(),
            'old_values' => ! empty($oldValues) ? json_encode($oldValues) : null,
            'new_values' => ! empty($newValues) ? json_encode($newValues) : null,
            'url' => request()->fullUrl(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
