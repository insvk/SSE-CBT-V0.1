import sys
import os
import uuid
import datetime
from typing import Dict, Any, List

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.db import get_db
from app.core.tenant import DEFAULT_TENANT_ID, ensure_tenant_exists
from app.core.master_clock import format_ist_now

ACTIVE_EXAM_ID = "ff9838dc-c81d-4492-85c8-4ab0cec7f3ad"

CANDIDATES_DATA = [
    # Slot A (Morning Shift)
    {
        "id": "c0000001-0000-0000-0000-000000000001",
        "full_name": "Aarav Sharma",
        "reg_no": "SSE-A-CBT-0001",
        "batch": "A",
        "category": "General",
        "gender": "Male",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-A-0001",
        "room_number": "LAB-01 (Block-A)",
        "email": "aarav.sharma@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 99.2,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000002",
        "full_name": "Priya Venkatesh",
        "reg_no": "SSE-A-CBT-0002",
        "batch": "A",
        "category": "OBC-NCL",
        "gender": "Female",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-A-0002",
        "room_number": "LAB-01 (Block-A)",
        "email": "priya.venkatesh@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 98.7,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000003",
        "full_name": "Rohan Sundaram",
        "reg_no": "SSE-A-CBT-0003",
        "batch": "A",
        "category": "General",
        "gender": "Male",
        "is_pwd": True,
        "has_scribe": True,
        "disability_type": "Locomotor Disability",
        "compensatory_minutes": 60,
        "assigned_terminal": "T-A-0003",
        "room_number": "LAB-01 (Block-A)",
        "email": "rohan.sundaram@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 98.4,
    },

    # Slot B (Midday Shift)
    {
        "id": "c0000001-0000-0000-0000-000000000004",
        "full_name": "Ananya Deshmukh",
        "reg_no": "SSE-B-CBT-0001",
        "batch": "B",
        "category": "General",
        "gender": "Female",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-B-0001",
        "room_number": "LAB-02 (Block-B)",
        "email": "ananya.deshmukh@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 99.0,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000005",
        "full_name": "Mohammed Zeeshan",
        "reg_no": "SSE-B-CBT-0002",
        "batch": "B",
        "category": "OBC-NCL",
        "gender": "Male",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-B-0002",
        "room_number": "LAB-02 (Block-B)",
        "email": "mohammed.zeeshan@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 98.9,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000006",
        "full_name": "Kavitha Rajendran",
        "reg_no": "SSE-B-CBT-0003",
        "batch": "B",
        "category": "SC",
        "gender": "Female",
        "is_pwd": True,
        "has_scribe": False,
        "disability_type": "Low Vision",
        "compensatory_minutes": 40,
        "assigned_terminal": "T-B-0003",
        "room_number": "LAB-02 (Block-B)",
        "email": "kavitha.rajendran@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 97.9,
    },

    # Slot C (Afternoon Shift)
    {
        "id": "c0000001-0000-0000-0000-000000000007",
        "full_name": "Vikramaditya Verma",
        "reg_no": "SSE-C-CBT-0001",
        "batch": "C",
        "category": "General",
        "gender": "Male",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-C-0001",
        "room_number": "LAB-03 (Block-C)",
        "email": "vikram.verma@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 99.4,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000008",
        "full_name": "Deepa Subramanian",
        "reg_no": "SSE-C-CBT-0002",
        "batch": "C",
        "category": "OBC-NCL",
        "gender": "Female",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-C-0002",
        "room_number": "LAB-03 (Block-C)",
        "email": "deepa.subramanian@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 98.5,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000009",
        "full_name": "Karthik Nambiar",
        "reg_no": "SSE-C-CBT-0003",
        "batch": "C",
        "category": "ST",
        "gender": "Male",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-C-0003",
        "room_number": "LAB-03 (Block-C)",
        "email": "karthik.nambiar@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 98.1,
    },

    # Slot D (Evening Shift)
    {
        "id": "c0000001-0000-0000-0000-000000000010",
        "full_name": "Sneha Mukherjee",
        "reg_no": "SSE-D-CBT-0001",
        "batch": "D",
        "category": "General",
        "gender": "Female",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-D-0001",
        "room_number": "LAB-04 (Block-D)",
        "email": "sneha.mukherjee@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 99.1,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000011",
        "full_name": "Tanmay Joshi",
        "reg_no": "SSE-D-CBT-0002",
        "batch": "D",
        "category": "EWS",
        "gender": "Male",
        "is_pwd": False,
        "has_scribe": False,
        "disability_type": "",
        "compensatory_minutes": 0,
        "assigned_terminal": "T-D-0002",
        "room_number": "LAB-04 (Block-D)",
        "email": "tanmay.joshi@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 98.8,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000012",
        "full_name": "Meera Krishnan",
        "reg_no": "SSE-D-CBT-0003",
        "batch": "D",
        "category": "General",
        "gender": "Female",
        "is_pwd": True,
        "has_scribe": True,
        "disability_type": "Locomotor Disability",
        "compensatory_minutes": 60,
        "assigned_terminal": "T-D-0003",
        "room_number": "LAB-04 (Block-D)",
        "email": "meera.krishnan@sse.cbt.in",
        "password": "Candidate.2026@",
        "biometric_score": 98.3,
    },
]

