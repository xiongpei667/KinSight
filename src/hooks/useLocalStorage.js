import { useState, useCallback, useRef } from 'react';
import { loadData, saveData } from '../utils/storage';

/**
 * localStorage 持久化 Hook
 * 使用 microtask 批量合并同一渲染周期内的多次更新，避免频繁写入
 * 加入 try-catch 防止配额超限等异常导致后续写入被永久阻断
 */
export function useLocalStorage() {
  const [data, setData] = useState(loadData);
  const saveQueued = useRef(false);

  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!saveQueued.current) {
        saveQueued.current = true;
        queueMicrotask(() => {
          try {
            saveData(next);
          } catch (e) {
            console.error('[KinSight] localStorage 写入失败:', e);
          } finally {
            saveQueued.current = false;
          }
        });
      }
      return next;
    });
  }, []);

  return [data, updateData];
}
