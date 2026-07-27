# ORM Scanner — Python OMR Engine

OMR (Optical Mark Recognition) scanner for the **Karnataka Examinations Authority** answer sheet (MTA format).

**Pipeline:**
- **YOLO** detects named layout regions on the sheet
- **OpenCV** reads bubbles/digits inside each region
- Results are uploaded to the Next.js API



## Run Commands

### Scan a single PDF (print only, no upload)
```bash
uv run main.py downloads\101.pdf --no-upload
```

### Scan a single PDF and upload to API
```bash
uv run main.py downloads\101.pdf
```

### Scan a single PDF with YOLO region detection
```bash
uv run main.py downloads\101.pdf --yolo models\yolov8n.pt --no-upload
```

### Scan all PDFs in the downloads folder
```bash
uv run main.py downloads\
```

### Scan all PDFs and upload to API
```bash
uv run main.py downloads\ --yolo models\yolov8n.pt
```

### Point to a custom API server
```bash
uv run main.py downloads\101.pdf --api-url http://localhost:3000
```


uv run main.py downloads\101.pdf --page 1 --show --no-upload

---

## Flags

| Flag | Default | Description |
|---|---|---|
| `pdf_path` | *(required)* | Path to a PDF file or a directory of PDFs |
| `--yolo` | `None` | Path to trained YOLO model (`.pt`). Without it, region detection is skipped |
| `--no-upload` | `False` | Print scan result only; do not send to Next.js API |
| `--api-url` | `http://localhost:3000` | Base URL of the Next.js API |

---

## PDF Format

Each **page** in a PDF = one OMR answer sheet.

Multi-page PDFs are fully supported — every page is scanned independently and uploaded as a separate answer sheet record.

---

## Project Structure

```
python/
├── main.py                        # CLI entry point
├── downloads/                     # PDF files to scan (101.pdf, 102.pdf, ...)
├── models/
│   └── yolov8n.pt                 # YOLO model (base or fine-tuned)
└── service/
    ├── scanner_service.py         # Orchestrator: PDF → ScanResult
    ├── region_detector.py         # YOLO wrapper → named bounding boxes
    ├── bubble_reader.py           # OpenCV pixel-fill bubble/digit reader
    └── api_service.py             # HTTP upload to Next.js API
```

---

## YOLO Region Classes

The YOLO model must be trained to detect these 9 classes (in order):

| ID | Class Name | Description |
|---|---|---|
| 0 | `name_box` | Candidate name handwritten area |
| 1 | `reg_box` | Registration Number digit-bubble grid (9 × 10) |
| 2 | `paper_box` | Paper/stream selection bubbles |
| 3 | `booklet_version_box` | Question booklet version (A/B/C/D) |
| 4 | `booklet_serial_box` | Question booklet serial number digit grid |
| 5 | `answer_block_col1` | Answer grid Q1–Q25 |
| 6 | `answer_block_col2` | Answer grid Q26–Q50 |
| 7 | `answer_block_col3` | Answer grid Q51–Q75 |
| 8 | `answer_block_col4` | Answer grid Q76–Q100 |

> **Note:** `yolov8n.pt` in `models/` is the base pretrained model.
> Fine-tune it on annotated OMR sheets to enable accurate region detection.

---

## Training a Custom Model

1. Annotate 50–100 OMR sheet images using [Roboflow](https://roboflow.com) with the 9 classes above
2. Export dataset in **YOLOv8 format**
3. Train:
   ```bash
   uv run -m yolo train model=models/yolov8n.pt data=dataset.yaml epochs=100 imgsz=1280
   ```
4. Replace the model:
   ```bash
   copy runs\detect\train\weights\best.pt models\omr_regions.pt
   ```
5. Run with the trained model:
   ```bash
   uv run main.py downloads\ --yolo models\omr_regions.pt
   ```
