import { useMissionStore } from "./store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws";

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private initialReconnectDelay = 1000; // 1 second
  private maxReconnectDelay = 30000; // 30 seconds
  private currentReconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.isConnecting = false;
        this.currentReconnectDelay = this.initialReconnectDelay; // Reset delay on success
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const missionStore = useMissionStore.getState();
          
          // Update mission state
          missionStore.updateFromWS(data);
          
          // Record location point for trail
          if (data.type === "mission_update" && data.location) {
            missionStore.addLocationPoint(data.location);
          }
          
          // Reset trail when mission restarts
          if (
            data.type === "mission_update" &&
            data.status === "in-progress" &&
            data.progress === 0
          ) {
            missionStore.resetPath();
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected, will reconnect...");
        this.isConnecting = false;
        this.ws = null;

        if (this.shouldReconnect && !this.reconnectTimeout) {
          // Exponential backoff with max limit
          const delay = Math.min(this.currentReconnectDelay, this.maxReconnectDelay);
          console.log(`Reconnecting in ${delay}ms...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            // Double the delay for next attempt (exponential backoff)
            this.currentReconnectDelay = Math.min(
              this.currentReconnectDelay * 2,
              this.maxReconnectDelay
            );
            this.connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.isConnecting = false;
      
      if (this.shouldReconnect && !this.reconnectTimeout) {
        const delay = Math.min(this.currentReconnectDelay, this.maxReconnectDelay);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.currentReconnectDelay = Math.min(
            this.currentReconnectDelay * 2,
            this.maxReconnectDelay
          );
          this.connect();
        }, delay);
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();

