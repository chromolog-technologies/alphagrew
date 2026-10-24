<?php

namespace App\Notifications;

use App\Models\MarkEntry;
use App\Models\User;
use Illuminate\Notifications\Notification;

/**
 * In-app alert to the faculty member whose marks were sent back to draft.
 */
class MarksRejected extends Notification
{
    public function __construct(
        private readonly MarkEntry $entry,
        private readonly User $rejectedBy,
        private readonly string $remarks,
    ) {
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $this->entry->loadMissing(['subject:id,code,name', 'student:id,name,registration_number']);

        return [
            'markEntryId' => $this->entry->id,
            'examId' => $this->entry->exam_id,
            'subjectCode' => $this->entry->subject?->code,
            'studentName' => $this->entry->student?->name,
            'registrationNumber' => $this->entry->student?->registration_number,
            'rejectedBy' => $this->rejectedBy->name,
            'remarks' => $this->remarks,
            'message' => "Marks for {$this->entry->student?->name} in {$this->entry->subject?->code} were sent back for correction.",
        ];
    }
}
