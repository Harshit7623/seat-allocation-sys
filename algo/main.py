# Application factory and configuration.
# Initializes the Flask app, sets up middleware (CORS, logging), and registers API blueprints.
import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from algo.config.settings import Config
from algo.database import ensure_demo_db, close_db

# Rate Limiting (graceful import)
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    LIMITER_AVAILABLE = True
except ImportError:
    LIMITER_AVAILABLE = False

# Import Blueprints
from algo.api.blueprints.sessions import session_bp
from algo.api.blueprints.students import student_bp
from algo.api.blueprints.allocations import allocation_bp
from algo.api.blueprints.pdf import pdf_bp
from algo.api.blueprints.classrooms import classrooms_bp
from algo.api.blueprints.dashboard import dashboard_bp
from algo.api.blueprints.admin import auth_bp, admin_bp
from algo.api.blueprints.health import health_bp
from algo.api.blueprints.feedback import feedback_bp
from algo.api.blueprints.database import database_bp
from algo.api.blueprints.templates import templates_bp
from algo.api.blueprints.master_plan_pdf import master_plan_bp


def create_app(test_config=None):
    # Setup Logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(Config.LOG_FILE),
            logging.StreamHandler()
        ]
    )
    logger = logging.getLogger(__name__)
    logger.info("Initializing Modular Flask Application...")
    
    app = Flask(__name__, instance_relative_config=True)
    
    # Configuration
    app.config.from_object(Config)
    if test_config:
        app.config.from_mapping(test_config)
        
    # Ensure instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
        
    # Extensions - CORS with environment-aware origins
    allowed_origins = os.getenv('ALLOWED_ORIGINS', '*')
    if allowed_origins != '*':
        # Parse comma-separated origins for production
        origins_list = [o.strip() for o in allowed_origins.split(',')]
        CORS(app, resources={r"/api/*": {"origins": origins_list}})
        logger.info(f"CORS configured for: {origins_list}")
    else:
        # Development mode - allow all (log warning in production)
        CORS(app, resources={r"/api/*": {"origins": "*"}})
        if os.getenv('FLASK_ENV') == 'production':
            logger.warning("⚠️  CORS allows all origins! Set ALLOWED_ORIGINS in production.")
    
    # Rate Limiting - protect auth endpoints from brute force
    if LIMITER_AVAILABLE:
        limiter = Limiter(
            get_remote_address,
            app=app,
            default_limits=["200 per day", "50 per hour"],
            storage_uri=os.getenv('RATELIMIT_STORAGE_URL', 'memory://'),
        )
        # Store limiter on app for use in blueprints
        app.limiter = limiter
        logger.info("✅ Rate limiting enabled")
    else:
        app.limiter = None
        logger.warning("⚠️  Flask-Limiter not installed. Rate limiting disabled.")
    
    # Database Setup
    with app.app_context():
        ensure_demo_db()
        
    @app.teardown_appcontext
    def teardown_db(exception):
        close_db(exception)
        
    # Register Blueprints
    app.register_blueprint(database_bp)
    app.register_blueprint(session_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(allocation_bp)
    app.register_blueprint(pdf_bp)
    app.register_blueprint(classrooms_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(templates_bp)
    app.register_blueprint(master_plan_bp)
    
    from algo.api.blueprints.plans import plans_bp
    app.register_blueprint(plans_bp)
    app.register_blueprint(health_bp)
    
    # Global Activity Tracking (Middleware)
    from algo.database.queries.user_queries import UserQueries
    
    @app.after_request
    def track_activity(response):
        if request.path.startswith('/static') or request.method == 'OPTIONS':
            return response
        
        # Use request.user_id if available (after token_required)
        user_id = getattr(request, 'user_id', None)
        if not user_id:
            return response
            
        try:
             UserQueries.track_activity(user_id, request.path)
        except Exception:
             pass # Fail silently
        
        return response

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=8000)