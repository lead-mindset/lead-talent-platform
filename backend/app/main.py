import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.modules.core.router import router as core_router
from app.modules.talent.router import router as talent_router

settings = get_settings()

app = FastAPI(title="LEAD Talent API", version="0.1.0")
log = logging.getLogger("lead_talent")


# Va antes de CORS para que un error 500 también lleve los headers de CORS.
# Sin esto, el navegador muestra un error de CORS y esconde el error real.
@app.middleware("http")
async def catch_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        log.exception("Error no controlado en %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": {"code": "server_error", "message": "Error interno del backend. Revisa la terminal de uvicorn."}},
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(core_router, prefix="/api/v1")
app.include_router(talent_router, prefix="/api/v1")
