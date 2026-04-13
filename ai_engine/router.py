"""
FoodBridge AI — Routing Engine
Nearest-Neighbor TSP seed + 2-opt improvements for multi-stop route optimization.
"""
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from geopy.distance import geodesic
import httpx
import os

logger = logging.getLogger(__name__)

AVERAGE_SPEED_KMH = 30  # Urban Bhopal estimate
OSRM_URL = os.getenv("OSRM_URL", "")


@dataclass
class Stop:
    type: str  # "pickup" or "dropoff"
    donation_id: int
    lat: float
    lng: float
    eta_utc: Optional[str] = None
    food_summary: Optional[str] = None


@dataclass
class RouteResult:
    ordered_stops: List[Stop] = field(default_factory=list)
    total_distance_km: float = 0.0
    total_duration_min: float = 0.0
    polyline_coords: List[Tuple[float, float]] = field(default_factory=list)
    improvement_pct: float = 0.0


class ExpiryViolationError(Exception):
    def __init__(self, donation_id: int, eta: datetime, expiry: datetime):
        self.donation_id = donation_id
        self.eta = eta
        self.expiry = expiry
        super().__init__(f"Donation {donation_id} ETA {eta} exceeds expiry {expiry}")


def _haversine_km(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return geodesic(p1, p2).km


def _total_route_distance(coords: List[Tuple[float, float]]) -> float:
    """Calculate total distance of a route given sequential coordinates."""
    total = 0.0
    for i in range(len(coords) - 1):
        total += _haversine_km(coords[i], coords[i + 1])
    return total


def _check_precedence(stops: List[Stop]) -> bool:
    """Verify that every pickup comes before its corresponding dropoff."""
    seen_pickups = set()
    for stop in stops:
        if stop.type == "pickup":
            seen_pickups.add(stop.donation_id)
        elif stop.type == "dropoff":
            if stop.donation_id not in seen_pickups:
                return False
    return True


def nearest_neighbor_tsp(
    driver_loc: Tuple[float, float],
    stops: List[Stop],
) -> List[Stop]:
    """Build initial route using nearest-neighbor heuristic with precedence constraints."""
    if not stops:
        return []

    remaining = list(stops)
    ordered = []
    current = driver_loc
    picked_up = set()

    while remaining:
        # Find nearest valid stop
        best_stop = None
        best_dist = float('inf')

        for stop in remaining:
            # Precedence: can only visit dropoff if pickup already visited
            if stop.type == "dropoff" and stop.donation_id not in picked_up:
                continue

            dist = _haversine_km(current, (stop.lat, stop.lng))
            if dist < best_dist:
                best_dist = dist
                best_stop = stop

        if best_stop is None:
            # Stuck — add remaining stops in order
            ordered.extend(remaining)
            break

        ordered.append(best_stop)
        remaining.remove(best_stop)
        current = (best_stop.lat, best_stop.lng)

        if best_stop.type == "pickup":
            picked_up.add(best_stop.donation_id)

    return ordered


def two_opt_improve(
    driver_loc: Tuple[float, float],
    stops: List[Stop],
    max_iterations: int = 500,
) -> Tuple[List[Stop], float]:
    """Apply 2-opt improvements to reduce total route distance."""
    if len(stops) < 3:
        return stops, 0.0

    def route_coords(s: List[Stop]) -> List[Tuple[float, float]]:
        return [driver_loc] + [(st.lat, st.lng) for st in s]

    current_stops = list(stops)
    current_dist = _total_route_distance(route_coords(current_stops))
    original_dist = current_dist
    improved = True
    iterations = 0

    while improved and iterations < max_iterations:
        improved = False
        iterations += 1

        for i in range(len(current_stops) - 1):
            for j in range(i + 2, len(current_stops)):
                # Try reversing segment between i and j
                new_stops = (
                    current_stops[:i] +
                    list(reversed(current_stops[i:j + 1])) +
                    current_stops[j + 1:]
                )

                # Check precedence constraint
                if not _check_precedence(new_stops):
                    continue

                new_dist = _total_route_distance(route_coords(new_stops))
                if new_dist < current_dist - 0.001:  # Small epsilon
                    current_stops = new_stops
                    current_dist = new_dist
                    improved = True
                    break  # Restart inner loop
            if improved:
                break

    improvement = ((original_dist - current_dist) / original_dist * 100) if original_dist > 0 else 0
    return current_stops, round(improvement, 1)


def compute_etas(
    driver_loc: Tuple[float, float],
    stops: List[Stop],
    departure_time: datetime,
) -> List[Stop]:
    """Compute ETA for each stop based on cumulative travel time."""
    current = driver_loc
    cumulative_time = 0.0

    for stop in stops:
        dist = _haversine_km(current, (stop.lat, stop.lng))
        travel_min = (dist / AVERAGE_SPEED_KMH) * 60
        cumulative_time += travel_min
        eta = departure_time + timedelta(minutes=cumulative_time)
        stop.eta_utc = eta.isoformat() + "Z"
        current = (stop.lat, stop.lng)

    return stops


def optimize_route(
    driver_id: int,
    donation_ids: List[int],
    db,
) -> RouteResult:
    """
    Main routing function:
    1. Build stops from DB
    2. Run nearest-neighbor TSP
    3. Improve with 2-opt
    4. Compute ETAs
    5. Validate expiry constraints
    """
    from app.models.driver import Driver
    from app.models.donation import Donation
    from app.models.shelter import Shelter
    from app.models.match import Match

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise ValueError(f"Driver {driver_id} not found")

    driver_loc = (driver.current_lat, driver.current_lng)
    stops = []

    for don_id in donation_ids:
        donation = db.query(Donation).filter(Donation.id == don_id).first()
        if not donation:
            continue

        # Add pickup stop
        stops.append(Stop(
            type="pickup",
            donation_id=don_id,
            lat=donation.pickup_lat,
            lng=donation.pickup_lng,
            food_summary=f"{donation.food_type} ({donation.quantity_kg}kg)",
        ))

        # Find shelter from match
        match = db.query(Match).filter(Match.donation_id == don_id).first()
        if match:
            shelter = db.query(Shelter).filter(Shelter.id == match.shelter_id).first()
            if shelter:
                stops.append(Stop(
                    type="dropoff",
                    donation_id=don_id,
                    lat=shelter.lat,
                    lng=shelter.lng,
                    food_summary=f"Deliver to shelter",
                ))

    if not stops:
        return RouteResult()

    # Step 1: Nearest-neighbor TSP
    ordered_stops = nearest_neighbor_tsp(driver_loc, stops)

    # Step 2: 2-opt improvement
    optimized_stops, improvement_pct = two_opt_improve(driver_loc, ordered_stops)

    # Step 3: Compute ETAs
    now = datetime.utcnow()
    optimized_stops = compute_etas(driver_loc, optimized_stops, now)

    # Step 4: Build polyline
    polyline = [list(driver_loc)]
    for stop in optimized_stops:
        polyline.append([stop.lat, stop.lng])

    # Step 5: Calculate totals
    total_dist = _total_route_distance(
        [driver_loc] + [(s.lat, s.lng) for s in optimized_stops]
    )
    total_duration = (total_dist / AVERAGE_SPEED_KMH) * 60

    # Step 6: Expiry validation
    for stop in optimized_stops:
        if stop.type == "dropoff" and stop.eta_utc:
            donation = db.query(Donation).filter(Donation.id == stop.donation_id).first()
            if donation:
                eta_dt = datetime.fromisoformat(stop.eta_utc.replace("Z", ""))
                if eta_dt > donation.expiry_datetime:
                    logger.warning(
                        f"Expiry violation: donation {stop.donation_id} "
                        f"ETA {eta_dt} > expiry {donation.expiry_datetime}"
                    )

    return RouteResult(
        ordered_stops=optimized_stops,
        total_distance_km=round(total_dist, 2),
        total_duration_min=round(total_duration, 1),
        polyline_coords=polyline,
        improvement_pct=improvement_pct,
    )
