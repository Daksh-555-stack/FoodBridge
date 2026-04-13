from app.routes.auth import router as auth_router
from app.routes.donations import router as donations_router
from app.routes.drivers import router as drivers_router
from app.routes.shelters import router as shelters_router
from app.routes.matches import router as matches_router
from app.routes.routes import router as routes_router
from app.routes.admin import router as admin_router

__all__ = [
    "auth_router", "donations_router", "drivers_router",
    "shelters_router", "matches_router", "routes_router", "admin_router",
]
