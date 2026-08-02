import random
import time

# Standard proportion of supply generation mix
SOURCE_RATIOS = {
    "nuclear": 0.40,
    "solar": 0.20,
    "wind": 0.15,
    "hydro": 0.10,
    "gas": 0.15,
    "coal": 0.0,
}

# Standard proportion of sector demand allocations
SECTOR_RATIOS = {
    "industrial": 0.35,
    "datacenters": 0.20,
    "residential": 0.20,
    "commercial": 0.10,
    "transport": 0.08,
    "hospital": 0.04,
    "research": 0.02,
    "agricultural": 0.01,
}

# Baseline structure for power sources matching frontend/lib/gridData.ts
INITIAL_SOURCES = [
    {"id": "solar", "name": "Solar Farm Alpha", "type": "solar", "capacity": 800, "color": "#ffaa00", "efficiency": 92},
    {"id": "wind", "name": "Wind Park Beta", "type": "wind", "capacity": 600, "color": "#00f5ff", "efficiency": 78},
    {"id": "nuclear", "name": "Reactor Core Gamma", "type": "nuclear", "capacity": 1200, "color": "#00ff88", "efficiency": 97},
    {"id": "hydro", "name": "Hydro Dam Delta", "type": "hydro", "capacity": 400, "color": "#0088ff", "efficiency": 88},
    {"id": "gas", "name": "Gas Turbine Epsilon", "type": "gas", "capacity": 500, "color": "#8855ff", "efficiency": 65},
    {"id": "coal", "name": "Coal Plant Zeta", "type": "coal", "capacity": 700, "color": "#ff3355", "efficiency": 42},
]

# Baseline structure for sectors matching frontend/lib/gridData.ts
INITIAL_SECTORS = [
    {"id": "industrial", "name": "Industrial Zone A", "priority": 1, "online": True, "efficiency": 88},
    {"id": "residential", "name": "Residential District B", "priority": 2, "online": True, "efficiency": 94},
    {"id": "commercial", "name": "Commercial Hub C", "priority": 2, "online": True, "efficiency": 91},
    {"id": "hospital", "name": "Medical Complex D", "priority": 1, "online": True, "efficiency": 99},
    {"id": "datacenters", "name": "Data Centers E", "priority": 1, "online": True, "efficiency": 85},
    {"id": "transport", "name": "Transit Network F", "priority": 3, "online": True, "efficiency": 82},
    {"id": "agricultural", "name": "Agricultural Grid G", "priority": 3, "online": True, "efficiency": 76},
    {"id": "research", "name": "Research Campus H", "priority": 2, "online": True, "efficiency": 93},
]

# Global mutable session states for grid operator controls
ACTIVE_SECTORS_STATUS = {sec["id"]: True for sec in INITIAL_SECTORS}
ACTIVE_VOLTAGE_SETPOINT = 220.0
ACTIVE_SECTORS_DEMAND_OVERRIDE = {}

