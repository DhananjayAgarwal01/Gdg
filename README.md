# Smart Resource Allocation System

An AI-powered NGO volunteer coordination platform that uses Machine Learning and Linear Programming (Hungarian Algorithm) to optimally assign volunteers to emergency tasks.

![Dashboard Preview](https://via.placeholder.com/800x400.png?text=Smart+Resource+Allocation+System)

## ✨ Features
- **Premium Glassmorphic UI**: Beautiful, fully responsive React frontend with animated mesh gradients and glowing neon accents.
- **Smart Assignment Engine**:
  - Uses **Machine Learning (Random Forest & XGBoost)** to calculate match probabilities based on distance (Haversine), skill sets, experience, and urgency.
  - Feeds probabilities into a **Cost Matrix**.
  - Applies the **Hungarian Algorithm (scipy linear_sum_assignment)** to solve the assignment problem globally, maximizing total efficiency across all tasks and volunteers.
- **Volunteer & Task Management**: Full CRUD operations with MongoDB.

## 🧩 Tech Stack
- **Frontend**: React 18 + Vite + Vanilla CSS Variables (Glassmorphism)
- **Backend**: Flask + PyMongo (MongoDB Atlas)
- **Data Science/ML**: Scikit-Learn, XGBoost, SciPy, Pandas, Numpy

---

## 🚀 Setup & Installation

### 1. MongoDB Database
Create a free cluster at [mongodb.com](https://www.mongodb.com). Copy your Atlas connection URI.

### 2. Backend (Flask & ML)
```bash
cd backend
python -m venv myenv
myenv\Scripts\activate          # Windows
# source myenv/bin/activate     # Mac/Linux

pip install -r requirements.txt

# Create .env file and add your MongoDB connection string
echo "MONGO_URI=your_mongodb_atlas_uri" > .env
echo "MONGO_DB_NAME=smart_resource" >> .env
```

**Generate Dataset & Train the Model:**
```bash
python training/train.py
```
*(This generates synthetic data, trains both RF and XGBoost, and saves the best model to `backend/model/best_model.joblib`)*

**Seed Sample Data & Start API:**
```bash
python seed_db.py
python app.py
```
*API runs on `http://localhost:5000`*

### 3. Frontend (React)
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 🧠 How the ML Pipeline Works
1. **Dataset Generation:** `dataset_generator.py` creates a dataset of random volunteer-task matchings. The label (`is_match`) is determined by a strict heuristic: skill alignment, Haversine distance < 300km, experience, and urgency.
2. **Model Training:** `train.py` trains two models on this dataset. It picks the one with the highest accuracy (usually Random Forest at ~95%) and saves it.
3. **Execution:** Inside `app.py`, the `/assign` endpoint calculates `predict_proba` for every unassigned task against every available volunteer.
4. **Hungarian Optimization:** The predicted probabilities are transformed into a cost matrix. `scipy.optimize.linear_sum_assignment` then finds the mathematically optimal 1-to-1 matching across the entire board.
