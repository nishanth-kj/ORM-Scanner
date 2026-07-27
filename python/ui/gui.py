import sys
import os
import json
import cv2
import numpy as np
import fitz
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, 
                               QVBoxLayout, QTreeWidget, QTreeWidgetItem, 
                               QTextEdit, QPushButton, QLabel, QMessageBox,
                               QScrollArea, QFrame, QGraphicsView, QGraphicsScene,
                               QGraphicsRectItem)
from PySide6.QtGui import QImage, QPixmap, QPen, QColor, QBrush, QPainter
from PySide6.QtCore import Qt, QRectF
from service.scanner_service import OMRScanner
from service.api_service import ApiService
from main import build_payload

DOWNLOADS_DIR = "downloads"

class ResizableRect(QGraphicsRectItem):
    def __init__(self, name, x, y, w, h):
        super().__init__(x, y, w, h)
        self.name = name
        self.setFlags(QGraphicsRectItem.ItemIsSelectable | QGraphicsRectItem.ItemIsMovable)
        self.setPen(QPen(QColor(0, 150, 255), 3))
        self.setBrush(QBrush(QColor(0, 150, 255, 40)))
        self.setAcceptHoverEvents(True)
        self._resizing = False
        self._resize_edge = None
        
        # We need a label text for the region
        from PySide6.QtWidgets import QGraphicsTextItem
        self.text_item = QGraphicsTextItem(self.name, self)
        self.text_item.setDefaultTextColor(QColor(255, 0, 0))
        self.text_item.setPos(x, y - 20)

    def hoverMoveEvent(self, event):
        pos = event.pos()
        rect = self.rect()
        margin = 15
        
        on_left = abs(pos.x() - rect.x()) < margin
        on_right = abs(pos.x() - (rect.x() + rect.width())) < margin
        on_top = abs(pos.y() - rect.y()) < margin
        on_bottom = abs(pos.y() - (rect.y() + rect.height())) < margin
        
        edge = ''
        if on_top: edge += 't'
        elif on_bottom: edge += 'b'
        if on_left: edge += 'l'
        elif on_right: edge += 'r'

        if edge in ('tl', 'br'):
            self.setCursor(Qt.SizeFDiagCursor)
        elif edge in ('tr', 'bl'):
            self.setCursor(Qt.SizeBDiagCursor)
        elif edge in ('l', 'r'):
            self.setCursor(Qt.SizeHorCursor)
        elif edge in ('t', 'b'):
            self.setCursor(Qt.SizeVerCursor)
        else:
            self.setCursor(Qt.SizeAllCursor)
            
        self._resize_edge = edge if edge else None
        super().hoverMoveEvent(event)

    def mousePressEvent(self, event):
        if self._resize_edge:
            self._resizing = True
        else:
            super().mousePressEvent(event)

    def mouseMoveEvent(self, event):
        if self._resizing and self._resize_edge:
            diff = event.pos() - event.lastPos()
            rect = self.rect()
            x, y, w, h = rect.x(), rect.y(), rect.width(), rect.height()
            
            if 'l' in self._resize_edge:
                x += diff.x()
                w -= diff.x()
            elif 'r' in self._resize_edge:
                w += diff.x()
                
            if 't' in self._resize_edge:
                y += diff.y()
                h -= diff.y()
            elif 'b' in self._resize_edge:
                h += diff.y()
                
            # Prevent negative or extremely small sizes
            if w < 10: w = 10
            if h < 10: h = 10
                
            self.setRect(x, y, w, h)
        else:
            super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        if self._resizing:
            self._resizing = False
        else:
            super().mouseReleaseEvent(event)

    def get_coords(self):
        # Calculate exact coordinates without pen width padding
        rect = self.rect()
        pos = self.scenePos()
        return (int(pos.x() + rect.x()), int(pos.y() + rect.y()), int(rect.width()), int(rect.height()))

