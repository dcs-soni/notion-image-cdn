import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProblemSection } from './components/ProblemSection';
import { HowItWorks } from './components/HowItWorks';
import { Architecture } from './components/Architecture';
import { Features } from './components/Features';
import { CodeShowcase } from './components/CodeShowcase';
import { QuickStart } from './components/QuickStart';
import { Footer } from './components/Footer';
import { CustomCursor } from './components/special/CustomCursor';

function App() {
  return (
    <div className="relative isolate min-h-screen bg-background text-foreground custom-cursor-active">
      <CustomCursor />
      <Navbar />
      <main className="relative z-(--z-base)">
        <div className="max-w-[1440px] mx-auto">
          <Hero />
          <div className="micro-border-b" />
          <ProblemSection />
          <div className="micro-border-b" />
          <HowItWorks />
          <div className="micro-border-b" />
          <Architecture />
          <div className="micro-border-b" />
          <Features />
          <div className="micro-border-b" />
          <CodeShowcase />
          <div className="micro-border-b" />
          <QuickStart />
          <Footer />
        </div>
      </main>
    </div>
  );
}

export default App;
