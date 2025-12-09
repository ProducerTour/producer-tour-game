import { useState, useMemo } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, Plus,
  Video, MapPin
} from 'lucide-react';
import type { WidgetProps } from '../../../types/productivity.types';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  type: 'meeting' | 'deadline' | 'reminder' | 'event';
  color: string;
}

/**
 * CalendarAgendaWidget - Today's schedule at a glance
 *
 * Features:
 * - Today's events and upcoming meetings
 * - Date navigation
 * - Event type indicators
 * - Add event button (placeholder for integration)
 *
 * Note: This widget shows demo data. For full functionality,
 * integrate with Google Calendar or Outlook via OAuth.
 */
export default function CalendarAgendaWidget({ config: _config, isEditing }: WidgetProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Demo events (replace with real API integration)
  const demoEvents: CalendarEvent[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [
      {
        id: '1',
        title: 'Team Standup',
        startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endTime: new Date(today.getTime() + 9.5 * 60 * 60 * 1000), // 9:30 AM
        isAllDay: false,
        type: 'meeting',
        color: 'bg-blue-500',
      },
      {
        id: '2',
        title: 'Review Placements',
        startTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11 AM
        endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12 PM
        isAllDay: false,
        type: 'deadline',
        color: 'bg-orange-500',
      },
      {
        id: '3',
        title: 'Client Call',
        startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM
        endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3 PM
        isAllDay: false,
        location: 'Zoom',
        type: 'meeting',
        color: 'bg-purple-500',
      },
      {
        id: '4',
        title: 'Statement Processing',
        startTime: new Date(today.getTime() + 16 * 60 * 60 * 1000), // 4 PM
        endTime: new Date(today.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        isAllDay: false,
        type: 'event',
        color: 'bg-green-500',
      },
    ];
  }, []);

  // Filter events for selected date
  const events = demoEvents.filter(event => {
    const eventDate = new Date(event.startTime);
    eventDate.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return eventDate.getTime() === selected.getTime();
  });

  // Navigate dates
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return today.getTime() === selected.getTime();
  };

  // Format date header
  const formatDateHeader = () => {
    if (isToday()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    if (yesterday.getTime() === selected.getTime()) return 'Yesterday';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (tomorrow.getTime() === selected.getTime()) return 'Tomorrow';

    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get type icon
  const getTypeIcon = (_type: string, location?: string) => {
    if (location?.toLowerCase().includes('zoom') || location?.toLowerCase().includes('meet')) {
      return <Video className="w-3 h-3" />;
    }
    if (location) {
      return <MapPin className="w-3 h-3" />;
    }
    return <Clock className="w-3 h-3" />;
  };

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-theme-primary" />
          <span className="text-sm font-medium text-theme-foreground">
            {formatDateHeader()}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousDay}
            disabled={isEditing}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-theme-foreground-muted" />
          </button>

          {!isToday() && (
            <button
              onClick={goToToday}
              disabled={isEditing}
              className="px-2 py-0.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              Today
            </button>
          )}

          <button
            onClick={goToNextDay}
            disabled={isEditing}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-theme-foreground-muted" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Calendar className="w-8 h-8 text-theme-foreground-muted mb-2 opacity-50" />
            <p className="text-sm text-theme-foreground-muted">
              No events scheduled
            </p>
            <p className="text-xs text-theme-foreground-muted mt-1">
              Connect your calendar for real events
            </p>
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              className="flex gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Time indicator */}
              <div className={`w-1 rounded-full ${event.color}`} />

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-theme-foreground block truncate">
                  {event.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-theme-foreground-muted">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-0.5 text-xs text-theme-foreground-muted">
                      {getTypeIcon(event.type, event.location)}
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer - Connect Calendar CTA */}
      <div className="pt-2 border-t border-white/10 mt-2">
        <button
          disabled={isEditing}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs
            text-theme-foreground-muted hover:text-theme-foreground
            bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          Connect Google Calendar
        </button>
      </div>
    </div>
  );
}
