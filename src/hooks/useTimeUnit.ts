import { useState, useEffect } from 'react';
import { TimeUnit } from '../lib/focus';

const STORAGE_KEY = 'focus-meter:time-unit';

export function useTimeUnit(): [TimeUnit, (unit: TimeUnit) => void] {
  const [unit, setUnit] = useState<TimeUnit>('minutes');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'minutes' || stored === 'hours') {
      setUnit(stored);
    }
  }, []);

  const updateUnit = (newUnit: TimeUnit) => {
    setUnit(newUnit);
    localStorage.setItem(STORAGE_KEY, newUnit);
  };

  return [unit, updateUnit];
}