from app import create_app
from app.database.db_connection import ping_db
import os

app = create_app()

# Fail fast if MongoDB is unreachable
ping_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
