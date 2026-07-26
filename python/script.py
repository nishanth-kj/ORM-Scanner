import os
import requests

BASE_URL = "https://cetonline.karnataka.gov.in/keaomrs/files/PGCET2026/MTECH"

os.makedirs("downloads", exist_ok=True)

session = requests.Session()

for i in range(1001):  # 0 to 1000
    url = f"{BASE_URL}/{i}.pdf"

    try:
        response = session.get(url, timeout=10)

        if response.status_code == 200 and response.headers.get("Content-Type", "").startswith("application/pdf"):
            filename = os.path.join("downloads", f"{i}.pdf")

            with open(filename, "wb") as f:
                f.write(response.content)

            print(f"Downloaded: {i}.pdf")
        else:
            print(f"Not found: {i}.pdf")

    except Exception as e:
        print(f"Error downloading {i}.pdf: {e}")