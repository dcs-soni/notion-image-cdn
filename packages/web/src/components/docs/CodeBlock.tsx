import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Token-based syntax highlighting — no Prism/Highlight.js.
 *
 * Unlike chained .replace() calls, this collects ALL regex matches against the
 * original escaped text FIRST, resolves overlaps (leftmost-longest wins), then
 * builds the HTML output in a single pass. This prevents later regex patterns
 * from corrupting HTML tags inserted by earlier patterns.
 */
function highlightCode(code: string, language: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const src = esc(code);

  // Token: a slice of the source that should be wrapped in a <span>
  type Mark = { s: number; e: number; c: string };
  const marks: Mark[] = [];

  // Scan a regex against the ORIGINAL text and record match positions
  const scan = (re: RegExp, cls: string) => {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = r.exec(src)) !== null) {
      marks.push({ s: m.index, e: m.index + m[0].length, c: cls });
    }
  };

  // Scan a regex but use a capture group (index 1) for the token boundaries
  const scanGroup = (re: RegExp, cls: string) => {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = r.exec(src)) !== null) {
      if (m[1] !== undefined) {
        const offset = m[0].indexOf(m[1]);
        if (offset >= 0) {
          marks.push({ s: m.index + offset, e: m.index + offset + m[1].length, c: cls });
        }
      }
    }
  };

  // ─── Language-specific token patterns ───────────────────────────
  if (language === 'json') {
    // Classify quoted strings by context: key vs value
    const qr = /"[^"]*"/g;
    let m: RegExpExecArray | null;
    while ((m = qr.exec(src)) !== null) {
      const after = src.slice(m.index + m[0].length);
      marks.push({
        s: m.index,
        e: m.index + m[0].length,
        c: /^\s*:/.test(after) ? 'syn-key' : 'syn-str',
      });
    }
    scan(/\b\d+\.?\d*\b/g, 'syn-num');
    scan(/\b(true|false|null)\b/g, 'syn-kw');
  } else if (language === 'bash' || language === 'sh' || language === 'curl') {
    scan(/#.*$/gm, 'syn-cmt');
    scan(/"[^"]*"/g, 'syn-str');
    scan(/'[^']*'/g, 'syn-str');
    scan(/https?:\/\/[^\s"')]+/g, 'syn-url');
    scan(/\b(curl|wget|git|cd|cp|bun|npm|npx|docker|compose)\b/g, 'syn-kw');
    // Flags: extract group 1 so the leading whitespace isn't wrapped
    scanGroup(/(?:^|\s)(--?\w[\w-]*)/gm, 'syn-flag');
  } else if (
    language === 'typescript' ||
    language === 'ts' ||
    language === 'tsx' ||
    language === 'javascript' ||
    language === 'js'
  ) {
    scan(/\/\/.*$/gm, 'syn-cmt');
    scan(/'[^']*'/g, 'syn-str');
    scan(/`[^`]*`/g, 'syn-str');
    scan(/"[^"]*"/g, 'syn-str');
    scan(
      /\b(import|from|export|const|let|var|function|async|await|return|if|else|new|type|interface|class|extends|implements|typeof|as|default)\b/g,
      'syn-kw',
    );
    scan(/\b\d+\.?\d*\b/g, 'syn-num');
  } else if (language === 'python' || language === 'py') {
    scan(/#.*$/gm, 'syn-cmt');
    scan(/"""[\s\S]*?"""/g, 'syn-str');
    scan(/'[^']*'/g, 'syn-str');
    scan(/"[^"]*"/g, 'syn-str');
    scan(
      /\b(import|from|def|class|if|else|elif|return|print|for|in|with|as|try|except|raise|True|False|None)\b/g,
      'syn-kw',
    );
    scan(/\b\d+\.?\d*\b/g, 'syn-num');
  } else if (language === 'go') {
    scan(/\/\/.*$/gm, 'syn-cmt');
    scan(/"[^"]*"/g, 'syn-str');
    scan(
      /\b(package|import|func|var|const|type|struct|interface|if|else|return|for|range|defer|go|chan|make|nil|err)\b/g,
      'syn-kw',
    );
    scan(/\b\d+\.?\d*\b/g, 'syn-num');
  }

  // ─── Resolve overlaps ──────────────────────────────────────────
  // Sort by start position; for ties, longest match wins
  marks.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));

  // Walk left-to-right, skip any mark that overlaps a previously accepted one
  const resolved: Mark[] = [];
  let lastEnd = 0;
  for (const m of marks) {
    if (m.s >= lastEnd) {
      resolved.push(m);
      lastEnd = m.e;
    }
  }

  // ─── Build HTML output in a single pass ────────────────────────
  let out = '';
  let pos = 0;
  for (const m of resolved) {
    out += src.slice(pos, m.s);
    out += `<span class="${m.c}">${src.slice(m.s, m.e)}</span>`;
    pos = m.e;
  }
  out += src.slice(pos);

  return out;
}

interface Tab {
  label: string;
  language: string;
  code: string;
}

interface CodeBlockProps {
  code?: string;
  language?: string;
  label?: string;
  tabs?: Tab[];
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language = 'bash',
  label,
  tabs,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const activeCode = tabs ? tabs[activeTab].code : (code ?? '');
  const activeLang = tabs ? tabs[activeTab].language : language;
  const activeLabel = tabs ? tabs[activeTab].label : label;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeCode]);

  const highlighted = highlightCode(activeCode, activeLang);
  const lines = highlighted.split('\n');

  return (
    <div className="group border border-white/[0.06] bg-white/[0.015] overflow-hidden">
      {/* Header with tabs or label */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center gap-0">
          {tabs ? (
            tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`font-mono text-[10px] tracking-wider px-3 py-1 transition-colors duration-200 border-b ${
                  i === activeTab
                    ? 'text-cobalt border-cobalt'
                    : 'text-muted-foreground/50 border-transparent hover:text-muted-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))
          ) : (
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase">
              {activeLabel || activeLang}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-200 opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto custom-scrollbar">
        <pre className="p-4 text-[13px] leading-relaxed font-mono">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                {showLineNumbers && (
                  <span className="select-none text-muted-foreground/20 w-8 text-right mr-4 shrink-0">
                    {i + 1}
                  </span>
                )}
                <span dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
