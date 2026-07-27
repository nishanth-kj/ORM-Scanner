"""
bubble_reader.py
----------------
Pure OpenCV bubble / digit-grid scoring. No YOLO involved.

Responsibilities:
  - Preprocess a cropped region for mark detection
  - Score individual bubble ROIs by pixel-fill ratio
  - Choose the filled option in a row (with ambiguity detection)
  - Read a full bubble grid  (rows × options  → list of answers)
  - Read a full digit grid   (rows × 10 cols  → per-column digit string)
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple

# ── Constants ────────────────────────────────────────────────────────────────

OPTIONS_ABCD = ["A", "B", "C", "D"]
OPTIONS_ABCDE = ["A", "B", "C", "D", "E"]
DIGITS = [str(i) for i in range(10)]  # rows 0-9 represent digits 0-9

# A bubble must be at least this fraction filled to be considered marked.
MIN_FILL_RATIO = 0.08

# The winning bubble must beat the runner-up by at least this margin.
# Below this, the answer is flagged as ambiguous (double-marked / unclear).
AMBIGUITY_MARGIN = 0.04


# ── Preprocessing ────────────────────────────────────────────────────────────

def preprocess(crop: np.ndarray) -> np.ndarray:
    """
    Convert a BGR crop to a binary (inverted) threshold image ready for
    pixel-fill scoring.

    Steps:
      1. Grayscale
      2. Gaussian blur   — smooths out JPEG noise / printer dots
      3. Adaptive threshold (Gaussian, inverted) — marks appear WHITE
    """
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU
    )
    return thresh


# ── Single-bubble scoring ─────────────────────────────────────────────────────

def fill_ratio(thresh: np.ndarray, x: int, y: int, w: int, h: int) -> float:
    """
    Return the fraction of white pixels in the ROI [y:y+h, x:x+w].
    White pixels in the inverted image correspond to dark (filled) marks.
    """
    roi = thresh[y : y + h, x : x + w]
    if roi.size == 0:
        return 0.0
    return float(cv2.countNonZero(roi)) / float(w * h)


# ── Row-level option selection ────────────────────────────────────────────────

def choose_option(
    thresh: np.ndarray,
    boxes: List[Tuple[int, int, int, int]],
    labels: List[str] = OPTIONS_ABCD,
) -> Tuple[Optional[str], float]:
    """
    Given a list of bubble bboxes for one question row, return
    (chosen_label, fill_score_of_winner).

    Returns (None, score) when:
      - No bubble is sufficiently filled  (score < MIN_FILL_RATIO)
      - Two bubbles are almost equally filled  (ambiguous / double-mark)
    """
    scores = [fill_ratio(thresh, x, y, w, h) for (x, y, w, h) in boxes]

    if not scores:
        return None, 0.0

    sorted_scores = sorted(scores, reverse=True)
    best_score = sorted_scores[0]
    second_score = sorted_scores[1] if len(sorted_scores) > 1 else 0.0

    if best_score < MIN_FILL_RATIO:
        return None, best_score  # nothing filled

    if best_score - second_score < AMBIGUITY_MARGIN:
        return None, best_score  # ambiguous / double-marked

    best_idx = int(np.argmax(scores))
    return labels[best_idx], best_score


# ── Bubble grid (A/B/C/D per row) ────────────────────────────────────────────

def read_bubble_grid(
    crop: np.ndarray,
    rows: int,
    cols: int,
    labels: List[str] = OPTIONS_ABCD,
    padding_ratio: float = 0.15,
    align: str = "center",
    header_rows: float = 0.0,
) -> List[Tuple[Optional[str], float]]:
    """
    Slice *crop* into a (rows × cols) grid and score each row.

    Parameters
    ----------
    crop          : BGR image of the answer block
    rows          : number of questions in this block
    cols          : number of options per question (usually 4)
    labels        : option labels matching column order
    padding_ratio : fractional inset to avoid border lines

    Returns
    -------
    List of (answer, confidence) tuples, one per row.
    """
    thresh = preprocess(crop)
    h, w = thresh.shape

    total_rows = rows + header_rows
    cell_h = h / total_rows
    cell_w = w / cols

    # Calculate a perfectly square box size centered in each cell
    box_size = min(cell_w, cell_h) * (1 - 2 * padding_ratio)

    results: List[Tuple[Optional[str], float]] = []

    for r in range(rows):
        actual_r = r + header_rows
        row_boxes: List[Tuple[int, int, int, int]] = []
        for c in range(cols):
            if align == "right":
                # Force the boxes to hug the right edge
                # c=cols-1 is the rightmost, c=cols-2 is the next left, etc.
                pad_right = int(w * 0.05)
                bx = int(w - pad_right - (cols - c) * box_size)
                cy = (actual_r + 0.5) * cell_h
                by = int(cy - box_size / 2)
            else:
                cx = (c + 0.5) * cell_w
                cy = (actual_r + 0.5) * cell_h
                bx = int(cx - box_size / 2)
                by = int(cy - box_size / 2)
                
            bw = int(box_size)
            bh = int(box_size)
            row_boxes.append((bx, by, bw, bh))

        answer, conf = choose_option(thresh, row_boxes, labels)
        
        # Visually track all 4 options on the crop
        for i, (bx, by, bbw, bbh) in enumerate(row_boxes):
            if answer is not None and i == labels.index(answer):
                # Selected: Green rectangle
                cv2.rectangle(crop, (bx, by), (bx + bbw, by + bbh), (0, 255, 0), 2)
            else:
                # Unselected: Red rectangle
                cv2.rectangle(crop, (bx, by), (bx + bbw, by + bbh), (0, 0, 255), 1)
                
        results.append((answer, round(conf, 4)))

    return results


# ── Digit grid (0-9 per column, one digit per column) ────────────────────────

def read_digit_grid(
    crop: np.ndarray,
    digit_cols: int,
    digit_rows: int = 10,
    padding_ratio: float = 0.15,
    header_rows: float = 0.0,
) -> str:
    """
    Read a digit-entry grid where:
      - Each **column** represents one digit position in the number
      - Each **row** in that column represents a possible digit (0-9, top->bottom)
      - The filled row in a column is the selected digit
    
    `header_rows` can be used to skip the handwritten boxes at the top of the grid.
    """
    thresh = preprocess(crop)
    h, w = thresh.shape

    total_rows = digit_rows + header_rows
    cell_h = h / total_rows
    cell_w = w / digit_cols

    box_size = min(cell_w, cell_h) * (1 - 2 * padding_ratio)

    number = ""

    for c in range(digit_cols):
        col_boxes: List[Tuple[int, int, int, int]] = []
        for r in range(digit_rows):
            actual_r = r + header_rows
            cx = (c + 0.5) * cell_w
            cy = (actual_r + 0.5) * cell_h
            bx = int(cx - box_size / 2)
            by = int(cy - box_size / 2)
            bw = int(box_size)
            bh = int(box_size)
            col_boxes.append((bx, by, bw, bh))

        answer, _ = choose_option(thresh, col_boxes, DIGITS)
        
        for i, (bx, by, bbw, bbh) in enumerate(col_boxes):
            if answer is not None and i == DIGITS.index(answer):
                cv2.rectangle(crop, (bx, by), (bx + bbw, by + bbh), (0, 255, 0), 2)
            else:
                cv2.rectangle(crop, (bx, by), (bx + bbw, by + bbh), (0, 0, 255), 1)
                
        if answer is not None:
            number += answer
        else:
            number += "?"

    return number


def read_registration_number(
    crop: np.ndarray,
    digit_rows: int = 10,
    padding_ratio: float = 0.15,
    header_rows: float = 1.0,
) -> str:
    """
    Specific function for the Registration Number.
    The physical OMR sheet has 10 columns, but the 6th column (index 5) is an empty spacer.
    This reads all 10 columns and drops the 6th one, returning a 9-digit string.
    """
    raw_number = read_digit_grid(
        crop,
        digit_cols=10,
        digit_rows=digit_rows,
        padding_ratio=padding_ratio,
        header_rows=header_rows
    )
    
    # If we successfully read 10 columns, drop the 6th column (index 5)
    if len(raw_number) == 10:
        return raw_number[:5] + raw_number[6:]
    return raw_number

def read_booklet_serial_number(
    crop: np.ndarray,
    digit_rows: int = 10,
    padding_ratio: float = 0.15,
    header_rows: float = 1.0,
) -> str:
    """
    Specific function for the Booklet Serial Number.
    The physical OMR sheet uses the same 10-column spacing as the Registration Number,
    but has gaps at indices 3, 6, and 9.
    This reads all 10 columns and drops the gaps, returning a 7-digit string.
    """
    raw_number = read_digit_grid(
        crop,
        digit_cols=10,
        digit_rows=digit_rows,
        padding_ratio=padding_ratio,
        header_rows=header_rows
    )

    # If we successfully read 10 columns, drop columns at index 3, 6, and 9
    if len(raw_number) == 10:
        return raw_number[:3] + raw_number[4:6] + raw_number[7:9]
    return raw_number

def read_booklet_version(
    crop: np.ndarray,
    padding_ratio: float = 0.15,
    header_rows: float = 0.0,
) -> str:
    """
    Specific function for the Booklet Version Code.
    User specified: TWO ROW ONE I a B C D ROW 1 AND 1 2 3 4 ROW 2
    So it's a 2x4 grid. There is a huge gap between Row 1 and Row 2.
    Row 0 options: A, B, C, D
    Row 1 options: 1, 2, 3, 4
    """
    h, w = crop.shape[:2]
    mid = h // 2
    top_crop = crop[:mid, :]
    bot_crop = crop[mid:, :]

    row0 = read_bubble_grid(
        top_crop,
        rows=1,
        cols=4,
        labels=["A", "B", "C", "D"],
        padding_ratio=padding_ratio,
        align="center",
        header_rows=header_rows
    )
    
    row1 = read_bubble_grid(
        bot_crop,
        rows=1,
        cols=4,
        labels=["1", "2", "3", "4"],
        padding_ratio=padding_ratio,
        align="center",
        header_rows=0.0 # No header for the bottom half
    )
    
    if len(row0) == 1 and len(row1) == 1:
        ans0, conf0 = row0[0]
        ans1, conf1 = row1[0]
        
        letter = ans0 if ans0 else "?"
        num = ans1 if ans1 else "?"
        return f"{letter}{num}"
        
    return "??"


# ── Debug helper ─────────────────────────────────────────────────────────────

def draw_grid_overlay(
    crop: np.ndarray,
    rows: int,
    cols: int,
    results: List[Tuple[Optional[str], float]],
    padding_ratio: float = 0.05,
) -> np.ndarray:
    """
    Draw coloured overlays on *crop* showing which bubble was selected.
    Green = selected, Red = ambiguous/empty.  Useful for debugging.
    """
    vis = crop.copy()
    h, w = vis.shape[:2]

    cell_h = h / rows
    cell_w = w / cols
    pad_x = int(cell_w * padding_ratio)
    pad_y = int(cell_h * padding_ratio)

    for r, (answer, _) in enumerate(results):
        for c in range(cols):
            label = OPTIONS_ABCD[c] if c < len(OPTIONS_ABCD) else str(c)
            x = int(c * cell_w) + pad_x
            y = int(r * cell_h) + pad_y
            bw = int(cell_w) - 2 * pad_x
            bh = int(cell_h) - 2 * pad_y

            color = (0, 200, 0) if answer == label else (0, 0, 200)
            if answer is None:
                color = (0, 100, 200)

            cv2.rectangle(vis, (x, y), (x + bw, y + bh), color, 1)

    return vis
