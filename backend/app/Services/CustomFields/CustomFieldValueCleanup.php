<?php

namespace App\Services\CustomFields;

use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use App\Models\CustomModuleRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Removes a record's custom field values when the record is gone for good.
 *
 * `custom_field_values.entity_id` has no foreign key (one column serves many tables), so
 * nothing else cleans up. Soft-deleted records keep their values, because they can be
 * restored; values go when the record is force-deleted, or deleted for models without soft
 * deletes (designations).
 */
class CustomFieldValueCleanup
{
    public static function register(): void
    {
        foreach (CustomFieldDefinition::ENTITIES as $entity => $model) {
            self::listen($model, fn (Model $record) => self::purge($entity, $record->getKey()));
        }

        // Records of institution-created modules use the entity "module_{id}".
        self::listen(CustomModuleRecord::class, fn (CustomModuleRecord $record) => self::purge(
            CustomFieldDefinition::moduleEntity($record->custom_module_id),
            $record->getKey(),
        ));
    }

    public static function purge(string $entity, int|string $recordId): void
    {
        // Without the tenant scope: a record is always cleaned up, whichever context deletes it
        // (console, queued job, another institution's admin in the owner console).
        CustomFieldValue::query()
            ->withoutGlobalScopes()
            ->where('entity', $entity)
            ->where('entity_id', $recordId)
            ->delete();
    }

    /**
     * @param  class-string<Model>  $model
     */
    private static function listen(string $model, callable $callback): void
    {
        $softDeletes = in_array(SoftDeletes::class, class_uses_recursive($model), true);
        $softDeletes ? $model::forceDeleted($callback) : $model::deleted($callback);
    }
}
