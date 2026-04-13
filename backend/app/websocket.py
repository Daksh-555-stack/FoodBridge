import json
import asyncio
import logging
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
from app.auth.jwt import decode_token

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and routes Redis pub/sub messages to clients."""

    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self._pubsub_task = None

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: user_id={user_id}, total={len(self.active_connections)}")

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)
        logger.info(f"WebSocket disconnected: user_id={user_id}, total={len(self.active_connections)}")

    async def send_to_user(self, user_id: int, message: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        disconnected = []
        for user_id, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(uid)

    async def start_redis_listener(self, redis_client):
        """Subscribe to Redis channels and forward messages to WebSocket clients."""
        import redis as redis_lib

        channels = ["new_match", "route_updated", "driver_location", "delivery_done", "expiry_alert"]

        def _listen():
            r = redis_lib.Redis.from_url(redis_client.connection_pool.connection_kwargs.get("url", "redis://redis:6379/0"), decode_responses=True)
            pubsub = r.pubsub()
            pubsub.subscribe(*channels)
            for message in pubsub.listen():
                if message["type"] == "message":
                    return message["data"]
            return None

        while True:
            try:
                # Use Redis pub/sub in a thread to avoid blocking
                pubsub = redis_client.pubsub()
                pubsub.subscribe(*channels)

                while True:
                    message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message["type"] == "message":
                        try:
                            data = json.loads(message["data"])
                            await self.broadcast(data)
                        except json.JSONDecodeError:
                            pass
                    await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Redis listener error: {e}")
                await asyncio.sleep(5)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint with JWT authentication via query parameter."""
    # Authenticate via token query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return

    token_user_id = int(payload.get("sub", 0))
    if token_user_id != user_id:
        await websocket.close(code=4003, reason="User ID mismatch")
        return

    await manager.connect(websocket, user_id)

    try:
        while True:
            # Keep connection alive with ping/pong
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Handle client messages (e.g., ping)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send ping to check connection
                try:
                    await websocket.send_text("ping")
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        manager.disconnect(user_id)
