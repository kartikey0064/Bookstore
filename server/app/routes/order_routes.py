# ============================================================
#  ORDER ROUTES
#  GET  /api/orders           – user's orders (requires ?email=)
#  POST /api/orders           – place an order
#  GET  /api/admin/orders     – all orders (admin)
# ============================================================

from flask import Blueprint, jsonify, request
from ..services.order_service import list_orders, create_order, list_all_orders

order_bp = Blueprint("orders", __name__)


# ── User orders ───────────────────────────────────────────────
@order_bp.get("/api/orders")
def get_orders():
    email = request.args.get("email", "")
    return jsonify(list_orders(email)), 200


# ── Place order ───────────────────────────────────────────────
@order_bp.post("/api/orders")
def add_order():
    payload = request.get_json(silent=True) or {}
    order   = create_order(payload)
    return jsonify(order), 201


# ── Admin: all orders ─────────────────────────────────────────
@order_bp.get("/api/admin/orders")
def admin_orders():
    return jsonify(list_all_orders()), 200
