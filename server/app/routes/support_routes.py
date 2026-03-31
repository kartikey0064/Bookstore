from flask import Blueprint, jsonify, request

from ..services.support_service import list_tickets, create_ticket

support_bp = Blueprint("support", __name__)


@support_bp.get("/api/support")
def get_tickets():
    email = request.args.get("email", "")
    return jsonify(list_tickets(email)), 200


@support_bp.post("/api/support")
def add_ticket():
    payload = request.get_json(silent=True) or {}
    ticket = create_ticket(payload)
    return jsonify(ticket), 201
