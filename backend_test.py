#!/usr/bin/env python3
"""
VitaGuide Bilingual Backend Testing Suite
Tests the German/Italian health app backend APIs
"""

import requests
import json
import time
from typing import Dict, Any

# Production URL from frontend/.env
BASE_URL = "https://nutrition-advisor-4.preview.emergentagent.com/api"

def test_health_check():
    """Test 1: Health Check"""
    print("🏥 Testing Health Check...")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check OK: {data}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_german_products():
    """Test 2: German Products API (default and explicit)"""
    print("\n🇩🇪 Testing German Products API...")
    
    # Test default (no lang parameter)
    try:
        response = requests.get(f"{BASE_URL}/products", timeout=10)
        print(f"Default products status: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            print(f"✅ Default products count: {len(products)} (expected: 30)")
            
            # Verify all products have application_instructions
            missing_instructions = [p for p in products if not p.get("application_instructions")]
            if missing_instructions:
                print(f"❌ {len(missing_instructions)} products missing application_instructions")
                return False
            
            # Check affiliate URLs point to joachim-kaeser.de
            wrong_domain = [p for p in products if "joachim-kaeser.de" not in p.get("affiliate_url", "")]
            if wrong_domain:
                print(f"❌ {len(wrong_domain)} products have wrong affiliate domain")
                return False
            
            print("✅ All German products have application_instructions and correct domain")
            
            # Test explicit lang=de
            response_de = requests.get(f"{BASE_URL}/products?lang=de", timeout=10)
            if response_de.status_code == 200:
                products_de = response_de.json()
                if len(products) == len(products_de):
                    print("✅ Explicit lang=de returns same result as default")
                    return len(products) == 30
                else:
                    print(f"❌ Default vs explicit de count mismatch: {len(products)} vs {len(products_de)}")
                    return False
            else:
                print(f"❌ Explicit lang=de failed: {response_de.status_code}")
                return False
        else:
            print(f"❌ German products failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ German products error: {e}")
        return False

def test_italian_products():
    """Test 3: Italian Products API"""
    print("\n🇮🇹 Testing Italian Products API...")
    
    try:
        response = requests.get(f"{BASE_URL}/products?lang=it", timeout=10)
        print(f"Italian products status: {response.status_code}")
        
        if response.status_code == 200:
            products = response.json()
            print(f"✅ Italian products count: {len(products)} (expected: 61)")
            
            if len(products) == 0:
                print("❌ No Italian products returned")
                return False
            
            # Verify required fields
            sample_product = products[0]
            required_fields = ["name", "price", "image_url", "application_instructions", "tags", "affiliate_url"]
            missing_fields = [field for field in required_fields if not sample_product.get(field)]
            
            if missing_fields:
                print(f"❌ Sample product missing fields: {missing_fields}")
                return False
            
            # Check for products with video_url (should be 8)
            products_with_video = [p for p in products if p.get("video_url")]
            print(f"✅ Products with video_url: {len(products_with_video)}")
            
            # Verify affiliate URLs point to joachimkaeser.it (not .de)
            wrong_domain = [p for p in products if "joachimkaeser.it" not in p.get("affiliate_url", "")]
            if wrong_domain:
                print(f"❌ {len(wrong_domain)} Italian products have wrong affiliate domain")
                return False
            
            # Verify Italian descriptions (basic check for Italian words)
            italian_indicators = ["il", "la", "di", "per", "con", "una", "in"]
            italian_products = [p for p in products if any(word in p.get("description", "").lower() for word in italian_indicators)]
            
            if len(italian_products) > len(products) * 0.5:  # At least 50% should have Italian text
                print("✅ Italian product descriptions appear to be in Italian")
            else:
                print("⚠️ Some product descriptions might not be in Italian")
            
            print("✅ Italian products API working correctly")
            return len(products) == 61
        else:
            print(f"❌ Italian products failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Italian products error: {e}")
        return False

def test_german_symptom_analysis():
    """Test 4: German Symptom Analysis"""
    print("\n🇩🇪 Testing German Symptom Analysis...")
    
    payload = {
        "text": "Ich bin müde",
        "tags": ["müdigkeit"],
        "lang": "de"
    }
    
    try:
        print("Sending German symptom analysis request (may take 10-20 seconds)...")
        response = requests.post(f"{BASE_URL}/symptoms/analyze", json=payload, timeout=30)
        print(f"German analysis status: {response.status_code}")
        
        if response.status_code == 200:
            analysis = response.json()
            
            # Verify basic response structure
            required_fields = ["summary", "brand_products", "supplement_schedule", "prompt_version", "model", "lang"]
            missing_fields = [field for field in required_fields if field not in analysis]
            
            if missing_fields:
                print(f"❌ Analysis missing fields: {missing_fields}")
                return False
            
            # Verify German summary (basic check)
            summary = analysis.get("summary", "")
            if not summary or len(summary.strip()) == 0:
                print("❌ Empty summary")
                return False
            
            # Check brand_products reference German products
            brand_products = analysis.get("brand_products", [])
            if brand_products:
                wrong_domain = [p for p in brand_products if "joachim-kaeser.de" not in p.get("affiliate_url", "")]
                if wrong_domain:
                    print(f"❌ {len(wrong_domain)} brand products have wrong domain")
                    return False
                print(f"✅ {len(brand_products)} German brand products recommended")
            
            # Verify supplement_schedule has application_instructions
            schedule = analysis.get("supplement_schedule", [])
            if schedule:
                missing_instructions = [item for item in schedule if not item.get("application_instructions")]
                if missing_instructions:
                    print(f"❌ {len(missing_instructions)} schedule items missing application_instructions")
                    return False
                print(f"✅ {len(schedule)} schedule items with application_instructions")
            
            # Verify other fields
            prompt_version = analysis.get("prompt_version")
            model = analysis.get("model")
            lang = analysis.get("lang")
            
            print(f"✅ Analysis details - Version: {prompt_version}, Model: {model}, Lang: {lang}")
            
            if lang != "de":
                print(f"❌ Expected lang 'de', got '{lang}'")
                return False
            
            print("✅ German symptom analysis working correctly")
            return True
        else:
            print(f"❌ German analysis failed with status {response.status_code}")
            if response.text:
                print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ German analysis error: {e}")
        return False

def test_italian_symptom_analysis():
    """Test 5: Italian Symptom Analysis"""
    print("\n🇮🇹 Testing Italian Symptom Analysis...")
    
    payload = {
        "text": "Sono stanco e ho dolori articolari",
        "tags": ["stanchezza"],
        "lang": "it"
    }
    
    try:
        print("Sending Italian symptom analysis request (may take 10-20 seconds)...")
        response = requests.post(f"{BASE_URL}/symptoms/analyze", json=payload, timeout=30)
        print(f"Italian analysis status: {response.status_code}")
        
        if response.status_code == 200:
            analysis = response.json()
            
            # Verify basic response structure
            required_fields = ["summary", "brand_products", "supplement_schedule", "prompt_version", "model", "lang"]
            missing_fields = [field for field in required_fields if field not in analysis]
            
            if missing_fields:
                print(f"❌ Analysis missing fields: {missing_fields}")
                return False
            
            # Verify Italian summary (basic check for Italian words)
            summary = analysis.get("summary", "")
            italian_indicators = ["il", "la", "di", "per", "con", "una", "in", "è", "che", "sono"]
            has_italian = any(word in summary.lower() for word in italian_indicators)
            
            if not has_italian:
                print(f"⚠️ Summary might not be in Italian: {summary[:100]}...")
            else:
                print("✅ Summary appears to be in Italian")
            
            # Check brand_products reference Italian products
            brand_products = analysis.get("brand_products", [])
            if brand_products:
                wrong_domain = [p for p in brand_products if "joachimkaeser.it" not in p.get("affiliate_url", "")]
                if wrong_domain:
                    print(f"❌ {len(wrong_domain)} brand products have wrong domain")
                    return False
                
                # Check for video_url in any products
                products_with_video = [p for p in brand_products if p.get("video_url")]
                if products_with_video:
                    print(f"✅ {len(products_with_video)} brand products have video_url")
                
                print(f"✅ {len(brand_products)} Italian brand products recommended")
            
            # Verify supplement_schedule has Italian application_instructions
            schedule = analysis.get("supplement_schedule", [])
            if schedule:
                missing_instructions = [item for item in schedule if not item.get("application_instructions")]
                if missing_instructions:
                    print(f"❌ {len(missing_instructions)} schedule items missing application_instructions")
                    return False
                
                # Check if instructions appear to be in Italian
                sample_instruction = schedule[0].get("application_instructions", "")
                has_italian_instructions = any(word in sample_instruction.lower() for word in ["assumere", "capsula", "giorno", "acqua"])
                
                if has_italian_instructions:
                    print("✅ Application instructions appear to be in Italian")
                else:
                    print(f"⚠️ Instructions might not be in Italian: {sample_instruction}")
                
                print(f"✅ {len(schedule)} schedule items with application_instructions")
            
            # Verify specific fields
            prompt_version = analysis.get("prompt_version")
            model = analysis.get("model")
            lang = analysis.get("lang")
            
            print(f"✅ Analysis details - Version: {prompt_version}, Model: {model}, Lang: {lang}")
            
            if prompt_version != "1.2":
                print(f"❌ Expected prompt_version '1.2', got '{prompt_version}'")
                return False
            
            if lang != "it":
                print(f"❌ Expected lang 'it', got '{lang}'")
                return False
            
            print("✅ Italian symptom analysis working correctly")
            return True
        else:
            print(f"❌ Italian analysis failed with status {response.status_code}")
            if response.text:
                print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Italian analysis error: {e}")
        return False

def test_affiliate_click_tracking():
    """Test 6: Affiliate Click Tracking"""
    print("\n📊 Testing Affiliate Click Tracking...")
    
    payload = {
        "product_id": "sistema-cartilagine",
        "affiliate_url": "https://joachimkaeser.it/products/sistema-cartilagine?ref=vitaguide",
        "source": "app"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/track/click", json=payload, timeout=10)
        print(f"Click tracking status: {response.status_code}")
        
        if response.status_code == 200:
            click_data = response.json()
            
            # Verify response structure
            required_fields = ["id", "product_id", "affiliate_url", "source", "timestamp"]
            missing_fields = [field for field in required_fields if field not in click_data]
            
            if missing_fields:
                print(f"❌ Click data missing fields: {missing_fields}")
                return False
            
            print(f"✅ Click tracked - ID: {click_data['id']}, Product: {click_data['product_id']}")
            return True
        else:
            print(f"❌ Click tracking failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Click tracking error: {e}")
        return False

def test_diary_regression():
    """Test 7: Diary Regression (quick test)"""
    print("\n📔 Testing Diary Regression...")
    
    # POST new diary entry
    diary_payload = {
        "mood": 4,
        "sleep": 3,
        "stress": 2,
        "water": 8,
        "exercise": 20
    }
    
    try:
        # Save diary entry
        response = requests.post(f"{BASE_URL}/diary", json=diary_payload, timeout=10)
        print(f"Diary save status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Diary save failed with status {response.status_code}")
            return False
        
        saved_entry = response.json()
        print(f"✅ Diary entry saved - ID: {saved_entry.get('id')}")
        
        # GET diary entries
        get_response = requests.get(f"{BASE_URL}/diary", timeout=10)
        print(f"Diary get status: {get_response.status_code}")
        
        if get_response.status_code == 200:
            entries = get_response.json()
            print(f"✅ Retrieved {len(entries)} diary entries")
            return len(entries) > 0
        else:
            print(f"❌ Diary get failed with status {get_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Diary regression error: {e}")
        return False

def main():
    """Run all tests and provide summary"""
    print("🚀 VitaGuide Bilingual Backend Testing Suite")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_check),
        ("German Products API", test_german_products),
        ("Italian Products API", test_italian_products),
        ("German Symptom Analysis", test_german_symptom_analysis),
        ("Italian Symptom Analysis", test_italian_symptom_analysis),
        ("Affiliate Click Tracking", test_affiliate_click_tracking),
        ("Diary Regression", test_diary_regression)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        results[test_name] = test_func()
        time.sleep(1)  # Brief pause between tests
    
    # Summary
    print(f"\n{'='*60}")
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<30} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed + failed}, Passed: {passed}, Failed: {failed}")
    
    if failed == 0:
        print("🎉 All tests passed! Backend is fully functional.")
    else:
        print(f"⚠️ {failed} test(s) failed. Please check the issues above.")
    
    return failed == 0

if __name__ == "__main__":
    main()