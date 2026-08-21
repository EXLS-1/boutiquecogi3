// components/atoms/SectionTitle.tsx
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

/** 
 * Composant atomique pour les titres de section.
 * Utilise tracking-wider pour une meilleure lisibilité des majuscules.
 */
export const SectionTitle = ({ children, className }: SectionTitleProps) => (
  <h2 
    className={cn(
      "text-xl font-semibold tracking-wider uppercase text-foreground", 
      className
    )}
  >
    {children}
  </h2>
);
