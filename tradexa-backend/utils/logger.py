import logging
import json
import sys
from flask import g, has_request_context

class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        if has_request_context():
            payload["request_id"] = getattr(g, "request_id", None)
            payload["user_id"] = getattr(g, "user_id", None)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def setup_logger():
    logger = logging.getLogger("tradexa")
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.handlers = [handler]
    logger.propagate = False  # Avoid duplicate logging in Flask default stream
    return logger


logger = setup_logger()
