import os
from dotenv import load_dotenv

# Load from backend/.env if it exists
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

EIA_API_KEY = os.getenv("EIA_API_KEY", "")
EIA_REGION = os.getenv("EIA_REGION", "caiso").lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
