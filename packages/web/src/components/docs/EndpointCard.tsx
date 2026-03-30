import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Link as LinkIcon } from 'lucide-react';
import { MethodBadge } from './MethodBadge';

interface EndpointCardProps {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function EndpointCard({
  id,
  method,
  path,
  description,
  children,
  defaultExpanded = false,
}: EndpointCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Highlight path params in the path
  const highlightedPath = path.replace(
    /:(\w+)/g,
    '<span class="text-cobalt">:$1</span>',
  );

  return (
    <div id={id} className="border border-white/[0.06] scroll-mt-20 group/card">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <MethodBadge method={method} />
        <code
          className="font-mono text-[13px] text-foreground/80 flex-1"
          dangerouslySetInnerHTML={{ __html: highlightedPath }}
        />
        <button
          onClick={handleCopyLink}
          className="opacity-0 group-hover/card:opacity-100 text-muted-foreground/30 hover:text-muted-foreground transition-all duration-200 p-1"
          title="Copy link"
        >
          <LinkIcon size={12} className={linkCopied ? 'text-emerald-500' : ''} />
        </button>
        <span className="text-xs text-muted-foreground/50 hidden sm:inline max-w-[200px] truncate">
          {description}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground/30 transition-transform duration-300 shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-4 py-5 space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
