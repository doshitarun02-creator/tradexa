from flask import jsonify

def api_response(success, data, message, status=200):
    return jsonify({"success": success, "data": data, "message": message}), status
