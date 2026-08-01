from fastapi import APIRouter
import time
from datetime import datetime

router = APIRouter()

START_TIME = time.time()

@router.get("/health")
async def health_check():
    uptime = time.time() - START_TIME
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime": uptime,
        "uptime_formatted": format_uptime(uptime),
    }

def format_uptime(seconds: float) -> str:
    s = int(seconds)
    d = s // (3600 * 24)
    h = (s % (3600 * 24)) // 3600
    m = (s % 3600) // 60
    sec = s % 60
    
    parts = []
    if d > 0: parts.append(f"{d}d")
    if h > 0: parts.append(f"{h}h")
    if m > 0: parts.append(f"{m}m")
    parts.append(f"{sec}s")
    
    return " ".join(parts)
