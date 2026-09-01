from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException


def message_code(status, detail):
    known = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 400: "INVALID_REQUEST"}
    return known.get(status, "REQUEST_FAILED"), str(detail)


async def http_error(request: Request, exc: HTTPException):
    code, message = message_code(exc.status_code, exc.detail)
    return JSONResponse({"error": {"code": code, "message": message, "request_id": request.state.request_id}}, status_code=exc.status_code)


async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse({"error": {"code": "VALIDATION_ERROR", "message": "Request validation failed", "details": exc.errors(), "request_id": request.state.request_id}}, status_code=422)
