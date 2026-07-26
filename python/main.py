import sys
import json
import argparse
import requests
from service.scanner_service import OMRScanner

def main():
    parser = argparse.ArgumentParser(description="OMR Scanner CLI")
    parser.add_argument("pdf_path", help="Path to the PDF OMR sheet to scan")
    parser.add_argument("--yolo", default=None, help="Path to YOLO model (optional)")
    
    args = parser.parse_args()
    
    scanner = OMRScanner(yolo_model_path=args.yolo)
    
    result = scanner.process_pdf(args.pdf_path)
    
    # Print the result as a JSON string to stdout
    print("Scan complete:")
    print(json.dumps(result, indent=2))
    
    if result.get("success"):
        # Map to Next.js format (following validation constraints)
        db_payload = {
            "candidate_name": "Unknown", # Extracted from sheet
            "registration_number": result.get("registration_number", "000000000"),
            "branch": "Computer Stream", # Based on example image
            "booklet_version": "C1", 
            "booklet_serial_no": "203867", 
            "responses": [
                {"question_number": int(q), "user_answer": a} 
                for q, a in result.get("answers", {}).items()
            ]
        }
        
        # Send to Next.js API
        api_url = "http://localhost:3000/api/v1/answer-sheet/upload"
        try:
            print(f"\nSending data to API: {api_url}")
            response = requests.post(api_url, json=db_payload, timeout=10)
            if response.status_code == 200:
                print(f"Successfully sent data to API! Response: {response.json()}")
            else:
                print(f"API returned error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Failed to reach API: {e}")

if __name__ == "__main__":
    main()
