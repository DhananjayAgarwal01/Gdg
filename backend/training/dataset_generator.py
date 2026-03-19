"""
dataset_generator.py
Generates a synthetic dataset for volunteer-task matching.
Features: skill_match, distance_km, availability_match, experience, urgency
Label: assigned (1=good match, 0=bad match)
"""

import numpy as np
import pandas as pd
import math
import os

SKILLS = ["medical", "food", "education", "rescue"]
ISSUE_TYPES = ["medical", "food", "education", "rescue"]

def haversine(lat1, lon1, lat2, lon2):
    """Return distance in km between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def generate_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    rows = []

    for _ in range(n_samples):
        # Volunteer attributes
        v_skill = np.random.choice(SKILLS)
        v_lat = np.random.uniform(8.0, 37.0)   # India-like bounding box
        v_lon = np.random.uniform(68.0, 97.0)
        v_avail = np.random.choice([0, 1], p=[0.3, 0.7])
        v_exp = np.random.randint(0, 6)

        # Task attributes
        t_issue = np.random.choice(ISSUE_TYPES)
        t_lat = np.random.uniform(8.0, 37.0)
        t_lon = np.random.uniform(68.0, 97.0)
        t_severity = np.random.randint(1, 11)
        t_people = np.random.randint(5, 500)

        # Computed features
        skill_match = int(v_skill == t_issue)
        distance_km = haversine(v_lat, v_lon, t_lat, t_lon)
        availability_match = int(v_avail == 1)
        experience = v_exp
        urgency = t_severity * t_people

        # Label heuristic: good match if skill matches, distance < 100 km, 
        # exp >= 2, and urgency is high enough, plus strict availability.
        # This cleaner heuristic makes decision boundaries easier to learn.
        is_match = (
            skill_match == 1
            and availability_match == 1
            and distance_km < 300
            and (experience >= 1 or urgency < 500)
        )
        
        # Add only 5% noise to make it realistic but still very learnable (~95% accuracy expected)
        label = int(is_match)
        if np.random.rand() < 0.05:
            label = 1 - label

        rows.append({
            "skill_match": skill_match,
            "distance_km": float(f"{distance_km:.4f}"),
            "availability_match": availability_match,
            "experience": experience,
            "urgency": urgency,
            "assigned": label,
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "dataset.csv")
    df = generate_dataset(n_samples=5000)
    df.to_csv(out_path, index=False)
    print(f"[✓] Dataset saved → {out_path}")
    print(df.head())
    print(f"\nClass distribution:\n{df['assigned'].value_counts()}")
