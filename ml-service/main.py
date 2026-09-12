import os
import io
import time
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from PIL import Image
import cv2

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("civiclens-cv-engine")

app = FastAPI(
    title="CivicLens Computer Vision & ML Microservice",
    description="Dedicated FastAPI engine for municipal defect bounding box detection, damage area calculation, and SSIM Before/After verification.",
    version="2.0.0"
)

# Enable CORS for Node.js backend and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional YOLOv8 Model Initialization (with graceful fallback)
yolo_model = None
try:
    from ultralytics import YOLO
    model_path = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")
    yolo_model = YOLO(model_path)
    logger.info("✅ YOLOv8 Computer Vision model loaded successfully")
except Exception as e:
    logger.warning(f"⚠️ YOLOv8 model not loaded (using built-in OpenCV Adaptive CV Engine): {e}")


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    label: str
    confidence: float

class DefectAnalysisResponse(BaseModel):
    success: bool
    service: str
    processedAt: float
    totalDefectsFound: int
    detections: List[BoundingBox]
    damageDensityScore: float
    computedPriority: str
    suggestedCategory: str
    isCivicDefectLikely: bool
    diagnosticSummary: str

class ResolutionComparisonResponse(BaseModel):
    success: bool
    structuralSimilarityScore: float
    pixelDeltaScore: float
    isRepairVerified: bool
    confidencePercent: float
    summary: str


def cv_analyze_damage(img_cv: np.ndarray) -> Dict[str, Any]:
    """
    OpenCV Computer Vision Pipeline:
    Performs Canny edge detection, adaptive thresholding, and contour analysis
    to detect potholes, cracks, debris, and structural damage bounding boxes.
    """
    height, width = img_cv.shape[:2]
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

    # 1. Contrast Normalization (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # 2. Gaussian Blur to suppress sensor noise
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    # 3. Multi-threshold edge & defect gradient detection
    edges = cv2.Canny(blurred, 50, 150)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    combined = cv2.bitwise_or(edges, thresh)

    # 4. Morphological closure to group adjacent damage pockets
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)

    # 5. Find contours of damaged zones
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = (width * height) * 0.003  # Minimum 0.3% of image area
    max_area = (width * height) * 0.85   # Maximum 85% of image area

    detections = []
    total_defect_area = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if min_area < area < max_area:
            x, y, w, h = cv2.boundingRect(cnt)
            total_defect_area += area
            
            # Aspect ratio check to categorize defect shape
            aspect_ratio = float(w) / h
            label = "Pothole / Asphalt Cavity" if 0.5 <= aspect_ratio <= 2.0 else "Road Surface Crack / Debris"
            confidence = min(0.98, max(0.65, float(area / (width * height * 0.2))))

            detections.append(BoundingBox(
                x=int(x),
                y=int(y),
                width=int(w),
                height=int(h),
                label=label,
                confidence=round(confidence, 2)
            ))

    # Calculate overall damage density
    damage_density = min(1.0, total_defect_area / (width * height))

    # Priority decision logic
    if damage_density > 0.12 or len(detections) >= 4:
        computed_priority = "Critical"
    elif damage_density > 0.05 or len(detections) >= 2:
        computed_priority = "High"
    elif damage_density > 0.01 or len(detections) >= 1:
        computed_priority = "Medium"
    else:
        computed_priority = "Low"

    return {
        "detections": detections[:6],  # Top 6 significant bounding boxes
        "damage_density": round(float(damage_density), 4),
        "computed_priority": computed_priority,
        "is_defect_likely": len(detections) > 0 or damage_density > 0.015
    }


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "CivicLens Computer Vision ML Service",
        "framework": "FastAPI + OpenCV + YOLO",
        "version": "2.0.0",
        "endpoints": [
            "/health",
            "/api/v1/detect-defect",
            "/api/v1/compare-resolution"
        ]
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "yolo_loaded": yolo_model is not None,
        "opencv_version": cv2.__version__,
        "timestamp": time.time()
    }


