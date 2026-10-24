<?php

namespace App\Enums;

/**
 * question = a planned question; follow_up = a probe on the previous answer (vague, evasive
 * or an unverified claim). Only questions count towards the plan's target turns.
 */
enum TurnKind: string
{
    case Question = 'question';
    case FollowUp = 'follow_up';
    case Clarification = 'clarification';
    case SystemHint = 'system_hint';
}
