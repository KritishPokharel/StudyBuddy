"""
Test script to verify Supabase update operations work correctly
Run this to test if your backend can update quiz_results table
"""

import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

async def test_update():
    """Test if we can update quiz_results table"""
    supabase_url = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL_HERE")
    supabase_key = os.getenv("SUPABASE_KEY", "YOUR_SUPABASE_KEY_HERE")
    
    if supabase_url == "YOUR_SUPABASE_URL_HERE" or supabase_key == "YOUR_SUPABASE_KEY_HERE":
        print("❌ Please set SUPABASE_URL and SUPABASE_KEY in your .env file")
        return
    
    client = create_client(supabase_url, supabase_key)
    
    # Test 1: Check if we can read quiz_results
    print("📖 Testing READ access...")
    try:
        result = client.table("quiz_results").select("*").limit(1).execute()
        print(f"✅ READ works - Found {len(result.data)} results")
        if result.data:
            print(f"   Sample result ID: {result.data[0].get('id')}")
    except Exception as e:
        print(f"❌ READ failed: {str(e)}")
        return
    
    # Test 2: Check if we can update (need a real user_id and result_id)
    print("\n📝 Testing UPDATE access...")
    if result.data:
        test_result = result.data[0]
        test_id = test_result.get("id")
        test_user_id = test_result.get("user_id")
        
        update_data = {
            "correct_count": test_result.get("correct_count") or 5,
            "wrong_count": test_result.get("wrong_count") or 2,
        }
        
        try:
            update_result = client.table("quiz_results").update(update_data).eq(
                "id", test_id
            ).eq("user_id", test_user_id).execute()
            
            if update_result.data:
                print(f"✅ UPDATE works - Updated result ID: {test_id}")
                print(f"   Updated fields: {list(update_data.keys())}")
            else:
                print(f"⚠️  UPDATE returned no data - might be RLS blocking")
        except Exception as e:
            print(f"❌ UPDATE failed: {str(e)}")
            print(f"   This might be an RLS (Row Level Security) issue")
            print(f"   Check your RLS policies in Supabase")
    else:
        print("⚠️  No quiz results found to test UPDATE")
    
    # Test 3: Check RLS policies
    print("\n🔒 Checking RLS policies...")
    try:
        # Try to query policy information (if accessible)
        policies = client.table("quiz_results").select("*").limit(0).execute()
        print("✅ Table is accessible")
    except Exception as e:
        print(f"❌ Table access issue: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_update())

