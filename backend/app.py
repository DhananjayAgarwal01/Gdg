"""
app.py — Flask REST API for Smart Resource Allocation System
Database: MongoDB (pymongo)
ML Model: best_model.joblib (loaded once at startup)
"""

import os
import json
import math
import joblib
import numpy as np
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from scipy.optimize import linear_sum_assignment

load_dotenv()

# ─── App ──────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB  = os.getenv("MONGO_DB_NAME", "smart_resource")

# Lazy MongoDB connection — created on first use, not at import time.
_client = None
_db     = None

def get_db():
    global _client, _db
    if _db is not None:
        return _db
    uri = MONGO_URI.strip()
    if not uri or "<username>" in uri or "<password>" in uri:
        raise RuntimeError(
            "MONGO_URI is not configured. "
            "Edit backend/.env and set a valid MongoDB connection string."
        )
    _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    _db     = _client[MONGO_DB]
    print(f"[✓] Connected to MongoDB  db={MONGO_DB}")
    return _db

def get_col(name):
    return get_db()[name]


# ─── ML Model ─────────────────────────────────────────────────────────────────
MODEL_DIR   = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH  = os.path.join(MODEL_DIR, "best_model.joblib")
META_PATH   = os.path.join(MODEL_DIR, "metadata.json")

model = None
model_meta = {}

if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    with open(META_PATH) as f:
        model_meta = json.load(f)
    print(f"[✓] Loaded model: {model_meta.get('model_name')}  accuracy={model_meta.get('accuracy')}")
else:
    print("[!] WARNING: best_model.joblib not found. Run backend/training/train.py first.")

