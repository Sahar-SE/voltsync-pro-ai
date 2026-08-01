from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException
from app.core.safety import SafetyInterlock
from app.core.database import save_operator_action
from app.services.interpolation import (
    get_active_sector_status,
    set_active_sector_status,
    get_active_voltage_setpoint,
    set_active_voltage_setpoint
)

router = APIRouter()

class RegionRequest(BaseModel):
    region: str

class ControlRequest(BaseModel):
    action: str  # 'toggle_sector' or 'adjust_voltage'
    sector_id: Optional[str] = None
    value: Optional[float] = None

@router.post("/grid/region")
async def update_region(request: Request, payload: RegionRequest):
    new_region = payload.region.lower()
    valid_regions = ["caiso", "ercot", "pjm", "miso"]
    
    if new_region not in valid_regions:
        raise HTTPException(status_code=400, detail=f"Invalid region. Must be one of: {', '.join(valid_regions)}")
        
    request.app.state.active_region = new_region
    print(f"Grid Region updated to: {new_region.upper()}")
    
    return {
        "status": "success",
        "active_region": new_region,
    }

@router.post("/grid/control")
async def control_grid(payload: ControlRequest):
    action = payload.action.strip()
    
    if action == "toggle_sector":
        sector_id = payload.sector_id
        if not sector_id:
            raise HTTPException(status_code=400, detail="sector_id is required for toggle_sector action.")
            
        current_status = get_active_sector_status(sector_id)
        new_status = not current_status
        
        # Run through safety interlocks
        is_safe, error_msg = SafetyInterlock.validate_toggle_sector(sector_id, new_status)
        if not is_safe:
            # Log security violation alert to SQLite
            save_operator_action(
                actor="operator",
                action_type="toggle_sector",
                target_sector=sector_id,
                status="rejected_by_interlock",
                reason=error_msg
            )
            raise HTTPException(status_code=400, detail=error_msg)
            
        # Execute transition
        set_active_sector_status(sector_id, new_status)
        save_operator_action(
            actor="operator",
            action_type="toggle_sector",
            target_sector=sector_id,
            value=1.0 if new_status else 0.0,
            status="executed"
        )
        return {
            "status": "success",
            "message": f"Sector '{sector_id}' toggled to {'ONLINE' if new_status else 'OFFLINE'}.",
            "online": new_status
        }
        
    elif action == "adjust_voltage":
        new_voltage = payload.value
        if new_voltage is None:
            raise HTTPException(status_code=400, detail="value parameter is required for adjust_voltage action.")
            
        current_voltage = get_active_voltage_setpoint()
        
        # Run through safety interlocks
        is_safe, error_msg = SafetyInterlock.validate_voltage_adjustment(current_voltage, new_voltage)
        if not is_safe:
            save_operator_action(
                actor="operator",
                action_type="adjust_voltage",
                value=new_voltage,
                status="rejected_by_interlock",
                reason=error_msg
            )
            raise HTTPException(status_code=400, detail=error_msg)
            
        # Execute voltage adjustment
        set_active_voltage_setpoint(new_voltage)
        save_operator_action(
            actor="operator",
            action_type="adjust_voltage",
            value=new_voltage,
            status="executed"
        )
        return {
            "status": "success",
            "message": f"Grid nominal voltage setpoint adjusted to {new_voltage:.1f}V.",
            "voltage": new_voltage
        }
        
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")

