// components/atoms/ClickableText.tsx
import { cn } from '@/lib/utils/cn';

interface ClickableTextProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** 
 * Composant atomique pour les éléments textuels cliquables (ex: fil d'ariane, filtres).
 * Garantit le curseur 'pointer' et l'accessibilité clavier.
 */
export const ClickableText = ({ children, onClick, className }: ClickableTextProps) => (
  <span
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    className={cn(
      "cursor-pointer select-none transition-colors hover:text-primary",
      className
    )}
  >
    {children}
  </span>
);