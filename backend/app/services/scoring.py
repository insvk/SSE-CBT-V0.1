class ScoringEngine:
    @staticmethod
    def calculate_score(responses: list, answer_keys: dict, config: dict):
        total_score = 0
        correct_marks = config.get("correct_marks", 4)
        negative_marks = config.get("negative_marks", 1)
        
        details = []

        for resp in responses:
            q_id = resp["question_id"]
            candidate_ans = resp["response_data"]
            
            correct_ans = answer_keys.get(q_id)
            if not correct_ans:
                continue

            if candidate_ans == correct_ans:
                total_score += correct_marks
                details.append({"q_id": q_id, "status": "correct", "marks": correct_marks})
            elif candidate_ans is not None:
                total_score -= negative_marks
                details.append({"q_id": q_id, "status": "incorrect", "marks": -negative_marks})
            else:
                details.append({"q_id": q_id, "status": "unanswered", "marks": 0})
                
        return {
            "total_score": total_score,
            "details": details
        }
