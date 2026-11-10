<?php

namespace App\Http\Requests\Dashboards;

use App\Models\Dashboard;
use App\Services\Dashboards\DashboardTemplates;
use App\Services\Dashboards\WidgetQuery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

/**
 * Create a dashboard (blank, from a template, or as a copy of one the user can open) or
 * edit one the user owns. Every widget spec is checked against the source catalogue.
 */
class SaveDashboardRequest extends FormRequest
{
    public const WIDGET_TYPES = ['kpi', 'bar', 'line', 'pie', 'table', 'list'];

    public const MAX_WIDGETS = 30;

    public function authorize(): bool
    {
        $dashboard = $this->dashboard();

        return $dashboard === null || $dashboard->isOwnedBy($this->user());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $creating = $this->dashboard() === null;

        return [
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'isHome' => ['sometimes', 'boolean'],
            ...($creating ? [
                'fromTemplate' => ['nullable', 'string', Rule::in(DashboardTemplates::keysFor($this->user()))],
                'fromDashboard' => ['nullable', 'integer', 'prohibits:fromTemplate'],
            ] : []),
            'widgets' => ['sometimes', 'array', 'max:'.self::MAX_WIDGETS],
            'widgets.*.id' => ['required', 'string', 'max:40', 'distinct'],
            'widgets.*.title' => ['required', 'string', 'max:100'],
            'widgets.*.type' => ['required', Rule::in(self::WIDGET_TYPES)],
            'widgets.*.spec' => ['required', 'array'],
            'widgets.*.layout' => ['required', 'array'],
            'widgets.*.layout.x' => ['required', 'integer', 'min:0', 'max:11'],
            'widgets.*.layout.y' => ['required', 'integer', 'min:0', 'max:500'],
            'widgets.*.layout.w' => ['required', 'integer', 'min:1', 'max:12'],
            'widgets.*.layout.h' => ['required', 'integer', 'min:1', 'max:12'],
            'widgets.*.options' => ['nullable', 'array'],
            'widgets.*.options.format' => ['nullable', Rule::in(['number', 'decimal', 'percent'])],
            'widgets.*.options.target' => ['nullable', 'numeric'],
            'widgets.*.options.stacked' => ['nullable', 'boolean'],
            'widgets.*.options.color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $query = app(WidgetQuery::class);
            foreach ($this->input('widgets', []) as $i => $widget) {
                try {
                    $query->validate((array) ($widget['spec'] ?? []), "widgets.{$i}.spec");
                } catch (ValidationException $e) {
                    foreach ($e->errors() as $key => $messages) {
                        foreach ($messages as $message) {
                            $validator->errors()->add($key, $message);
                        }
                    }
                }
            }
        }];
    }

    /**
     * Widgets with normalised specs and only known options.
     *
     * @return list<array<string, mixed>>|null
     */
    public function widgets(): ?array
    {
        if (! $this->has('widgets')) {
            return null;
        }

        $query = app(WidgetQuery::class);

        return array_values(array_map(fn (array $widget) => [
            'id' => $widget['id'],
            'title' => $widget['title'],
            'type' => $widget['type'],
            'spec' => $query->validate($widget['spec']),
            'layout' => array_map('intval', array_intersect_key($widget['layout'], array_flip(['x', 'y', 'w', 'h']))),
            'options' => array_intersect_key($widget['options'] ?? [], array_flip(['format', 'target', 'stacked', 'color'])),
        ], $this->validated('widgets')));
    }

    private function dashboard(): ?Dashboard
    {
        $dashboard = $this->route('dashboard');

        return $dashboard instanceof Dashboard ? $dashboard : null;
    }
}
