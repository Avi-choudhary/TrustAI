import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

key = os.getenv("GEMINI_API_KEY")

if not key:
    raise RuntimeError("GEMINI_API_KEY not found")

client = genai.Client(api_key=key)

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Reply with exactly: TRUSTAI GEMINI CONNECTED",
)

print(response.text)