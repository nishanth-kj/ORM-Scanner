# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "aiohttp>=3.14.3",
#     "numpy>=2.5.1",
#     "opencv-python-headless>=5.0.0.93",
#     "pdf2image>=1.17.0",
#     "pillow>=10.2.0",
#     "PySide6>=6.6.0",
#     "pymupdf>=1.28.0",
#     "requests>=2.34.2",
#     "ultralytics>=8.4.106",
# ]
# ///

import sys
import json
import logging
from pathlib import Path

from service.scanner_service import OMRScanner, ScanResult
from service.api_service import ApiService

# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_PDF_PATH = "downloads/101.pdf"
DEFAULT_YOLO_MODEL = None
DEFAULT_API_URL = "http://localhost:3000"
DEFAULT_PAGE = 1
DEFAULT_SHOW = True
DEFAULT_NO_UPLOAD = True

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def build_payload(result: ScanResult) -> dict:
    """Build the JSON payload that matches the Next.js API contract."""
    return {
        "candidate_name":      result.candidate_name or "Unknown",
        "registration_number": result.registration_number or "000000000",
        "branch":              result.paper or "Unknown",  # paper field holds branch full name
        "booklet_version":     result.booklet_version or "A1",
        "booklet_serial_no":   result.booklet_serial_no or "0000000",
        "responses": [
            {
                "question_number": r.question_number,
                "user_answer":     r.user_answer,
            }
            for r in result.answer_responses
        ],
    }


def main():
    logger.info("Starting OMR Scanner Explorer GUI...")
    
    scanner = OMRScanner(yolo_model_path=DEFAULT_YOLO_MODEL)
    api     = ApiService(base_url=DEFAULT_API_URL)

    try:
        from ui.gui import run_explorer
        run_explorer(scanner, api)
    except Exception as e:
        logger.error(f"Failed to start GUI: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
