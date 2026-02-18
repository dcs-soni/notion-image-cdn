import { AnimatedSection } from './AnimatedSection';
import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative section-padding micro-border-t">
      <div className="section-container">
        <AnimatedSection>
          <div className="grid md:grid-cols-12 gap-12">
            {/* Left — Brand */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-cobalt" />
                <span className="font-mono text-sm tracking-wider text-foreground/90">
                  notion-image-cdn
                </span>
              </div>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed max-w-sm">
                A standalone microservice + NPM SDK that solves Notion's expiring image URL problem.
                Open source, MIT licensed.
              </p>
            </div>

            {/* Middle — Links */}
            <div className="md:col-span-3">
              <h4 className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">
                Navigation
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'Architecture', href: '#architecture' },
                  { label: 'Features', href: '#features' },
                  { label: 'Quick Start', href: '#quickstart' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block font-sans text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Right — Tech */}
            <div className="md:col-span-4">
              <h4 className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">
                Built With
              </h4>
              <div className="flex flex-wrap gap-2">
                {['Bun', 'Fastify', 'Sharp', 'Redis', 'Zod', 'Turborepo'].map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-[11px] text-muted-foreground px-2.5 py-1 micro-border"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Bottom bar */}
        <AnimatedSection delay={0.2}>
          <div className="mt-16 pt-6 micro-border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-mono text-[11px] text-muted-foreground/60 tracking-wider">
              © {new Date().getFullYear()} Divyanshu Soni · MIT License
            </span>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/dcs-soni/notion-image-cdn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 flex items-center gap-2"
              >
                <Github size={16} />
                <span className="font-mono text-[11px] tracking-wider">GitHub</span>
              </a>
              <a
                href="https://www.npmjs.com/package/notion-image-cdn"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                npm
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