BIO_EVS_QUESTIONS = [
    {
        "id": "b0000001-0000-0000-0000-000000000001",
        "type": "mcq_single",
        "subject": "Biology",
        "difficulty": "Easy",
        "content": {"statement": "Which cell organelle is known as the powerhouse of the cell, responsible for ATP synthesis?"},
        "options": ["Ribosome", "Mitochondria", "Endoplasmic Reticulum", "Golgi Apparatus"],
        "correct_answer": "B",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000002",
        "type": "mcq_single",
        "subject": "Biology",
        "difficulty": "Medium",
        "content": {"statement": "In the process of photosynthesis, what is the primary light-absorbing pigment in higher plants?"},
        "options": ["Carotenoid", "Chlorophyll a", "Anthocyanin", "Xanthophyll"],
        "correct_answer": "B",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000003",
        "type": "mcq_single",
        "subject": "Environmental Studies",
        "difficulty": "Easy",
        "content": {"statement": "Which layer of the Earth's atmosphere contains the highest concentration of ozone that shields against UV radiation?"},
        "options": ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere"],
        "correct_answer": "B",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000004",
        "type": "mcq_single",
        "subject": "Environmental Studies",
        "difficulty": "Medium",
        "content": {"statement": "What phenomenon refers to the progressive increase in the concentration of toxic substances up the trophic levels of a food chain?"},
        "options": ["Eutrophication", "Biomagnification", "Bioaccumulation", "Salinization"],
        "correct_answer": "B",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000005",
        "type": "mcq_single",
        "subject": "Biology",
        "difficulty": "Medium",
        "content": {"statement": "Which enzyme unwinds the double helix DNA during the replication process?"},
        "options": ["DNA Polymerase", "DNA Ligase", "DNA Helicase", "RNA Primase"],
        "correct_answer": "C",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000006",
        "type": "mcq_single",
        "subject": "Environmental Studies",
        "difficulty": "Easy",
        "content": {"statement": "Which international environmental treaty was adopted in 1987 specifically to phase out ozone-depleting substances?"},
        "options": ["Kyoto Protocol", "Paris Agreement", "Montreal Protocol", "Ramsar Convention"],
        "correct_answer": "C",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000007",
        "type": "mcq_single",
        "subject": "Biology",
        "difficulty": "Hard",
        "content": {"statement": "In human physiology, the loop of Henle is situated in which organ and functions primarily in osmoregulation?"},
        "options": ["Liver", "Kidney", "Pancreas", "Spleen"],
        "correct_answer": "B",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000008",
        "type": "mcq_single",
        "subject": "Environmental Studies",
        "difficulty": "Medium",
        "content": {"statement": "Excessive agricultural runoff rich in nitrates and phosphates into freshwater bodies primarily causes which environmental issue?"},
        "options": ["Acid Rain", "Eutrophication", "Desertification", "Thermal Inversion"],
        "correct_answer": "B",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000009",
        "type": "mcq_single",
        "subject": "Biology",
        "difficulty": "Medium",
        "content": {"statement": "According to Mendelian genetics, what is the expected phenotypic ratio in the F2 generation of a monohybrid cross with complete dominance?"},
        "options": ["9:3:3:1", "1:2:1", "3:1", "2:1"],
        "correct_answer": "C",
    },
    {
        "id": "b0000001-0000-0000-0000-000000000010",
        "type": "mcq_single",
        "subject": "Environmental Studies",
        "difficulty": "Hard",
        "content": {"statement": "Which of the following greenhouse gases has the highest Global Warming Potential (GWP) on a 100-year timescale relative to CO2?"},
        "options": ["Methane (CH4)", "Nitrous Oxide (N2O)", "Sulfur Hexafluoride (SF6)", "Water Vapor (H2O)"],
        "correct_answer": "C",
    },
]

