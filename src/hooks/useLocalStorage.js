import { useState, useCallback, useRef } from 'react';
import { loadData, saveData } from '../utils/storage';

export function useLocalStorage() {
  const [data, setData] = useState(loadData);
  const saveQueued = useRef(false);

  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!saveQueued.current) {
        saveQueued.current = true;
        queueMicrotask(() => {
          saveData(next);
          saveQueued.current = false;
        });
      }
      return next;
    });
  }, []);

  return [data, updateData];
}
