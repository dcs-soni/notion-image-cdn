type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  PUT: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
  PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  OPTIONS: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  HEAD: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

interface MethodBadgeProps {
  method: HttpMethod;
  size?: 'sm' | 'md';
}

export function MethodBadge({ method, size = 'md' }: MethodBadgeProps) {
  const colors = METHOD_COLORS[method] || METHOD_COLORS.GET;

  return (
    <span
      className={`font-mono font-semibold uppercase border inline-flex items-center justify-center ${colors} ${
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5 tracking-wide' : 'text-[11px] px-2.5 py-1 tracking-wider min-w-[56px]'
      }`}
    >
      {method}
    </span>
  );
}
