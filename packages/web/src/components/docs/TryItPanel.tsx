import { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';

interface TryItField {
  name: string;
  location: 'query' | 'path' | 'header';
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
}

interface TryItPanelProps {
  method: string;
  path: string;
  baseUrl: string;
  fields: TryItField[];
}

export function TryItPanel({ method, path, baseUrl, fields }: TryItPanelProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.defaultValue) initial[f.name] = f.defaultValue;
    });
    return initial;
  });
  const [copied, setCopied] = useState(false);

  const generatedUrl = useMemo(() => {
    let url = `${baseUrl}${path}`;

    // Replace path params
    fields
      .filter((f) => f.location === 'path')
      .forEach((f) => {
        url = url.replace(`:${f.name}`, values[f.name] || `:${f.name}`);
      });

    // Add query params
    const queryParams = fields
      .filter((f) => f.location === 'query' && values[f.name])
      .map((f) => `${f.name}=${encodeURIComponent(values[f.name])}`)
      .join('&');

    if (queryParams) url += `?${queryParams}`;
    return url;
  }, [baseUrl, path, fields, values]);

  const curlCommand = useMemo(() => {
    const headers = fields
      .filter((f) => f.location === 'header' && values[f.name])
      .map((f) => `-H "${f.name}: ${values[f.name]}"`)
      .join(' \\\n  ');

    const parts = [`curl -X ${method}`];
    if (headers) parts.push(headers);
    parts.push(`"${generatedUrl}"`);
    return parts.join(' \\\n  ');
  }, [method, generatedUrl, fields, values]);

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-cobalt/20 bg-cobalt/[0.03] overflow-hidden">
      <div className="px-4 py-2 border-b border-cobalt/10 bg-cobalt/[0.05] flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-wider text-cobalt uppercase">
          Try It
        </span>
        <span className="font-mono text-[9px] text-muted-foreground/40">Interactive</span>
      </div>

      <div className="p-4 space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="flex items-center gap-3">
            <label className="font-mono text-[11px] text-muted-foreground w-16 shrink-0 text-right">
              {field.name}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
              type="text"
              placeholder={field.placeholder}
              value={values[field.name] || ''}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              className="flex-1 bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 font-mono text-xs text-foreground/80 outline-none focus:border-cobalt/40 transition-colors placeholder:text-muted-foreground/30"
            />
          </div>
        ))}
      </div>

      {/* Generated command */}
      <div className="border-t border-cobalt/10 bg-black/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] text-muted-foreground/50 tracking-wider uppercase">
            Generated Command
          </span>
          <button
            onClick={handleCopy}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </div>
        <pre className="font-mono text-[11px] text-emerald-400/70 whitespace-pre-wrap break-all leading-relaxed">
          {curlCommand}
        </pre>
      </div>
    </div>
  );
}
