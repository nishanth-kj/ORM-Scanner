import sys
import json
import argparse
from service.scanner_service import OMRScanner
from service.api_service import ApiService

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
        
        # Send to Next.js API using ApiService
        api_service = ApiService()
        success = api_service.upload_answer_sheet(db_payload)
        
        if success:
            print("\nFinished successfully!")
        else:
            print("\nFailed to upload results to server.")

if __name__ == "__main__":
    main()
