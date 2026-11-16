/** A student's own documents: upload (PDF/JPG/PNG up to 5 MB), see review status, open, remove. */
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/apiError';
import { DOCUMENT_TYPES, documentsApi, useMyDocuments, useRemoveDocument, useUploadDocument, type DocumentType } from '../../api/documentsApi';
import { Alert, AlertDescription, Badge, Button, Card, Input, Label, Select, Skeleton } from '../ui';

const statusVariant = { pending: 'secondary', verified: 'success', rejected: 'destructive' } as const;

export function StudentDocumentsView() {
  const documents = useMyDocuments();
  const upload = useUploadDocument();
  const remove = useRemoveDocument();
  const [type, setType] = useState<DocumentType>('mark_sheet');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    upload.mutate(
      { type, title: title.trim(), file },
      {
        onSuccess: () => {
          setTitle('');
          setFile(null);
          setFormKey((k) => k + 1);
        },
      },
    );
  };

  const error = upload.error ?? remove.error;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My documents</h1>
        <p className="text-sm text-muted-foreground">Upload mark sheets, certificates and ID proof. The office verifies them.</p>
      </div>

      <Card className="p-4">
        <form key={formKey} onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_2fr_2fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Type</Label>
            <Select id="doc-type" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" required maxLength={150} placeholder="e.g. Class 12 mark sheet" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File (PDF, JPG, PNG · 5 MB)</Label>
            <input id="doc-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
          <Button type="submit" disabled={!file || upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </form>
        {error ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{error instanceof ApiError ? Object.values(error.firstFieldErrors)[0] ?? error.message : 'The document could not be saved.'}</AlertDescription>
          </Alert>
        ) : null}
      </Card>

      {documents.isLoading ? (
        <Skeleton className="h-24" />
      ) : (documents.data ?? []).length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No documents yet.</Card>
      ) : (
        <Card className="divide-y divide-border">
          {(documents.data ?? []).map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {DOCUMENT_TYPES.find((t) => t.value === d.type)?.label} · {d.originalName}
                  {d.status === 'rejected' && d.reviewRemarks ? ` · Rejected: ${d.reviewRemarks}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[d.status]}>{d.status}</Badge>
                <Button type="button" variant="outline" size="sm" onClick={() => documentsApi.open(d.id)}>
                  Open
                </Button>
                {d.status !== 'verified' ? (
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${d.title}`} onClick={() => remove.mutate(d.id)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
