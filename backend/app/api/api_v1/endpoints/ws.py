import time
import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.ws_manager import ws_manager
from app.core.db import get_db
from app.core.tenant import DEFAULT_TENANT_ID
from app.services.exam_persistence import (
    persist_response_cloud_db,
    mark_attempt_submitted_cloud_db,
    resolve_exam_uuid
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/exam/{exam_id}")
async def exam_websocket_endpoint(websocket: WebSocket, exam_id: str):
    """
    Real-Time WebSocket channel for candidate exam session.
    Provides sub-second answer synchronization and live proctoring alerts.
    Persists all candidate responses directly into Supabase Cloud DB in real time.
    """
    channel = f"exam_{exam_id}"
    await ws_manager.connect(websocket, channel)

    # Send initial connection confirmation
    await websocket.send_text(json.dumps({
        "type": "CONNECTED",
        "channel": channel,
        "exam_id": exam_id,
        "server_time": time.time(),
        "cloud_db_connected": True,
        "message": "Real-time bidirectional CBT synchronization active."
    }))

    db = get_db()

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg_type = data.get("type")

                if msg_type == "PING":
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "server_time": time.time()
                    }))

                elif msg_type == "RESPONSE_UPDATE":
                    # Realtime response updated via WebSocket
                    q_id = str(data.get("question_id"))
                    ans = data.get("answer")
                    st = data.get("state", 1)
                    idemp_key = data.get("idempotency_key") or f"ws_{q_id}_{int(time.time()*1000)}"
                    cand_id = data.get("candidate_id")
                    reg_no = data.get("reg_no") or "5254740(V4.3.7)"
                    cand_name = data.get("candidate_name") or "NARESH S"

                    # 1. Direct Cloud DB Persistence
                    persist_res = persist_response_cloud_db(
                        db=db,
                        tenant_id=DEFAULT_TENANT_ID,
                        exam_id=exam_id,
                        question_id=q_id,
                        answer=ans,
                        state=st,
                        idempotency_key=idemp_key,
                        candidate_id=cand_id,
                        reg_no=reg_no,
                        candidate_name=cand_name,
                    )

                    # 2. Live Broadcast to Administrator Command Centre
                    await ws_manager.broadcast("admin_feed", {
                        "type": "CANDIDATE_RESPONSE",
                        "exam_id": exam_id,
                        "candidate_id": cand_id or persist_res.get("candidate_id"),
                        "candidate_name": cand_name,
                        "reg_no": reg_no,
                        "question_id": q_id,
                        "question_uuid": persist_res.get("question_uuid"),
                        "answer": ans,
                        "state": st,
                        "status": persist_res.get("status"),
                        "cloud_synced": persist_res.get("success", False),
                        "timestamp": time.time()
                    })

                    # 3. Fast Acknowledgement back to Candidate Console
                    await websocket.send_text(json.dumps({
                        "type": "ACK",
                        "question_id": q_id,
                        "cloud_synced": persist_res.get("success", False),
                        "status": persist_res.get("status"),
                        "timestamp": time.time()
                    }))

                elif msg_type == "SUBMIT_EXAM":
                    cand_id = data.get("candidate_id")
                    reg_no = data.get("reg_no")
                    cand_name = data.get("candidate_name") or "NARESH S"

                    mark_attempt_submitted_cloud_db(
                        db=db,
                        tenant_id=DEFAULT_TENANT_ID,
                        exam_id=exam_id,
                        candidate_id=cand_id,
                        reg_no=reg_no
                    )

                    await ws_manager.broadcast("admin_feed", {
                        "type": "CANDIDATE_SUBMITTED",
                        "exam_id": exam_id,
                        "candidate_name": cand_name,
                        "reg_no": reg_no,
                        "timestamp": time.time()
                    })

                    await websocket.send_text(json.dumps({
                        "type": "SUBMIT_ACK",
                        "status": "success",
                        "timestamp": time.time()
                    }))

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)
    except Exception as e:
        logger.warning(f"WebSocket error in {channel}: {e}")
        ws_manager.disconnect(websocket, channel)


@router.websocket("/ws/admin")
async def admin_websocket_endpoint(websocket: WebSocket):
    """
    Real-Time WebSocket channel for Administrator Command Centre.
    Receives live test-taker progress, submissions, questions edits, and database updates.
    """
    channel = "admin_feed"
    await ws_manager.connect(websocket, channel)

    await websocket.send_text(json.dumps({
        "type": "CONNECTED",
        "channel": channel,
        "server_time": time.time(),
        "cloud_db_connected": True,
        "message": "Command Centre Real-Time Feed Active."
    }))

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg_type = data.get("type")
                if msg_type == "PING":
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "server_time": time.time()
                    }))
                elif msg_type == "EXTEND_TIME":
                    exam_id = data.get("exam_id", "EX-1001")
                    extra_mins = int(data.get("extra_minutes", 15))
                    await ws_manager.broadcast(f"exam_{exam_id}", {
                        "type": "TIME_EXTENDED",
                        "exam_id": exam_id,
                        "extra_minutes": extra_mins,
                        "timestamp": time.time()
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)
    except Exception as e:
        logger.warning(f"Admin WebSocket error: {e}")
        ws_manager.disconnect(websocket, channel)


@router.get("/ws/status")
def get_ws_status():
    """Diagnostic health check for active WebSocket connections."""
    return {
        "status": "online",
        "stats": ws_manager.get_stats(),
        "server_time": time.time()
    }
