"""
FoodBridge AI — AI Matching Engine
Bipartite graph + Hungarian Algorithm for optimal (driver, shelter) matching.
"""
import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional, List
import numpy as np
from scipy.optimize import linear_sum_assignment
from geopy.distance import geodesic
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    driver_id: Optional[int] = None
    shelter_id: Optional[int] = None
    confidence_score: float = 0.0
    estimated_minutes: float = 0.0
    rejection_reason: Optional[str] = None
    cost_breakdown: Optional[dict] = None
    donation_id: Optional[int] = None


def time_to_expiry_penalty(expiry_datetime: datetime) -> float:
    """Exponential penalty as food approaches expiry."""
    remaining_minutes = (expiry_datetime - datetime.utcnow()).total_seconds() / 60
    if remaining_minutes < 30:
        return float('inf')  # Hard block
    if remaining_minutes < 60:
        return 10 * (60 / remaining_minutes)
    return 0


def capacity_mismatch_penalty(driver_capacity_kg: float, donation_qty_kg: float) -> float:
    """Penalty for poor capacity fit. Lower when driver capacity closely matches donation."""
    if driver_capacity_kg < donation_qty_kg:
        return float('inf')  # Can't carry
    ratio = donation_qty_kg / driver_capacity_kg
    return (1 - ratio) * 5  # Scale: 0 (perfect fit) to 5 (empty truck)


