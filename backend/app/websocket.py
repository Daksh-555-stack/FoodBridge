import json
import asyncio
import logging
from typing import Dict
from uuid import UUID
from fastapi import WebSocket, WebSocketDisconnect
from app.auth.jwt import decode_token

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and routes Redis pub/sub messages to clients."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # user_id (str) -> WebSocket
        self._pubsub_task = None

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: user_id={user_id}, total={len(self.active_connections)}")

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        logger.info(f"WebSocket disconnected: user_id={user_id}, total={len(self.active_connections)}")

    async def send_to_user(self, user_id: str, message: dict):
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
        channels = ["foodbridge_events"]

        while True:
            try:
                pubsub = redis_client.pubsub()
                pubsub.subscribe(*channels)

                while True:
                    message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message["type"] == "message":
                        try:
                            data = json.loads(message["data"])
                            event = data.get("event", "")
                            target_user = data.get("data", {}).get("shelter_user_id") or data.get("data", {}).get("donor_user_id")

                            # Route to specific user or broadcast
                            if event in ("delivery_assigned", "food_picked_up") and target_user:
                                await self.send_to_user(target_user, data)
                            elif event == "food_delivered":
                                # Send to both donor and shelter
                                donor_id = data.get("data", {}).get("donor_user_id")
                                shelter_id = data.get("data", {}).get("shelter_user_id")
                                if donor_id:
                                    await self.send_to_user(donor_id, data)
                                if shelter_id:
                                    await self.send_to_user(shelter_id, data)
                            else:
                                await self.broadcast(data)
                        except json.JSONDecodeError:
                            pass
                    await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Redis listener error: {e}")
                await asyncio.sleep(5)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, user_id: str):
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

    token_user_id = payload.get("sub", "")
    if token_user_id != user_id:
        await websocket.close(code=4003, reason="User ID mismatch")
        return

    await manager.connect(websocket, user_id)

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
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
