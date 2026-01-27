import { useState, useMemo, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'yaad_voice_disabled_until';

interface UseVoiceDisableStatusReturn {
  isVoiceDisabledGlobally: boolean;
  disabledUntil: Date | null;
  remainingDisableTime: string | null;
  disableVoiceFor24Hours: () => void;
  checkAndClearIfExpired: () => void;
}

export function useVoiceDisableStatus(): UseVoiceDisableStatusReturn {
  const [disabledUntil, setDisabledUntil] = useState<Date | null>(() => {
    // Check localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const date = new Date(stored);
        if (date > new Date()) {
          return date; // Still disabled
        } else {
          localStorage.removeItem(STORAGE_KEY); // Expired, clear it
          return null;
        }
      }
    } catch (e) {
      console.error('Error reading voice disable status:', e);
    }
    return null;
  });

  const isVoiceDisabledGlobally = useMemo(() => {
    return disabledUntil !== null && disabledUntil > new Date();
  }, [disabledUntil]);

  const remainingDisableTime = useMemo(() => {
    if (!disabledUntil) return null;
    const now = new Date();
    if (disabledUntil <= now) return null;
    
    const diffMs = disabledUntil.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [disabledUntil]);

  const disableVoiceFor24Hours = useCallback(() => {
    try {
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
      localStorage.setItem(STORAGE_KEY, until.toISOString());
      setDisabledUntil(until);
    } catch (e) {
      console.error('Error saving voice disable status:', e);
    }
  }, []);

  const checkAndClearIfExpired = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const date = new Date(stored);
        if (date <= new Date()) {
          localStorage.removeItem(STORAGE_KEY);
          setDisabledUntil(null);
        }
      }
    } catch (e) {
      console.error('Error checking voice disable status:', e);
    }
  }, []);

  // Check expiry on mount and periodically
  useEffect(() => {
    checkAndClearIfExpired();
    const interval = setInterval(checkAndClearIfExpired, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkAndClearIfExpired]);

  // Also update remaining time display every minute
  useEffect(() => {
    if (!disabledUntil) return;
    
    const interval = setInterval(() => {
      // Force re-render to update remainingDisableTime
      setDisabledUntil(prev => prev ? new Date(prev.getTime()) : null);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [disabledUntil]);

  return {
    isVoiceDisabledGlobally,
    disabledUntil,
    remainingDisableTime,
    disableVoiceFor24Hours,
    checkAndClearIfExpired,
  };
}
