# OMR Scanner Explorer GUI

The interactive GUI is an incredibly powerful tool for debugging, creating custom bounding boxes, and verifying the computer vision extraction process.

## Launching the GUI
To launch the GUI for a specific PDF:
```bash
uv run main.py downloads\101.pdf --show --no-upload
```

## Features

### 1. Interactive Bounding Boxes
When you load an image, the GUI will apply the bounding boxes from `default_regions.json`. 
You can **click and drag** anywhere on the image to draw a new bounding box.

### 2. Auto-Updating Predictions
When you draw a new box, select the corresponding region type from the dropdown menu (e.g., "Registration Number") and click **"Predict Bubbles"**.
The algorithm will immediately run the extraction code on your custom crop and overlay the tracking squares on the image.

### 3. Visual Tracking
- **Green Squares**: The bubble the algorithm believes is filled.
- **Red Squares**: Empty bubbles or unselected options.
By analyzing the alignment of the red squares, you can instantly see if your bounding box is drawn correctly. The red squares should perfectly map to the printed bubbles.

### 4. Saving Configurations
If you are happy with the bounding boxes for a specific page, click **"Save Regions"**. This will generate a JSON file specific to that page (e.g., `downloads/101_page_1_regions.json`). 

If you want to apply these custom regions to ALL future scans (e.g., if you're adapting to a new exam format), copy the contents of that JSON file directly into `default_regions.json`.

### Troubleshooting Misaligned Squares
- **Squares drifting horizontally**: Your bounding box is likely too wide or too narrow. Try making it tightly hug the leftmost and rightmost bubbles.
- **Squares shifted vertically by a full row**: Your bounding box is likely including handwriting or whitespace at the top. The first red square corresponds to "Row 0" (the digit 0). Draw the top edge of your box just above the first row of bubbles.
