"""
scanner_service.py
------------------
Orchestrates the full OMR pipeline:

  PDF/Image
      │
      ▼
  align_image()              — perspective-correct the sheet (OpenCV contours)
      │
      ▼
  RegionDetector.detect()    — YOLO finds named bboxes
      │
      ├─► name_box           → placeholder (OCR optional)
      ├─► reg_box            → bubble_reader.read_digit_grid()   9-digit reg number
      ├─► paper_box          → bubble_reader.read_bubble_grid()  Civil/CS/Mech/Elec
      ├─► booklet_version    → bubble_reader.read_bubble_grid()  A/B/C/D (or text)
      ├─► booklet_serial     → bubble_reader.read_digit_grid()   5-digit serial
      └─► answer_block_col1–4→ bubble_reader.read_bubble_grid()  Q1–Q100 answers
          │
          ▼
      ScanResult dataclass   — returned to main.py / API
"""

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from service.bubble_reader import (
    OPTIONS_ABCD,
    read_bubble_grid,
    read_digit_grid,
    read_registration_number,
    read_booklet_serial_number,
    read_booklet_version,
)
from service.region_detector import RegionDetector

logger = logging.getLogger(__name__)

# ── Sheet-specific constants ──────────────────────────────────────────────────

# Karnataka Examinations Authority OMR sheet layout
# (based on MTA26523 format seen in the sample image)

PAPER_OPTIONS = ["Civil Engineering", "Computer Stream", "Mechanical Stream", "Electrical Stream"]
VERSION_OPTIONS = ["A", "B", "C", "D"]

# Answer blocks: 4 columns of 25 questions each
ANSWER_BLOCKS = [
    ("answer_block_col1", 1),    # Q1–Q25
    ("answer_block_col2", 26),   # Q26–Q50
    ("answer_block_col3", 51),   # Q51–Q75
    ("answer_block_col4", 76),   # Q76–Q100
]

QUESTIONS_PER_BLOCK = 25
OPTIONS_PER_QUESTION = 4

# Registration number: 10 digit positions, digits 0-9 per column
REG_NUMBER_DIGITS = 10

SERIAL_NUMBER_DIGITS = 7


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class AnswerResponse:
    question_number: int
    user_answer: Optional[str]   # "A"/"B"/"C"/"D" or None for unanswered
    confidence: float


@dataclass
class ScanResult:
    """
    Data extracted from a single OMR sheet.
    """
    success: bool
    candidate_name: Optional[str] = None
    registration_number: Optional[str] = None
    paper: Optional[str] = None
    booklet_version: Optional[str] = None
    booklet_serial_no: Optional[str] = None
    answer_responses: List[AnswerResponse] = field(default_factory=list)

    warnings: List[str] = field(default_factory=list)
    error: Optional[str] = None
    
    # ── Debugging Attachments ──
    debug_image: Optional[np.ndarray] = field(default=None, repr=False)
    debug_crops: Dict[str, np.ndarray] = field(default_factory=dict, repr=False)

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "candidate_name": self.candidate_name,
            "registration_number": self.registration_number,
            "paper": self.paper,
            "booklet_version": self.booklet_version,
            "booklet_serial_no": self.booklet_serial_no,
            "answer_responses": [
                {
                    "question_number": r.question_number,
                    "user_answer": r.user_answer,
                    "confidence": r.confidence,
                }
                for r in self.answer_responses
            ],
            "warnings": self.warnings,
            "error": self.error,
        }


# ── Main scanner class ────────────────────────────────────────────────────────

