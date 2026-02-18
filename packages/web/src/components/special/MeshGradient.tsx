import { motion } from 'framer-motion';

/**
 * Animated CSS mesh gradient background.
 * Three radial-gradient blobs drift organically behind content.
 * Renders as a fixed-position layer with pointer-events: none.
 */
export function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Blob 1 — cobalt */}
      <motion.div
        className="absolute w-[800px] h-[800px] opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)',
          top: '-20%',
          left: '-10%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -40, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Blob 2 — violet */}
      <motion.div
        className="absolute w-[600px] h-[600px] opacity-[0.05]"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          top: '20%',
          right: '-5%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 60, -40, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Blob 3 — emerald */}
      <motion.div
        className="absolute w-[500px] h-[500px] opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
          bottom: '-10%',
          left: '30%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 40, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
