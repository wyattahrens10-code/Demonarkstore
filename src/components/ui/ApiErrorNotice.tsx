import { AlertTriangle } from 'lucide-react';

interface Props {
  title?: string;
  message: string;
}

export default function ApiErrorNotice({
  title = 'Unable to load this content',
  message,
}: Props) {
  return (
    <div role="alert" aria-live="polite" className="my-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-red-200">{title}</h2>
          <p className="mt-2 break-words text-xs leading-relaxed text-red-100/90">{message}</p>
          <p className="mt-2 text-xs text-red-200/70">Please refresh the page or try again in a moment.</p>
        </div>
      </div>
    </div>
  );
}
