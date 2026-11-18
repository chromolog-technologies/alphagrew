<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/**
 * A resume with its parsed sections (education, skills, experience, projects).
 */
class ResumeDetailResource extends ResumeResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'parsedData' => $this->parsed_data,
            'overallScore' => $this->analysis?->overall_score,
        ];
    }
}
