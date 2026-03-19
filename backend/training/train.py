"""
train.py
Trains RandomForest and XGBoost classifiers on the synthetic dataset,
compares their accuracy & F1, then saves the best model + metadata.
"""

import os
import json
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
from xgboost import XGBClassifier

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "..", "model")
MODEL_PATH = os.path.join(MODEL_DIR, "best_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

FEATURES = ["skill_match", "distance_km", "availability_match", "experience", "urgency"]
TARGET = "assigned"


def load_data():
    if not os.path.exists(DATASET_PATH):
        print("[!] dataset.csv not found. Running generator …")
        from dataset_generator import generate_dataset
        df = generate_dataset()
        df.to_csv(DATASET_PATH, index=False)
    else:
        df = pd.read_csv(DATASET_PATH)

    X = df[FEATURES]
    y = df[TARGET]
    return train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)


def train_random_forest(X_train, y_train):
    print("\n[→] Training Random Forest …")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=4,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def train_xgboost(X_train, y_train):
    print("[→] Training XGBoost …")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train, verbose=False)
    return model


def evaluate(model, X_test, y_test):
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")
    return acc, f1


def print_comparison(results: dict):
    print("\n" + "=" * 50)
    print(f"{'Model':<20} {'Accuracy':>10} {'F1 Score':>10}")
    print("-" * 50)
    for name, metrics in results.items():
        print(f"{name:<20} {metrics['accuracy']:>10.4f} {metrics['f1']:>10.4f}")
    print("=" * 50)


def save_best(model, name: str, accuracy: float, f1: float):
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    metadata = {
        "model_name": name,
        "accuracy": float(f"{accuracy:.6f}"),
        "f1_score": float(f"{f1:.6f}"),
        "features": FEATURES,
    }
    with open(METADATA_PATH, "w") as fp:
        json.dump(metadata, fp, indent=2)
    print(f"\n[✓] Best model ({name}) saved → {MODEL_PATH}")
    print(f"[✓] Metadata saved → {METADATA_PATH}")


def main():
    print("[✓] Loading dataset …")
    X_train, X_test, y_train, y_test = load_data()
    print(f"    Train size: {len(X_train)}  |  Test size: {len(X_test)}")

    rf_model = train_random_forest(X_train, y_train)
    xgb_model = train_xgboost(X_train, y_train)

    rf_acc, rf_f1 = evaluate(rf_model, X_test, y_test)
    xgb_acc, xgb_f1 = evaluate(xgb_model, X_test, y_test)

    results = {
        "Random Forest": {"accuracy": rf_acc, "f1": rf_f1},
        "XGBoost":       {"accuracy": xgb_acc, "f1": xgb_f1},
    }
    print_comparison(results)

    if xgb_acc >= rf_acc:
        best_name, best_model, best_acc, best_f1 = "XGBoost", xgb_model, xgb_acc, xgb_f1
    else:
        best_name, best_model, best_acc, best_f1 = "Random Forest", rf_model, rf_acc, rf_f1

    print(f"\n[★] Winner: {best_name}")
    save_best(best_model, best_name, best_acc, best_f1)


if __name__ == "__main__":
    main()
