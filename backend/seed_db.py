import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB  = os.getenv("MONGO_DB_NAME", "smart_resource")

if not MONGO_URI or "<username>" in MONGO_URI:
    print("[!] Cannot seed DB: Invalid MONGO_URI in .env")
    exit(1)

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# Clear existing sample data to prevent duplicates
db.volunteers.delete_many({})
db.tasks.delete_many({})
db.assignments.delete_many({})

SKILLS = ["medical", "food", "education", "rescue"]
NAMES = ["Priya Sharma", "Rahul Verma", "Anita Desai", "Vikram Singh", 
         "Neha Gupta", "Amit Kumar", "Riya Patel", "Suresh Rao", 
         "Kavita Reddy", "Manoj Tiwari", "Anjali Joshi", "Arun Nair"]

# Seed 15 Volunteers
volunteers = []
for name in NAMES:
    volunteers.append({
        "name": name,
        "skill": random.choice(SKILLS),
        "latitude": round(random.uniform(18.0, 28.0), 4),
        "longitude": round(random.uniform(72.0, 85.0), 4),
        "availability": random.choice([True, True, True, False]), # 75% available
        "experience": random.randint(1, 5),
        "created_at": datetime.utcnow().isoformat()
    })
db.volunteers.insert_many(volunteers)

# Seed 10 Tasks
tasks = []
for _ in range(10):
    tasks.append({
        "issue_type": random.choice(SKILLS),
        "latitude": round(random.uniform(18.0, 28.0), 4),
        "longitude": round(random.uniform(72.0, 85.0), 4),
        "severity": random.randint(3, 10),
        "people_affected": random.randint(50, 1500),
        "date": (datetime.utcnow() + timedelta(days=random.randint(0, 5))).strftime("%Y-%m-%d"),
        "assigned": False,
        "created_at": datetime.utcnow().isoformat()
    })
db.tasks.insert_many(tasks)

print(f"[✓] Seeded {len(volunteers)} volunteers and {len(tasks)} tasks.")
print("[✓] Database is ready for dashboard metrics and ML assignment.")
