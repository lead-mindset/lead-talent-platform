import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import end_request, setup_logging, start_request
from app.modules.core.router import router as core_router
from app.modules.talent.router import router as talent_router

settings = get_settings()

app = FastAPI(title="LEAD Talent API", version="0.1.0")
log = setup_logging(
    allow_cv_debug=lambda: get_settings().cv_debug_allowed,
    connection_string=settings.applicationinsights_connection_string,
)


# Va antes de CORS para que un error 500 también lleve los headers de CORS.
# Sin esto, el navegador muestra un error de CORS y esconde el error real.
@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = uuid4().hex
    token = start_request(request_id)
    started = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception:
        log.exception(
            "error no controlado", extra={"endpoint": f"{request.method} {request.url.path}"}
        )
        response = JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "code": "server_error",
                    "message": f"Error interno del backend. Código para soporte: {request_id}",
                }
            },
        )
    finally:
        # Solo método, ruta, estado, duración y person_id. Nunca headers ni cuerpo.
        log.info(
            "request",
            extra={
                "endpoint": f"{request.method} {request.url.path}",
                "status": status,
                "duration_ms": round((time.perf_counter() - started) * 1000),
            },
        )
        end_request(token)
    response.headers["X-Request-ID"] = request_id
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Request-ID"],
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(core_router, prefix="/api/v1")
app.include_router(talent_router, prefix="/api/v1")
