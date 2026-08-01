from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
from app.core.database import get_latest_telemetry
from app.services.interpolation import interpolate_grid_state
from app.services.eia_service import fetch_grid_data
import app.services.agent as agent_service

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()

@router.websocket("/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    async def send_telemetry_loop():
        cycle_count = 0
        try:
            while True:
                base_state = get_latest_telemetry()
                if not base_state:
                    base_state = {
                        "total_supply": 24000.0,
                        "total_demand": 23500.0,
                        "frequency": 50.0,
                        "voltage": 220.0,
                        "stability": 100.0,
                        "alerts": "[]"
                    }
                    
                # Run sub-second interpolation layer with noise
                state = interpolate_grid_state(base_state, cycle_count)
                
                # Check grid stability parameters and trigger SCADA agent reasoning concurrently
                if agent_service.CURRENT_PROPOSAL is None:
                    asyncio.create_task(agent_service.run_agent_cycle(state))
                
                # Dispatch JSON to client
                await websocket.send_text(json.dumps(state))
                cycle_count += 1
                
                # Pulse every 1 second
                await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            # Clean cancellation on disconnect
            pass
        except Exception as e:
            print(f"WebSocket Sender Error: {e}")

    # Start the sender loop task
    sender_task = asyncio.create_task(send_telemetry_loop())
    
    try:
        # Block and listen for client disconnect close events
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket connection handler error: {e}")
    finally:
        # Cancel sender task and disconnect
        sender_task.cancel()
        try:
            await sender_task
        except asyncio.CancelledError:
            pass
        manager.disconnect(websocket)
