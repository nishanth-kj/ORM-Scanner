# OMR Processing Algorithm

The ORM Scanner employs a robust computer vision pipeline designed to accurately extract answers from physical OMR sheets, even in the presence of varying lighting conditions, slight perspective warps, and user handwriting.

## Pipeline Overview

1. **Alignment & Perspective Correction**
   Using `cv2.findContours`, the scanner locates the largest rectangular contour on the page (the thick border outlining the answer sheet). It calculates the 4 corners of this border and applies a perspective transform (`cv2.warpPerspective`) to flatten and straighten the image, creating a uniformly scaled `aligned.png`.

2. **Region Detection**
   If a YOLOv8 model is provided, it detects the 9 critical bounding boxes (e.g., `reg_box`, `booklet_serial_box`, `answer_block_col1`). If no model is provided, the system falls back to `default_regions.json`, which contains mathematically precise bounding boxes for a standard A4 MTA format sheet.

3. **Digit & Bubble Extraction**
   The `bubble_reader.py` module uses pixel-density analysis to determine which bubble in a given column is filled.
   - The image is converted to grayscale and a binary threshold is applied.
   - For digit grids (like Registration Number), the bounding box is mathematically divided into a dense grid (e.g., 10 rows by 10 columns). 
   - A sub-region (the "tracking square") is mapped to the center of each expected cell.
   - The cell with the highest concentration of black pixels (after inversion) is chosen as the filled bubble.

## Special Cases: Printed Gaps

Some digit grids, like the Booklet Serial Number, contain physical printed gaps between columns on the OMR sheet. 
To perfectly align the tracking squares without complex dynamic horizontal tracking, the algorithm models the grid as having the full physical width (e.g., 10 columns) and mathematically drops the indices that correspond to the gaps. 
This ensures horizontal snapping remains perfectly accurate across the entire width of the grid, even if the user draws their bounding box slightly loosely.

## Future Improvements
- Dynamic Y-coordinate tracking using horizontal projections (`scipy.signal.find_peaks`) to perfectly track curved grids caused by extreme lens distortion.
- Localized adaptive thresholding to recover heavily washed-out corners of the scan.