@app.post("/api/v1/detect-defect", response_model=DefectAnalysisResponse)
async def detect_defect(image: UploadFile = File(...)):
    """
    Processes an uploaded civic issue photo.
    Returns detected defect bounding boxes, damage density score, and priority.
    """
    start_time = time.time()
    try:
        image_bytes = await image.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_cv is None:
            raise HTTPException(status_code=400, detail="Invalid image file or unsupported image format")

        # 1. Run OpenCV damage analysis
        cv_result = cv_analyze_damage(img_cv)
        detections = cv_result["detections"]

        # 2. If YOLO is loaded, also run YOLO inference
        if yolo_model:
            try:
                yolo_preds = yolo_model(img_cv, verbose=False)
                for r in yolo_preds:
                    for box in r.boxes:
                        conf = float(box.conf[0])
                        if conf > 0.35:
                            cls_id = int(box.cls[0])
                            label = yolo_model.names.get(cls_id, "Civic Defect")
                            xyxy = box.xyxy[0].tolist()
                            x1, y1, x2, y2 = map(int, xyxy)
                            detections.append(BoundingBox(
                                x=x1,
                                y=y1,
                                width=max(1, x2 - x1),
                                height=max(1, y2 - y1),
                                label=f"Object: {label}",
                                confidence=round(conf, 2)
                            ))
            except Exception as e:
                logger.warning(f"YOLO inference fallback to OpenCV: {e}")

        density = cv_result["damage_density"]
        priority = cv_result["computed_priority"]
        is_civic = cv_result["is_defect_likely"]

        # Suggested Category heuristic
        if density > 0.04:
            suggested_category = "Roads & Potholes"
        elif len(detections) > 2:
            suggested_category = "Garbage & Sanitation"
        else:
            suggested_category = "Public Infrastructure"

        summary = f"FastAPI CV detected {len(detections)} defect bounding zone(s) with a damage density index of {density * 100:.1f}%. Recommended SLA Priority: {priority}."

        return DefectAnalysisResponse(
            success=True,
            service="CivicLens FastAPI Computer Vision Engine",
            processedAt=time.time(),
            totalDefectsFound=len(detections),
            detections=detections,
            damageDensityScore=density,
            computedPriority=priority,
            suggestedCategory=suggested_category,
            isCivicDefectLikely=is_civic,
            diagnosticSummary=summary
        )

    except Exception as e:
        logger.error(f"Error in detect_defect: {e}")
        raise HTTPException(status_code=500, detail=f"Computer Vision processing failed: {str(e)}")


@app.post("/api/v1/compare-resolution", response_model=ResolutionComparisonResponse)
async def compare_resolution(
    beforeImage: UploadFile = File(...),
    afterImage: UploadFile = File(...)
):
    """
    Computes Structural Similarity Index (SSIM) and edge disparity between
    the Before and After photos to quantify physical repair work.
    """
    try:
        # Read before image
        b_bytes = await beforeImage.read()
        b_arr = np.frombuffer(b_bytes, np.uint8)
        b_img = cv2.imdecode(b_arr, cv2.IMREAD_COLOR)

        # Read after image
        a_bytes = await afterImage.read()
        a_arr = np.frombuffer(a_bytes, np.uint8)
        a_img = cv2.imdecode(a_arr, cv2.IMREAD_COLOR)

        if b_img is None or a_img is None:
            raise HTTPException(status_code=400, detail="Could not decode one or both comparison images")

        # Standardize sizes to 400x400 for comparison
        target_size = (400, 400)
        b_resized = cv2.resize(b_img, target_size)
        a_resized = cv2.resize(a_img, target_size)

        b_gray = cv2.cvtColor(b_resized, cv2.COLOR_BGR2GRAY)
        a_gray = cv2.cvtColor(a_resized, cv2.COLOR_BGR2GRAY)

        # Compute SSIM if scikit-image is available, or absolute edge delta
        ssim_score = 0.5
        try:
            from skimage.metrics import structural_similarity as ssim
            ssim_score = float(ssim(b_gray, a_gray))
        except Exception:
            diff = cv2.absdiff(b_gray, a_gray)
            ssim_score = 1.0 - (float(np.mean(diff)) / 255.0)

        # Edge roughness delta
        b_edges = cv2.Canny(b_gray, 50, 150)
        a_edges = cv2.Canny(a_gray, 50, 150)
        b_edge_density = np.sum(b_edges > 0) / b_edges.size
        a_edge_density = np.sum(a_edges > 0) / a_edges.size

        roughness_reduction = max(0.0, b_edge_density - a_edge_density)
        confidence = min(99.0, max(60.0, (1.0 - abs(ssim_score - 0.4)) * 70.0 + roughness_reduction * 300.0))
        is_verified = confidence >= 65.0

        summary = f"Structural delta analysis shows a {confidence:.1f}% confidence score that physical defect smoothing/repair was performed."

        return ResolutionComparisonResponse(
            success=True,
            structuralSimilarityScore=round(ssim_score, 4),
            pixelDeltaScore=round(float(roughness_reduction), 4),
            isRepairVerified=is_verified,
            confidencePercent=round(confidence, 1),
            summary=summary
        )

    except Exception as e:
        logger.error(f"Error in compare_resolution: {e}")
        raise HTTPException(status_code=500, detail=f"Resolution comparison failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting CivicLens FastAPI Engine on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
