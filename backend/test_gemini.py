import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY")

if not key:
    print("Error: GEMINI_API_KEY not found in .env")
    exit(1)

try:
    genai.configure(api_key=key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say 'Gemini is working' if you can read this.")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Gemini API Error: {e}")
