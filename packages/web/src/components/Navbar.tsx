import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Github, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MagneticButton } from './special/MagneticButton';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const landingLinks = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Features', href: '#features' },
    { label: 'Quick Start', href: '#quickstart' },
  ];

  const docLinks = [
    { label: 'Docs', to: '/architecture' },
    { label: 'API Reference', to: '/api-reference' },
  ];

  return (
    <motion.nav
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-obsidian/80 backdrop-blur-xl micro-border-b' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-2 h-2 bg-cobalt group-hover:scale-125 transition-transform duration-300" />
            <span className="font-mono text-sm tracking-wider text-foreground/90">
              notion-image-cdn
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {isLanding &&
              landingLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  {link.label}
                </a>
              ))}
            {docLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-mono text-xs tracking-widest uppercase transition-colors duration-300 ${
                  location.pathname === link.to
                    ? 'text-cobalt'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://github.com/dcs-soni/notion-image-cdn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              <Github size={18} />
            </a>
            <MagneticButton strength={0.3} radius={100}>
              <Link
                to={isLanding ? '#quickstart' : '/architecture'}
                className="font-mono text-xs tracking-wider px-4 py-2 bg-cobalt text-white hover:bg-cobalt-muted transition-colors duration-300 inline-block"
              >
                {isLanding ? 'Get Started' : 'Read Docs'}
              </Link>
            </MagneticButton>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-foreground">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-obsidian/95 backdrop-blur-xl micro-border-b"
        >
          <div className="px-6 py-6 space-y-4">
            {isLanding &&
              landingLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            {docLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block font-mono text-xs tracking-widest uppercase transition-colors ${
                  location.pathname === link.to
                    ? 'text-cobalt'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 micro-border-t flex items-center gap-4">
              <a
                href="https://github.com/dcs-soni/notion-image-cdn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github size={18} />
              </a>
              <Link
                to="/architecture"
                onClick={() => setMobileOpen(false)}
                className="font-mono text-xs tracking-wider px-4 py-2 bg-cobalt text-white"
              >
                Read Docs
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
