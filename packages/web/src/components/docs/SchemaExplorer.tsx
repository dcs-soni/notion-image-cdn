import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  children?: SchemaField[];
}

interface SchemaExplorerProps {
  schema: SchemaField[];
  title?: string;
}

export function SchemaExplorer({ schema, title }: SchemaExplorerProps) {
  return (
    <div className="border border-white/[0.06] overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
            {title}
          </span>
        </div>
      )}
      <div className="p-3">
        {schema.map((field) => (
          <SchemaFieldRow key={field.name} field={field} depth={0} />
        ))}
      </div>
    </div>
  );
}

function SchemaFieldRow({ field, depth }: { field: SchemaField; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = field.children && field.children.length > 0;

  const TYPE_COLORS: Record<string, string> = {
    string: 'text-emerald-400',
    number: 'text-amber-400',
    boolean: 'text-purple-400',
    object: 'text-cobalt',
    array: 'text-pink-400',
    integer: 'text-amber-400',
  };

  const typeColor = TYPE_COLORS[field.type] || 'text-muted-foreground';

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div
        className={`flex items-start gap-2 py-1.5 px-2 -mx-1 group ${
          hasChildren ? 'cursor-pointer hover:bg-white/[0.02]' : ''
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <ChevronRight
            size={12}
            className={`text-muted-foreground/40 mt-1 shrink-0 transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <code className="font-mono text-[12px] text-foreground/80 shrink-0">{field.name}</code>
        <span className={`font-mono text-[10px] shrink-0 mt-0.5 ${typeColor}`}>{field.type}</span>
        {field.required && (
          <span className="font-mono text-[8px] px-1 py-0.5 bg-red-500/10 text-red-400 shrink-0 -mt-0.5">
            REQ
          </span>
        )}
        <span className="text-[11px] text-muted-foreground/50 leading-relaxed">
          {field.description}
        </span>
      </div>
      {hasChildren && expanded && (
        <div className="border-l border-white/[0.04] ml-[7px]">
          {field.children!.map((child) => (
            <SchemaFieldRow key={child.name} field={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export type { SchemaField };
