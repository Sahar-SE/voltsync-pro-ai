import requests
import time
import random
import json
from app.core.config import EIA_API_KEY, EIA_REGION

REGION_MAPPING = {
    "caiso": "CISO",
    "ercot": "ERCO",
    "pjm": "PJM",
    "miso": "MISO",
}

def fetch_grid_data(region: str = None) -> dict:
    reg = (region or EIA_REGION).lower()
    respondent = REGION_MAPPING.get(reg, "CISO")
    
    if not EIA_API_KEY:
        # Fallback to mock data if key is missing
        return generate_mock_eia_data(respondent)
        
    try:
        url = "https://api.eia.gov/v2/electricity/rto/region-data/data/"
        
        # We fetch the latest records for the respondent (Demands and Net Generation)
        params_dict = {
            "frequency": "hourly",
            "data": ["value"],
            "facets": {
                "respondent": [respondent]
            },
            "sort": [
                {"column": "period", "direction": "desc"}
            ],
            "offset": 0,
            "length": 10
        }
        
        headers = {"X-Params": json.dumps(params_dict)}
        response = requests.get(url, params={"api_key": EIA_API_KEY}, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        records = data.get("response", {}).get("data", [])
        if not records:
            return generate_mock_eia_data(respondent)
            
        demand = None
        generation = None
        
        for record in records:
            rec_type = record.get("type")
            val = record.get("value")
            if rec_type == "D" and demand is None:
                demand = val
            elif rec_type == "NG" and generation is None:
                generation = val
            if demand is not None and generation is not None:
                break
                
        # If one of them is missing, fallback or calculate a realistic proxy
        if demand is None:
            demand = 22000 + random.randint(-2000, 2000)
        if generation is None:
            generation = demand + random.randint(-1000, 1000)
            
        return {
            "total_supply": float(generation),
            "total_demand": float(demand),
            "frequency": 50.0 + random.uniform(-0.02, 0.02),
            "voltage": 220.0 + random.uniform(-0.5, 0.5),
            "stability": 90.0 + random.uniform(-2.0, 2.0),
            "alerts": "[]"
        }
        
    except Exception as e:
        print(f"Error fetching EIA data, using mock fallback: {e}")
        return generate_mock_eia_data(respondent)

def generate_mock_eia_data(respondent: str) -> dict:
    # Baseline calculations based on hour of day
    hour = time.localtime().tm_hour
    # Cosine wave to simulate high demand in afternoon/evening
    demand_factor = 0.7 + 0.3 * (1.0 - abs(hour - 16) / 12)
    
    base_demand = {
        "CISO": 25000,
        "ERCO": 45000,
        "PJM": 65000,
        "MISO": 55000,
    }.get(respondent, 30000)
    
    demand = base_demand * demand_factor + random.uniform(-500, 500)
    # Supply usually matches demand closely, with minor errors
    supply = demand * (1.0 + random.uniform(-0.02, 0.03))
    
    # Calculate grid frequency and voltage based on stability
    balance = supply - demand
    stability = 90.0 - abs(balance) / (demand * 0.05) + random.uniform(-1, 1)
    stability = max(10.0, min(100.0, stability))
    
    frequency = 50.0 + (balance / demand) * 0.2 + random.uniform(-0.01, 0.01)
    frequency = max(49.0, min(51.0, frequency))
    
    voltage = 220.0 + (frequency - 50.0) * 10 + random.uniform(-0.2, 0.2)
    
    return {
        "total_supply": float(round(supply, 1)),
        "total_demand": float(round(demand, 1)),
        "frequency": float(round(frequency, 3)),
        "voltage": float(round(voltage, 1)),
        "stability": float(round(stability, 1)),
        "alerts": "[]"
    }
