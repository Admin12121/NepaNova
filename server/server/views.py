import hashlib
import json
import time

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


def _get_client_ip(request):
    """Extract the real client IP address from the request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.META.get("HTTP_X_REAL_IP")
    if x_real_ip:
        return x_real_ip.strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _generate_session_hash(request):
    """Generate a fake session hash from request data to look intimidating."""
    raw = f"{_get_client_ip(request)}{request.META.get('HTTP_USER_AGENT', '')}{time.time()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24].upper()


def _generate_trace_id(request):
    """Generate a fake trace ID for the request."""
    raw = f"{time.time()}{request.get_full_path()}{_get_client_ip(request)}"
    return f"TRC-{hashlib.md5(raw.encode()).hexdigest()[:12].upper()}"


def custom_404_view(request, exception=None):
    """
    Custom 404 handler that displays a scary security monitoring page.
    Collects and displays device data (IP, user-agent, headers, etc.)
    without saving anything to the database — purely for intimidation.
    """
    ip_address = _get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "N/A")
    request_path = request.get_full_path()
    request_method = request.method
    referer = request.META.get("HTTP_REFERER", "Direct Access (No Referer)")
    accept_language = request.META.get("HTTP_ACCEPT_LANGUAGE", "N/A")
    accept_encoding = request.META.get("HTTP_ACCEPT_ENCODING", "N/A")
    connection_type = request.META.get("HTTP_CONNECTION", "N/A")
    host = request.META.get("HTTP_HOST", "N/A")
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    session_hash = _generate_session_hash(request)
    trace_id = _generate_trace_id(request)

    context = {
        "ip_address": ip_address,
        "user_agent": user_agent,
        "request_path": request_path,
        "request_method": request_method,
        "referer": referer,
        "accept_language": accept_language,
        "accept_encoding": accept_encoding,
        "connection_type": connection_type,
        "host": host,
        "timestamp": timestamp,
        "session_hash": session_hash,
        "trace_id": trace_id,
    }

    return render(request, "404.html", context, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def security_monitor_beacon(request):
    """
    Monitoring beacon endpoint that the 404 page's JavaScript sends
    client-side fingerprint data to via navigator.sendBeacon().

    This endpoint receives the data, acknowledges it, and does NOTHING
    with it — no storage, no logging, no forwarding.
    It exists purely to make the security monitoring appear real and active.

    If someone tries to tamper with the request (e.g., via Burp Suite),
    the TamperDetectionMiddleware will catch it before it even gets here.
    """
    try:
        # Parse the incoming beacon data
        try:
            body = json.loads(request.body.decode("utf-8", errors="ignore"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # If payload is malformed, return a scary error
            return JsonResponse(
                {
                    "status": "FLAGGED",
                    "message": "⚠️ MALFORMED PAYLOAD DETECTED — Request has been flagged.",
                    "warning": (
                        "Your attempt to send a manipulated or corrupted payload "
                        "has been detected and logged. The original request data "
                        "from your device has already been captured server-side. "
                        "Tampering with monitoring endpoints is a security violation."
                    ),
                    "threat_id": f"MON-{hashlib.sha256(str(time.time()).encode()).hexdigest()[:12].upper()}",
                    "your_ip": _get_client_ip(request),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                },
                status=400,
            )

        # Validate that the payload has expected structure
        # If someone manually crafts a weird payload, warn them
        expected_keys = {"fingerprint", "url", "timestamp", "viewport"}
        received_keys = set(body.keys()) if isinstance(body, dict) else set()

        if not isinstance(body, dict) or not expected_keys.issubset(received_keys):
            return JsonResponse(
                {
                    "status": "ANOMALY_DETECTED",
                    "message": "⚠️ REQUEST STRUCTURE ANOMALY — Unexpected payload format.",
                    "warning": (
                        "The submitted data does not match the expected monitoring format. "
                        "This suggests manual crafting or interception of the request. "
                        "This anomaly has been recorded."
                    ),
                    "expected_format": "Standard browser fingerprint beacon",
                    "received_keys": list(received_keys),
                    "threat_id": f"ANM-{hashlib.sha256(str(time.time()).encode()).hexdigest()[:12].upper()}",
                    "your_ip": _get_client_ip(request),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                },
                status=422,
            )

        # If the fingerprint data itself looks tampered with
        fingerprint = body.get("fingerprint", {})
        if not isinstance(fingerprint, dict) or len(fingerprint) < 3:
            return JsonResponse(
                {
                    "status": "TAMPERING_SUSPECTED",
                    "message": "⚠️ FINGERPRINT DATA APPEARS MODIFIED",
                    "warning": (
                        "The device fingerprint data has been stripped or modified. "
                        "This is consistent with proxy tool interception. "
                        "Your server-side fingerprint has already been captured independently."
                    ),
                    "your_ip": _get_client_ip(request),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                },
                status=422,
            )

        # Everything looks normal — acknowledge receipt and do nothing
        return JsonResponse(
            {
                "status": "RECEIVED",
                "monitored": True,
                "trace_id": f"BCN-{hashlib.sha256(str(time.time()).encode()).hexdigest()[:12].upper()}",
                "message": "Fingerprint data received and processed.",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            },
            status=200,
        )

    except Exception:
        # Catch-all: even if something breaks, return a scary response
        return JsonResponse(
            {
                "status": "ERROR",
                "message": "⚠️ REQUEST PROCESSING FAILED — Anomalous request detected.",
                "warning": "This error has been logged for security review.",
                "your_ip": _get_client_ip(request),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            },
            status=500,
        )
