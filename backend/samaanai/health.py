from django.http import JsonResponse
from django.db import connection
from django.db.utils import OperationalError

def health_check(request):
    """
    Simple health check that verifies database connectivity.
    Used by Cloud Run for startup and liveness probes.
    """
    formatted_response = {
        "status": "ok",
        "database": "unknown"
    }
    
    try:
        connection.ensure_connection()
        formatted_response["database"] = "connected"
    except OperationalError:
        formatted_response["status"] = "error"
        formatted_response["database"] = "disconnected"
        return JsonResponse(formatted_response, status=503)

    return JsonResponse(formatted_response, status=200)
