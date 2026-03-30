import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Menu, X, Search } from 'lucide-react';

export interface SidebarSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface DocLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  sections: SidebarSection[];
  onSearch?: (query: string) => void;
}

export function DocLayout({ children, title, subtitle, sections, onSearch }: DocLayoutProps) {
  const [activeSection, setActiveSection] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scrollspy via Intersection Observer
  useEffect(() => {
    const allIds = sections.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, location.pathname]);

  // Cmd+K search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileOpen(false);
    }
  }, []);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    onSearch?.(q);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px]">
        <motion.div
          className="h-full bg-cobalt"
          style={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl mx-4 bg-surface border border-white/[0.08] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search documentation..."
                  className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
                  autoFocus
                />
                <kbd className="font-mono text-[10px] text-muted-foreground/50 px-1.5 py-0.5 border border-white/[0.08] hidden sm:inline">
                  ESC
                </kbd>
              </div>
              {searchQuery && (
                <div className="max-h-64 overflow-y-auto p-2">
                  {sections
                    .flatMap((s) => [
                      { ...s, parent: null as string | null },
                      ...(s.children?.map((c) => ({ ...c, parent: s.label })) ?? []),
                    ])
                    .filter(
                      (item) =>
                        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.id.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          scrollToSection(item.id);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors flex items-center gap-2"
                      >
                        <span className="font-mono text-xs text-cobalt">#</span>
                        <span className="text-sm text-foreground/80">{item.label}</span>
                        {'parent' in item && item.parent && (
                          <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto">
                            {item.parent}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              )}
              {!searchQuery && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground/50 font-mono">
                    Type to search across all documentation sections
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="fixed top-[2px] left-0 right-0 z-50 bg-obsidian/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              <ArrowLeft size={14} />
              <span className="font-mono text-xs tracking-wider">Home</span>
            </Link>
            <span className="text-white/[0.15] hidden sm:inline">·</span>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cobalt" />
              <span className="font-mono text-xs tracking-wider text-foreground/90">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
            >
              <Search size={13} className="text-muted-foreground" />
              <span className="font-mono text-[10px] text-muted-foreground/60 hidden sm:inline">
                Search
              </span>
              <kbd className="font-mono text-[9px] text-muted-foreground/40 px-1 py-0.5 border border-white/[0.06] hidden sm:inline">
                ⌘K
              </kbd>
            </button>
            <Link
              to="/architecture"
              className={`font-mono text-[10px] tracking-widest uppercase transition-colors duration-300 hidden md:inline ${
                location.pathname === '/architecture'
                  ? 'text-cobalt'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Docs
            </Link>
            <Link
              to="/api-reference"
              className={`font-mono text-[10px] tracking-widest uppercase transition-colors duration-300 hidden md:inline ${
                location.pathname === '/api-reference'
                  ? 'text-cobalt'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              API
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex pt-[calc(2px+3.5rem)]">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="fixed w-64 top-[calc(2px+3.5rem)] bottom-0 overflow-y-auto py-6 px-4 border-r border-white/[0.04] custom-scrollbar">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground/50 mb-4 px-2">
              {subtitle}
            </p>
            {sections.map((section) => (
              <div key={section.id} className="mb-1">
                <button
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-2 py-1.5 text-sm transition-all duration-200 ${
                    activeSection === section.id
                      ? 'text-cobalt font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="font-sans text-[13px]">{section.label}</span>
                </button>
                {section.children && (
                  <div className="ml-3 border-l border-white/[0.04]">
                    {section.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => scrollToSection(child.id)}
                        className={`w-full text-left pl-3 py-1 text-[12px] transition-all duration-200 ${
                          activeSection === child.id
                            ? 'text-cobalt border-l border-cobalt -ml-px'
                            : 'text-muted-foreground/60 hover:text-muted-foreground'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Sidebar - Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-[calc(2px+3.5rem)] bottom-0 w-[280px] z-50 bg-obsidian border-r border-white/[0.06] overflow-y-auto py-6 px-4 lg:hidden"
              >
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground/50 mb-4 px-2">
                  {subtitle}
                </p>
                {sections.map((section) => (
                  <div key={section.id} className="mb-1">
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-2 py-1.5 text-sm transition-all duration-200 ${
                        activeSection === section.id
                          ? 'text-cobalt font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="font-sans text-[13px]">{section.label}</span>
                    </button>
                    {section.children && (
                      <div className="ml-3 border-l border-white/[0.04]">
                        {section.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => scrollToSection(child.id)}
                            className={`w-full text-left pl-3 py-1 text-[12px] transition-all duration-200 ${
                              activeSection === child.id
                                ? 'text-cobalt border-l border-cobalt -ml-px'
                                : 'text-muted-foreground/60 hover:text-muted-foreground'
                            }`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-8 pb-24">{children}</main>
      </div>
    </div>
  );
}
