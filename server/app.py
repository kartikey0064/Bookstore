from app import create_app
from app.database.db_connection import ping_db
import os

app = create_app()

if __name__ == "__main__":
    try:
        ping_db()
    except Exception as exc:
        app.logger.warning("Database ping failed during startup: %s", exc)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
