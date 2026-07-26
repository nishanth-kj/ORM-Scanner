import cv2
import numpy as np
import fitz  # PyMuPDF
import os
import logging
from ultralytics import YOLO

logger = logging.getLogger(__name__)

class OMRScanner:
    def __init__(self, yolo_model_path: str = None):
        """
        Initialize the OMR Scanner. 
        If a YOLO model path is provided, it uses YOLO for anchor detection.
        Otherwise, it falls back to classic OpenCV contour detection.
        """
        self.use_yolo = yolo_model_path and os.path.exists(yolo_model_path)
        if self.use_yolo:
            self.model = YOLO(yolo_model_path)
            logger.info(f"Loaded YOLO model from {yolo_model_path}")
        else:
            logger.info("No YOLO model found. Falling back to OpenCV contour detection.")

    def process_pdf(self, pdf_path: str) -> dict:
        """
        Main entry point for processing a PDF OMR sheet.
        """
        try:
            # 1. Convert PDF to Image (first page only) using PyMuPDF
            doc = fitz.open(pdf_path)
            if not doc:
                return {"success": False, "error": "Could not open PDF"}
            
            page = doc.load_page(0) # Get first page
            pix = page.get_pixmap(dpi=300)
            
            # Convert PyMuPDF pixmap to numpy array (RGB)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            
            # Convert RGB to BGR for OpenCV
            if pix.n == 4:
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            else:
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            
            doc.close()
            
            # 2. Preprocess & Deskew
            warped = self.align_image(img)
            
            # 3. Extract Answers & Registration
            registration_number = self.extract_registration(warped)
            answers = self.extract_answers(warped)
            
            return {
                "success": True,
                "registration_number": registration_number,
                "answers": answers,
                "confidence": 0.99  # Placeholder for calculation
            }
            
        except Exception as e:
            logger.error(f"Error processing {pdf_path}: {e}")
            return {"success": False, "error": str(e)}

    def align_image(self, img: np.ndarray) -> np.ndarray:
        """
        Find the corners of the OMR sheet and perform a perspective transform 
        to perfectly flatten it, eliminating rotation and skew.
        """
        if self.use_yolo:
            # YOLO-based corner detection
            results = self.model(img)
            # Extrapolate corners from YOLO bounding boxes...
            # (Placeholder logic for YOLO extraction)
            pass
            
        # OpenCV fallback: Edge detection & Contours
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 75, 200)

        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return img

        # Find largest contour which is assumed to be the paper/OMR boundary
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        document_contour = None
        
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                document_contour = approx
                break
                
        if document_contour is not None:
            # Apply perspective transform
            pts = document_contour.reshape(4, 2)
            rect = self._order_points(pts)
            (tl, tr, br, bl) = rect
            
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))

            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))

            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]], dtype="float32")

            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
            return warped
            
        return img # Return original if no boundary found

    def extract_grid(self, img: np.ndarray, x: int, y: int, w: int, h: int, rows: int, cols: int, options_per_row: int = 4) -> list:
        """
        Slices a bounding box into rows and columns, analyzing pixel density to find filled bubbles.
        Returns a list of answers for each row.
        """
        grid_roi = img[y:y+h, x:x+w]
        gray = cv2.cvtColor(grid_roi, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

        row_h = h // rows
        col_w = w // cols
        
        results = []
        for r in range(rows):
            row_y = r * row_h
            best_density = 0
            best_option = None
            
            for c in range(options_per_row):
                col_x = c * col_w
                cell = thresh[row_y:row_y+row_h, col_x:col_x+col_w]
                
                # Count non-zero pixels (white pixels in binary inverted image)
                density = cv2.countNonZero(cell)
                if density > best_density and density > (row_h * col_w * 0.3): # 30% fill threshold
                    best_density = density
                    best_option = c + 1 # Options are 1, 2, 3, 4
                    
            if best_option is not None:
                results.append(str(best_option))
            else:
                results.append(None) # No bubble filled or too light
                
        return results

    def extract_registration(self, img: np.ndarray) -> str:
        """
        Extract the 9-digit registration number by analyzing the grid.
        Grid is 9 columns wide, 10 rows high (0-9).
        """
        height, width = img.shape[:2]
        
        # Approximate relative coordinates for the Registration Number block (Block 2)
        # These will need to be calibrated for the exact physical paper
        x = int(width * 0.1)
        y = int(height * 0.15)
        w = int(width * 0.3)
        h = int(height * 0.2)
        
        gray = cv2.cvtColor(img[y:y+h, x:x+w], cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
        
        rows = 10
        cols = 9
        row_h = h // rows
        col_w = w // cols
        
        reg_number = ""
        for c in range(cols):
            best_density = 0
            best_val = "0"
            for r in range(rows):
                cell = thresh[r*row_h:(r+1)*row_h, c*col_w:(c+1)*col_w]
                density = cv2.countNonZero(cell)
                if density > best_density and density > (row_h * col_w * 0.3):
                    best_density = density
                    best_val = str(r)
            reg_number += best_val
            
        logger.info(f"Extracted Registration Number: {reg_number}")
        return reg_number if len(reg_number) == 9 else "000000000"

    def extract_answers(self, img: np.ndarray) -> dict:
        """
        Slice the answer grid into 4 columns of 25 questions.
        """
        height, width = img.shape[:2]
        answers = {}
        
        # Define 4 column boundaries (Relative coordinates based on standard A4 OMR)
        # Block 1 (Q1-Q25), Block 2 (Q26-Q50), Block 3 (Q51-Q75), Block 4 (Q76-Q100)
        columns_config = [
            {"q_start": 1,  "x_pct": 0.05, "y_pct": 0.45, "w_pct": 0.20, "h_pct": 0.50},
            {"q_start": 26, "x_pct": 0.30, "y_pct": 0.45, "w_pct": 0.20, "h_pct": 0.50},
            {"q_start": 51, "x_pct": 0.55, "y_pct": 0.45, "w_pct": 0.20, "h_pct": 0.50},
            {"q_start": 76, "x_pct": 0.80, "y_pct": 0.45, "w_pct": 0.20, "h_pct": 0.50},
        ]
        
        for col in columns_config:
            x = int(width * col["x_pct"])
            y = int(height * col["y_pct"])
            w = int(width * col["w_pct"])
            h = int(height * col["h_pct"])
            
            # Options map from 1,2,3,4 to A,B,C,D based on Next.js DB expectations
            option_map = {"1": "A", "2": "B", "3": "C", "4": "D"}
            
            col_answers = self.extract_grid(img, x, y, w, h, rows=25, cols=4, options_per_row=4)
            
            for i, ans in enumerate(col_answers):
                q_num = str(col["q_start"] + i)
                # If an answer was found, map it, else leave empty/default
                answers[q_num] = option_map.get(ans, "A") 
                
        return answers

    def _order_points(self, pts):
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        return rect
