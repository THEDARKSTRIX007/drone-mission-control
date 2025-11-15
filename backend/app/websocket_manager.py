from typing import List, Dict, Any
import json
import logging

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str) -> None:
        for connection in list(self.active_connections):
            await connection.send_text(message)

    async def broadcast_json(self, message: Dict[Any, Any]) -> None:
        """Broadcast a JSON message to all connected clients."""
        message_str = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message_str)
            except Exception:
                # Remove dead connections
                if connection in self.active_connections:
                    self.active_connections.remove(connection)
                logging.exception("Failed to send websocket message, removed connection")


# Global manager instance
manager = ConnectionManager()

