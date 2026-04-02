import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSEvent, WSEventType } from '@shipnuts/shared';

type WSHandler<T = unknown> = (payload: T) => void;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<WSEventType, Set<WSHandler>>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const parsed: WSEvent = JSON.parse(event.data);
          const handlers = handlersRef.current.get(parsed.type);
          handlers?.forEach((handler) => handler(parsed.payload));
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const subscribe = useCallback(<T = unknown>(type: WSEventType, handler: WSHandler<T>): (() => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    const handlers = handlersRef.current.get(type)!;
    handlers.add(handler as WSHandler);
    return () => {
      handlers.delete(handler as WSHandler);
    };
  }, []);

  return { connected, subscribe };
}
