<?php

namespace App\Traits;

use App\Models\ActivityLog;

trait LogsActivity
{
    protected static function bootLogsActivity()
    {
        static::created(function ($model) {
            ActivityLog::log(
                'created',
                class_basename($model),
                $model->id,
                ['new_values' => $model->toArray()]
            );
        });

        static::updated(function ($model) {
            // Hidden attributes (password hash, remember token) are recorded as changed,
            // never with their values.
            $hidden = $model->getHidden();
            $changes = [];
            foreach ($model->getChanges() as $key => $newValue) {
                $changes[$key] = in_array($key, $hidden, true)
                    ? ['old' => '[redacted]', 'new' => '[redacted]']
                    : ['old' => $model->getOriginal($key), 'new' => $newValue];
            }

            if (!empty($changes)) {
                ActivityLog::log(
                    'updated',
                    class_basename($model),
                    $model->id,
                    $changes
                );
            }
        });

        static::deleted(function ($model) {
            ActivityLog::log(
                'deleted',
                class_basename($model),
                $model->id,
                ['deleted_values' => $model->toArray()]
            );
        });
    }
}
