"""
Authoritative Examination Master Clock Synchronizer.
Synchronizes with Google Public NTP (time.google.com) and provides Indian Standard Time (IST, UTC+05:30).
"""
import socket
import struct
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Indian Standard Time: UTC+05:30
IST_OFFSET = timedelta(hours=5, minutes=30)
IST_TZ = timezone(IST_OFFSET, name="IST")

NTP_SERVER = "time.google.com"
NTP_PORT = 123
NTP_DELTA = 2208988800  # Seconds between 1900-01-01 (NTP epoch) and 1970-01-01 (Unix epoch)

_ntp_offset_seconds: float = 0.0
_last_ntp_sync: float = 0.0
_sync_status: str = "initialized"


def sync_with_google_ntp(timeout: float = 0.4) -> Dict[str, Any]:
    """Queries time.google.com on UDP port 123 to calculate atomic clock offset."""
    global _ntp_offset_seconds, _last_ntp_sync, _sync_status
    _last_ntp_sync = time.time()
    client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client.settimeout(timeout)
    # NTP v3 client mode request (0x1b = 00 011 011)
    req = b"\x1b" + 47 * b"\0"
    try:
        t_sent = time.time()
        client.sendto(req, (NTP_SERVER, NTP_PORT))
        data, _ = client.recvfrom(1024)
        t_recv = time.time()

        if len(data) >= 48:
            integ = struct.unpack("!I", data[40:44])[0]
            frac = struct.unpack("!I", data[44:48])[0]
            t_server = (integ - NTP_DELTA) + (frac / (2**32))

            round_trip = t_recv - t_sent
            _ntp_offset_seconds = t_server - ((t_sent + t_recv) / 2.0)
            _last_ntp_sync = t_recv
            _sync_status = "synchronized"
            logger.info("Master Clock synchronized with %s: offset=%.3f ms", NTP_SERVER, _ntp_offset_seconds * 1000)
            return {
                "success": True,
                "server": NTP_SERVER,
                "offset_ms": round(_ntp_offset_seconds * 1000, 2),
                "round_trip_ms": round(round_trip * 1000, 2),
                "sync_timestamp": _last_ntp_sync,
            }
    except Exception as e:
        logger.debug("Could not sync with NTP server %s: %s. Using local clock.", NTP_SERVER, e)
        _sync_status = "local_fallback"
    finally:
        client.close()

    return {
        "success": False,
        "server": NTP_SERVER,
        "offset_ms": round(_ntp_offset_seconds * 1000, 2),
        "status": _sync_status,
    }


def get_current_authoritative_timestamp() -> float:
    """Returns the server-authoritative timestamp adjusted by NTP offset."""
    global _last_ntp_sync
    if time.time() - _last_ntp_sync > 600:
        sync_with_google_ntp()
    return time.time() + _ntp_offset_seconds


def get_current_ist_datetime() -> datetime:
    """Returns authoritative datetime object in Indian Standard Time (IST)."""
    ts = get_current_authoritative_timestamp()
    return datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(IST_TZ)


def format_ist_now(fmt: str = "%d-%b-%Y %H:%M:%S IST") -> str:
    """Returns current IST time string (e.g. '11-Oct-2026 13:08:50 IST')."""
    return get_current_ist_datetime().strftime(fmt)


def format_timestamp_to_ist(ts: float, fmt: str = "%d-%b-%Y %H:%M:%S IST") -> str:
    """Converts a Unix timestamp into formatted Indian Standard Time."""
    dt = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(IST_TZ)
    return dt.strftime(fmt)


def get_master_clock_payload() -> Dict[str, Any]:
    """Provides full system time payload for API endpoints and UI status chips."""
    now_dt = get_current_ist_datetime()
    return {
        "source": NTP_SERVER,
        "ntp_synced": _sync_status == "synchronized",
        "status": _sync_status,
        "timezone": "IST (UTC+05:30)",
        "unix_timestamp": round(get_current_authoritative_timestamp(), 3),
        "ist_iso": now_dt.isoformat(),
        "ist_formatted": now_dt.strftime("%d-%b-%Y %H:%M:%S IST"),
        "time_only_ist": now_dt.strftime("%H:%M:%S"),
        "date_only_ist": now_dt.strftime("%d-%b-%Y"),
        "offset_ms": round(_ntp_offset_seconds * 1000, 2),
    }


# Initial sync on module load
try:
    sync_with_google_ntp()
except Exception:
    pass
