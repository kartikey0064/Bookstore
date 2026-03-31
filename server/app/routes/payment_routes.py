from flask import Blueprint, jsonify, request

from ..services.payment_service import create_payment_order, verify_payment_and_create_order

payment_bp = Blueprint("payments", __name__)


@payment_bp.post("/api/create-order")
@payment_bp.post("/create-order")
def create_payment():
    payload = request.get_json(silent=True) or {}
    order = create_payment_order(payload)
    return jsonify(order), 201


@payment_bp.post("/api/verify-payment")
@payment_bp.post("/verify-payment")
def verify_payment_route():
    payload = request.get_json(silent=True) or {}
    result = verify_payment_and_create_order(payload)
    return jsonify(result), 200
