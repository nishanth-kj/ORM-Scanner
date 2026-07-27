"""
region_detector.py
------------------
YOLO wrapper — detects named regions on the OMR sheet.

Returns a dict mapping region label → (x, y, w, h) bounding box in the
aligned image.  Falls back to None values for any class not detected.

YOLO class indices (must match training):
  0  name_box
  1  reg_box
  2  paper_box
  3  booklet_version_box
  4  booklet_serial_box
  5  answer_block_col1   (Q1–25)
  6  answer_block_col2   (Q26–50)
  7  answer_block_col3   (Q51–75)
  8  answer_block_col4   (Q76–100)
"""

import logging
import os
from typing import Dict, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# Canonical class names in training order (index = class id)
CLASS_NAMES = [
    "name_box",
    "reg_box",
    "paper_box",
    "booklet_version_box",
    "booklet_serial_box",
    "answer_block_col1",
    "answer_block_col2",
    "answer_block_col3",
    "answer_block_col4",
]

BBox = Tuple[int, int, int, int]  # (x, y, w, h)
RegionMap = Dict[str, Optional[BBox]]


class RegionDetector:
    """
    Wraps a YOLO model to detect fixed layout regions on an OMR sheet.

    Usage
    -----
    detector = RegionDetector("models/omr_regions.pt")
    regions  = detector.detect(aligned_image)
    reg_crop = detector.crop(aligned_image, regions["reg_box"])
    """

    def __init__(self, model_path: Optional[str] = None, conf_threshold: float = 0.4):
        self.model = None
        self.conf_threshold = conf_threshold

        if model_path and os.path.exists(model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(model_path)
                logger.info(f"Loaded YOLO region detector from: {model_path}")
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {e}")
        else:
            logger.warning(
                "No YOLO model provided or model file not found. "
                "Region detection will return None for all regions."
            )

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    def detect(self, image: np.ndarray) -> RegionMap:
        """
        Run YOLO inference on *image* and return a dict of
        label → (x, y, w, h) for each detected region.

        Undetected regions are mapped to None so callers can handle
        missing blocks gracefully.
        """
        # Initialise all regions to None
        regions: RegionMap = {name: None for name in CLASS_NAMES}

        if not self.is_ready:
            logger.warning("RegionDetector has no model — returning empty region map.")
            return regions

        results = self.model(image, conf=self.conf_threshold, verbose=False)

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for box in boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])

                if cls_id >= len(CLASS_NAMES):
                    logger.warning(f"Unknown class id {cls_id} — skipping.")
                    continue

                label = CLASS_NAMES[cls_id]

                # xyxy → xywh  (integers, image coordinates)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x, y = int(x1), int(y1)
                w, h = int(x2 - x1), int(y2 - y1)

                # Keep highest-confidence detection if duplicates
                existing = regions.get(label)
                if existing is None or conf > self._last_conf.get(label, 0):
                    regions[label] = (x, y, w, h)
                    self._last_conf[label] = conf

                logger.debug(f"  [{label}] conf={conf:.2f}  bbox=({x},{y},{w},{h})")

        detected = [k for k, v in regions.items() if v is not None]
        logger.info(f"Detected regions: {detected}")
        return regions

    def crop(self, image: np.ndarray, bbox: Optional[BBox]) -> Optional[np.ndarray]:
        """
        Return the sub-image defined by *bbox*, or None if bbox is None.
        Clamps coordinates to image boundaries.
        """
        if bbox is None:
            return None
        x, y, w, h = bbox
        ih, iw = image.shape[:2]
        x  = max(0, x)
        y  = max(0, y)
        x2 = min(iw, x + w)
        y2 = min(ih, y + h)
        return image[y:y2, x:x2]

    # Internal confidence tracker (reset per call)
    _last_conf: Dict[str, float] = {}

    def detect(self, image: np.ndarray) -> RegionMap:  # noqa: F811 — intentional override to reset tracker
        self._last_conf = {}
        regions: RegionMap = {name: None for name in CLASS_NAMES}

        if not self.is_ready:
            logger.warning("RegionDetector has no model — returning empty region map.")
            return regions

        results = self.model(image, conf=self.conf_threshold, verbose=False)

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for box in boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])

                if cls_id >= len(CLASS_NAMES):
                    logger.warning(f"Unknown class id {cls_id} — skipping.")
                    continue

                label = CLASS_NAMES[cls_id]

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x, y = int(x1), int(y1)
                w, h  = int(x2 - x1), int(y2 - y1)

                if regions[label] is None or conf > self._last_conf.get(label, 0.0):
                    regions[label] = (x, y, w, h)
                    self._last_conf[label] = conf

                logger.debug(f"  [{label}] conf={conf:.2f}  bbox=({x},{y},{w},{h})")

        detected = [k for k, v in regions.items() if v is not None]
        logger.info(f"Detected {len(detected)}/9 regions: {detected}")
        return regions
