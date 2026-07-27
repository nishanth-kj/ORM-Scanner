import requests
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ApiService:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url

    def upload_answer_sheet(self, payload: Dict[str, Any]) -> bool:
        """
        Send the extracted OMR data to the Next.js API to be saved in the database.
        """
        url = f"{self.base_url}/api/v1/answer-sheet/upload"
        try:
            logger.info(f"Sending data to API: {url}")
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"Successfully sent data to API! Response: {response.json()}")
                return True
            else:
                logger.error(f"API returned error: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to reach API: {e}")
            return False
