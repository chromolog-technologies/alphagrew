<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A form field an institution admin added to one kind of record.
 *
 * @property string $entity
 * @property string $key
 * @property string $label
 * @property string $type
 * @property array<int, string>|null $options
 * @property bool $is_required
 * @property bool $is_active
 */
class CustomFieldDefinition extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const ENTITY_STUDENT = 'student';

    public const ENTITY_STAFF = 'staff';

    public const ENTITY_SUBJECT = 'subject';

    public const ENTITY_EXAM = 'exam';

    /** Record type → model holding the records. */
    public const ENTITIES = [
        self::ENTITY_STUDENT => Student::class,
        self::ENTITY_STAFF => User::class,
        self::ENTITY_SUBJECT => Subject::class,
        self::ENTITY_EXAM => Exam::class,
    ];

    public const TYPE_TEXT = 'text';

    public const TYPE_NUMBER = 'number';

    public const TYPE_DATE = 'date';

    public const TYPE_BOOLEAN = 'boolean';

    public const TYPE_SELECT = 'select';

    public const TYPE_MULTISELECT = 'multiselect';

    public const TYPES = [
        self::TYPE_TEXT,
        self::TYPE_NUMBER,
        self::TYPE_DATE,
        self::TYPE_BOOLEAN,
        self::TYPE_SELECT,
        self::TYPE_MULTISELECT,
    ];

    protected $fillable = [
        'entity',
        'key',
        'label',
        'type',
        'options',
        'help_text',
        'is_required',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function values(): HasMany
    {
        return $this->hasMany(CustomFieldValue::class, 'definition_id');
    }

    /** The custom_field_values column this type is stored in. */
    public function valueColumn(): string
    {
        return self::columnForType($this->type);
    }

    public static function columnForType(string $type): string
    {
        return match ($type) {
            self::TYPE_NUMBER, self::TYPE_BOOLEAN => 'value_number',
            self::TYPE_DATE => 'value_date',
            default => 'value_text',
        };
    }

    public function hasOptions(): bool
    {
        return in_array($this->type, [self::TYPE_SELECT, self::TYPE_MULTISELECT], true);
    }
}
