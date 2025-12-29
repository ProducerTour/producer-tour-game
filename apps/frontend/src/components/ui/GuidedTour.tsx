/**
 * GuidedTour Component
 * A tooltip-based walkthrough for onboarding new users
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGuidedTour } from '../../hooks/useGuidedTour';

export interface TourStep {
  /** CSS selector or data-tour attribute value */
  target: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Preferred tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GuidedTourProps {
  /** Unique ID for localStorage tracking */
  tourId: string;
  /** Array of tour steps */
  steps: TourStep[];
  /** Callback when tour is completed */
  onComplete?: () => void;
  /** Callback when tour is skipped */
  onSkip?: () => void;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

/**
 * GuidedTour - Onboarding walkthrough component
 */
export function GuidedTour({
  tourId,
  steps,
  onComplete,
  onSkip,
}: GuidedTourProps) {
  const {
    isActive,
    currentStep,
    isNeverShow,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    setNeverShow,
  } = useGuidedTour({
    tourId,
    totalSteps: steps.length,
    onComplete,
    onSkip,
  });

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [neverShowChecked, setNeverShowChecked] = useState(isNeverShow);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Find and highlight the target element
  const updateTargetPosition = useCallback(() => {
    if (!currentStepData) return;

    // Try data-tour-id first, then CSS selector
    let element = document.querySelector(`[data-tour-id="${currentStepData.target}"]`);
    if (!element) {
      element = document.querySelector(currentStepData.target);
    }

    if (element) {
      const rect = element.getBoundingClientRect();
      const padding = 8; // Padding around the highlighted element

      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        bottom: rect.bottom + padding,
        right: rect.right + padding,
      });

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // If element not found, center the tooltip
      setTargetRect(null);
    }
  }, [currentStepData]);

  // Calculate tooltip position
  const calculateTooltipPosition = useCallback(() => {
    if (!targetRect || !tooltipRef.current) {
      // Center tooltip if no target
      setTooltipPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 160,
        arrowPosition: 'top',
      });
      return;
    }

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const preferredPosition = currentStepData?.position || 'bottom';
    const margin = 16;
    const arrowOffset = 12;

    let top: number;
    let left: number;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = preferredPosition;

    // Calculate center positions
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Try preferred position first, then fallback
    const positions = [preferredPosition, 'bottom', 'top', 'right', 'left'];

    for (const pos of positions) {
      let fits = false;

      switch (pos) {
        case 'bottom':
          top = targetRect.bottom + arrowOffset;
          left = targetCenterX - tooltipRect.width / 2;
          fits = top + tooltipRect.height < window.innerHeight - margin;
          arrowPosition = 'top';
          break;
        case 'top':
          top = targetRect.top - tooltipRect.height - arrowOffset;
          left = targetCenterX - tooltipRect.width / 2;
          fits = top > margin;
          arrowPosition = 'bottom';
          break;
        case 'right':
          top = targetCenterY - tooltipRect.height / 2;
          left = targetRect.right + arrowOffset;
          fits = left + tooltipRect.width < window.innerWidth - margin;
          arrowPosition = 'left';
          break;
        case 'left':
          top = targetCenterY - tooltipRect.height / 2;
          left = targetRect.left - tooltipRect.width - arrowOffset;
          fits = left > margin;
          arrowPosition = 'right';
          break;
      }

      if (fits) break;
    }

    // Clamp to viewport
    left = Math.max(margin, Math.min(left!, window.innerWidth - tooltipRect.width - margin));
    top = Math.max(margin, Math.min(top!, window.innerHeight - tooltipRect.height - margin));

    setTooltipPosition({ top, left, arrowPosition });
  }, [targetRect, currentStepData]);

  // Update positions on step change and resize
  useEffect(() => {
    if (!isActive) return;

    updateTargetPosition();

    const handleResize = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isActive, currentStep, updateTargetPosition]);

  // Calculate tooltip position after target is found
  useEffect(() => {
    if (isActive) {
      // Small delay to allow tooltip to render
      const timer = setTimeout(calculateTooltipPosition, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, targetRect, calculateTooltipPosition]);

  // Handle "never show again" checkbox
  const handleNeverShowChange = (checked: boolean) => {
    setNeverShowChecked(checked);
    if (checked) {
      setNeverShow(true);
    }
  };

  // Handle done button
  const handleDone = () => {
    if (neverShowChecked) {
      setNeverShow(true);
    }
    completeTour();
  };

  // Handle skip button
  const handleSkip = () => {
    if (neverShowChecked) {
      setNeverShow(true);
    }
    skipTour();
  };

  if (!isActive || !currentStepData) return null;

  const arrowStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-white/20',
    bottom: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-white/20',
    left: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-white/20',
    right: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-white/20',
  };

  return createPortal(
    <div className="guided-tour" role="dialog" aria-modal="true" aria-label="Guided Tour">
      {/* Overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[9998]">
        {/* Dark overlay using CSS mask for cutout effect */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id={`tour-mask-${tourId}`}>
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask={`url(#tour-mask-${tourId})`}
          />
        </svg>

        {/* Highlight ring around target */}
        {targetRect && (
          <div
            className="absolute rounded-xl ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300 ease-out"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-[9999] w-80 sm:w-96 max-w-[calc(100vw-2rem)]',
          'bg-white rounded-2xl shadow-2xl',
          'border border-gray-200',
          'transition-all duration-300 ease-out',
          'animate-in fade-in-0 zoom-in-95'
        )}
        style={{
          top: tooltipPosition?.top ?? '50%',
          left: tooltipPosition?.left ?? '50%',
        }}
      >
        {/* Arrow */}
        {tooltipPosition && targetRect && (
          <div
            className={cn(
              'absolute w-0 h-0 border-8',
              arrowStyles[tooltipPosition.arrowPosition]
            )}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">{currentStep + 1}</span>
            </div>
            <span className="text-xs text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {currentStepData.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Never show again checkbox */}
        <div className="px-4 pb-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={neverShowChecked}
              onChange={(e) => handleNeverShowChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
              Never show this again
            </span>
          </label>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                index === currentStep
                  ? 'bg-blue-600 w-4'
                  : index < currentStep
                  ? 'bg-blue-300'
                  : 'bg-gray-200'
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 pb-4 gap-3">
          <button
            onClick={handleSkip}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={handleDone}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default GuidedTour;
