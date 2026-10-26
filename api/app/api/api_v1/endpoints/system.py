"""
System Time & Master Examination Clock Synchronizer Endpoint.
Authoritative time synchronization with Google Public NTP (time.google.com) in Indian Standard Time (IST).
"""
import logging
from fastapi import APIRouter
from app.core.master_clock import (
    get_master_clock_payload,
    sync_with_google_ntp,
    format_ist_now,
    get_current_ist_datetime,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/time")
def get_system_time():
    """
    Returns authoritative server time synced with time.google.com via NTP.
    Standardized to Indian Standard Time (IST, UTC+05:30).
    """
    return {
        "status": "success",
        "clock": get_master_clock_payload(),
    }


@router.post("/sync-clock")
def trigger_clock_sync():
    """
    Forces an immediate resynchronization with time.google.com (UDP port 123).
    """
    sync_res = sync_with_google_ntp()
    clock_payload = get_master_clock_payload()
    return {
        "status": "success",
        "sync_result": sync_res,
        "clock": clock_payload,
    }


from pydantic import BaseModel

class VerifyPinRequest(BaseModel):
    pin: str


@router.post("/verify-exit-pin")
def verify_kiosk_exit_pin(req: VerifyPinRequest):
    """
    Validates supervisor exit PIN against authoritative system date (YYYYMMDD).
    Never exposes the expected PIN in responses or error logs.
    """
    pin = req.pin.strip().replace(" ", "")
    from datetime import datetime, timezone
    today_local = datetime.now()
    today_utc = datetime.now(timezone.utc)
    try:
        today_ist = get_current_ist_datetime()
    except Exception:
        today_ist = today_local

    valid_pins = set()
    for dt in (today_local, today_utc, today_ist):
        valid_pins.add(dt.strftime("%Y%m%d"))
        valid_pins.add(dt.strftime("%Y-%m-%d"))
        valid_pins.add(dt.strftime("%d%m%Y"))
        valid_pins.add(dt.strftime("%d-%m-%Y"))

    if pin in valid_pins:
        return {
            "status": "success",
            "authorized": True,
            "message": "Invigilator authorization verified."
        }
    return {
        "status": "error",
        "authorized": False,
        "message": "Invalid invigilator authorization key."
    }

