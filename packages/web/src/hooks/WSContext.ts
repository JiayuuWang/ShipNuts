import { createContext, useContext } from 'react';
import type { WSEventType } from '@shipnuts/shared';

type WSHandler<T = unknown> = (payload: T) => void;

export interface WSContextValue {
  connected: boolean;
  subscribe: <T = unknown>(type: WSEventType, handler: WSHandler<T>) => () => void;
}

export const WSContext = createContext<WSContextValue | null>(null);

export function useWS(): WSContextValue {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWS must be used within WSProvider');
  return ctx;
}
