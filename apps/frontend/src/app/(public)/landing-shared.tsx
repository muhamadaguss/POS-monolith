// ─────────────────────────────────────────────────────────────
// Shared types, constants, hooks & components for landing page
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

// ── Color Palette ──
export const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryAccent: '#065F46',
  lightBg: '#ECFDF5',
  warmBg: '#FFFBF5',
  text: '#1F2937',
  textSecondary: '#4B5563',
};

// ── Custom Hook: useScrollReveal ──
export function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// ── Custom Hook: useCountUp ──
export function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime: number;
    let animationId: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        animationId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [target, duration, start]);

  return count;
}

// ── Animated Counter ──
export function AnimatedCounter({ value, suffix = '', prefix = '', isDecimal = false }: { value: number; suffix?: string; prefix?: string; isDecimal?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const intTarget = isDecimal ? value * 10 : value;
  const count = useCountUp(intTarget, 2200, isVisible);
  const displayValue = isDecimal ? (count / 10).toFixed(1) : count.toLocaleString('id-ID');

  return (
    <div ref={containerRef} className="inline-block">
      {prefix}{displayValue}{suffix}
    </div>
  );
}

// ── Scroll Reveal Wrapper ──
export function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Section Badge ──
export function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: COLORS.lightBg, color: COLORS.primary }}>
      {children}
    </span>
  );
}

// ── Section Title ──
export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2 className="text-3xl md:text-4xl font-bold" style={{ color: COLORS.text }}>{title}</h2>
      {subtitle && <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: COLORS.textSecondary }}>{subtitle}</p>}
    </>
  );
}
