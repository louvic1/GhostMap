from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
from contextlib import asynccontextmanager
from router import router

# 1. Models must come first
class Camera(BaseModel):
    id: int
    lat: float
    lng: float
    type: Optional[str] = None
    operator: Optional[str] = None

class RouteResponse(BaseModel):
    fast: List[List[float]]
    safe: List[List[float]]

class HealthResponse(BaseModel):
    status: str
    message: str

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float

# 2. Global variable definition
GLOBAL_CAMERAS: List[Camera] = []

# 3. Helper functions
def fetch_cameras_from_api():
    """Helper to fetch cameras from Overpass"""
    overpass_url = "https://overpass-api.de/api/interpreter"
    overpass_query = """
    [out:json];
    node(around:2000,45.5017,-73.5673)["man_made"="surveillance"];
    out;
    """
    try:
        response = requests.get(overpass_url, params={'data': overpass_query})
        response.raise_for_status()
        data = response.json()
        
        cameras = []
        for element in data.get('elements', []):
            tags = element.get('tags', {})
            cameras.append(Camera(
                id=element['id'],
                lat=element['lat'],
                lng=element['lon'],
                type=tags.get('surveillance:type') or tags.get('camera:type') or "Unknown",
                operator=tags.get('operator')
            ))
        return cameras
    except Exception as e:
        print(f"Error fetching data from Overpass: {e}")
        return []

@asynccontextmanager
async def lifespan(app: FastAPI):
    global GLOBAL_CAMERAS
    # Load graph on startup
    print("Initializing Application...")
    try:
        router.get_graph()
        
        # Fetch cameras and apply penalties
        print("Fetching cameras for routing penalties...")
        GLOBAL_CAMERAS = fetch_cameras_from_api()
        # Convert Pydantic models to dicts for router
        camera_dicts = [{'lat': c.lat, 'lng': c.lng} for c in GLOBAL_CAMERAS]
        router.apply_camera_penalties(camera_dicts)
        
    except Exception as e:
        print(f"Failed to initialize graph or apply penalties: {e}")
    yield
    # Clean up on shutdown if needed

app = FastAPI(title="GhostMap Backend", lifespan=lifespan)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", message="Backend is healthy and running")

@app.get("/api/cameras", response_model=List[Camera])
async def get_cameras():
    # Return cached cameras
    return GLOBAL_CAMERAS

@app.get("/api/route", response_model=RouteResponse)
async def get_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float):
    result = router.get_shortest_path((start_lat, start_lon), (end_lat, end_lon))
    if not result["fast"] and not result["safe"]:
         raise HTTPException(status_code=404, detail="No path found")
    return RouteResponse(fast=result["fast"], safe=result["safe"])
