from pathlib import Path
import os

from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_cors import CORS

from .extensions import mail
from .routes.auth_routes import auth_bp
from .routes.book_routes import book_bp
from .routes.review_routes import review_bp
from .routes.wishlist_routes import wishlist_bp
from .routes.order_routes import order_bp
from .routes.support_routes import support_bp
from .routes.profile_routes import profile_bp
from .routes.recommendation_routes import recommendation_bp


def create_app():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env_path)
    app = Flask(__name__)
    app.config.update(
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_USE_TLS=os.getenv("MAIL_USE_TLS", "true").strip().lower() == "true",
        MAIL_USE_SSL=os.getenv("MAIL_USE_SSL", "false").strip().lower() == "true",
        MAIL_USERNAME=os.getenv("SMTP_EMAIL", "").strip(),
        MAIL_PASSWORD=os.getenv("SMTP_PASSWORD", "").strip(),
        MAIL_DEFAULT_SENDER=os.getenv("SMTP_EMAIL", "").strip(),
    )
    mail.init_app(app)

    # Allow frontend dev server to call the API
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(book_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(wishlist_bp)
    app.register_blueprint(order_bp)
    app.register_blueprint(support_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(recommendation_bp)

    @app.errorhandler(ValueError)
    def handle_value_error(err):
        return jsonify({"error": str(err)}), 400

    return app