def seed_database():
    db = get_db()
    ensure_tenant_exists(db, DEFAULT_TENANT_ID)
    print(f"[1/4] Supabase Tenant verified: {DEFAULT_TENANT_ID}")

    # 1. Clean up stale mock/artifact candidate records (excluding test IDs)
    try:
        stale_res = db.table("candidates").select("id, registration_number, full_name").execute()
        for cand in (stale_res.data or []):
            cid = str(cand["id"])
            cname = cand.get("full_name", "")
            # Only remove dummy rows like "Candidate", "Candidate SSE-A-CBT-1B9F", or non-seeded rows
            if cname in ("Candidate", "Candidate SSE-A-CBT-1B9F", "Candidate SSE-A-CBT-3927", "Scorecard Test Candidate", "Candidate SSE-A-CBT-0002"):
                try:
                    db.table("exam_attempts").delete().eq("candidate_id", cid).execute()
                    db.table("candidates").delete().eq("id", cid).execute()
                    print(f"Cleaned up stale candidate artifact: {cname} ({cid})")
                except Exception as ex:
                    print(f"Cleanup note: {ex}")
    except Exception as e:
        print(f"Cleanup check: {e}")

    # 2. Seed Candidates into Supabase Cloud DB
    print("[2/4] Seeding authoritative candidates across Slots A, B, C, D...")
    now_ist = format_ist_now()
    seed_cands_inserted = 0

    for c in CANDIDATES_DATA:
        cand_id = c["id"]
        reg_no = c["reg_no"]
        slot = c["batch"]

        slot_schedule = {
            "A": {"timing": "Subject Paper Slot A", "reporting": "Subject Slot A", "lab": "LAB-01 (Block-A)"},
            "B": {"timing": "Subject Paper Slot B", "reporting": "Subject Slot B", "lab": "LAB-02 (Block-B)"},
            "C": {"timing": "Subject Paper Slot C", "reporting": "Subject Slot C", "lab": "LAB-03 (Block-C)"},
            "D": {"timing": "Subject Paper Slot D", "reporting": "Subject Slot D", "lab": "LAB-04 (Block-D)"},
        }[slot]

        candidate_record = {
            "id": cand_id,
            "tenant_id": DEFAULT_TENANT_ID,
            "registration_number": reg_no,
            "full_name": c["full_name"],
            "metadata": {
                "batch": slot,
                "status": "active",
                "email": c["email"],
                "password": c["password"],
                "roll_number": reg_no,
                "category": c["category"],
                "gender": c["gender"],
                "is_pwd": c["is_pwd"],
                "has_scribe": c["has_scribe"],
                "disability_type": c["disability_type"],
                "compensatory_minutes": c["compensatory_minutes"],
                "assigned_terminal": c["assigned_terminal"],
                "room_number": c["room_number"],
                "test_center_name": "SSE Digital Assessment Hub, Campus Block-A, Chennai - 602105",
                "test_center_code": "SSEC-TN-042",
                "reporting_time_ist": slot_schedule["reporting"],
                "slot_timing_ist": slot_schedule["timing"],
                "biometric_status": "verified",
                "biometric_score": c["biometric_score"],
                "exam_status": "assigned",
                "created_at_ist": now_ist,
                "registered_at_ist": now_ist,
            }
        }

        try:
            db.table("candidates").upsert(candidate_record).execute()
            seed_cands_inserted += 1
            print(f"  + Synced: {c['full_name']:<22} | {reg_no} | Slot {slot} | {c['assigned_terminal']}")
        except Exception as e:
            print(f"  x Failed candidate {reg_no}: {e}")

    # 3. Seed Biology & EVS Questions into question_bank
    print("[3/4] Seeding authentic Biology & Environmental Studies questions into question_bank...")
    q_ids_seeded = []
    for q in BIO_EVS_QUESTIONS:
        qid = q["id"]
        q_record = {
            "id": qid,
            "tenant_id": DEFAULT_TENANT_ID,
            "type": q["type"],
            "subject": q["subject"],
            "difficulty": q["difficulty"],
            "content": q["content"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "status": "approved",
            "version": 1,
        }
        try:
            db.table("question_bank").upsert(q_record).execute()
            q_ids_seeded.append(qid)
            print(f"  + Synced Question: {qid} [{q['subject']}] - {q['content']['statement'][:45]}...")
        except Exception as e:
            print(f"  x Failed question {qid}: {e}")

    # 4. Link questions and candidates to Active Exam
    print(f"[4/4] Synchronizing Active Exam '{ACTIVE_EXAM_ID}'...")
    try:
        ex_res = db.table("exams").select("*").eq("id", ACTIVE_EXAM_ID).limit(1).execute()
        if ex_res.data:
            exam = ex_res.data[0]
            cfg = exam.get("config") or {}
            cfg["question_ids"] = q_ids_seeded
            cfg["assigned_candidate_ids"] = [c["id"] for c in CANDIDATES_DATA]
            db.table("exams").update({
                "config": cfg,
                "state": "active",
            }).eq("id", ACTIVE_EXAM_ID).execute()
            print(f"  + Active Exam '{exam.get('title')}' successfully linked with {len(q_ids_seeded)} questions!")

            # Enroll all 12 candidates in exam_attempts
            for c in CANDIDATES_DATA:
                try:
                    att_record = {
                        "tenant_id": DEFAULT_TENANT_ID,
                        "exam_id": ACTIVE_EXAM_ID,
                        "candidate_id": c["id"],
                        "status": "assigned",
                    }
                    db.table("exam_attempts").upsert(att_record, on_conflict="exam_id,candidate_id").execute()
                except Exception as ex:
                    print(f"  x Failed attempt assignment: {ex}")
            print(f"  + Enrolled {len(CANDIDATES_DATA)} authoritative candidates in exam_attempts!")
    except Exception as e:
        print(f"  x Failed exam update: {e}")

    print("\n=======================================================")
    print("SUCCESS: Supabase Cloud DB is 100% Synced & Authoritative!")
    print(f"Candidates Seeded: {seed_cands_inserted}")
    print(f"Questions Seeded:  {len(q_ids_seeded)}")
    print("=======================================================")

if __name__ == "__main__":
    seed_database()
