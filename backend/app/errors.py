import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException

logger = logging.getLogger("agentguard.api")


def message_code(status, detail):
    known = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 400: "INVALID_REQUEST"}
    return known.get(status, "REQUEST_FAILED"), str(detail)


def _safe(value):
    """Pydantic puts the raw exception object in ctx, which JSONResponse cannot encode."""
    if isinstance(value, (str, int, float, bool, type(None))):
        return value
    if isinstance(value, dict):
        return {str(k): _safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_safe(v) for v in value]
    return str(value)


def serialize_validation_errors(errors):
    """Keep the useful fields and guarantee the payload is JSON serializable."""
    return [{key: _safe(value) for key, value in error.items() if key != "url"} for error in errors]


async def http_error(request: Request, exc: HTTPException):
    code, message = message_code(exc.status_code, exc.detail)
    return JSONResponse({"error": {"code": code, "message": message, "request_id": request.state.request_id}}, status_code=exc.status_code)


async def validation_error(request: Request, exc: RequestValidationError):
    details = serialize_validation_errors(exc.errors())
    message = details[0].get("msg") if details else "Request validation failed"
    return JSONResponse(
        {"error": {"code": "VALIDATION_ERROR", "message": str(message).replace("Value error, ", ""), "details": details, "request_id": request.state.request_id}},
        status_code=422,
    )


async def unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled request error", extra={"request_id": getattr(request.state, "request_id", None)})
    return JSONResponse(
        {"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred", "request_id": getattr(request.state, "request_id", None)}},
        status_code=500,
    )
