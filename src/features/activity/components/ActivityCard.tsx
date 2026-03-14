/**
 * Activity Card Component - Runalyzer
 * 
 * Displays a summary of a running activity in the list.
 */

import { Link } from '@tanstack/react-router';
import { DomainActivity } from '../domain/activity.types';
import { formatDuration, formatPace } from '../domain/math';

interface ActivityCardProps {
  activity: DomainActivity;
  onClick?: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Calculate pace in min/km
  const pace = activity.averagePace 
    ? formatPace(activity.averagePace)
    : '--:--';

  // Distance in km
  const distanceKm = (activity.distance / 1000).toFixed(1);

  return (
    <Link
      to="/activity/$id"
      params={{ id: activity.id }}
      onClick={handleClick}
      className="block w-full text-left bg-bg-card rounded-xl border border-border p-4 
        hover:border-orange-500 hover:shadow-[0_0_30px_rgba(255,107,0,0.3)] 
        hover:bg-bg-elevated transition-all duration-300"
    >
      {/* Glow effect inside */}
      <div className="relative">
        {/* Inner glow gradient */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-orange-500 line-clamp-1">
            {activity.name}
          </h3>
          <p className="text-sm text-gray-500">
            {formatDate(activity.startDate)} • {formatTime(activity.startDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-orange-500">{distanceKm} km</p>
          <p className="text-sm text-gray-500">{pace}/km</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(activity.duration)}
        </span>
        
        {activity.hasHeartrate && activity.averageHeartrate && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {Math.round(activity.averageHeartrate)} bpm
          </span>
        )}
        
        {activity.elevationGain > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {Math.round(activity.elevationGain)} m
          </span>
        )}
      </div>

      {/* Data availability indicator */}
      <div className="mt-2 flex items-center gap-2">
        <span className={`
          text-xs px-2 py-1 rounded-full
          ${activity.dataAvailability === 'full-streams' 
            ? 'bg-green-900/30 text-green-400' 
            : activity.dataAvailability === 'summary-only'
            ? 'bg-orange-900/30 text-orange-400'
            : 'bg-gray-800 text-gray-400'
          }
        `}>
          {activity.dataAvailability === 'full-streams' 
            ? '✓ Datos completos' 
            : activity.dataAvailability === 'summary-only'
            ? '⚠ Solo resumen'
            : '✗ Sin FC'
          }
        </span>
      </div>
      </div>
    </Link>
  );
}
