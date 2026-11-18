<?php

namespace App\Enums;

enum ResumeStatus: string
{
    case Uploaded = 'uploaded';
    case Parsing = 'parsing';
    case Parsed = 'parsed';
    case Failed = 'failed';
}