def interpolate_grid_state(base_state: dict, cycle_count: int) -> dict:
    """
    Interpolates a base EIA grid state to generate a full sub-second GridState object 
    for the frontend, adding realistic telemetry noise.
    """
    base_supply = base_state.get("total_supply", 25000.0)
    base_demand = base_state.get("total_demand", 24500.0)
    
    # 1. Fluctuuate total metrics slightly using Gaussian noise
    supply_noise = random.gauss(0, base_supply * 0.001)
    demand_noise = random.gauss(0, base_demand * 0.001)
    
    total_supply = max(1000.0, base_supply + supply_noise)
    total_demand = max(1000.0, base_demand + demand_noise)
    
    # 2. Build detailed sources list scaled to total supply
    sources = []
    for src in INITIAL_SOURCES:
        ratio = SOURCE_RATIOS.get(src["id"], 0.0)
        # Add minor local efficiency fluctuation
        eff_noise = random.gauss(0, 0.5)
        efficiency = max(10, min(100, int(src["efficiency"] + eff_noise)))
        
        # Calculate current generation based on proportion of total supply
        current = total_supply * ratio
        # Ensure capacity limit fits scaling or adjust capacity dynamically
        capacity = max(src["capacity"], int(current * 1.2))
        
        sources.append({
            "id": src["id"],
            "name": src["name"],
            "type": src["type"],
            "capacity": capacity,
            "current": int(round(current)),
            "efficiency": efficiency,
            "color": src["color"]
        })
        
    # 3. Build detailed sectors list scaled to total demand
    sectors = []
    actual_total_demand = 0.0
    for sec in INITIAL_SECTORS:
        is_online = ACTIVE_SECTORS_STATUS.get(sec["id"], True)
        
        if sec["id"] in ACTIVE_SECTORS_DEMAND_OVERRIDE:
            demand = ACTIVE_SECTORS_DEMAND_OVERRIDE[sec["id"]]
            trend = "stable"
        else:
            ratio = SECTOR_RATIOS.get(sec["id"], 0.0)
            # Calculate current demand
            demand = total_demand * ratio
            # Add random minor fluctuations to sector trends
            trend_val = random.gauss(0, demand * 0.02)
            demand = max(10.0, demand + trend_val)
            
            trend = "stable"
            if trend_val > demand * 0.005:
                trend = "up"
            elif trend_val < -demand * 0.005:
                trend = "down"
                
        if is_online:
            actual_total_demand += demand
            
        sectors.append({
            "id": sec["id"],
            "name": sec["name"],
            "priority": sec["priority"],
            "online": is_online,
            "efficiency": sec["efficiency"],
            "demand": int(round(demand)),
            "trend": trend,
            "allocated": int(round(demand)) 
        })
        
    # Use the sum of online sectors demand
    total_demand = actual_total_demand
    
    # Recalculate allocations based on priority
    sectors = allocate_supply_to_sectors(sectors, total_supply)
    
    # 4. Generate frequency, voltage, and stability metrics
    balance = total_supply - total_demand
    
    # Grid frequency: baseline is 50Hz, shifts slightly with demand/supply balance
    frequency = 50.0 + (balance / total_demand) * 0.2 + random.gauss(0, 0.005)
    frequency = max(49.0, min(51.0, frequency))
    
    # Grid voltage: fluctuates with frequency shifts
    voltage = ACTIVE_VOLTAGE_SETPOINT + (frequency - 50.0) * 12 + random.gauss(0, 0.1)
    voltage = max(200.0, min(240.0, voltage))
    
    # Stability: drops if frequency or voltage deviates from nominal
    freq_dev = abs(frequency - 50.0) * 80
    volt_dev = abs(voltage - 220.0) * 2
    stability = 100.0 - freq_dev - volt_dev + random.uniform(-1, 1)
    stability = max(0.0, min(100.0, stability))
    
    # Generate Alerts
    alerts = []
    if frequency < 49.5:
        alerts.append("CRITICAL: Underfrequency alert — shedding priority-3 load")
    elif frequency > 50.5:
        alerts.append("CRITICAL: Overfrequency alert — reduce generation")
    if stability < 60.0:
        alerts.append("WARNING: Grid stability index below threshold")
        
    return {
        "totalSupply": int(round(total_supply)),
        "totalDemand": int(round(total_demand)),
        "frequency": float(round(frequency, 3)),
        "voltage": float(round(voltage, 1)),
        "stability": float(round(stability, 1)),
        "timestamp": int(time.time() * 1000),
        "sources": sources,
        "sectors": sectors,
        "alerts": alerts,
        "cycleCount": cycle_count
    }

def allocate_supply_to_sectors(sectors: list, total_supply: float) -> list:
    # Sort online sectors by priority (1 is highest, 3 is lowest)
    online_sectors = [s for s in sectors if s["online"]]
    total_demand = sum(s["demand"] for s in online_sectors)
    
    if total_supply >= total_demand:
        for s in sectors:
            if s["online"]:
                s["allocated"] = s["demand"]
            else:
                s["allocated"] = 0
        return sectors
        
    # If supply is insufficient, allocate based on priority levels
    remaining_supply = total_supply
    
    # Priority 1 (Hospitals, Datacenters, Industrial) get fully allocated first
    for priority in [1, 2, 3]:
        level_sectors = [s for s in online_sectors if s["priority"] == priority]
        level_demand = sum(s["demand"] for s in level_sectors)
        
        if remaining_supply >= level_demand:
            for s in level_sectors:
                s["allocated"] = s["demand"]
            remaining_supply -= level_demand
        else:
            # Pro-rate remaining supply to this level
            ratio = remaining_supply / max(level_demand, 1)
            for s in level_sectors:
                s["allocated"] = int(round(s["demand"] * ratio))
            remaining_supply = 0
            
    # Set offline sectors allocation to 0
    for s in sectors:
        if not s["online"]:
            s["allocated"] = 0
            
    return sectors

def set_active_sector_status(sector_id: str, online: bool):
    global ACTIVE_SECTORS_STATUS
    ACTIVE_SECTORS_STATUS[sector_id] = online

def get_active_sector_status(sector_id: str) -> bool:
    return ACTIVE_SECTORS_STATUS.get(sector_id, True)

def set_active_voltage_setpoint(new_voltage: float):
    global ACTIVE_VOLTAGE_SETPOINT
    ACTIVE_VOLTAGE_SETPOINT = new_voltage

def get_active_voltage_setpoint() -> float:
    return ACTIVE_VOLTAGE_SETPOINT

def set_active_sector_demand(sector_id: str, demand: float):
    global ACTIVE_SECTORS_DEMAND_OVERRIDE
    ACTIVE_SECTORS_DEMAND_OVERRIDE[sector_id] = demand

def get_active_sector_demand(sector_id: str) -> float:
    return ACTIVE_SECTORS_DEMAND_OVERRIDE.get(sector_id)

