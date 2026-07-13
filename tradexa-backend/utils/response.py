from flask import jsonify


def api_response(success, data, message="", status=None):
    """
    Single normalized envelope for every API response in the app:
    { "success": bool, "data": {...}, "message": str }
    status defaults to 200 on success, 400 on failure if not specified.
    """
    if status is None:
        status = 200 if success else 400
    payload = {
        "success": bool(success),
        "data": data if data is not None else {},
        "message": message or "",
    }
    return jsonify(payload), status