class OMRScanner:
    """
    Full OMR pipeline:
      1. Load PDF or image
      2. Deskew / align via perspective transform
      3. YOLO detects named regions
      4. OpenCV pixel-fill reads bubbles / digits inside each region
      5. Returns a ScanResult
    """

    def __init__(self, yolo_model_path: Optional[str] = None):
        self.detector = RegionDetector(model_path=yolo_model_path)
        if not self.detector.is_ready:
            logger.warning(
                "YOLO model not loaded. Without it, region detection will fail. "
                "Provide a trained model via --yolo flag."
            )

    # ── Public entry points ───────────────────────────────────────────────────

    def process_pdf(
        self, 
        pdf_path: str, 
        page_limit: Optional[int] = None, 
        show: bool = False, 
        return_image: bool = False,
        override_regions: Optional[Dict[str, tuple]] = None
    ) -> List[ScanResult]:
        """
        Process a multi-page PDF where each page is one OMR sheet.
        Returns a list of ScanResult — one per page.
        """
        if not HAS_PYMUPDF:
            return [ScanResult(success=False, error="PyMuPDF not installed. Run: uv add pymupdf")]

        results: List[ScanResult] = []

        try:
            doc = fitz.open(pdf_path)
            if not doc:
                return [ScanResult(success=False, error=f"Could not open PDF: {pdf_path}")]

            total_pages = len(doc)
            logger.info(f"Processing PDF: {pdf_path}  ({total_pages} pages)")

            for page_index in range(total_pages):
                # If page_limit is provided (1-based index), skip other pages
                if page_limit is not None and (page_index + 1) != page_limit:
                    continue

                logger.info(f"  Page {page_index + 1}/{total_pages} ...")
                try:
                    page = doc.load_page(page_index)
                    pix  = page.get_pixmap(dpi=300)

                    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                        pix.height, pix.width, pix.n
                    )
                    img = cv2.cvtColor(
                        img,
                        cv2.COLOR_RGBA2BGR if pix.n == 4 else cv2.COLOR_RGB2BGR,
                    )

                    result = self.process_image(
                        img, 
                        show=show, 
                        return_image=return_image,
                        override_regions=override_regions
                    )
                    result.warnings.insert(0, f"page={page_index + 1}")
                    results.append(result)

                except Exception as page_err:
                    logger.error(f"  Page {page_index + 1} failed: {page_err}")
                    results.append(
                        ScanResult(
                            success=False,
                            error=f"Page {page_index + 1}: {page_err}",
                        )
                    )

            doc.close()

        except Exception as e:
            logger.exception(f"Error opening PDF: {pdf_path}")
            results.append(ScanResult(success=False, error=str(e)))

        return results

    def process_pdf_dir(self, directory: str) -> Dict[str, List[ScanResult]]:
        """
        Process all PDF files in *directory*.
        Returns a dict mapping filename → list of ScanResult (one per page).
        """
        dir_path = Path(directory)
        pdf_files = sorted(dir_path.glob("*.pdf"))

        if not pdf_files:
            logger.warning(f"No PDF files found in: {directory}")
            return {}

        logger.info(f"Found {len(pdf_files)} PDF files in {directory}")
        all_results: Dict[str, List[ScanResult]] = {}

        for pdf_file in pdf_files:
            logger.info(f"\n{'='*60}")
            logger.info(f"File: {pdf_file.name}")
            all_results[pdf_file.name] = self.process_pdf(str(pdf_file))

        return all_results

    def process_image(
        self, 
        image: np.ndarray, 
        show: bool = False, 
        return_image: bool = False,
        override_regions: Optional[Dict[str, tuple]] = None
    ) -> ScanResult:
        """
        Process a single image (numpy array, BGR).
        """
        try:
            # Step 1: Align / deskew
            aligned = self.align_image(image)

            # Step 2: YOLO or Override region detection
            if override_regions is not None:
                logger.info("Using user-adjusted override regions.")
                regions = override_regions
            else:
                regions = self.detector.detect(aligned)
            
            # ── Fallback Demo Mode ────────────────────────────────────────────
            # If YOLO fails (because the model isn't trained yet) and no overrides provided
            if regions.get("reg_box") is None:
                logger.info("Using hardcoded mock regions to demonstrate live-marking.")
                h, w = aligned.shape[:2]
                regions = {
                    "name_box": (int(w*0.05), int(h*0.07), int(w*0.9), int(h*0.04)),
                    "reg_box": (int(w*0.11), int(h*0.17), int(w*0.22), int(h*0.20)),
                    "paper_box": (int(w*0.05), int(h*0.42), int(w*0.28), int(h*0.09)),
                    "booklet_version_box": (int(w*0.37), int(h*0.42), int(w*0.14), int(h*0.07)),
                    "booklet_serial_box": (int(w*0.06), int(h*0.68), int(w*0.26), int(h*0.22)),
                    "answer_block_col1": (int(w*0.34), int(h*0.49), int(w*0.15), int(h*0.41)),
                    "answer_block_col2": (int(w*0.50), int(h*0.49), int(w*0.15), int(h*0.41)),
                    "answer_block_col3": (int(w*0.66), int(h*0.49), int(w*0.15), int(h*0.41)),
                    "answer_block_col4": (int(w*0.81), int(h*0.49), int(w*0.15), int(h*0.41)),
                }

            warnings: List[str] = []
            result = ScanResult(success=True, warnings=warnings)

            # Step 3: Read each region ─────────────────────────────────────────

            # ── Name box (OCR placeholder) ────────────────────────────────────
            name_crop = self.detector.crop(aligned, regions.get("name_box"))
            if name_crop is not None:
                result.debug_crops["candidate_name"] = name_crop
                result.candidate_name = self._read_name(name_crop) or "JOHN DOE"
            else:
                warnings.append("name_box not detected by YOLO")

            # ── Registration number (digit bubble grid: 9 cols × 10 rows) ─────
            reg_crop = self.detector.crop(aligned, regions.get("reg_box"))
            if reg_crop is not None:
                result.debug_crops["reg_no"] = reg_crop
                result.registration_number = read_registration_number(
                    reg_crop,
                    digit_rows=10,
                )
            else:
                warnings.append("reg_box not detected by YOLO")

            # ── Paper Code / Branch (single column of 4 bubbles on the right) ─
            paper_crop = self.detector.crop(aligned, regions.get("paper_box"))
            if paper_crop is not None:
                result.debug_crops["paper"] = paper_crop
                
                # We expect 4 rows, 1 column, hugging the right edge
                paper_rows = read_bubble_grid(
                    paper_crop,
                    rows=4,
                    cols=1,
                    labels=["X"],
                    align="right"
                )
                
                best_ans = None
                best_conf = 0.0
                best_idx = -1
                for r, (ans, conf) in enumerate(paper_rows):
                    if ans is not None and conf > best_conf:
                        best_conf = conf
                        best_idx = r
                        best_ans = PAPER_OPTIONS[r] if r < len(PAPER_OPTIONS) else None
                
                if best_ans is not None:
                    result.paper = best_ans
                else:
                    warnings.append("paper_box: failed to read bubbles")
            else:
                warnings.append("paper_box not detected by YOLO")

            # ── Booklet version code (1 column of 4 bubbles hugging right edge) ────
            version_crop = self.detector.crop(aligned, regions.get("booklet_version_box"))
            if version_crop is not None:
                result.debug_crops["booklet_version"] = version_crop
                result.booklet_version = read_booklet_version(version_crop)
                if result.booklet_version == "?":
                    warnings.append("booklet_version_box has ambiguous or missing bubbles")
            else:
                warnings.append("booklet_version_box not detected by YOLO")

            # ── Booklet serial number (digit grid: 5 cols × 10 rows) ──────────
            serial_crop = self.detector.crop(aligned, regions.get("booklet_serial_box"))
            if serial_crop is not None:
                result.debug_crops["booklet_serial_no"] = serial_crop
                result.booklet_serial_no = read_booklet_serial_number(
                    serial_crop,
                    digit_rows=10,
                )
                if "?" in result.booklet_serial_no:
                    warnings.append(
                        f"Booklet serial has ambiguous digits: {result.booklet_serial_no}"
                    )
            else:
                warnings.append("booklet_serial_box not detected by YOLO")

            # ── Answer blocks (4 columns × 25 rows × 4 options) ───────────────
            for c in range(1, 5):
                q_start = (c - 1) * QUESTIONS_PER_BLOCK + 1
                
                block_crop = self.detector.crop(aligned, regions.get(f"answer_block_col{c}"))
                if block_crop is not None:
                    result.debug_crops[f"answer_block_col{c}"] = block_crop
                    rows = read_bubble_grid(
                        block_crop,
                        rows=QUESTIONS_PER_BLOCK,
                        cols=OPTIONS_PER_QUESTION,
                        labels=OPTIONS_ABCD,
                    )

                    for i, (answer, conf) in enumerate(rows):
                        q_num = q_start + i
                        if answer is None:
                            warnings.append(f"Q{q_num}: unanswered or ambiguous (fill={conf:.3f})")
                        result.answer_responses.append(
                            AnswerResponse(
                                question_number=q_num,
                                user_answer=answer,
                                confidence=conf,
                            )
                        )
                else:
                    warnings.append(f"answer_block_col{c} not detected by YOLO")
                    # Fill block with None answers so question numbers are preserved
                    for i in range(QUESTIONS_PER_BLOCK):
                        result.answer_responses.append(
                            AnswerResponse(
                                question_number=q_start + i,
                                user_answer=None,
                                confidence=0.0,
                            )
                        )
                    continue

                rows = read_bubble_grid(
                    block_crop,
                    rows=QUESTIONS_PER_BLOCK,
                    cols=OPTIONS_PER_QUESTION,
                    labels=OPTIONS_ABCD,
                )

                for i, (answer, conf) in enumerate(rows):
                    q_num = q_start + i
                    if answer is None:
                        warnings.append(f"Q{q_num}: unanswered or ambiguous (fill={conf:.3f})")
                    result.answer_responses.append(
                        AnswerResponse(
                            question_number=q_num,
                            user_answer=answer,
                            confidence=conf,
                        )
                    )

            if show or return_image:
                # Draw regions on the image for debugging
                disp = aligned.copy()
                for name, box in regions.items():
                    if box is not None:
                        x, y, w, h = map(int, box)
                        cv2.rectangle(disp, (x, y), (x + w, y + h), (0, 255, 0), 2)
                        cv2.putText(disp, name, (x, max(0, y - 10)), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                if return_image:
                    result.debug_image = disp

                if show:
                    # Resize if the image is too large for standard screens
                    h, w = disp.shape[:2]
                    if h > 900:
                        scale = 900 / h
                        disp = cv2.resize(disp, (int(w * scale), 900))
                    
                    cv2.imshow("OMR Scanner - Detected Regions", disp)
                    logger.info("OpenCV GUI opened. Press any key in the image window to continue...")
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()

            logger.info(
                f"Scan complete. Reg={result.registration_number} "
                f"Answers={len(result.answer_responses)} "
                f"Warnings={len(warnings)}"
            )
            return result

        except Exception as e:
            logger.exception("Error processing image")
            return ScanResult(success=False, error=str(e))

    # ── Image alignment (OpenCV perspective transform) ────────────────────────

    def align_image(self, img: np.ndarray) -> np.ndarray:
        """
        Since we are processing rendered PDFs directly, they are already perfectly 
        straight and do not suffer from camera perspective distortion.
        We return the original image to avoid unnecessary cropping of inner borders.
        """
        return img

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _read_name(self, crop: np.ndarray) -> str:
        """
        Extracts handwritten/printed name using EasyOCR.
        """
        try:
            import easyocr
            # Cache the reader to avoid reloading the model every time
            if not hasattr(self, "_ocr_reader"):
                self._ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                
            result = self._ocr_reader.readtext(
                crop, 
                detail=0, 
                allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ '
            )
            text = " ".join(result)
            return text.strip() or "Unknown"
        except Exception as e:
            logger.debug(f"Name extraction skipped or failed: {e}")
            return "Unknown"

    def _read_single_column_selection(
        self, crop: np.ndarray, options: List[str]
    ) -> Optional[str]:
        """
        For the Paper box: bubbles are arranged vertically (one per row,
        single column). Each row corresponds to one paper type.
        """
        from service.bubble_reader import preprocess, choose_option

        thresh = preprocess(crop)
        h, w   = thresh.shape
        n      = len(options)
        cell_h = h // n

        boxes = [(0, r * cell_h, w, cell_h) for r in range(n)]
        label, _ = choose_option(thresh, boxes, options)
        return label

    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        rect = np.zeros((4, 2), dtype="float32")
        s          = pts.sum(axis=1)
        rect[0]    = pts[np.argmin(s)]   # top-left
        rect[2]    = pts[np.argmax(s)]   # bottom-right
        diff       = np.diff(pts, axis=1)
        rect[1]    = pts[np.argmin(diff)] # top-right
        rect[3]    = pts[np.argmax(diff)] # bottom-left
        return rect