class ImageViewer(QGraphicsView):
    def __init__(self, scene):
        super().__init__(scene)
        self.setDragMode(QGraphicsView.ScrollHandDrag)
        self.setRenderHint(QPainter.Antialiasing)
        self.setRenderHint(QPainter.SmoothPixmapTransform)

    def wheelEvent(self, event):
        if event.modifiers() == Qt.ControlModifier:
            zoom_in = event.angleDelta().y() > 0
            factor = 1.15 if zoom_in else 0.85
            self.scale(factor, factor)
        else:
            super().wheelEvent(event)

class OMRExplorerApp(QMainWindow):
    def __init__(self, scanner: OMRScanner, api: ApiService):
        super().__init__()
        self.scanner = scanner
        self.api = api
        self._last_result = None  # stores the most recent ScanResult
        self.setWindowTitle("OMR Scanner - Interactive View")
        self.resize(1600, 900)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        
        # --- Left Panel (PDF Tree) ---
        left_layout = QVBoxLayout()
        self.tree = QTreeWidget()
        self.tree.setHeaderLabels(["PDF Files & Pages"])
        self.tree.itemSelectionChanged.connect(self.on_tree_selection)
        
        self.predict_btn = QPushButton("Predict Bubbles Using Regions")
        self.predict_btn.setStyleSheet("background-color: #28a745; color: white; font-weight: bold; padding: 10px;")
        self.predict_btn.setEnabled(False)
        self.predict_btn.clicked.connect(self.on_predict_clicked)
        
        self.save_regions_btn = QPushButton("Save Region Markings (JSON)")
        self.save_regions_btn.setStyleSheet("background-color: #17a2b8; color: white; font-weight: bold; padding: 10px;")
        self.save_regions_btn.setEnabled(False)
        self.save_regions_btn.clicked.connect(self.on_save_regions_clicked)
        
        self.load_regions_btn = QPushButton("Load Region Markings (JSON)")
        self.load_regions_btn.setStyleSheet("background-color: #ffc107; color: black; font-weight: bold; padding: 10px;")
        self.load_regions_btn.setEnabled(False)
        self.load_regions_btn.clicked.connect(self.on_load_regions_clicked)
        
        self.export_crops_btn = QPushButton("Export Cropped Images")
        self.export_crops_btn.setStyleSheet("background-color: #6f42c1; color: white; font-weight: bold; padding: 10px;")
        self.export_crops_btn.setEnabled(False)
        self.export_crops_btn.clicked.connect(self.on_export_crops_clicked)
        
        self.predict_all_btn = QPushButton("Predict ALL Pages (Batch)")
        self.predict_all_btn.setStyleSheet("background-color: #20c997; color: white; font-weight: bold; padding: 10px;")
        self.predict_all_btn.setEnabled(False)
        self.predict_all_btn.clicked.connect(self.on_predict_all_clicked)

        self.upload_btn = QPushButton("⬆  Upload to API")
        self.upload_btn.setStyleSheet("background-color: #e74c3c; color: white; font-weight: bold; padding: 10px; font-size: 13px;")
        self.upload_btn.setEnabled(False)
        self.upload_btn.clicked.connect(self.on_upload_clicked)
        
        left_layout.addWidget(self.tree)
        left_layout.addWidget(self.predict_btn)
        left_layout.addWidget(self.predict_all_btn)
        left_layout.addWidget(self.save_regions_btn)
        left_layout.addWidget(self.load_regions_btn)
        left_layout.addWidget(self.export_crops_btn)
        left_layout.addWidget(self.upload_btn)
        
        # --- Middle Panel (Interactive Canvas) ---
        mid_layout = QVBoxLayout()
        
        self.scene = QGraphicsScene()
        self.viewer = ImageViewer(self.scene)
        self.viewer.setStyleSheet("background-color: #333333;")
        
        self.info_text = QTextEdit()
        self.info_text.setReadOnly(False)
        self.info_text.setStyleSheet("font-family: Consolas; font-size: 10pt; background-color: #f0f0f0; color: #000000;")
        self.info_text.setMinimumHeight(150)
        self.info_text.setMaximumHeight(250)
        
        self.save_json_btn = QPushButton("Save JSON")
        self.save_json_btn.setEnabled(False)
        self.save_json_btn.clicked.connect(self.on_save_json_clicked)
        
        mid_layout.addWidget(QLabel("Ctrl+Scroll to Zoom. Drag canvas to pan. Drag boxes to align them over bubbles!"))
        mid_layout.addWidget(self.viewer, 4)
        mid_layout.addWidget(self.info_text, 1)
        mid_layout.addWidget(self.save_json_btn)
        
        # --- Right Panel (Crops) ---
        right_layout = QVBoxLayout()
        crops_title = QLabel("Extracted Regions")
        crops_title.setStyleSheet("font-weight: bold; font-size: 14px;")
        crops_title.setAlignment(Qt.AlignCenter)
        right_layout.addWidget(crops_title)
        
        self.crops_scroll = QScrollArea()
        self.crops_scroll.setWidgetResizable(True)
        self.crops_container = QWidget()
        self.crops_grid = QVBoxLayout(self.crops_container)
        self.crops_scroll.setWidget(self.crops_container)
        self.crops_scroll.setMinimumWidth(350)
        right_layout.addWidget(self.crops_scroll)
        
        main_layout.addLayout(left_layout, 1)
        main_layout.addLayout(mid_layout, 3)
        main_layout.addLayout(right_layout, 2)
        
        self.selected_file = None
        self.selected_page = None
        self.current_cv_img = None
        self.current_crops = None
        
        self.bg_pixmap_item = None
        self.draggable_items = []
        self.last_used_regions = {}
        self.batch_results = []
        
        self.load_pdfs()
        
    def load_pdfs(self):
        if not os.path.exists(DOWNLOADS_DIR):
            os.makedirs(DOWNLOADS_DIR)
            
        pdf_files = [f for f in os.listdir(DOWNLOADS_DIR) if f.lower().endswith(".pdf")]
        
        for pdf in pdf_files:
            pdf_path = os.path.join(DOWNLOADS_DIR, pdf)
            parent = QTreeWidgetItem(self.tree, [pdf])
            parent.setData(0, Qt.UserRole, {"type": "file", "path": pdf_path})
            
            try:
                doc = fitz.open(pdf_path)
                page_count = len(doc)
                doc.close()
                for i in range(page_count):
                    child = QTreeWidgetItem(parent, [f"Page {i+1}"])
                    child.setData(0, Qt.UserRole, {"type": "page", "path": pdf_path, "page": i+1})
            except Exception:
                child = QTreeWidgetItem(parent, [f"Error reading pages"])
                child.setData(0, Qt.UserRole, {"type": "error"})
                
        self.tree.expandAll()

    def on_tree_selection(self):
        selected_items = self.tree.selectedItems()
        if not selected_items:
            self.predict_btn.setEnabled(False)
            return
            
        item = selected_items[0]
        data = item.data(0, Qt.UserRole)
        
        if data and data.get("type") == "page":
            # Save current marks so they persist to the new page
            if self.draggable_items:
                for d_item in self.draggable_items:
                    self.last_used_regions[d_item.name] = d_item.get_coords()
                    
            self.selected_file = data.get("path")
            self.selected_page = data.get("page")
            self.predict_btn.setEnabled(True)
            self.predict_all_btn.setEnabled(True)
            self.save_regions_btn.setEnabled(True)
            self.load_regions_btn.setEnabled(True)
            self.clear_crops()
            self.load_image_to_canvas()
        else:
            self.selected_file = None
            self.selected_page = None
            self.predict_btn.setEnabled(False)
            self.predict_all_btn.setEnabled(False)
            self.save_regions_btn.setEnabled(False)
            self.load_regions_btn.setEnabled(False)
            self.export_crops_btn.setEnabled(False)
            self.save_json_btn.setEnabled(False)

    def load_image_to_canvas(self):
        self.scene.clear()
        self.draggable_items = []
        
        try:
            doc = fitz.open(self.selected_file)
            page = doc.load_page(self.selected_page - 1)
            # Use 200dpi to match scanner_service.py's internal scaling
            pix = page.get_pixmap(dpi=200)
            
            img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            if pix.n == 4:
                rgb_img = cv2.cvtColor(img_data, cv2.COLOR_RGBA2RGB)
                self.current_cv_img = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
            else:
                rgb_img = img_data
                self.current_cv_img = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
                
            h, w, ch = rgb_img.shape
            bytes_per_line = ch * w
            q_img = QImage(rgb_img.data, w, h, bytes_per_line, QImage.Format_RGB888)
            pixmap = QPixmap.fromImage(q_img)
            
            self.bg_pixmap_item = self.scene.addPixmap(pixmap)
            self.scene.setSceneRect(0, 0, w, h)
            self.viewer.fitInView(self.scene.sceneRect(), Qt.KeepAspectRatio)
            
            self.init_draggable_regions(w, h, self.last_used_regions)
            
            self.info_text.setPlainText(f"Ready to predict: {os.path.basename(self.selected_file)} - Page {self.selected_page}")
            doc.close()
        except Exception as e:
            self.info_text.setPlainText(f"Error loading preview: {e}")

    def init_draggable_regions(self, w, h, saved_regions=None):
        # Fallback if no default JSON is found
        default_regions = {
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
        
        import os, json
        
        # Load permanent project default if it exists
        default_json_path = os.path.join(os.path.dirname(__file__), "..", "default_regions.json")
        try:
            with open(default_json_path, "r") as f:
                data = json.load(f)
                if "regions" in data:
                    for k, box in data["regions"].items():
                        default_regions[k] = box
        except Exception as e:
            pass
        
        
        # Override with most recently saved JSON from downloads/
        import glob
        import json
        region_files = glob.glob(os.path.join(DOWNLOADS_DIR, "*_regions.json"))
        if region_files:
            latest_file = max(region_files, key=os.path.getmtime)
            try:
                with open(latest_file, "r") as f:
                    data = json.load(f)
                    if "regions" in data:
                        # Use the saved boxes
                        for k, box in data["regions"].items():
                            default_regions[k] = box
            except Exception as e:
                pass

        for name, box in default_regions.items():
            if len(box) == 4:
                x, y, bw, bh = box
            else:
                continue
                
            if saved_regions and name in saved_regions:
                x, y, bw, bh = saved_regions[name]
                
            rect = ResizableRect(name, 0, 0, bw, bh) # define local rect around origin
            rect.setPos(x, y) # move item to actual coordinates so sceneBoundingRect handles it
            self.scene.addItem(rect)
            self.draggable_items.append(rect)

    def clear_crops(self):
        while self.crops_grid.count():
            item = self.crops_grid.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def add_crop_image(self, name, crop_img, predicted_value=""):
        frame = QFrame()
        frame.setStyleSheet("QFrame { border: 1px solid #ccc; background: white; margin-bottom: 10px; }")
        layout = QVBoxLayout(frame)
        
        display_text = f"{name}"
        if predicted_value:
            display_text += f" : {predicted_value}"
            
        title = QLabel(display_text)
        title.setStyleSheet("font-weight: bold; border: none; background: transparent; color: #0055a4;")
        
        img_label = QLabel()
        img_label.setAlignment(Qt.AlignCenter)
        img_label.setStyleSheet("border: none; background: transparent;")
        
        rgb_img = cv2.cvtColor(crop_img, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_img.shape
        bytes_per_line = ch * w
        q_img = QImage(rgb_img.data, w, h, bytes_per_line, QImage.Format_RGB888)
        pixmap = QPixmap.fromImage(q_img)
        
        if w > 300:
            pixmap = pixmap.scaledToWidth(300, Qt.SmoothTransformation)
            
        img_label.setPixmap(pixmap)
        
        layout.addWidget(title)
        layout.addWidget(img_label)
        self.crops_grid.addWidget(frame)

    def on_predict_clicked(self):
        if not self.selected_file or not self.selected_page:
            return
            
        self.info_text.setPlainText("Scanning with user-adjusted regions... Please wait.")
        self.clear_crops()
        QApplication.processEvents()
        
        # Build override regions dictionary from the interactive canvas
        override_regions = {}
        for item in self.draggable_items:
            override_regions[item.name] = item.get_coords()
        
        try:
            if self.current_cv_img is None:
                raise ValueError("No image loaded.")
                
            result = self.scanner.process_image(
                self.current_cv_img,
                show=False,
                return_image=False, # We don't need debug image on canvas anymore
                override_regions=override_regions
            )
            
            self._last_result = result  # store for upload
            self.upload_btn.setEnabled(True)

            # Merge override_regions into JSON output!
            out_dict = result.to_dict()
            out_dict["regions"] = override_regions
            
            pretty_json = json.dumps(out_dict, indent=2)
            self.info_text.setPlainText(pretty_json)
                
            self.save_json_btn.setEnabled(True)
                
            if hasattr(result, "debug_crops"):
                self.current_crops = result.debug_crops
                self.export_crops_btn.setEnabled(True)
                val_map = {
                    "candidate_name": result.candidate_name,
                    "registration_number": result.registration_number,
                    "paper": result.paper,
                    "booklet_version": result.booklet_version,
                    "booklet_serial_no": result.booklet_serial_no,
                }
                for name, crop in result.debug_crops.items():
                    if crop is not None:
                        pred_val = val_map.get(name, "")
                        self.add_crop_image(name, crop, pred_val)
                
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to scan page:\n{str(e)}")
            self.info_text.setPlainText(f"Error: {str(e)}")

    def on_upload_clicked(self):
        """Build the API payload from the last ScanResult and POST it to the API."""
        if self._last_result is None:
            QMessageBox.warning(self, "No Data", "Please run 'Predict Bubbles' first to generate scan data.")
            return

        try:
            payload = build_payload(self._last_result)
        except Exception as e:
            QMessageBox.critical(self, "Payload Error", f"Failed to build payload:\n{str(e)}")
            return

        # Show a preview of what will be sent
        preview = json.dumps(payload, indent=2)
        confirm = QMessageBox.question(
            self,
            "Confirm Upload",
            f"Upload the following data to the API?\n\n{preview[:800]}{'...' if len(preview) > 800 else ''}",
            QMessageBox.Yes | QMessageBox.No,
        )
        if confirm != QMessageBox.Yes:
            return

        self.upload_btn.setEnabled(False)
        self.upload_btn.setText("Uploading...")
        QApplication.processEvents()

        try:
            success = self.api.upload_answer_sheet(payload)
            if success:
                QMessageBox.information(
                    self, "Success",
                    f"Successfully uploaded answer sheet for:\n"
                    f"Reg: {payload.get('registration_number')}\n"
                    f"Branch: {payload.get('branch')}\n"
                    f"Booklet: {payload.get('booklet_version')}"
                )
                self.info_text.setPlainText(
                    f"\u2705 Uploaded to API successfully!\n\nPayload sent:\n{json.dumps(payload, indent=2)}"
                )
            else:
                QMessageBox.critical(self, "Upload Failed", "API returned an error. Check the terminal for details.")
        except Exception as e:
            QMessageBox.critical(self, "Upload Error", f"Failed to reach API:\n{str(e)}")
        finally:
            self.upload_btn.setEnabled(True)
            self.upload_btn.setText("\u2b06  Upload to API")

    def on_predict_all_clicked(self):
        if not self.selected_file:
            return
            
        override_regions = {}
        for item in self.draggable_items:
            override_regions[item.name] = item.get_coords()
            
        self.info_text.setPlainText("Processing ALL pages in PDF using these markings... Please wait.")
        self.clear_crops()
        QApplication.processEvents()
        
        try:
            results = self.scanner.process_pdf(
                pdf_path=self.selected_file,
                page_limit=None,
                show=False,
                return_image=False,
                override_regions=override_regions
            )
            
            out_list = []
            for res in results:
                d = res.to_dict()
                d["regions"] = override_regions
                out_list.append(d)
                
            self.batch_results = out_list
            pretty_json = json.dumps(out_list, indent=2)
            self.info_text.setPlainText(pretty_json)
            
            self.save_json_btn.setEnabled(True)
            QMessageBox.information(self, "Batch Complete", f"Processed {len(results)} pages successfully!")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Batch processing failed:\n{str(e)}")
            self.info_text.setPlainText(f"Error: {str(e)}")

    def on_save_regions_clicked(self):
        if not self.selected_file or not self.selected_page:
            return
            
        regions = {}
        for item in self.draggable_items:
            regions[item.name] = item.get_coords()
            
        base_name = os.path.splitext(os.path.basename(self.selected_file))[0]
        save_path = os.path.join(DOWNLOADS_DIR, f"{base_name}_page_{self.selected_page}_regions.json")
        
        try:
            with open(save_path, "w") as f:
                json.dump({"file": self.selected_file, "page": self.selected_page, "regions": regions}, f, indent=2)
            QMessageBox.information(self, "Saved", f"Region markings saved to:\n{save_path}")
            self.info_text.setPlainText(f"Saved regions to {save_path}\n" + json.dumps(regions, indent=2))
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save regions:\n{str(e)}")

    def on_load_regions_clicked(self):
        if not self.selected_file or not self.selected_page:
            return
            
        from PySide6.QtWidgets import QFileDialog
        file_path, _ = QFileDialog.getOpenFileName(self, "Open Region JSON", DOWNLOADS_DIR, "JSON Files (*.json)")
        
        if not file_path:
            return
            
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                
            regions = data.get("regions", {})
            if not regions:
                raise ValueError("No 'regions' dictionary found in JSON.")
                
            for item in self.draggable_items:
                if item.name in regions:
                    x, y, w, h = regions[item.name]
                    item.setRect(0, 0, w, h)
                    item.setPos(x, y)
                    
            self.info_text.setPlainText(f"Loaded regions from {os.path.basename(file_path)}")
            QMessageBox.information(self, "Loaded", "Region markings loaded successfully!")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to load regions:\n{str(e)}")

    def on_export_crops_clicked(self):
        if not self.current_crops:
            QMessageBox.warning(self, "No crops", "Please click 'Predict Bubbles' first to generate crops.")
            return
            
        base_name = os.path.splitext(os.path.basename(self.selected_file))[0]
        export_dir = os.path.join(DOWNLOADS_DIR, f"{base_name}_page_{self.selected_page}_crops")
        os.makedirs(export_dir, exist_ok=True)
        
        saved_count = 0
        for name, crop in self.current_crops.items():
            if crop is not None:
                save_path = os.path.join(export_dir, f"{base_name}_page_{self.selected_page}_{name}.png")
                cv2.imwrite(save_path, crop)
                saved_count += 1
                
        QMessageBox.information(self, "Success", f"Exported {saved_count} cropped images to:\n{export_dir}")

    def on_save_json_clicked(self):
        if not self.selected_file:
            return
            
        json_text = self.info_text.toPlainText()
        try:
            parsed_data = json.loads(json_text)
            
            base_name = os.path.splitext(os.path.basename(self.selected_file))[0]
            
            # If it's a batch result (list), save differently
            if isinstance(parsed_data, list):
                save_path = os.path.join(DOWNLOADS_DIR, f"{base_name}_ALL_pages_result.json")
            else:
                save_path = os.path.join(DOWNLOADS_DIR, f"{base_name}_page_{self.selected_page}_result.json")
            
            with open(save_path, "w") as f:
                json.dump(parsed_data, f, indent=2)
                
            QMessageBox.information(self, "Success", f"JSON saved successfully to:\n{save_path}")
        except json.JSONDecodeError as e:
            QMessageBox.warning(self, "Invalid JSON", f"Could not save because JSON is invalid:\n{str(e)}")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save JSON:\n{str(e)}")

def run_explorer(scanner: OMRScanner, api: ApiService = None):
    app = QApplication.instance()
    if not app:
        app = QApplication(sys.argv)

    if api is None:
        api = ApiService()  # fallback to default localhost:3000

    explorer = OMRExplorerApp(scanner, api)
    explorer.show()
    explorer.raise_()
    explorer.activateWindow()
    sys.exit(app.exec())
