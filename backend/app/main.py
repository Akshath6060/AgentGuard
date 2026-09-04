from contextlib import asynccontextmanager
import logging
from time import perf_counter
from fastapi import FastAPI,Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException
from .config import get_settings
from .database import ensure_indexes,client,db
from .errors import http_error,unexpected_error,validation_error
from .utils import public_id
from .api import auth,agents,policies,authorizations,transactions,approvals,audit,api_keys,dashboard,payments,workspaces

settings=get_settings()
@asynccontextmanager
async def lifespan(app):
    settings.validate_runtime()
    await ensure_indexes()
    yield
    await client.close()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s %(message)s")
app=FastAPI(title="AgentGuard API",version="1.0.0",lifespan=lifespan,docs_url=None if settings.is_production else "/docs",redoc_url=None if settings.is_production else "/redoc")
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_origins,allow_credentials=True,allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"],allow_headers=["Authorization","Content-Type","X-Workspace-ID","X-Agent-Key","X-Razorpay-Signature"])
@app.middleware("http")
async def request_context(request:Request,call_next):
    request.state.request_id=public_id("req",12);start=perf_counter()
    response=await call_next(request);response.headers["X-Request-ID"]=request.state.request_id;response.headers["X-Response-Time-Ms"]=str(round((perf_counter()-start)*1000,3))
    response.headers["X-Content-Type-Options"]="nosniff";response.headers["X-Frame-Options"]="DENY";response.headers["Referrer-Policy"]="strict-origin-when-cross-origin";response.headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=()"
    if settings.is_production:response.headers["Strict-Transport-Security"]="max-age=31536000; includeSubDomains"
    return response
app.add_exception_handler(HTTPException,http_error);app.add_exception_handler(RequestValidationError,validation_error);app.add_exception_handler(Exception,unexpected_error)
for module in [auth,workspaces,agents,policies,authorizations,transactions,approvals,audit,api_keys,dashboard,payments]:app.include_router(module.router)
@app.get("/health",include_in_schema=False)
async def health():return {"status":"ok","service":"agentguard-api"}
@app.get("/ready",include_in_schema=False)
async def ready():
    await db.command("ping")
    return {"status":"ready","dependencies":{"mongodb":"ok"}}
