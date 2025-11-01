# app.py - FIXED VERSION
from flask import Flask, redirect, url_for
from flask_login import LoginManager, current_user
from dotenv import load_dotenv
import os
from utils import to_ist


# Load environment variables
load_dotenv()

from config import Config
from models import db, User
from auth import auth_bp
from admin_routes import admin_bp
from public_routes import public_bp


def create_app():
    """Application factory pattern"""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)

    # Setup Flask-Login
    login_manager = LoginManager()
    login_manager.login_view = "auth.login"  # type: ignore
    login_manager.login_message = "⚠️ Please login to access this page."
    login_manager.login_message_category = "warning"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id: str):
        """Load user by ID for Flask-Login"""
        try:
            return User.query.get(int(user_id))
        except (ValueError, TypeError):
            return None

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(public_bp)  # Public uses root URLs
    app.jinja_env.filters["to_ist"] = to_ist

    # Create tables if they don't exist
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created/verified")
        except Exception as e:
            print(f"⚠️ Database initialization error: {e}")
            # Log error but don't crash - useful for first deployment

    # CLI commands
    @app.cli.command("seed")
    def seed_command():
        """Seed the database with sample data"""
        from utils import seed_data
        with app.app_context():
            seed_data()

    @app.cli.command("reset-db")
    def reset_db_command():
        """Reset the database (WARNING: Deletes all data)"""
        from utils import reset_database
        with app.app_context():
            reset_database()

    @app.cli.command("create-admin")
    def create_admin_command():
        """Create a new admin user"""
        email = input("Enter admin email: ")
        password = input("Enter admin password: ")
        
        with app.app_context():
            existing = User.query.filter_by(email=email).first()
            if existing:
                print(f"❌ User with email {email} already exists!")
                return
            
            admin = User()
            admin.email = email
            admin.is_admin = True
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            print(f"✅ Admin user created: {email}")

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        """Handle 404 errors"""
        return redirect(url_for("public.index"))

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        db.session.rollback()
        return redirect(url_for("public.index"))

    # Context processor for templates
    @app.context_processor
    def inject_user():
        """Make current_user available in all templates"""
        from flask_wtf.csrf import generate_csrf
        return dict(current_user=current_user, csrf_token=generate_csrf)

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    # Disable debug in production
    debug_mode = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)