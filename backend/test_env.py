import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY")
print(f"Key Found: {key is not None}")
if key:
    print(f"Key starts with: {key[:8]}")
