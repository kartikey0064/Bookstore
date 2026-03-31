from collections import Counter
from datetime import date, datetime, timedelta, timezone

from ..database.db_connection import get_db


def _serialize_order(doc):
    created_at = doc.get("created_at")
    return {
        "id": str(doc.get("_id")),
        "userEmail": doc.get("user_email", ""),
        "items": doc.get("items", []),
        "subtotal": doc.get("subtotal", 0),
        "shipping": doc.get("shipping", 0),
        "total": doc.get("total", 0),
        "status": doc.get("status", "Processing"),
        "createdAt": created_at.isoformat() if created_at else None,
    }


def _safe_date(value):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).date()
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value.strip():
        try:
            normalized = value.strip().replace("Z", "+00:00")
            return datetime.fromisoformat(normalized).astimezone(timezone.utc).date()
        except ValueError:
            return None
    return None


def _parse_requested_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError("dates must use YYYY-MM-DD format") from exc


def _book_categories(book):
    raw_categories = book.get("categories")
    if isinstance(raw_categories, list):
        categories = [str(value).strip() for value in raw_categories if str(value).strip()]
        if categories:
            return categories

    primary = str(book.get("category") or "").strip()
    return [primary] if primary else ["Uncategorized"]


def _date_span(start_date, end_date):
    return (end_date - start_date).days + 1


def _date_series(start_date, end_date):
    return [start_date + timedelta(days=offset) for offset in range(_date_span(start_date, end_date))]


def _month_floor(value):
    return date(value.year, value.month, 1)


def _next_month(value):
    if value.month == 12:
        return date(value.year + 1, 1, 1)
    return date(value.year, value.month + 1, 1)


def _month_series(start_date, end_date):
    months = []
    current = _month_floor(start_date)
    last = _month_floor(end_date)
    while current <= last:
        months.append(current)
        current = _next_month(current)
    return months


def _month_label(value):
    return value.strftime("%b %Y")


def _previous_range(start_date, end_date):
    span = _date_span(start_date, end_date)
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=span - 1)
    return previous_start, previous_end


def _is_in_range(value, start_date, end_date):
    return value is not None and start_date <= value <= end_date


def _trend_percent(current_total, previous_total):
    if previous_total == 0:
        if current_total == 0:
            return 0.0
        return 100.0
    return round(((current_total - previous_total) / previous_total) * 100, 1)


def _trend_direction(value):
    if value > 0:
        return "up"
    if value < 0:
        return "down"
    return "flat"


def _format_label(day, span):
    if span > 31:
        return day.strftime("%d %b")
    return day.strftime("%d %b")


def _resolve_range(start_date=None, end_date=None):
    if start_date and end_date:
        resolved_start = _parse_requested_date(start_date)
        resolved_end = _parse_requested_date(end_date)
    elif start_date or end_date:
        raise ValueError("both startDate and endDate are required")
    else:
        resolved_end = datetime.now(timezone.utc).date()
        resolved_start = resolved_end - timedelta(days=6)

    if resolved_end < resolved_start:
        raise ValueError("endDate cannot be earlier than startDate")

    return resolved_start, resolved_end


