"""
Tests for the Routing Engine.
Covers: single stop, multi-stop precedence, 2-opt improvement.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from router import (
    Stop, nearest_neighbor_tsp, two_opt_improve,
    compute_etas, _haversine_km, _check_precedence, _total_route_distance,
)
from datetime import datetime, timedelta


class TestHaversine:
    def test_same_point(self):
        assert _haversine_km((23.25, 77.42), (23.25, 77.42)) < 0.01

    def test_bhopal_distance(self):
        dist = _haversine_km((23.2332, 77.4345), (23.2700, 77.3950))
        assert 3 < dist < 8  # Approx 5km across Bhopal


class TestPrecedence:
    def test_valid(self):
        stops = [
            Stop("pickup", 1, 23.25, 77.42),
            Stop("dropoff", 1, 23.27, 77.40),
        ]
        assert _check_precedence(stops) is True

    def test_invalid(self):
        stops = [
            Stop("dropoff", 1, 23.27, 77.40),
            Stop("pickup", 1, 23.25, 77.42),
        ]
        assert _check_precedence(stops) is False


class TestNearestNeighborTSP:
    def test_single_stop_pair(self):
        stops = [
            Stop("pickup", 1, 23.25, 77.42),
            Stop("dropoff", 1, 23.27, 77.40),
        ]
        result = nearest_neighbor_tsp((23.24, 77.41), stops)
        assert len(result) == 2
        assert result[0].type == "pickup"
        assert result[1].type == "dropoff"

    def test_multi_stop(self):
        stops = [
            Stop("pickup", 1, 23.25, 77.42),
            Stop("dropoff", 1, 23.27, 77.40),
            Stop("pickup", 2, 23.26, 77.43),
            Stop("dropoff", 2, 23.28, 77.41),
        ]
        result = nearest_neighbor_tsp((23.24, 77.41), stops)
        assert len(result) == 4
        assert _check_precedence(result)


class TestTwoOptImprove:
    def test_no_worse(self):
        stops = [
            Stop("pickup", 1, 23.25, 77.42),
            Stop("dropoff", 1, 23.27, 77.40),
        ]
        driver_loc = (23.24, 77.41)
        original_dist = _total_route_distance(
            [driver_loc] + [(s.lat, s.lng) for s in stops]
        )
        improved, pct = two_opt_improve(driver_loc, stops, max_iterations=100)
        improved_dist = _total_route_distance(
            [driver_loc] + [(s.lat, s.lng) for s in improved]
        )
        assert improved_dist <= original_dist + 0.001


class TestComputeETAs:
    def test_etas_set(self):
        stops = [
            Stop("pickup", 1, 23.25, 77.42),
            Stop("dropoff", 1, 23.27, 77.40),
        ]
        now = datetime.utcnow()
        result = compute_etas((23.24, 77.41), stops, now)
        for stop in result:
            assert stop.eta_utc is not None
