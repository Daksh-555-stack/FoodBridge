"""clean schema v2 — UUID-based models

Revision ID: 002_clean_schema_v2
Revises:
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "002_clean_schema_v2"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ── Enum types ────────────────────────────────────
    userrole = sa.Enum("donor", "driver", "shelter", "admin", name="userrole")
    restaurantstatus = sa.Enum("pending", "approved", "rejected", name="restaurantstatus")
    shelterstatus = sa.Enum("pending", "approved", "rejected", name="shelterstatus")
    foodtype = sa.Enum("veg", "non_veg", "vegan", name="foodtype")
    listingstatus = sa.Enum("available", "claimed", "in_transit", "delivered", "expired", name="listingstatus")
    claimstatus = sa.Enum("pending", "driver_assigned", "picked_up", "delivered", "cancelled", name="claimstatus")
    deliverystatus = sa.Enum("assigned", "picked_up", "delivered", name="deliverystatus")

    # ── Users ─────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(300), nullable=True),
        sa.Column("role", userrole, nullable=False),
        sa.Column("google_id", sa.String(200), unique=True, nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_approved", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── Restaurants ───────────────────────────────────
    op.create_table(
        "restaurants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(400), nullable=False),
        sa.Column("city", sa.String(100), nullable=False, server_default="Bhopal"),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("fssai_number", sa.String(100), nullable=True),
        sa.Column("status", restaurantstatus, server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ── Shelters ──────────────────────────────────────
    op.create_table(
        "shelters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("manager_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(400), nullable=False),
        sa.Column("city", sa.String(100), nullable=False, server_default="Bhopal"),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("capacity_kg", sa.Float(), nullable=False, server_default="100.0"),
        sa.Column("current_load_kg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("shelter_type", sa.String(100), nullable=True),
        sa.Column("status", shelterstatus, server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ── Drivers ───────────────────────────────────────
    op.create_table(
        "drivers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("vehicle_type", sa.String(50), nullable=True),
        sa.Column("vehicle_number", sa.String(30), nullable=True),
        sa.Column("capacity_kg", sa.Float(), nullable=False, server_default="20.0"),
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("current_lat", sa.Float(), nullable=True),
        sa.Column("current_lng", sa.Float(), nullable=True),
        sa.Column("last_location_update", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ── Food Listings ─────────────────────────────────
    op.create_table(
        "food_listings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("restaurant_id", UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("donor_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("food_name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("quantity_kg", sa.Float(), nullable=False),
        sa.Column("food_type", foodtype, server_default="veg", nullable=False),
        sa.Column("expiry_time", sa.DateTime(), nullable=False),
        sa.Column("pickup_lat", sa.Float(), nullable=False),
        sa.Column("pickup_lng", sa.Float(), nullable=False),
        sa.Column("pickup_address", sa.String(400), nullable=True),
        sa.Column("status", listingstatus, server_default="available", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ── Food Claims ───────────────────────────────────
    op.create_table(
        "food_claims",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", UUID(as_uuid=True), sa.ForeignKey("food_listings.id"), nullable=False),
        sa.Column("shelter_id", UUID(as_uuid=True), sa.ForeignKey("shelters.id"), nullable=False),
        sa.Column("claimed_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("delivery_lat", sa.Float(), nullable=False),
        sa.Column("delivery_lng", sa.Float(), nullable=False),
        sa.Column("delivery_address", sa.String(400), nullable=False),
        sa.Column("status", claimstatus, server_default="pending", nullable=False),
        sa.Column("claimed_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ── Deliveries ────────────────────────────────────
    op.create_table(
        "deliveries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("claim_id", UUID(as_uuid=True), sa.ForeignKey("food_claims.id"), unique=True, nullable=False),
        sa.Column("driver_id", UUID(as_uuid=True), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("pickup_lat", sa.Float(), nullable=False),
        sa.Column("pickup_lng", sa.Float(), nullable=False),
        sa.Column("dropoff_lat", sa.Float(), nullable=False),
        sa.Column("dropoff_lng", sa.Float(), nullable=False),
        sa.Column("pickup_address", sa.String(400), nullable=True),
        sa.Column("dropoff_address", sa.String(400), nullable=True),
        sa.Column("status", deliverystatus, server_default="assigned", nullable=False),
        sa.Column("osrm_route", sa.JSON(), nullable=True),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("duration_min", sa.Float(), nullable=True),
        sa.Column("assigned_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("picked_up_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("deliveries")
    op.drop_table("food_claims")
    op.drop_table("food_listings")
    op.drop_table("drivers")
    op.drop_table("shelters")
    op.drop_table("restaurants")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS deliverystatus")
    op.execute("DROP TYPE IF EXISTS claimstatus")
    op.execute("DROP TYPE IF EXISTS listingstatus")
    op.execute("DROP TYPE IF EXISTS foodtype")
    op.execute("DROP TYPE IF EXISTS shelterstatus")
    op.execute("DROP TYPE IF EXISTS restaurantstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
