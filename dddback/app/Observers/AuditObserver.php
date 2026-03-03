<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditObserver
{
    public function created(Model $model)
    {
        $this->logActivity($model, 'created', [], $model->toArray());
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

        $this->logActivity($model, 'updated', $oldValues, $newValues);
    }

    public function deleted(Model $model)
    {
        $this->logActivity($model, 'deleted', $model->toArray(), []);
    }

    protected function logActivity(Model $model, string $event, array $oldValues, array $newValues)
    {
        AuditLog::create([
            'user_id' => Auth::id(), // Peut être null si action système/cron
            'event' => $event,
            'auditable_type' => get_class($model),
            'auditable_id' => $model->id,
            'old_values' => !empty($oldValues) ? json_encode($oldValues) : null,
            'new_values' => !empty($newValues) ? json_encode($newValues) : null,
            'url' => request()->fullUrl(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
