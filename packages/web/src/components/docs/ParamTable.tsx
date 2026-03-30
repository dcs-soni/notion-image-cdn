interface Param {
  name: string;
  location: 'query' | 'path' | 'header' | 'body';
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
  validation?: string;
}

interface ParamTableProps {
  params: Param[];
}

const LOCATION_COLORS: Record<string, string> = {
  query: 'text-amber-400 bg-amber-500/10',
  path: 'text-cobalt bg-cobalt/10',
  header: 'text-purple-400 bg-purple-500/10',
  body: 'text-emerald-400 bg-emerald-500/10',
};

export function ParamTable({ params }: ParamTableProps) {
  if (params.length === 0) return null;

  return (
    <div className="border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="col-span-2 font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
          Name
        </div>
        <div className="col-span-1 font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
          In
        </div>
        <div className="col-span-2 font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
          Type
        </div>
        <div className="col-span-1 font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
          Req
        </div>
        <div className="col-span-2 font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
          Default
        </div>
        <div className="col-span-4 font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
          Description
        </div>
      </div>

      {/* Rows */}
      {params.map((param, i) => (
        <div
          key={param.name}
          className={`px-4 py-3 ${i < params.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
        >
          {/* Desktop row */}
          <div className="hidden md:grid grid-cols-12 gap-2 items-start">
            <div className="col-span-2">
              <code className="font-mono text-[13px] text-foreground/90">{param.name}</code>
            </div>
            <div className="col-span-1">
              <span
                className={`font-mono text-[9px] px-1.5 py-0.5 tracking-wide uppercase ${LOCATION_COLORS[param.location] ?? ''}`}
              >
                {param.location}
              </span>
            </div>
            <div className="col-span-2">
              <span className="font-mono text-[11px] text-muted-foreground">{param.type}</span>
            </div>
            <div className="col-span-1">
              {param.required ? (
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 tracking-wide">
                  REQ
                </span>
              ) : (
                <span className="font-mono text-[9px] text-muted-foreground/40">opt</span>
              )}
            </div>
            <div className="col-span-2">
              {param.defaultValue ? (
                <code className="font-mono text-[11px] text-muted-foreground/60">
                  {param.defaultValue}
                </code>
              ) : (
                <span className="text-muted-foreground/20">—</span>
              )}
            </div>
            <div className="col-span-4">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {param.description}
              </p>
              {param.validation && (
                <p className="text-[10px] text-muted-foreground/40 font-mono mt-1">
                  {param.validation}
                </p>
              )}
            </div>
          </div>

          {/* Mobile card */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="font-mono text-[13px] text-foreground/90">{param.name}</code>
              <span
                className={`font-mono text-[9px] px-1.5 py-0.5 tracking-wide uppercase ${LOCATION_COLORS[param.location] ?? ''}`}
              >
                {param.location}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{param.type}</span>
              {param.required && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 tracking-wide">
                  REQUIRED
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {param.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { Param };
