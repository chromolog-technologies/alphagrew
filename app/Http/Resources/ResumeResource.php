<?php

namespace App\Http\Resources;

use App\Models\Resume;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Resume
 */
class ResumeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'fileName' => $this->file_name,
            'fileSizeBytes' => $this->file_size_bytes,
            'mimeType' => $this->mime_type,
            'status' => $this->status->value,
            'parseError' => $this->parse_error,
            'isDefault' => $this->is_default,
            'hasAnalysis' => $this->relationLoaded('analysis') ? $this->analysis !== null : $this->analysis()->exists(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