# ─── Helpers ──────────────────────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi   = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def doc_to_dict(doc):
    """Convert MongoDB document to JSON-serialisable dict."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


def bad_req(msg):
    return jsonify({"error": msg}), 400


@app.errorhandler(RuntimeError)
def handle_db_error(e):
    return jsonify({"error": str(e)}), 503


# ─── Volunteers ───────────────────────────────────────────────────────────────
@app.get("/volunteers")
def get_volunteers():
    docs = [doc_to_dict(d) for d in get_col("volunteers").find()]
    return jsonify(docs)


@app.post("/volunteer")
def add_volunteer():
    data = request.get_json(force=True)
    required = ["name", "skill", "latitude", "longitude", "availability", "experience"]
    if missing := [f for f in required if f not in data]:
        return bad_req(f"Missing fields: {missing}")

    skill = data["skill"].lower()
    if skill not in ("medical", "food", "education", "rescue"):
        return bad_req("skill must be one of: medical, food, education, rescue")

    exp = int(data["experience"])
    if not (0 <= exp <= 5):
        return bad_req("experience must be 0–5")

    doc = {
        "name":         str(data["name"]),
        "skill":        skill,
        "latitude":     float(data["latitude"]),
        "longitude":    float(data["longitude"]),
        "availability": bool(data["availability"]),
        "experience":   exp,
        "created_at":   datetime.utcnow().isoformat(),
    }
    result = get_col("volunteers").insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return jsonify(doc), 201


@app.delete("/volunteer/<vid>")
def delete_volunteer(vid):
    try:
        oid = ObjectId(vid)
    except InvalidId:
        return bad_req("Invalid volunteer id")
    r = get_col("volunteers").delete_one({"_id": oid})
    if r.deleted_count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"deleted": vid})


# ─── Tasks ────────────────────────────────────────────────────────────────────
@app.get("/tasks")
def get_tasks():
    docs = [doc_to_dict(d) for d in get_col("tasks").find()]
    return jsonify(docs)


@app.post("/task")
def add_task():
    data = request.get_json(force=True)
    required = ["latitude", "longitude", "issue_type", "severity", "people_affected", "date"]
    if missing := [f for f in required if f not in data]:
        return bad_req(f"Missing fields: {missing}")

    sev = int(data["severity"])
    if not (1 <= sev <= 10):
        return bad_req("severity must be 1–10")

    doc = {
        "latitude":        float(data["latitude"]),
        "longitude":       float(data["longitude"]),
        "issue_type":      str(data["issue_type"]).lower(),
        "severity":        sev,
        "people_affected": int(data["people_affected"]),
        "date":            str(data["date"]),
        "assigned":        False,
        "created_at":      datetime.utcnow().isoformat(),
    }
    result = get_col("tasks").insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return jsonify(doc), 201


@app.delete("/task/<tid>")
def delete_task(tid):
    try:
        oid = ObjectId(tid)
    except InvalidId:
        return bad_req("Invalid task id")
    r = get_col("tasks").delete_one({"_id": oid})
    if r.deleted_count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"deleted": tid})


# ─── Smart Assignment ─────────────────────────────────────────────────────────
@app.post("/assign")
def assign():
    """
    Body (optional): { "task_id": "<mongo_id>" }
    If task_id is provided → assign only that task.
    Otherwise → assign ALL unassigned tasks.
    """
    if model is None:
        return jsonify({"error": "Model not loaded. Run training/train.py first."}), 503

    data      = request.get_json(force=True) if request.data else {}
    task_id   = data.get("task_id")
    all_volunteers = list(get_col("volunteers").find())

    if not all_volunteers:
        return jsonify({"error": "No volunteers registered."}), 400

    if task_id:
        try:
            oid = ObjectId(task_id)
        except InvalidId:
            return bad_req("Invalid task_id")
        tasks = list(get_col("tasks").find({"_id": oid}))
    else:
        tasks = list(get_col("tasks").find({"assigned": False}))

    if not tasks:
        return jsonify({"message": "No tasks to assign."}), 200

    results = []
    
    # ─── Global Optimization (Hungarian Algorithm) ───
    # We want to globally maximize the total match probability across all assignments.
    # linear_sum_assignment minimizes cost, so we build a cost matrix of -Probability.
    
    # Only consider volunteers who are actually available
    available_vols = [v for v in all_volunteers if v.get("availability") is True]
    if not available_vols:
        return jsonify({"message": "No available volunteers found."}), 200

    N_tasks = len(tasks)
    M_vols  = len(available_vols)
    cost_matrix   = np.zeros((N_tasks, M_vols))
    scores_matrix = np.zeros((N_tasks, M_vols))

    for i, task in enumerate(tasks):
        urgency = task["severity"] * task["people_affected"]
        for j, vol in enumerate(available_vols):
            skill_match        = int(vol["skill"] == task["issue_type"])
            distance_km        = haversine(vol["latitude"], vol["longitude"],
                                           task["latitude"],  task["longitude"])
            availability_match = 1 # We already filtered for availability
            experience         = int(vol.get("experience", 0))

            features = np.array([[skill_match, distance_km, availability_match,
                                   experience, urgency]])
            try:
                proba = float(model.predict_proba(features)[0][1])
            except Exception:
                proba = float(model.predict(features)[0])

            scores_matrix[i, j] = proba
            cost_matrix[i, j]   = -proba

    # Solve the Assignment Problem (Linear Programming)
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    for r, c in zip(row_ind, col_ind):
        best_score = scores_matrix[r, c]
        task       = tasks[r]
        best_vol   = available_vols[c]

        # Prevent assigning terrible matches (e.g., if the solver is forced to make a match)
        if best_score < 0.1:
            continue

        assignment = {
            "task_id":      str(task["_id"]),
            "volunteer_id": str(best_vol["_id"]),
            "score":        round(best_score, 6),
            "assigned_at":  datetime.utcnow().isoformat(),
        }
        get_col("assignments").insert_one(assignment)

        # Mark task as assigned & volunteer as unavailable
        get_col("tasks").update_one({"_id": task["_id"]}, {"$set": {"assigned": True}})
        get_col("volunteers").update_one({"_id": best_vol["_id"]}, {"$set": {"availability": False}})

        results.append({
            "task_id":        str(task["_id"]),
            "task_issue":     task["issue_type"],
            "volunteer_id":   str(best_vol["_id"]),
            "volunteer_name": best_vol["name"],
            "score":          round(best_score, 6),
        })

    model_name_display = f"Hungarian LP + {model_meta.get('model_name', 'ML')}"
    return jsonify({"assignments": results, "model_used": model_name_display}), 200


# ─── Assignments ──────────────────────────────────────────────────────────────
@app.get("/assignments")
def get_assignments():
    pipeline = [
        {
            "$addFields": {
                "task_oid":      {"$toObjectId": "$task_id"},
                "volunteer_oid": {"$toObjectId": "$volunteer_id"},
            }
        },
        {"$lookup": {"from": "tasks",      "localField": "task_oid",      "foreignField": "_id", "as": "task"}},
        {"$lookup": {"from": "volunteers", "localField": "volunteer_oid", "foreignField": "_id", "as": "volunteer"}},
        {"$unwind": {"path": "$task",      "preserveNullAndEmptyArrays": True}},
        {"$unwind": {"path": "$volunteer", "preserveNullAndEmptyArrays": True}},
    ]
    docs = list(get_col("assignments").aggregate(pipeline))
    out  = []
    for d in docs:
        out.append({
            "id":             str(d["_id"]),
            "task_id":        d.get("task_id"),
            "volunteer_id":   d.get("volunteer_id"),
            "score":          d.get("score"),
            "assigned_at":    d.get("assigned_at"),
            "task_issue":     d.get("task", {}).get("issue_type"),
            "task_severity":  d.get("task", {}).get("severity"),
            "volunteer_name": d.get("volunteer", {}).get("name"),
            "volunteer_skill":d.get("volunteer", {}).get("skill"),
        })
    return jsonify(out)


# ─── Model Info ───────────────────────────────────────────────────────────────
@app.get("/model-info")
def model_info():
    return jsonify(model_meta)


# ─── Stats (dashboard) ────────────────────────────────────────────────────────
@app.get("/stats")
def stats():
    total_vol   = get_col("volunteers").count_documents({})
    total_tasks = get_col("tasks").count_documents({})
    assigned    = get_col("tasks").count_documents({"assigned": True})
    unassigned  = total_tasks - assigned
    high_urgency = get_col("tasks").count_documents({"$expr": {
        "$gte": [{"$multiply": ["$severity", "$people_affected"]}, 1000]
    }})
    return jsonify({
        "total_volunteers": total_vol,
        "total_tasks":      total_tasks,
        "assigned_tasks":   assigned,
        "unassigned_tasks": unassigned,
        "high_urgency":     high_urgency,
        "model":            model_meta,
    })


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    app.run(debug=True, port=port)
