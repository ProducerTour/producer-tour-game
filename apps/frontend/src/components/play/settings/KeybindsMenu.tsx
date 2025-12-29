/**
 * Keybinds Menu Component
 * Allows users to view and customize their key bindings
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useKeybindsStore,
  ACTION_LABELS,
  ACTION_CATEGORIES,
  eventToKeyBinding,
  mouseToKeyBinding,
  type GameAction,
} from './useKeybindsStore';

interface KeybindsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeybindsMenu({ isOpen, onClose }: KeybindsMenuProps) {
  const { keybinds, setKeybind, removeKeybind, resetToDefaults, resetAction } = useKeybindsStore();

  // Which action/index is currently being rebound
  const [rebinding, setRebinding] = useState<{ action: GameAction; index: number } | null>(null);

  // Handle key press during rebinding
  const handleRebindKey = useCallback(
    (e: KeyboardEvent) => {
      if (!rebinding) return;

      e.preventDefault();
      e.stopPropagation();

      // Escape cancels rebinding
      if (e.code === 'Escape') {
        setRebinding(null);
        return;
      }

      // Don't allow binding these keys
      const forbidden = ['Escape', 'F12', 'F11'];
      if (forbidden.includes(e.code)) {
        return;
      }

      const binding = eventToKeyBinding(e);
      setKeybind(rebinding.action, binding, rebinding.index);
      setRebinding(null);
    },
    [rebinding, setKeybind]
  );

  // Handle mouse click during rebinding
  const handleRebindMouse = useCallback(
    (e: MouseEvent) => {
      if (!rebinding) return;

      // Only allow middle mouse and side buttons for rebinding
      // Left and right click are reserved for aim/fire
      if (e.button === 0 || e.button === 2) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const binding = mouseToKeyBinding(e.button);
      setKeybind(rebinding.action, binding, rebinding.index);
      setRebinding(null);
    },
    [rebinding, setKeybind]
  );

  // Set up event listeners for rebinding
  useEffect(() => {
    if (!rebinding) return;

    window.addEventListener('keydown', handleRebindKey, true);
    window.addEventListener('mousedown', handleRebindMouse, true);

    return () => {
      window.removeEventListener('keydown', handleRebindKey, true);
      window.removeEventListener('mousedown', handleRebindMouse, true);
    };
  }, [rebinding, handleRebindKey, handleRebindMouse]);

  // Close on Escape when not rebinding
  useEffect(() => {
    if (!isOpen || rebinding) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, rebinding, onClose]);

  if (!isOpen) return null;

  const startRebinding = (action: GameAction, index: number) => {
    setRebinding({ action, index });
  };

  const handleRemoveBinding = (action: GameAction, index: number) => {
    const bindings = keybinds[action];
    if (bindings && bindings.length > 1) {
      removeKeybind(action, index);
    }
  };

  const handleAddBinding = (action: GameAction) => {
    const bindings = keybinds[action];
    if (!bindings || bindings.length < 2) {
      setRebinding({ action, index: bindings?.length ?? 0 });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !rebinding) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h2 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>
            Keybinds
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={resetToDefaults}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8b5cf6',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Done
            </button>
          </div>
        </div>

        {/* Rebinding overlay */}
        {rebinding && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
          >
            <div
              style={{
                backgroundColor: '#8b5cf6',
                padding: '40px 60px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, color: '#fff', fontSize: '20px', marginBottom: '8px' }}>
                Press a key for
              </p>
              <p style={{ margin: 0, color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
                {ACTION_LABELS[rebinding.action]}
              </p>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '16px' }}>
                Press Escape to cancel
              </p>
            </div>
          </div>
        )}

        {/* Categories */}
        {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => (
          <div key={category} style={{ marginBottom: '24px' }}>
            <h3
              style={{
                color: '#8b5cf6',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px',
              }}
            >
              {category}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {actions.map((action) => {
                const bindings = keybinds[action] || [];

                return (
                  <div
                    key={action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: '15px' }}>
                      {ACTION_LABELS[action]}
                    </span>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Existing bindings */}
                      {bindings.map((binding, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <button
                            onClick={() => startRebinding(action, idx)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: rebinding?.action === action && rebinding?.index === idx
                                ? '#8b5cf6'
                                : 'rgba(139, 92, 246, 0.2)',
                              border: '1px solid rgba(139, 92, 246, 0.4)',
                              borderRadius: '4px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                              minWidth: '60px',
                            }}
                          >
                            {binding.display}
                          </button>
                          {bindings.length > 1 && (
                            <button
                              onClick={() => handleRemoveBinding(action, idx)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: '16px',
                              }}
                              title="Remove binding"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add binding button */}
                      {bindings.length < 2 && (
                        <button
                          onClick={() => handleAddBinding(action)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            border: '1px dashed rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: '#666',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                          title="Add alternative binding"
                        >
                          +
                        </button>
                      )}

                      {/* Reset single action */}
                      <button
                        onClick={() => resetAction(action)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#555',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer info */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#666',
            fontSize: '13px',
          }}
        >
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Tip:</strong> Click a key to rebind it. Each action can have up to 2 bindings.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Mouse:</strong> Left Click = Fire, Right Click = Aim (not rebindable)
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeybindsMenu;
