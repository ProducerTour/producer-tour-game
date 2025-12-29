// Game Menu Components - Pause menu, settings, etc.
import React, { useState, useCallback } from 'react';

interface MenuButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
}

// Reusable Menu Button
export function MenuButton({
  onClick,
  children,
  variant = 'secondary',
  disabled = false,
  fullWidth = true,
}: MenuButtonProps) {
  const [hovered, setHovered] = useState(false);

  const colors = {
    primary: {
      bg: 'rgba(52, 152, 219, 0.8)',
      hover: 'rgba(52, 152, 219, 1)',
      border: 'rgba(52, 152, 219, 1)',
    },
    secondary: {
      bg: 'rgba(255, 255, 255, 0.1)',
      hover: 'rgba(255, 255, 255, 0.2)',
      border: 'rgba(255, 255, 255, 0.3)',
    },
    danger: {
      bg: 'rgba(231, 76, 60, 0.8)',
      hover: 'rgba(231, 76, 60, 1)',
      border: 'rgba(231, 76, 60, 1)',
    },
  };

  const colorSet = colors[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '14px 24px',
        backgroundColor: hovered ? colorSet.hover : colorSet.bg,
        border: `2px solid ${colorSet.border}`,
        borderRadius: 8,
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease-out',
        transform: hovered && !disabled ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {children}
    </button>
  );
}

// Slider Component
interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: SliderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          color: 'white',
          fontSize: 14,
        }}
      >
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          appearance: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

// Toggle Component
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}
    >
      <span style={{ color: 'white', fontSize: 14 }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 48,
          height: 26,
          borderRadius: 13,
          backgroundColor: checked ? 'rgba(52, 152, 219, 1)' : 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background-color 0.2s',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'white',
            position: 'absolute',
            top: 3,
            left: checked ? 25 : 3,
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  );
}

// Settings Panel
interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  invertY: boolean;
  showFPS: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
}

interface SettingsPanelProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onBack: () => void;
}

export function SettingsPanel({ settings, onSettingsChange, onBack }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'audio' | 'controls' | 'graphics'>('audio');

  const updateSetting = useCallback(
    <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
      onSettingsChange({ ...settings, [key]: value });
    },
    [settings, onSettingsChange]
  );

  return (
    <div
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 12,
        padding: 24,
        width: 400,
        maxHeight: '80vh',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: 20,
            cursor: 'pointer',
            marginRight: 12,
          }}
        >
          ←
        </button>
        <h2 style={{ color: 'white', margin: 0, fontSize: 20 }}>Settings</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['audio', 'controls', 'graphics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor:
                activeTab === tab ? 'rgba(52, 152, 219, 0.8)' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 6,
              color: 'white',
              fontSize: 14,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ minHeight: 200 }}>
        {activeTab === 'audio' && (
          <>
            <Slider
              label="Master Volume"
              value={settings.masterVolume}
              onChange={(v) => updateSetting('masterVolume', v)}
            />
            <Slider
              label="Music Volume"
              value={settings.musicVolume}
              onChange={(v) => updateSetting('musicVolume', v)}
            />
            <Slider
              label="SFX Volume"
              value={settings.sfxVolume}
              onChange={(v) => updateSetting('sfxVolume', v)}
            />
          </>
        )}

        {activeTab === 'controls' && (
          <>
            <Slider
              label="Mouse Sensitivity"
              value={settings.mouseSensitivity}
              min={10}
              max={200}
              onChange={(v) => updateSetting('mouseSensitivity', v)}
            />
            <Toggle
              label="Invert Y Axis"
              checked={settings.invertY}
              onChange={(v) => updateSetting('invertY', v)}
            />
          </>
        )}

        {activeTab === 'graphics' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <span style={{ color: 'white', fontSize: 14, display: 'block', marginBottom: 8 }}>
                Graphics Quality
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['low', 'medium', 'high'] as const).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => updateSetting('graphicsQuality', quality)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor:
                        settings.graphicsQuality === quality
                          ? 'rgba(52, 152, 219, 0.8)'
                          : 'rgba(255, 255, 255, 0.1)',
                      border:
                        settings.graphicsQuality === quality
                          ? '2px solid rgba(52, 152, 219, 1)'
                          : '2px solid transparent',
                      borderRadius: 6,
                      color: 'white',
                      fontSize: 14,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>
            <Toggle
              label="Show FPS Counter"
              checked={settings.showFPS}
              onChange={(v) => updateSetting('showFPS', v)}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Pause Menu
interface PauseMenuProps {
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
  title?: string;
}

export function PauseMenu({
  onResume,
  onSettings,
  onQuit,
  title = 'Paused',
}: PauseMenuProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          borderRadius: 16,
          padding: 32,
          minWidth: 300,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: 'white',
            margin: '0 0 32px 0',
            fontSize: 32,
            fontWeight: 'bold',
          }}
        >
          {title}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <MenuButton onClick={onResume} variant="primary">
            Resume
          </MenuButton>
          <MenuButton onClick={onSettings}>Settings</MenuButton>
          <MenuButton onClick={onQuit} variant="danger">
            Quit Game
          </MenuButton>
        </div>
      </div>
    </div>
  );
}

// Loading Screen
interface LoadingScreenProps {
  progress?: number;
  message?: string;
  tip?: string;
}

export function LoadingScreen({
  progress = 0,
  message = 'Loading...',
  tip,
}: LoadingScreenProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      {/* Logo/Title */}
      <h1
        style={{
          color: 'white',
          fontSize: 48,
          fontWeight: 'bold',
          marginBottom: 40,
          textShadow: '0 0 20px rgba(100, 150, 255, 0.5)',
        }}
      >
        PRODUCER TOUR
      </h1>

      {/* Loading message */}
      <p
        style={{
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 16,
          marginBottom: 20,
        }}
      >
        {message}
      </p>

      {/* Progress bar */}
      <div
        style={{
          width: 300,
          height: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'rgba(100, 150, 255, 1)',
            borderRadius: 4,
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>

      {/* Tip */}
      {tip && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            maxWidth: 500,
          }}
        >
          <p
            style={{
              color: 'rgba(255, 200, 100, 0.9)',
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            TIP
          </p>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 14,
            }}
          >
            {tip}
          </p>
        </div>
      )}
    </div>
  );
}

// Confirmation Dialog
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'primary' | 'danger';
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
}: ConfirmDialogProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: 'white', margin: '0 0 12px 0', fontSize: 20 }}>{title}</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 24px 0', fontSize: 14 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <MenuButton onClick={onCancel} fullWidth={false}>
            {cancelText}
          </MenuButton>
          <MenuButton onClick={onConfirm} variant={variant === 'danger' ? 'danger' : 'primary'} fullWidth={false}>
            {confirmText}
          </MenuButton>
        </div>
      </div>
    </div>
  );
}
