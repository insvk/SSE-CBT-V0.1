"""
Authoritative examination scoring engine for SSE CBT PLATFORM.

Guarantees:
- Single authoritative scoring logic for student scorecard, admin reports, and exports.
- Elimination of mock/synthetic percentile figures in favor of verified Percentage and Accuracy metrics.
- Exact per-question positive and negative marking configuration.
- Numerical question tolerance verification.
- Dropped / Bonus question adjudications.
- Question-level review metadata, review flags, and section/subject breakdowns.
"""
from typing import Dict, Any, List, Optional, Union
import logging

logger = logging.getLogger("cbt.scoring")


class ScoringEngine:
    @staticmethod
    def normalize_answer(ans: Any) -> Optional[str]:
        """Normalizes candidate answer (e.g., int 0 -> 'A', 'a' -> 'A', '0' -> 'A')."""
        if ans is None:
            return None
        if isinstance(ans, int):
            index_map = {0: "A", 1: "B", 2: "C", 3: "D", 4: "E", 5: "F"}
            return index_map.get(ans, str(ans))
        if isinstance(ans, str):
            s = ans.strip().upper()
            index_digit_map = {"0": "A", "1": "B", "2": "C", "3": "D"}
            return index_digit_map.get(s, s)
        return str(ans).strip().upper()

    @classmethod
    def calculate_score(
        cls,
        responses: List[Dict[str, Any]],
        questions_map: Dict[str, Dict[str, Any]],
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Authoritative server-side scoring for an exam attempt.

        :param responses: List of candidate responses [{'question_id': '...', 'response_data': ..., 'status': ...}]
        :param questions_map: Dict mapping question_id to question record with correct_answer, options, subject, etc.
        :param config: Exam configuration with marking rules
        """
        config = config or {}
        default_correct = float(config.get("correct_marks", 4.0))
        default_negative = float(config.get("negative_marks", 1.0))
        tolerance = float(config.get("numerical_tolerance", 0.01))

        total_score = 0.0
        max_possible_score = 0.0
        marks_before_penalty = 0.0
        penalty_deducted = 0.0
        bonus_marks = 0.0

        correct_count = 0
        incorrect_count = 0
        unanswered_count = 0
        attempted_count = 0
        marked_for_review_count = 0
        answered_and_marked_for_review_count = 0
        bonus_count = 0

        total_questions = len(questions_map)
        subject_scores: Dict[str, Dict[str, Any]] = {}
        details: List[Dict[str, Any]] = []

        # Index recorded responses by question_id (stringified)
        response_by_qid = {}
        for r in responses:
            if not isinstance(r, dict):
                continue
            qid = str(r.get("question_id", ""))
            if qid:
                response_by_qid[qid] = r

        q_items = list(questions_map.items())
        for q_idx, (q_id, q_data) in enumerate(q_items, start=1):
            q_id_str = str(q_id)
            correct_raw = q_data.get("correct_answer")
            subject = str(q_data.get("subject", "General") or "General").strip()
            section = str(q_data.get("section") or q_data.get("section_id") or subject).strip()
            q_type = str(q_data.get("type", "mcq_single") or "mcq_single").strip().lower()
            q_text = str(q_data.get("statement") or q_data.get("question_text") or q_data.get("text") or "").strip()
            options = q_data.get("options")
            if not isinstance(options, list):
                options = []

            # Per-question marking configuration with exam defaults as fallback
            q_correct_marks = float(q_data.get("marks") or q_data.get("positive_marks") or default_correct)
            q_neg_marks = float(q_data.get("negative_marks") if q_data.get("negative_marks") is not None else default_negative)

            max_possible_score += q_correct_marks

            if subject not in subject_scores:
                subject_scores[subject] = {
                    "total": 0,
                    "attempted": 0,
                    "correct": 0,
                    "incorrect": 0,
                    "unanswered": 0,
                    "score": 0.0,
                    "max_score": 0.0,
                    "marks_awarded": 0.0,
                    "penalty_deducted": 0.0,
                }
            subject_scores[subject]["total"] += 1
            subject_scores[subject]["max_score"] += q_correct_marks

            resp = response_by_qid.get(q_id_str)
            cand_raw = None
            resp_status = None
            if resp:
                resp_status = resp.get("status")
                if "response_data" in resp:
                    rd = resp["response_data"]
                    if isinstance(rd, dict):
                        cand_raw = rd.get("answer", rd.get("response", None))
                    else:
                        cand_raw = rd
                elif "answer" in resp:
                    cand_raw = resp["answer"]

            # Evaluate review flags
            is_marked_for_review = (
                resp_status in ("marked_review", "answered_marked_review", "review", "marked_for_review")
                or resp.get("is_marked_for_review") is True
                or resp.get("marked_for_review") is True
            ) if resp else False

            # Check if answered
            is_answered = cand_raw is not None and str(cand_raw).strip() != "" and str(cand_raw).strip().lower() != "null"

            if is_marked_for_review:
                marked_for_review_count += 1
                if is_answered:
                    answered_and_marked_for_review_count += 1

            # Check for Official Dropped Question / Bonus Adjudication
            is_bonus = (
                str(correct_raw).strip().upper() in ("BONUS", "DROPPED")
                or q_data.get("is_dropped") is True
                or str(q_data.get("status", "")).strip().lower() in ("dropped", "bonus")
            )
            if is_bonus:
                bonus_count += 1
                correct_count += 1
                total_score += q_correct_marks
                marks_before_penalty += q_correct_marks
                bonus_marks += q_correct_marks
                subject_scores[subject]["correct"] += 1
                subject_scores[subject]["score"] += q_correct_marks
                subject_scores[subject]["marks_awarded"] += q_correct_marks
                details.append({
                    "question_number": q_idx,
                    "question_id": q_id_str,
                    "statement": q_text,
                    "options": options,
                    "subject": subject,
                    "section": section,
                    "type": q_type,
                    "status": "bonus",
                    "marks_awarded": q_correct_marks,
                    "max_marks": q_correct_marks,
                    "negative_marks": 0.0,
                    "candidate_answer": cand_raw,
                    "candidate_answer_display": str(cand_raw) if is_answered else "Not Attempted",
                    "correct_answer": "BONUS",
                    "correct_answer_display": "Official Bonus / Dropped Question",
                    "is_marked_for_review": is_marked_for_review,
                })
                continue

            if not is_answered:
                unanswered_count += 1
                subject_scores[subject]["unanswered"] += 1
                details.append({
                    "question_number": q_idx,
                    "question_id": q_id_str,
                    "statement": q_text,
                    "options": options,
                    "subject": subject,
                    "section": section,
                    "type": q_type,
                    "status": "unanswered",
                    "marks_awarded": 0.0,
                    "max_marks": q_correct_marks,
                    "negative_marks": q_neg_marks,
                    "candidate_answer": None,
                    "candidate_answer_display": "Unanswered",
                    "correct_answer": correct_raw,
                    "correct_answer_display": cls._format_answer_display(correct_raw, options),
                    "is_marked_for_review": is_marked_for_review,
                })
                continue

            # Question was attempted
            attempted_count += 1
            subject_scores[subject]["attempted"] += 1

            # Evaluate response correctness
            is_correct = False
            if q_type == "numerical":
                try:
                    c_val = float(cand_raw)
                    k_val = float(correct_raw)
                    is_correct = abs(c_val - k_val) <= tolerance
                except (ValueError, TypeError):
                    is_correct = False
            else:
                # MCQ Single
                cand_norm = cls.normalize_answer(cand_raw)
                correct_norm = cls.normalize_answer(correct_raw)
                is_correct = (cand_norm == correct_norm) and (cand_norm is not None)

                # Match against option text or index if options list is present
                if not is_correct and options and isinstance(options, list):
                    try:
                        cand_idx = int(cand_raw)
                        if 0 <= cand_idx < len(options):
                            opt_text = str(options[cand_idx]).strip().lower()
                            if opt_text == str(correct_raw).strip().lower():
                                is_correct = True
                    except (ValueError, TypeError):
                        pass

                    if not is_correct and isinstance(cand_raw, str):
                        for opt_idx, opt_text in enumerate(options):
                            if str(opt_text).strip().lower() == cand_raw.strip().lower():
                                if cls.normalize_answer(opt_idx) == correct_norm:
                                    is_correct = True
                                break

            cand_display = cls._format_answer_display(cand_raw, options)
            correct_display = cls._format_answer_display(correct_raw, options)

            if is_correct:
                total_score += q_correct_marks
                marks_before_penalty += q_correct_marks
                correct_count += 1
                subject_scores[subject]["score"] += q_correct_marks
                subject_scores[subject]["marks_awarded"] += q_correct_marks
                subject_scores[subject]["correct"] += 1
                details.append({
                    "question_number": q_idx,
                    "question_id": q_id_str,
                    "statement": q_text,
                    "options": options,
                    "subject": subject,
                    "section": section,
                    "type": q_type,
                    "status": "correct",
                    "marks_awarded": q_correct_marks,
                    "max_marks": q_correct_marks,
                    "negative_marks": q_neg_marks,
                    "candidate_answer": cand_raw,
                    "candidate_answer_display": cand_display,
                    "correct_answer": correct_raw,
                    "correct_answer_display": correct_display,
                    "is_marked_for_review": is_marked_for_review,
                })
            else:
                total_score -= q_neg_marks
                penalty_deducted += q_neg_marks
                incorrect_count += 1
                subject_scores[subject]["score"] -= q_neg_marks
                subject_scores[subject]["penalty_deducted"] += q_neg_marks
                subject_scores[subject]["incorrect"] += 1
                details.append({
                    "question_number": q_idx,
                    "question_id": q_id_str,
                    "statement": q_text,
                    "options": options,
                    "subject": subject,
                    "section": section,
                    "type": q_type,
                    "status": "incorrect",
                    "marks_awarded": -q_neg_marks,
                    "max_marks": q_correct_marks,
                    "negative_marks": q_neg_marks,
                    "candidate_answer": cand_raw,
                    "candidate_answer_display": cand_display,
                    "correct_answer": correct_raw,
                    "correct_answer_display": correct_display,
                    "is_marked_for_review": is_marked_for_review,
                })

        # Calculate Authoritative Percentage (Preserving negative scores without arbitrary clamping)
        percentage = (total_score / max_possible_score * 100.0) if max_possible_score > 0 else 0.0

        # Calculate Authoritative Accuracy = (Correct / Attempted) * 100
        # If no questions were attempted, return None / N/A rather than 0% or 100%
        if attempted_count > 0:
            accuracy: Optional[float] = round((correct_count / attempted_count) * 100.0, 2)
            accuracy_display = f"{accuracy:.1f}%"
        else:
            accuracy = None
            accuracy_display = "N/A"

        # Compute accuracy for each subject
        for s_data in subject_scores.values():
            s_att = s_data.get("attempted", 0)
            s_cor = s_data.get("correct", 0)
            s_data["score"] = round(s_data["score"], 2)
            s_data["max_score"] = round(s_data["max_score"], 2)
            s_data["marks_awarded"] = round(s_data["marks_awarded"], 2)
            s_data["penalty_deducted"] = round(s_data["penalty_deducted"], 2)
            if s_att > 0:
                s_data["accuracy"] = round((s_cor / s_att) * 100.0, 1)
            else:
                s_data["accuracy"] = None

        return {
            "total_score": round(total_score, 2),
            "max_possible_score": round(max_possible_score, 2),
            "percentage": round(percentage, 2),
            "accuracy": accuracy,
            "accuracy_display": accuracy_display,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "unanswered_count": unanswered_count,
            "attempted_count": attempted_count,
            "marked_for_review_count": marked_for_review_count,
            "answered_and_marked_for_review_count": answered_and_marked_for_review_count,
            "bonus_count": bonus_count,
            "total_questions": total_questions,
            "marks_before_penalty": round(marks_before_penalty, 2),
            "penalty_deducted": round(penalty_deducted, 2),
            "bonus_marks": round(bonus_marks, 2),
            "subject_breakdown": subject_scores,
            "details": details,
        }

    @classmethod
    def _format_answer_display(cls, ans: Any, options: List[Any]) -> str:
        """Formats answer value nicely with option text if available."""
        if ans is None or str(ans).strip() == "":
            return "Unanswered"
        norm = cls.normalize_answer(ans)
        if norm and len(norm) == 1 and norm in "ABCDEF":
            idx = ord(norm) - ord("A")
            if options and 0 <= idx < len(options):
                opt_txt = str(options[idx]).strip()
                return f"Option {norm}: {opt_txt}"
            return f"Option {norm}"
        return str(ans)
