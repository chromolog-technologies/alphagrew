import { Link } from 'react-router-dom';
import { Loader2, SearchX, ShieldAlert } from 'lucide-react';

/** Pages shown by the workspace router: loading, no access (403) and unknown page (404). */

export function PageLoading() {
  return (
    <div role="status" className="flex items-center gap-2 p-8 text-sm text-slate-500">
      <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading…
    </div>
  );
}

function StatusPage({ icon, title, message, homePath }: { icon: React.ReactNode; title: string; message: string; homePath: string }) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <Link to={homePath} className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        Go to your dashboard
      </Link>
    </div>
  );
}

export function AccessDenied({ homePath }: { homePath: string }) {
  return (
    <StatusPage
      icon={<ShieldAlert size={22} aria-hidden="true" />}
      title="You don't have access to this page"
      message="Your role can't open this page. Ask your institution administrator if you need access."
      homePath={homePath}
    />
  );
}

export function NotFound({ homePath }: { homePath: string }) {
  return (
    <StatusPage
      icon={<SearchX size={22} aria-hidden="true" />}
      title="Page not found"
      message="This page doesn't exist. Check the address or use the menu."
      homePath={homePath}
    />
  );
}
