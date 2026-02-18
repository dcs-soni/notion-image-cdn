import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

const commands = [
  { label: 'Clone', cmd: 'git clone https://github.com/dcs-soni/notion-image-cdn.git' },
  { label: 'Install', cmd: 'cd notion-image-cdn && bun install' },
  { label: 'Configure', cmd: 'cp .env.example .env' },
  { label: 'Run', cmd: 'bun run dev' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-muted-foreground hover:text-foreground transition-colors duration-200 shrink-0"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export function QuickStart() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="quickstart" ref={ref} className="w-full py-24 lg:py-32">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left — heading */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-cobalt mb-5 block">
                Quick Start
              </span>
              <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tighter text-foreground mb-4">
                Up and running in four commands.
              </h2>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Clone, install, configure, and run. The service starts with Redis and filesystem
                storage by default — no cloud accounts required.
              </p>
            </motion.div>
          </div>

          {/* Right — terminal + SDK install */}
          <div className="lg:col-span-8 space-y-4">
            {/* Terminal window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
              className="border border-white/[0.06] bg-white/[0.02]"
            >
              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/60" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                  terminal
                </span>
                <div className="w-12" />
              </div>

              {/* Commands */}
              <div className="p-5 space-y-4">
                {commands.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.12 }}
                    className="flex items-start gap-3 group"
                  >
                    <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5">
                      $
                    </span>
                    <code className="font-mono text-sm text-foreground/80 flex-1 break-all">
                      {step.cmd}
                    </code>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5">
                      <CopyButton text={step.cmd} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Output */}
              <div className="px-5 pb-5">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: 1.1 }}
                  className="border-t border-white/[0.06] pt-4"
                >
                  <span className="font-mono text-xs text-emerald-500/80">
                    ✓ Service running at http://localhost:3002
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* SDK install */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 1.3 }}
              className="border border-white/[0.06] bg-white/[0.02] p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-muted-foreground">SDK:</span>
                <code className="font-mono text-sm text-foreground/80">
                  npm install notion-image-cdn
                </code>
              </div>
              <CopyButton text="npm install notion-image-cdn" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
