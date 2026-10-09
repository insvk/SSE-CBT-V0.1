import json

# This script mocks the seeding process.
# In a real setup, it would connect via `supabase-py` and insert the data.

def generate_seed_data():
    data = {
        "tenants": [
            {"id": "tenant-1", "name": "SIMATS Engineering", "domain": "simats.edu"}
        ],
        "users": [
            {"id": "user-1", "email": "admin@simats.edu", "role": "admin"}
        ],
        "exams": [
            {"id": "exam-1", "title": "JEE Main Mock A", "duration_minutes": 180, "state": "scheduled"}
        ]
    }
    
    with open("seed_data.json", "w") as f:
        json.dump(data, f, indent=4)
        
    print("Seed data generated: seed_data.json")

if __name__ == "__main__":
    generate_seed_data()