def match_donation(donation_id: int, db: Session, redis_client=None) -> MatchResult:
    """
    Main matching function: finds optimal (driver, shelter) pair for a donation.

    Algorithm:
    1. Build bipartite graph (drivers ↔ shelters)
    2. Compute cost matrix with 4 weighted factors
    3. Solve with Hungarian Algorithm (scipy.optimize.linear_sum_assignment)
    4. Validate hard constraints
    5. Return best match with confidence score
    """
    from app.models.donation import Donation, DonationStatus
    from app.models.driver import Driver
    from app.models.shelter import Shelter
    from app.models.match import Match
    from app.models.route import Route

    # Fetch donation
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        return MatchResult(rejection_reason="Donation not found", donation_id=donation_id)

    # Check if already matched
    if donation.status != DonationStatus.pending:
        return MatchResult(rejection_reason=f"Donation status is {donation.status.value}", donation_id=donation_id)

    # Check expiry
    remaining_min = (donation.expiry_datetime - datetime.utcnow()).total_seconds() / 60
    if remaining_min < 30:
        donation.status = DonationStatus.expired
        db.commit()
        return MatchResult(rejection_reason="Expiry too soon (<30 min)", donation_id=donation_id)

    donor_loc = (donation.pickup_lat, donation.pickup_lng)

    # Step 1: Get available drivers within 10km
    all_drivers = db.query(Driver).filter(Driver.is_available == True).all()
    nearby_drivers = []
    for d in all_drivers:
        if d.current_lat and d.current_lng:
            dist = geodesic((d.current_lat, d.current_lng), donor_loc).km
            if dist <= 10:
                nearby_drivers.append((d, dist))

    if not nearby_drivers:
        logger.warning(f"No drivers within 10km for donation {donation_id}")
        return MatchResult(rejection_reason="No available drivers within 10km", donation_id=donation_id)

    # Step 2: Get shelters with remaining capacity
    all_shelters = db.query(Shelter).all()
    eligible_shelters = [
        s for s in all_shelters
        if (s.capacity_kg - s.current_load_kg) >= donation.quantity_kg
    ]

    if not eligible_shelters:
        logger.warning(f"No shelters with enough capacity for donation {donation_id}")
        return MatchResult(rejection_reason="No shelters with sufficient capacity", donation_id=donation_id)

    # Step 3: Build cost matrix
    n_drivers = len(nearby_drivers)
    n_shelters = len(eligible_shelters)
    cost_matrix = np.full((n_drivers, n_shelters), float('inf'))

    W1, W2, W3, W4 = 0.4, 0.3, 0.2, 0.1  # Weights

    expiry_pen = time_to_expiry_penalty(donation.expiry_datetime)

    for i, (driver, pickup_dist) in enumerate(nearby_drivers):
        cap_pen = capacity_mismatch_penalty(driver.vehicle_capacity_kg, donation.quantity_kg)
        if cap_pen == float('inf'):
            continue

        for j, shelter in enumerate(eligible_shelters):
            delivery_dist = geodesic(donor_loc, (shelter.lat, shelter.lng)).km

            cost = (
                W1 * pickup_dist +
                W2 * delivery_dist +
                W3 * expiry_pen +
                W4 * cap_pen
            )

            # Estimate delivery time (30 km/h average)
            total_dist = pickup_dist + delivery_dist
            est_minutes = (total_dist / 30) * 60

            # Hard constraint: must deliver before expiry
            if est_minutes > remaining_min - 15:  # 15 min safety buffer
                cost = float('inf')

            cost_matrix[i][j] = cost

    # Check if any valid assignments exist
    if np.all(np.isinf(cost_matrix)):
        logger.warning(f"No valid (driver, shelter) pairs for donation {donation_id}")
        return MatchResult(rejection_reason="No feasible (driver, shelter) pairs", donation_id=donation_id)

    # Step 4: Solve with Hungarian Algorithm
    # Replace inf with large number for the algorithm
    large_val = 1e9
    cost_for_algo = np.where(np.isinf(cost_matrix), large_val, cost_matrix)

    row_ind, col_ind = linear_sum_assignment(cost_for_algo)

    # Find the best assignment
    best_cost = float('inf')
    best_i, best_j = -1, -1
    for i, j in zip(row_ind, col_ind):
        if cost_matrix[i][j] < best_cost:
            best_cost = cost_matrix[i][j]
            best_i, best_j = i, j

    if best_cost >= large_val or best_i == -1:
        return MatchResult(rejection_reason="No feasible match found by Hungarian Algorithm", donation_id=donation_id)

    best_driver, pickup_dist = nearby_drivers[best_i]
    best_shelter = eligible_shelters[best_j]

    # Step 5: Compute confidence score
    max_possible = W1 * 10 + W2 * 10 + W3 * 10 + W4 * 5  # reasonable max
    confidence = max(0, min(1, 1 - (best_cost / max_possible)))

    delivery_dist = geodesic(donor_loc, (best_shelter.lat, best_shelter.lng)).km
    total_dist = pickup_dist + delivery_dist
    est_minutes = (total_dist / 30) * 60

    cost_breakdown = {
        "pickup_distance_km": round(pickup_dist, 2),
        "delivery_distance_km": round(delivery_dist, 2),
        "total_distance_km": round(total_dist, 2),
        "expiry_penalty": round(expiry_pen, 2) if expiry_pen != float('inf') else "inf",
        "capacity_penalty": round(capacity_mismatch_penalty(best_driver.vehicle_capacity_kg, donation.quantity_kg), 2),
        "total_cost": round(best_cost, 4),
        "remaining_minutes_to_expiry": round(remaining_min, 0),
    }

    logger.info(f"✅ Match found for donation {donation_id}: driver={best_driver.id}, "
                f"shelter={best_shelter.id}, confidence={confidence:.2f}, "
                f"cost={cost_breakdown}")

    # ── Acquire distributed locks ─────────────────────
    driver_lock_key = f"lock:driver:{best_driver.id}"
    shelter_lock_key = f"lock:shelter:{best_shelter.id}"

    if redis_client:
        # Try to acquire driver lock
        if not redis_client.set(driver_lock_key, 1, nx=True, ex=10):
            return MatchResult(
                rejection_reason=f"Driver {best_driver.id} is locked (double-booking prevention)",
                donation_id=donation_id,
            )
        # Try to acquire shelter lock
        if not redis_client.set(shelter_lock_key, 1, nx=True, ex=10):
            redis_client.delete(driver_lock_key)
            return MatchResult(
                rejection_reason=f"Shelter {best_shelter.id} is locked (double-booking prevention)",
                donation_id=donation_id,
            )

    try:
        # Create Match record
        est_delivery_at = datetime.utcnow()
        from datetime import timedelta
        est_delivery_at += timedelta(minutes=est_minutes)

        match = Match(
            donation_id=donation_id,
            driver_id=best_driver.id,
            shelter_id=best_shelter.id,
            confidence_score=round(confidence, 4),
            estimated_delivery_at=est_delivery_at,
        )
        db.add(match)

        # Set driver unavailable
        best_driver.is_available = False

        # Update donation status
        donation.status = DonationStatus.matched

        db.flush()

        # Create Route record
        stops = [
            {
                "type": "pickup",
                "donation_id": donation_id,
                "lat": donation.pickup_lat,
                "lng": donation.pickup_lng,
                "food_summary": f"{donation.food_type} ({donation.quantity_kg}kg)",
            },
            {
                "type": "dropoff",
                "donation_id": donation_id,
                "lat": best_shelter.lat,
                "lng": best_shelter.lng,
                "food_summary": f"Deliver to {best_shelter.user.name if best_shelter.user else 'Shelter'}",
            },
        ]

        # Build polyline coords
        polyline = [
            [best_driver.current_lat, best_driver.current_lng],
            [donation.pickup_lat, donation.pickup_lng],
            [best_shelter.lat, best_shelter.lng],
        ]

        route = Route(
            match_id=match.id,
            stops=stops,
            total_distance_km=round(total_dist, 2),
            total_duration_min=round(est_minutes, 1),
            polyline_coords=polyline,
            improvement_pct=0.0,
        )
        db.add(route)
        db.commit()

    finally:
        # Release locks
        if redis_client:
            redis_client.delete(driver_lock_key)
            redis_client.delete(shelter_lock_key)

    return MatchResult(
        driver_id=best_driver.id,
        shelter_id=best_shelter.id,
        confidence_score=round(confidence, 4),
        estimated_minutes=round(est_minutes, 1),
        donation_id=donation_id,
        cost_breakdown=cost_breakdown,
    )
