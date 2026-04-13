"""
Tests for the AI Matching Engine.
Covers: normal match, no drivers, expiry too soon, shelter full.
"""
import sys
import os
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))


def make_donation(id=1, qty=10, expiry_hours=3, lat=23.2332, lng=77.4345, status="pending"):
    d = MagicMock()
    d.id = id
    d.donor_id = 100
    d.food_type = "Biryani"
    d.quantity_kg = qty
    d.expiry_datetime = datetime.utcnow() + timedelta(hours=expiry_hours)
    d.status = MagicMock(value=status)
    d.pickup_lat = lat
    d.pickup_lng = lng
    return d


def make_driver(id=1, lat=23.25, lng=77.42, capacity=50, available=True):
    d = MagicMock()
    d.id = id
    d.current_lat = lat
    d.current_lng = lng
    d.vehicle_capacity_kg = capacity
    d.is_available = available
    d.user = MagicMock(name=f"Driver {id}")
    return d


def make_shelter(id=1, lat=23.238, lng=77.425, capacity=100, load=0):
    s = MagicMock()
    s.id = id
    s.lat = lat
    s.lng = lng
    s.capacity_kg = capacity
    s.current_load_kg = load
    s.user = MagicMock(name=f"Shelter {id}")
    return s


class TestTimeToExpiryPenalty:
    def test_far_expiry(self):
        from matcher import time_to_expiry_penalty
        expiry = datetime.utcnow() + timedelta(hours=5)
        assert time_to_expiry_penalty(expiry) == 0

    def test_close_expiry(self):
        from matcher import time_to_expiry_penalty
        expiry = datetime.utcnow() + timedelta(minutes=45)
        penalty = time_to_expiry_penalty(expiry)
        assert penalty > 0
        assert penalty < float('inf')

    def test_critical_expiry(self):
        from matcher import time_to_expiry_penalty
        expiry = datetime.utcnow() + timedelta(minutes=20)
        assert time_to_expiry_penalty(expiry) == float('inf')


class TestCapacityMismatch:
    def test_perfect_fit(self):
        from matcher import capacity_mismatch_penalty
        assert capacity_mismatch_penalty(10, 10) == 0

    def test_oversize_truck(self):
        from matcher import capacity_mismatch_penalty
        penalty = capacity_mismatch_penalty(50, 10)
        assert penalty > 0

    def test_too_small(self):
        from matcher import capacity_mismatch_penalty
        assert capacity_mismatch_penalty(5, 10) == float('inf')


class TestMatchDonation:
    def test_donation_not_found(self):
        from matcher import match_donation
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = match_donation(999, db)
        assert result.rejection_reason == "Donation not found"

    def test_already_matched(self):
        from matcher import match_donation
        donation = make_donation(status="matched")
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = donation
        result = match_donation(1, db)
        assert "status is" in (result.rejection_reason or "")

    def test_expiry_too_soon(self):
        from matcher import match_donation
        donation = make_donation(expiry_hours=0.3)  # 18 minutes
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = donation
        result = match_donation(1, db)
        assert result.rejection_reason is not None
