import os
print("\nMAIN LOADED FROM:", os.path.abspath(__file__), "\n")
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import missions, drones, mission_control, reports, analytics
from app.websocket_manager import manager


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mission Control Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(missions.router)
app.include_router(drones.router)
app.include_router(mission_control.router)
app.include_router(reports.router)
app.include_router(analytics.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await manager.broadcast(message)
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

@app.on_event("startup")
async def print_routes():
    print("\n=== ROUTES LOADED ===")
    for r in app.routes:
        print(type(r), getattr(r, 'path', None), getattr(r, 'methods', None))
    print("=== END ROUTES ===\n")



