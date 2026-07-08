class PaginationError(Exception):
    pass

def parse_pagination(request_args, default_limit=20, max_limit=50):
    try:
        page = int(request_args.get("page", 1))
    except (TypeError, ValueError):
        raise PaginationError("Invalid 'page' parameter")

    try:
        limit = int(request_args.get("limit", default_limit))
    except (TypeError, ValueError):
        raise PaginationError("Invalid 'limit' parameter")

    if page < 1:
        page = 1
    if limit < 1:
        limit = default_limit
    if limit > max_limit:
        limit = max_limit

    skip = (page - 1) * limit
    return page, limit, skip
