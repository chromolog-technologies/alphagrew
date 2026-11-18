<?php

namespace App\Enums;

enum InterviewMode: string
{
    case Technical = 'technical';
    case Hr = 'hr';
    case ResumeDeepDive = 'resume_deep_dive';
    case SystemDesign = 'system_design';
    case Mixed = 'mixed';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
