from contextlib import asynccontextmanager
from time import perf_counter
from fastapi import FastAPI,Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException
from .config import get_settings
from .database import ensure_indexes,client
from .errors import http_error,validation_error
from .utils import public_id
from .api import auth,agents,policies,authorizations,transactions,approvals,audit,api_keys,dashboard,payments,workspaces

settings=get_settings()
@asynccontextmanager
async def lifespan(app):
    await ensure_indexes();yield;await client.close()
app=FastAPI(title="AgentGuard API",version="1.0.0",lifespan=lifespan)
allowed_origins={settings.frontend_url.rstrip("/")}
if settings.frontend_url.startswith("http://localhost:"):
    allowed_origins.add(settings.frontend_url.replace("http://localhost:","http://127.0.0.1:").rstrip("/"))
elif settings.frontend_url.startswith("http://127.0.0.1:"):
    allowed_origins.add(settings.frontend_url.replace("http://127.0.0.1:","http://localhost:").rstrip("/"))
app.add_middleware(CORSMiddleware,allow_origins=sorted(allowed_origins),allow_credentials=True,allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"],allow_headers=["Authorization","Content-Type","X-Workspace-ID","X-Agent-Key","X-Razorpay-Signature"])
@app.middleware("http")
async def request_context(request:Request,call_next):
    request.state.request_id=public_id("req",12);start=perf_counter()
    response=await call_next(request);response.headers["X-Request-ID"]=request.state.request_id;response.headers["X-Response-Time-Ms"]=str(round((perf_counter()-start)*1000,3));return response
app.add_exception_handler(HTTPException,http_error);app.add_exception_handler(RequestValidationError,validation_error)
for module in [auth,workspaces,agents,policies,authorizations,transactions,approvals,audit,api_keys,dashboard,payments]:app.include_router(module.router)
@app.get("/health")
async def health():return {"status":"ok"}
