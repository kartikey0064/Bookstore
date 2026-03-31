from flask import Blueprint, jsonify, request

from ..services.dashboard_service import get_admin_dashboard_snapshot


dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/api/admin/dashboard")
def admin_dashboard():
    try:
        data = get_admin_dashboard_snapshot(
            start_date=request.args.get("startDate"),
            end_date=request.args.get("endDate"),
        )
        return jsonify(data), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
