# ORM Scanner – Python OMR Engine

A robust Optical Mark Recognition (OMR) processing pipeline designed specifically for the **Karnataka Examinations Authority** answer sheets (MTA format). 

This engine is capable of reading heavily distorted, phone-scanned PDF pages, aligning them via perspective transformations, extracting handwritten digit bubbles, and pushing the extracted data to a Next.js REST API.

---

## 📖 Documentation
- [OMR Algorithm Details](docs/algorithm.md)
- [Interactive Debug GUI](docs/gui.md)

---

## 🚀 Quick Start

### Basic CLI Commands
Run the scanner from the `python/` directory using `uv`.

```bash
# Scan a single PDF (print only, no upload)
uv run main.py downloads\101.pdf --no-upload

# Scan all PDFs in the directory and upload results to API
uv run main.py downloads\

# Run the interactive Debug GUI
uv run main.py downloads\101.pdf --show --no-upload

# Point to a custom API server (default is http://localhost:3000)
uv run main.py downloads\101.pdf --api-url http://localhost:8080
```

### Region Detection (Optional YOLO Support)
By default, the scanner uses mathematically precise bounding boxes defined in `default_regions.json` for a standard A4 format sheet. 
If your scans have highly variable scaling or cropping, you can use a fine-tuned YOLOv8 model to dynamically detect the bounding boxes before bubble extraction.

```bash
uv run main.py downloads\101.pdf --yolo models\omr_regions.pt
```

---

## 🛠️ Project Architecture

```
python/
├── main.py                        # CLI entry point
├── pyproject.toml                 # Dependencies managed by `uv`
├── default_regions.json           # Default MTA format bounding boxes
├── docs/                          # Detailed documentation
├── models/
│   └── yolov8n.pt                 # YOLO model (base or fine-tuned)
├── ui/
│   └── gui.py                     # Interactive debugger and bounding box tool
└── service/
    ├── scanner_service.py         # Orchestrator: PDF -> Align -> Crop -> Read
    ├── region_detector.py         # YOLO bounding box dynamic detection
    ├── bubble_reader.py           # Core OpenCV pixel-density digit extraction
    └── api_service.py             # HTTP sync to the Next.js API
```

---

## 📊 Expected Payload Format

When a scan is successfully processed, the engine sends a POST request to `<api-url>/api/scans` with the following JSON structure:

```json
{
  "scans": [
    {
      "registration_number": "201121013",
      "booklet_serial_number": "2007011",
      "paper": "1",
      "booklet_version": "A",
      "answers": {
        "1": "C",
        "2": "A",
        "3": "B",
        "4": "D",
        "5": "C"
      }
    }
  ]
}
```

---

## 🧠 Training a Custom YOLO Model

To enable dynamic region detection instead of relying on `default_regions.json`:

1. Annotate 50–100 OMR sheet images using [Roboflow](https://roboflow.com) with the following classes:
   - `name_box`
   - `reg_box`
   - `paper_box`
   - `booklet_version_box`
   - `booklet_serial_box`
   - `answer_block_col1`, `answer_block_col2`, `answer_block_col3`, `answer_block_col4`
2. Export the dataset in **YOLOv8 format**.
3. Train the model:
   ```bash
   uv run -m yolo train model=models/yolov8n.pt data=dataset.yaml epochs=100 imgsz=1280
   ```
4. Run the scanner with your new weights:
   ```bash
   uv run main.py downloads\ --yolo runs\detect\train\weights\best.pt
   ```
