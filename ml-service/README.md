# CivicLens Computer Vision & ML Microservice (FastAPI)

High-performance Python microservice using **FastAPI + OpenCV + YOLOv8** for municipal defect bounding box detection, damage density measurement, and SSIM Before/After repair verification.

## 🚀 Features
1. **Defect Bounding Boxes**: Extracts `[x, y, width, height]` coordinates for potholes, garbage heaps, and road cracks.
2. **Damage Density Index**: Measures defect surface coverage to compute SLA severity (`Critical`, `High`, `Medium`, `Low`).
3. **SSIM Before/After Audit**: Quantifies structural difference between citizen defect photos and official repair photos.
4. **Dual-AI Synergy**: Works alongside Groq AI Vision for comprehensive semantic + visual intelligence.

## 🛠️ Local Setup

### 1. Install Dependencies
```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Service
```bash
uvicorn main:app --reload --port 8000
```
API Documentation will be live at: `http://localhost:8000/docs`

## 🌐 Endpoints
* `GET /health` - Health check & model status
* `POST /api/v1/detect-defect` - Upload image for bounding box & damage calculation
* `POST /api/v1/compare-resolution` - Compare Before vs. After photos
