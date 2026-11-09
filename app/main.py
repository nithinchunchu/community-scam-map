import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.api.health import router as health_router
from app.api.reports import router as reports_router
from app.api.lookup import router as lookup_router
from app.api.admin import router as admin_router
from app.api.challenges import router as challenges_router
from app.api.map import router as map_router
from app.api.alerts import router as alerts_router
from app.api.license import router as license_router
from app.api.vision import router as vision_router
from app.core.license import get_current_license_status

# Configure privacy-preserving logging (strip query parameters, IPs, and personal data from logs)
class PrivacyLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple) and len(record.args) >= 3:
            # Uvicorn access log args: (client_addr, method, full_path, http_version, status_code)
            new_args = list(record.args)
            # Redact client IP/address
            new_args[0] = "-"
            # Strip query string from path
            raw_path = record.args[2]
            if isinstance(raw_path, str) and "?" in raw_path:
                new_args[2] = raw_path.split("?")[0]
            record.args = tuple(new_args)

        # Also clean message itself if formatted text leaked IP or query string
        if isinstance(record.msg, str):
            import re
            # Strip query string
            record.msg = re.sub(r"\?[^ ]* HTTP", " HTTP", record.msg)
            # Redact IP addresses if present in msg
            record.msg = re.sub(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b", "-", record.msg)

        return True

logging.getLogger("uvicorn.access").addFilter(PrivacyLogFilter())
logging.getLogger("uvicorn").addFilter(PrivacyLogFilter())

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed Data
    init_db()
    yield

app = FastAPI(
    title="Community Scam Map",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Licence check middleware
@app.middleware("http")
async def license_check_middleware(request: Request, call_next):
    path = request.url.path
    # Exempt routes: /health, /license, root /, static files, PWA assets
    if (
        path in ("/health", "/license", "/")
        or path.startswith("/license")
        or path.startswith("/icons")
        or path.startswith("/assets")
        or path.startswith("/data")
        or path.startswith("/docs")
        or path.startswith("/openapi.json")
        or path.endswith((".js", ".css", ".png", ".svg", ".ico", ".json", ".webmanifest", ".html"))
    ):
        return await call_next(request)

    status_obj = get_current_license_status()
    if status_obj.get("status") != "valid":
        return JSONResponse(status_code=403, content={"error": "LICENSE_EXPIRED"})

    return await call_next(request)

# Include Routers
app.include_router(health_router)
app.include_router(reports_router)
app.include_router(lookup_router)
app.include_router(admin_router)
app.include_router(challenges_router)
app.include_router(map_router)
app.include_router(alerts_router)
app.include_router(license_router)
app.include_router(vision_router)

# Mount static assets and SPA fallback
static_path = Path(settings.STATIC_DIR)
if static_path.exists():
    if (static_path / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(static_path / "assets")), name="assets")
    if (static_path / "icons").exists():
        app.mount("/icons", StaticFiles(directory=str(static_path / "icons")), name="icons")
    if (static_path / "data").exists():
        app.mount("/data", StaticFiles(directory=str(static_path / "data")), name="data")

    @app.get("/{full_path:path}")
    async def serve_spa_or_file(full_path: str):
        target = static_path / full_path
        if full_path and target.is_file():
            return FileResponse(target)
        index_file = static_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse({"ok": True, "service": "Community Scam Map"})
else:
    @app.get("/")
    def index():
        return {
            "name": "Community Scam Map API",
            "version": "1.0.0",
            "status": "ready"
        }
