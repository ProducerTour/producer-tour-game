import { useState, useCallback, useEffect } from 'react';

interface UseGuidedTourOptions {
  tourId: string;
  totalSteps: number;
  onComplete?: () => void;
  onSkip?: () => void;
}

interface UseGuidedTourReturn {
  isActive: boolean;
  currentStep: number;
  isCompleted: boolean;
  isNeverShow: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  setNeverShow: (value: boolean) => void;
  resetTour: () => void;
}

/**
 * Hook to manage guided tour state with localStorage persistence
 */
export function useGuidedTour({
  tourId,
  totalSteps,
  onComplete,
  onSkip,
}: UseGuidedTourOptions): UseGuidedTourReturn {
  const completedKey = `tour-completed-${tourId}`;
  const neverShowKey = `tour-never-show-${tourId}`;

  // Initialize state from localStorage
  const [isCompleted, setIsCompleted] = useState(() => {
    try {
      return localStorage.getItem(completedKey) === 'true';
    } catch {
      return false;
    }
  });

  const [isNeverShow, setIsNeverShowState] = useState(() => {
    try {
      return localStorage.getItem(neverShowKey) === 'true';
    } catch {
      return false;
    }
  });

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-start tour for new users (not completed and not "never show")
  useEffect(() => {
    if (!isCompleted && !isNeverShow) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, isNeverShow]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    try {
      localStorage.setItem(completedKey, 'true');
    } catch (e) {
      console.warn('Failed to save tour completion status:', e);
    }
    onComplete?.();
  }, [completedKey, onComplete]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    try {
      localStorage.setItem(completedKey, 'true');
    } catch (e) {
      console.warn('Failed to save tour completion status:', e);
    }
    onSkip?.();
  }, [completedKey, onSkip]);

  const setNeverShow = useCallback((value: boolean) => {
    setIsNeverShowState(value);
    try {
      if (value) {
        localStorage.setItem(neverShowKey, 'true');
        // Also mark as completed when "never show" is checked
        localStorage.setItem(completedKey, 'true');
        setIsCompleted(true);
        setIsActive(false);
      } else {
        localStorage.removeItem(neverShowKey);
      }
    } catch (e) {
      console.warn('Failed to save never show preference:', e);
    }
  }, [neverShowKey, completedKey]);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(completedKey);
      localStorage.removeItem(neverShowKey);
    } catch (e) {
      console.warn('Failed to reset tour:', e);
    }
    setIsCompleted(false);
    setIsNeverShowState(false);
    setCurrentStep(0);
    setIsActive(true);
  }, [completedKey, neverShowKey]);

  return {
    isActive,
    currentStep,
    isCompleted,
    isNeverShow,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    setNeverShow,
    resetTour,
  };
}
