// Mobile Touch Controls - virtual joystick and action buttons
import React, { useRef, useCallback, useEffect, useState } from 'react';

export interface TouchState {
  // Movement joystick
  movement: { x: number; y: number };
  // Camera joystick
  camera: { x: number; y: number };
  // Action buttons
  jump: boolean;
  action: boolean;
  sprint: boolean;
}

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
  size?: number;
  position: 'left' | 'right';
  className?: string;
}

// Virtual Joystick Component
export function VirtualJoystick({
  onMove,
  onEnd,
  size = 120,
  position,
  className = '',
}: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const maxDistance = size / 2 - 20;

  const handleStart = useCallback(
    (clientX: number, clientY: number, touchId: number) => {
      if (touchIdRef.current !== null) return;

      touchIdRef.current = touchId;
      setActive(true);
      handleMove(clientX, clientY);
    },
    []
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !knobRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let deltaX = clientX - centerX;
      let deltaY = clientY - centerY;

      // Clamp to max distance
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
      }

      // Update knob position
      knobRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      // Normalize to -1 to 1
      onMove(deltaX / maxDistance, deltaY / maxDistance);
    },
    [maxDistance, onMove]
  );

  const handleEnd = useCallback(() => {
    touchIdRef.current = null;
    setActive(false);

    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }

    onEnd();
  }, [onEnd]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchIdRef.current) {
          handleMove(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchIdRef.current) {
          handleEnd();
          break;
        }
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  const positionStyle = position === 'left' ? { left: 20 } : { right: 20 };

  return (
    <div
      ref={containerRef}
      className={`touch-joystick ${className}`}
      style={{
        position: 'absolute',
        bottom: 20,
        ...positionStyle,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: active ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
        border: '2px solid rgba(255, 255, 255, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        transition: 'background-color 0.1s',
      }}
    >
      <div
        ref={knobRef}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: active ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
          transition: active ? 'none' : 'transform 0.1s ease-out',
        }}
      />
    </div>
  );
}

// Action Button Component
interface ActionButtonProps {
  onPress: () => void;
  onRelease: () => void;
  label: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function ActionButton({
  onPress,
  onRelease,
  label,
  size = 60,
  style = {},
  className = '',
}: ActionButtonProps) {
  const [pressed, setPressed] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (touchIdRef.current !== null) return;

      touchIdRef.current = e.changedTouches[0].identifier;
      setPressed(true);
      onPress();
    },
    [onPress]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null;
          setPressed(false);
          onRelease();
          break;
        }
      }
    },
    [onRelease]
  );

  return (
    <div
      className={`touch-button ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: pressed ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)',
        border: '2px solid rgba(255, 255, 255, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
        userSelect: 'none',
        touchAction: 'none',
        transition: 'background-color 0.1s, transform 0.1s',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        ...style,
      }}
    >
      {label}
    </div>
  );
}

// Main Touch Controls Overlay
interface TouchControlsProps {
  onStateChange: (state: TouchState) => void;
  showCameraJoystick?: boolean;
  className?: string;
}

export function TouchControls({
  onStateChange,
  showCameraJoystick = true,
  className = '',
}: TouchControlsProps) {
  const stateRef = useRef<TouchState>({
    movement: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    jump: false,
    action: false,
    sprint: false,
  });

  const updateState = useCallback(
    (partial: Partial<TouchState>) => {
      stateRef.current = { ...stateRef.current, ...partial };
      onStateChange(stateRef.current);
    },
    [onStateChange]
  );

  return (
    <div
      className={`touch-controls ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* Movement Joystick */}
      <div style={{ pointerEvents: 'auto' }}>
        <VirtualJoystick
          position="left"
          onMove={(x, y) => updateState({ movement: { x, y } })}
          onEnd={() => updateState({ movement: { x: 0, y: 0 } })}
        />
      </div>

      {/* Camera Joystick */}
      {showCameraJoystick && (
        <div style={{ pointerEvents: 'auto' }}>
          <VirtualJoystick
            position="right"
            size={100}
            onMove={(x, y) => updateState({ camera: { x, y } })}
            onEnd={() => updateState({ camera: { x: 0, y: 0 } })}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 150,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <ActionButton
          label="Jump"
          onPress={() => updateState({ jump: true })}
          onRelease={() => updateState({ jump: false })}
        />
        <ActionButton
          label="Act"
          onPress={() => updateState({ action: true })}
          onRelease={() => updateState({ action: false })}
        />
      </div>

      {/* Sprint Button */}
      <div
        style={{
          position: 'absolute',
          left: 150,
          bottom: 30,
          pointerEvents: 'auto',
        }}
      >
        <ActionButton
          label="Run"
          size={50}
          onPress={() => updateState({ sprint: true })}
          onRelease={() => updateState({ sprint: false })}
        />
      </div>
    </div>
  );
}

// Hook to check if device is touch-enabled
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsTouch(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-ignore
          navigator.msMaxTouchPoints > 0
      );
    };

    check();

    // Also check on orientation change (common on mobile)
    window.addEventListener('orientationchange', check);
    return () => window.removeEventListener('orientationchange', check);
  }, []);

  return isTouch;
}

// Hook to use touch controls state
export function useTouchControls() {
  const [state, setState] = useState<TouchState>({
    movement: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    jump: false,
    action: false,
    sprint: false,
  });

  const isTouch = useIsTouchDevice();

  const handleStateChange = useCallback((newState: TouchState) => {
    setState(newState);
  }, []);

  return {
    state,
    isTouch,
    handleStateChange,
  };
}
