<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\StudentSelfRequest;
use App\Models\Student;
use App\Services\Students\ProfileCompleteness;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;

/**
 * Shared list/create/update/delete for the student's own profile sections
 * (projects, certifications, experience) under /students/me/...
 */
abstract class StudentProfileItemController extends Controller
{
    /** Maximum items per section, so a profile stays readable. */
    protected const MAX_ITEMS = 20;

    public function __construct(protected readonly ProfileCompleteness $completeness)
    {
    }

    abstract protected function items(Student $student): HasMany;

    /** @return class-string<JsonResource> */
    abstract protected function resourceClass(): string;

    protected function listItems(StudentSelfRequest $request): JsonResponse
    {
        $resource = $this->resourceClass();

        return response()->json(['data' => $resource::collection($this->items($request->student())->get())]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function createItem(StudentSelfRequest $request, array $attributes): JsonResponse
    {
        $student = $request->student();
        $items = $this->items($student);

        abort_if($items->count() >= static::MAX_ITEMS, 422, 'You can add at most '.static::MAX_ITEMS.' entries here.');

        $item = $items->create([
            'sort_order' => ((int) $items->max('sort_order')) + 1,
            ...$attributes,
        ]);

        $this->completeness->refresh($student);
        $resource = $this->resourceClass();

        return response()->json(['data' => new $resource($item)], 201);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function updateItem(StudentSelfRequest $request, string $parameter, array $attributes): JsonResponse
    {
        $item = $request->ownRecord($parameter);
        $item->update($attributes);
        $resource = $this->resourceClass();

        return response()->json(['data' => new $resource($item)]);
    }

    protected function deleteItem(StudentSelfRequest $request, string $parameter): Response
    {
        /** @var Model $item */
        $item = $request->ownRecord($parameter);
        $item->delete();

        $this->completeness->refresh($request->student());

        return response()->noContent();
    }
}
