"""initial tables

Revision ID: 001_initial
Revises:
Create Date: 2024-01-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("donor", "driver", "shelter", "admin", name="userrole"), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"])

    # Donations
    op.create_table(
        "donations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("donor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("food_type", sa.String(255), nullable=False),
        sa.Column("quantity_kg", sa.Float(), nullable=False),
        sa.Column("expiry_datetime", sa.DateTime(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "matched", "in_transit", "delivered", "expired", name="donationstatus"),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("pickup_lat", sa.Float(), nullable=False),
        sa.Column("pickup_lng", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_donations_id", "donations", ["id"])

    # Drivers
    op.create_table(
        "drivers",
        sa.Column("id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("vehicle_capacity_kg", sa.Float(), nullable=False, server_default="50.0"),
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("current_lat", sa.Float(), nullable=True),
        sa.Column("current_lng", sa.Float(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Shelters
    op.create_table(
        "shelters",
        sa.Column("id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("capacity_kg", sa.Float(), nullable=False, server_default="100.0"),
        sa.Column("current_load_kg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
    )

    # Matches
    op.create_table(
        "matches",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("donation_id", sa.Integer(), sa.ForeignKey("donations.id"), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("drivers.id"), nullable=False),
        sa.Column("shelter_id", sa.Integer(), sa.ForeignKey("shelters.id"), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("matched_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("estimated_delivery_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_matches_id", "matches", ["id"])

    # Routes
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("match_id", sa.Integer(), sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("stops", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("total_distance_km", sa.Float(), nullable=True),
        sa.Column("total_duration_min", sa.Float(), nullable=True),
        sa.Column("polyline_coords", sa.JSON(), nullable=True),
        sa.Column("improvement_pct", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("optimized_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_routes_id", "routes", ["id"])

    # Deliveries
    op.create_table(
        "deliveries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id"), nullable=False),
        sa.Column("actual_delivered_at", sa.DateTime(), nullable=True),
        sa.Column("quantity_received_kg", sa.Float(), nullable=True),
        sa.Column("shelter_confirmed", sa.Boolean(), server_default=sa.text("false")),
    )
    op.create_index("ix_deliveries_id", "deliveries", ["id"])


def downgrade():
    op.drop_table("deliveries")
    op.drop_table("routes")
    op.drop_table("matches")
    op.drop_table("shelters")
    op.drop_table("drivers")
    op.drop_table("donations")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS donationstatus")
