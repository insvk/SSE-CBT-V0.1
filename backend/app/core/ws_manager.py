import json
import logging
import asyncio
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    High-Performance Multi-Channel WebSocket Hub.
    Manages live bidirectional synchronization between candidates and command centers.
    Guarantees sub-second real-time event dissemination across:
    - exam_{exam_id}: Candidate live examination channel
    - admin_feed: Administrator and proctor live command centre
    """
    def __init__(self):
        # channel_name -> set of active WebSockets
        self.active_rooms: Dict[str, Set[WebSocket]] = {}
        self.connection_count = 0

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_rooms:
            self.active_rooms[channel] = set()
        self.active_rooms[channel].add(websocket)
        self.connection_count += 1
        logger.info(f"WebSocket client connected to channel '{channel}'. Active in room: {len(self.active_rooms[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_rooms:
            self.active_rooms[channel].discard(websocket)
            if not self.active_rooms[channel]:
                del self.active_rooms[channel]
        logger.info(f"WebSocket client disconnected from channel '{channel}'")

    async def broadcast(self, channel: str, message: dict):
        if channel not in self.active_rooms:
            return
        payload = json.dumps(message)
        dead_sockets = set()
        for ws in list(self.active_rooms[channel]):
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client in '{channel}': {e}")
                dead_sockets.add(ws)

        for ws in dead_sockets:
            self.disconnect(ws, channel)

    async def broadcast_all(self, message: dict):
        payload = json.dumps(message)
        for channel, sockets in list(self.active_rooms.items()):
            dead_sockets = set()
            for ws in list(sockets):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.disconnect(ws, channel)

    def broadcast_sync(self, channel: str, message: dict):
        """Synchronous wrapper for firing broadcasts from synchronous request handlers."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(channel, message))
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.run_coroutine_threadsafe(self.broadcast(channel, message), loop)
                else:
                    loop.run_until_complete(self.broadcast(channel, message))
            except Exception as e:
                logger.warning(f"Could not dispatch sync broadcast to '{channel}': {e}")

    def broadcast_all_sync(self, message: dict):
        """Synchronous wrapper for broadcasting to all channels."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast_all(message))
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.run_coroutine_threadsafe(self.broadcast_all(message), loop)
                else:
                    loop.run_until_complete(self.broadcast_all(message))
            except Exception as e:
                logger.warning(f"Could not dispatch sync broadcast_all: {e}")

    def get_stats(self) -> Dict[str, Any]:
        return {
            "channels": {ch: len(sockets) for ch, sockets in self.active_rooms.items()},
            "total_active_sockets": sum(len(s) for s in self.active_rooms.values()),
        }


# Global singleton instance
ws_manager = WebSocketManager()
