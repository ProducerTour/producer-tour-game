import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../lib/api';
import { AnimatedBorder, parseBorderConfig } from './AnimatedBorder';

interface UserAvatarWithBorderProps {
  userId: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

/**
 * A user avatar component that automatically fetches and displays the user's equipped border
 */
export function UserAvatarWithBorder({
  userId,
  firstName,
  lastName,
  profilePhotoUrl,
  size = 'sm',
  className = '',
  showOnlineIndicator = false,
  isOnline = false,
}: UserAvatarWithBorderProps) {
  // Fetch the user's customizations (border)
  const { data: customizations } = useQuery({
    queryKey: ['user-customizations', userId],
    queryFn: async () => {
      const response = await gamificationApi.getUserCustomizations(userId);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false, // Don't retry on failure
  });

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  const border = customizations?.border ? parseBorderConfig(customizations.border) : null;

  return (
    <div className={`relative ${className}`}>
      <AnimatedBorder
        border={border}
        size={size}
        showBorder={!!border}
      >
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={`${firstName} ${lastName}`}
            className="absolute inset-0 w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">
            {initials}
          </div>
        )}
      </AnimatedBorder>
      {showOnlineIndicator && isOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
      )}
    </div>
  );
}

export default UserAvatarWithBorder;
