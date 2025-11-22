/**
 * Balancer Component
 * Wraps react-wrap-balancer for better headline text distribution
 */

import BalancerPrimitive from 'react-wrap-balancer';
import { cn } from '../../lib/utils';

interface BalancerProps {
  children: React.ReactNode;
  className?: string;
  ratio?: number;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export function Balancer({ children, className, ratio = 0.65, as = 'span' }: BalancerProps) {
  const Component = as;

  return (
    <Component className={cn(className)}>
      <BalancerPrimitive ratio={ratio}>
        {children}
      </BalancerPrimitive>
    </Component>
  );
}

export default Balancer;
