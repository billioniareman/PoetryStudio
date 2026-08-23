import os
import sys
import uuid
import gpsoauth
from dotenv import load_dotenv

# Load credentials
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

email = os.getenv("GOOGLE_KEEP_EMAIL", "").strip()

print("=== Google Keep Master Token Generator ===")
if not email:
    email = input("Enter your Google Email: ").strip()

print(f"Target Account: {email}")
print("\nFollow Step 1 in the chat instructions to get your oauth_token cookie.")
oauth_token = input("Paste your 'oauth_token' cookie: ").strip()

if not oauth_token:
    print("Error: OAuth Token cannot be empty.")
    sys.exit(1)

# Generate a random 16-character Android ID for authentication
android_id = uuid.uuid4().hex[:16]

try:
    print("\nExchanging OAuth Token for Master Token...")
    res = gpsoauth.exchange_token(email, oauth_token, android_id)
    
    if res and "Token" in res:
        master_token = res["Token"]
        print("\n" + "="*50)
        print("SUCCESS! Here is your Google Master Token:")
        print(master_token)
        print("="*50)
        print("\nHow to use it:")
        print("1. Copy this Master Token.")
        print("2. Open your backend/.env file.")
        print("3. Paste it in place of GOOGLE_KEEP_PASSWORD:")
        print("   GOOGLE_KEEP_PASSWORD=oauth2_rt_...")
        print("   (The gkeepapi library will automatically recognize the master token and authenticate successfully!)")
    else:
        print("\nFailed to exchange token. Response from Google:")
        print(res)
except Exception as e:
    print(f"\nError occurred: {e}")