def get_admin_dashboard_snapshot(start_date=None, end_date=None):
    db = get_db()
    resolved_start, resolved_end = _resolve_range(start_date, end_date)
    previous_start, previous_end = _previous_range(resolved_start, resolved_end)
    current_dates = _date_series(resolved_start, resolved_end)
    current_date_set = set(current_dates)
    previous_date_set = set(_date_series(previous_start, previous_end))

    books = list(db.books.find())
    order_docs = list(db.orders.find().sort("created_at", -1))
    user_docs = list(db.users.find({"role": {"$nin": ["admin", "super_admin"]}}))
    month_points = _month_series(resolved_start, resolved_end)

    filtered_orders = []
    recent_orders = []
    revenue_map = {day: 0.0 for day in current_dates}
    orders_map = {day: 0 for day in current_dates}
    revenue_month_map = {month: 0.0 for month in month_points}
    current_total = 0.0
    previous_total = 0.0

    for doc in order_docs:
        order_date = _safe_date(doc.get("created_at"))
        total = float(doc.get("total") or 0)
        if not order_date:
            continue

        if order_date in current_date_set:
            filtered_orders.append(doc)
            if len(recent_orders) < 8:
                recent_orders.append(doc)
            revenue_map[order_date] += total
            orders_map[order_date] += 1
            revenue_month_map[_month_floor(order_date)] += total
            current_total += total
        elif order_date in previous_date_set:
            previous_total += total

    filtered_books = [
        book for book in books
        if _is_in_range(_safe_date(book.get("created_at") or book.get("createdAt")), resolved_start, resolved_end)
    ]
    if not filtered_books and not start_date and not end_date:
        filtered_books = books

    range_user_docs = [
        user for user in user_docs
        if _is_in_range(_safe_date(user.get("created_at")), resolved_start, resolved_end)
    ]
    users_month_map = {month: 0 for month in month_points}
    for user in range_user_docs:
        created_date = _safe_date(user.get("created_at"))
        if created_date:
            users_month_map[_month_floor(created_date)] += 1

    active_user_emails = {
        str(doc.get("user_email") or "").strip().lower()
        for doc in filtered_orders
        if str(doc.get("user_email") or "").strip()
    }

    total_users = len(range_user_docs) or len(active_user_emails)
    total_books = len(filtered_books)
    total_orders = len(filtered_orders)
    total_revenue = round(sum(float(doc.get("total") or 0) for doc in filtered_orders), 2)

    rated_books = [float(book.get("rating") or 0) for book in filtered_books if float(book.get("rating") or 0) > 0]
    average_rating = round(sum(rated_books) / len(rated_books), 1) if rated_books else 0.0
    books_month_map = {month: 0 for month in month_points}
    ratings_month_map = {month: {"sum": 0.0, "count": 0} for month in month_points}
    for book in filtered_books:
        created_date = _safe_date(book.get("created_at") or book.get("createdAt"))
        if not created_date:
            continue
        month_key = _month_floor(created_date)
        books_month_map[month_key] += 1
        rating = float(book.get("rating") or 0)
        if rating > 0:
            ratings_month_map[month_key]["sum"] += rating
            ratings_month_map[month_key]["count"] += 1

    category_counts = Counter(
        category
        for book in filtered_books
        for category in _book_categories(book)
    )
    books_by_category = [
        {"label": category, "value": count}
        for category, count in category_counts.most_common()
    ]

    span = _date_span(resolved_start, resolved_end)
    revenue_over_time = [
        {"label": _format_label(day, span), "value": round(revenue_map[day], 2)}
        for day in current_dates
    ]
    orders_over_time = [
        {"label": _format_label(day, span), "value": orders_map[day]}
        for day in current_dates
    ]
    users_over_time = [
        {"label": _month_label(month), "value": users_month_map[month]}
        for month in month_points
    ]
    books_over_time = [
        {"label": _month_label(month), "value": books_month_map[month]}
        for month in month_points
    ]
    ratings_over_time = [
        {
            "label": _month_label(month),
            "value": round(
                ratings_month_map[month]["sum"] / ratings_month_map[month]["count"],
                1,
            ) if ratings_month_map[month]["count"] else 0,
        }
        for month in month_points
    ]
    revenue_by_month = [
        {"label": _month_label(month), "value": round(revenue_month_map[month], 2)}
        for month in month_points
    ]

    trend_percent = _trend_percent(current_total, previous_total)
    has_data = bool(total_orders or total_books or total_users or total_revenue)

    return {
        "meta": {
            "startDate": resolved_start.isoformat(),
            "endDate": resolved_end.isoformat(),
            "previousStartDate": previous_start.isoformat(),
            "previousEndDate": previous_end.isoformat(),
            "spanDays": span,
            "hasData": has_data,
        },
        "metrics": {
            "totalUsers": total_users,
            "totalBooks": total_books,
            "totalOrders": total_orders,
            "averageRating": average_rating,
            "totalRevenue": total_revenue,
            "revenueTrendPercent": abs(trend_percent),
            "revenueTrendDirection": _trend_direction(trend_percent),
        },
        "charts": {
            "revenueOverTime": revenue_over_time,
            "ordersOverTime": orders_over_time,
            "booksByCategory": books_by_category,
            "usersOverTime": users_over_time,
            "booksOverTime": books_over_time,
            "ratingsOverTime": ratings_over_time,
            "revenueByMonth": revenue_by_month,
        },
        "recentOrders": [_serialize_order(doc) for doc in recent_orders],
    }
