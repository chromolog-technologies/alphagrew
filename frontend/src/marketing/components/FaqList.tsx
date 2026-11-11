import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

export interface FaqEntry {
  question: string;
  answer: ReactNode;
}

/** Questions as native disclosures: keyboard and screen-reader support come from the browser. */
export function FaqList({ items, open = false }: { items: FaqEntry[]; open?: boolean }) {
  return (
    <div>
      {items.map((item) => (
        <details key={item.question} className="mk-qa" open={open || undefined}>
          <summary>
            {item.question}
            <Plus size={20} className="mk-qa-icon" aria-hidden="true" />
          </summary>
          <div className="mk-qa-body">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
