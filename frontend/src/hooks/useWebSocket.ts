import { useEffect, useRef, useCallback } from "react";
import { Task } from "@/types";

interface WebSocketMessage {
  type: "taskUpdate" | "bulkUpdate" | "newTasks" | "ping" | "pong";
  data: {
    task?: Task;
    tasks?: Task[];
  };
}

interface WebSocketWithHeartbeat extends WebSocket {
  heartbeatInterval?: NodeJS.Timeout;
}

export function useWebSocket(onMessage: (data: WebSocketMessage) => void) {
  const wsRef = useRef<WebSocketWithHeartbeat | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const HEARTBEAT_INTERVAL = 30000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}`
      ) as WebSocketWithHeartbeat;

      ws.onopen = () => {
        console.log("WebSocket connected");
        reconnectAttemptsRef.current = 0;

        // Start heartbeat
        ws.heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, HEARTBEAT_INTERVAL);

        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          if (data.type === "pong") {
            return; // Ignore pong messages
          }
          onMessage(data);
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);

        // Clear heartbeat interval
        if (ws.heartbeatInterval) {
          clearInterval(ws.heartbeatInterval);
        }

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(`Attempting to reconnect in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          console.error("Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        console.log("WebSocket state:", ws.readyState);
        console.log("WebSocket URL:", ws.url);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }, [onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        if (wsRef.current.heartbeatInterval) {
          clearInterval(wsRef.current.heartbeatInterval);
        }
        wsRef.current.close();
      }
    };
  }, [connect]);
}
