from app.routes.auth import router as auth_router
from app.routes.restaurants import router as restaurants_router
from app.routes.food_listings import router as listings_router
from app.routes.claims import router as claims_router
from app.routes.deliveries import router as deliveries_router
from app.routes.shelters import router as shelters_router
from app.routes.admin import router as admin_router
from app.routes.drivers import router as drivers_router

__all__ = [
    "auth_router", "restaurants_router", "listings_router",
    "claims_router", "deliveries_router", "shelters_router", "admin_router",
    "drivers_router",
]
