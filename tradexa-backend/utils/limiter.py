from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Storage backend is in-memory by default (memory://).
# If running across multiple worker processes in production,
# a Redis/Mongo-backed storage_uri is recommended.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
)
