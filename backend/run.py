import uvicorn
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    print(f"Starting Poetry Studio API Server on {host}:{port}...")
    uvicorn.run("app.api.api:app", host=host, port=port, reload=True)
