#!/usr/bin/env python3
"""
VitaGuide Backend Testing Script
Tests all backend endpoints for the German health app
"""

import asyncio
import json
import aiohttp
import sys
from datetime import datetime
from typing import Dict, List, Any

# Backend URL from frontend .env
BASE_URL = "https://gesundheit-app-1.preview.emergentagent.com/api"

class VitaGuideBackendTester:
    def __init__(self):
        self.session = None
        self.results = {
            "health_check": {"status": "pending", "details": {}},
            "products_api": {"status": "pending", "details": {}},
            "symptom_analysis": {"status": "pending", "details": {}},
            "affiliate_tracking": {"status": "pending", "details": {}},
            "diary_endpoints": {"status": "pending", "details": {}},
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_health_check(self):
        """Test GET /api/health endpoint"""
        print("\n🔍 Testing Health Check...")
        try:
            async with self.session.get(f"{BASE_URL}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    if "status" in data and data["status"] == "ok":
                        self.results["health_check"] = {
                            "status": "passed", 
                            "details": {"message": "Health check returned status ok", "data": data}
                        }
                        print("✅ Health check passed")
                    else:
                        self.results["health_check"] = {
                            "status": "failed", 
                            "details": {"error": f"Invalid response format: {data}"}
                        }
                        print("❌ Health check failed - invalid response format")
                else:
                    self.results["health_check"] = {
                        "status": "failed", 
                        "details": {"error": f"HTTP {response.status}"}
                    }
                    print(f"❌ Health check failed - HTTP {response.status}")
        except Exception as e:
            self.results["health_check"] = {
                "status": "failed", 
                "details": {"error": str(e)}
            }
            print(f"❌ Health check failed - {str(e)}")
    
    async def test_products_api(self):
        """Test GET /api/products endpoints with application_instructions"""
        print("\n🔍 Testing Products API...")
        
        try:
            # Test 1: All products
            print("  Testing GET /api/products (all products)...")
            async with self.session.get(f"{BASE_URL}/products") as response:
                if response.status != 200:
                    self.results["products_api"] = {
                        "status": "failed", 
                        "details": {"error": f"HTTP {response.status}"}
                    }
                    print(f"❌ Products API failed - HTTP {response.status}")
                    return
                    
                products = await response.json()
                if not isinstance(products, list):
                    self.results["products_api"] = {
                        "status": "failed", 
                        "details": {"error": "Response is not a list"}
                    }
                    print("❌ Products API failed - response is not a list")
                    return
                
                # Check if we have 30 products
                if len(products) != 30:
                    self.results["products_api"] = {
                        "status": "failed", 
                        "details": {"error": f"Expected 30 products, got {len(products)}"}
                    }
                    print(f"❌ Products API failed - expected 30 products, got {len(products)}")
                    return
                
                # Check if all products have application_instructions
                missing_instructions = []
                empty_instructions = []
                for product in products:
                    if "application_instructions" not in product:
                        missing_instructions.append(product.get("product_id", "unknown"))
                    elif not product["application_instructions"] or product["application_instructions"].strip() == "":
                        empty_instructions.append(product.get("product_id", "unknown"))
                
                if missing_instructions:
                    self.results["products_api"] = {
                        "status": "failed", 
                        "details": {"error": f"Products missing application_instructions: {missing_instructions}"}
                    }
                    print(f"❌ Products API failed - missing application_instructions: {missing_instructions}")
                    return
                
                if empty_instructions:
                    self.results["products_api"] = {
                        "status": "failed", 
                        "details": {"error": f"Products with empty application_instructions: {empty_instructions}"}
                    }
                    print(f"❌ Products API failed - empty application_instructions: {empty_instructions}")
                    return
                
                print(f"✅ All 30 products have application_instructions")
                
            # Test 2: Filtered products by tag
            print("  Testing GET /api/products?tags=gelenke (filtered products)...")
            async with self.session.get(f"{BASE_URL}/products?tags=gelenke") as response:
                if response.status != 200:
                    self.results["products_api"] = {
                        "status": "failed", 
                        "details": {"error": f"Filtered products HTTP {response.status}"}
                    }
                    print(f"❌ Filtered products failed - HTTP {response.status}")
                    return
                    
                filtered_products = await response.json()
                if not isinstance(filtered_products, list):
                    self.results["products_api"] = {
                        "status": "failed", 
                        "details": {"error": "Filtered response is not a list"}
                    }
                    print("❌ Filtered products failed - response is not a list")
                    return
                
                # Check if filtered products also have application_instructions
                for product in filtered_products:
                    if "application_instructions" not in product or not product["application_instructions"]:
                        self.results["products_api"] = {
                            "status": "failed", 
                            "details": {"error": f"Filtered product {product.get('product_id')} missing application_instructions"}
                        }
                        print(f"❌ Filtered product {product.get('product_id')} missing application_instructions")
                        return
                
                print(f"✅ All {len(filtered_products)} filtered products have application_instructions")
                
            self.results["products_api"] = {
                "status": "passed", 
                "details": {
                    "message": f"All {len(products)} products have application_instructions, filtering works",
                    "total_products": len(products),
                    "filtered_products": len(filtered_products)
                }
            }
            
        except Exception as e:
            self.results["products_api"] = {
                "status": "failed", 
                "details": {"error": str(e)}
            }
            print(f"❌ Products API failed - {str(e)}")
    
    async def test_symptom_analysis(self):
        """Test POST /api/symptoms/analyze with supplement_schedule verification"""
        print("\n🔍 Testing Symptom Analysis...")
        
        try:
            payload = {
                "text": "Ich bin müde und habe Gelenkschmerzen",
                "tags": ["müdigkeit", "gelenkschmerzen"]
            }
            
            print("  Sending symptom analysis request (may take 10-20 seconds)...")
            async with self.session.post(f"{BASE_URL}/symptoms/analyze", json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.results["symptom_analysis"] = {
                        "status": "failed", 
                        "details": {"error": f"HTTP {response.status}: {error_text}"}
                    }
                    print(f"❌ Symptom analysis failed - HTTP {response.status}: {error_text}")
                    return
                
                result = await response.json()
                
                # Check basic structure
                required_fields = ["id", "supplement_schedule", "prompt_version", "model"]
                missing_fields = [field for field in required_fields if field not in result]
                if missing_fields:
                    self.results["symptom_analysis"] = {
                        "status": "failed", 
                        "details": {"error": f"Missing required fields: {missing_fields}"}
                    }
                    print(f"❌ Symptom analysis failed - missing fields: {missing_fields}")
                    return
                
                # Check prompt version
                if result.get("prompt_version") != "1.2":
                    self.results["symptom_analysis"] = {
                        "status": "failed", 
                        "details": {"error": f"Expected prompt_version 1.2, got {result.get('prompt_version')}"}
                    }
                    print(f"❌ Symptom analysis failed - wrong prompt version: {result.get('prompt_version')}")
                    return
                
                # Check model
                if result.get("model") != "gpt-4o":
                    self.results["symptom_analysis"] = {
                        "status": "failed", 
                        "details": {"error": f"Expected model gpt-4o, got {result.get('model')}"}
                    }
                    print(f"❌ Symptom analysis failed - wrong model: {result.get('model')}")
                    return
                
                # Check supplement_schedule
                supplement_schedule = result.get("supplement_schedule", [])
                if not isinstance(supplement_schedule, list):
                    self.results["symptom_analysis"] = {
                        "status": "failed", 
                        "details": {"error": "supplement_schedule is not a list"}
                    }
                    print("❌ Symptom analysis failed - supplement_schedule is not a list")
                    return
                
                # Check if supplement_schedule items have application_instructions
                missing_instructions_count = 0
                for item in supplement_schedule:
                    if "application_instructions" not in item or not item["application_instructions"]:
                        missing_instructions_count += 1
                
                if missing_instructions_count > 0:
                    self.results["symptom_analysis"] = {
                        "status": "failed", 
                        "details": {"error": f"{missing_instructions_count} supplement_schedule items missing application_instructions"}
                    }
                    print(f"❌ Symptom analysis failed - {missing_instructions_count} items missing application_instructions")
                    return
                
                print(f"✅ Symptom analysis successful with {len(supplement_schedule)} supplement items")
                print(f"✅ Prompt version: {result.get('prompt_version')}")
                print(f"✅ Model: {result.get('model')}")
                print(f"✅ All supplement_schedule items have application_instructions")
                
                # Test retrieving the analysis
                analysis_id = result["id"]
                print(f"  Testing GET /api/analysis/{analysis_id}...")
                async with self.session.get(f"{BASE_URL}/analysis/{analysis_id}") as get_response:
                    if get_response.status != 200:
                        self.results["symptom_analysis"] = {
                            "status": "failed", 
                            "details": {"error": f"Could not retrieve analysis: HTTP {get_response.status}"}
                        }
                        print(f"❌ Could not retrieve analysis - HTTP {get_response.status}")
                        return
                    
                    stored_analysis = await get_response.json()
                    if stored_analysis.get("id") != analysis_id:
                        self.results["symptom_analysis"] = {
                            "status": "failed", 
                            "details": {"error": "Retrieved analysis ID mismatch"}
                        }
                        print("❌ Retrieved analysis ID mismatch")
                        return
                        
                print("✅ Analysis successfully stored and retrieved from database")
                
                self.results["symptom_analysis"] = {
                    "status": "passed", 
                    "details": {
                        "message": "Symptom analysis working correctly with official instructions",
                        "analysis_id": analysis_id,
                        "prompt_version": result.get("prompt_version"),
                        "model": result.get("model"),
                        "supplement_count": len(supplement_schedule)
                    }
                }
                
        except Exception as e:
            self.results["symptom_analysis"] = {
                "status": "failed", 
                "details": {"error": str(e)}
            }
            print(f"❌ Symptom analysis failed - {str(e)}")
    
    async def test_affiliate_tracking(self):
        """Test POST /api/track/click endpoint"""
        print("\n🔍 Testing Affiliate Click Tracking...")
        
        try:
            # Test first click
            click_payload = {
                "product_id": "gelenk-kraft",
                "affiliate_url": "https://joachim-kaeser.de/products/gelenk-kraft-360g?ref=vitaguide",
                "source": "app"
            }
            
            print("  Testing first click...")
            async with self.session.post(f"{BASE_URL}/track/click", json=click_payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.results["affiliate_tracking"] = {
                        "status": "failed", 
                        "details": {"error": f"HTTP {response.status}: {error_text}"}
                    }
                    print(f"❌ Affiliate tracking failed - HTTP {response.status}: {error_text}")
                    return
                
                result = await response.json()
                
                required_fields = ["id", "product_id", "timestamp"]
                missing_fields = [field for field in required_fields if field not in result]
                if missing_fields:
                    self.results["affiliate_tracking"] = {
                        "status": "failed", 
                        "details": {"error": f"Missing required fields: {missing_fields}"}
                    }
                    print(f"❌ Affiliate tracking failed - missing fields: {missing_fields}")
                    return
                
                if result.get("product_id") != "gelenk-kraft":
                    self.results["affiliate_tracking"] = {
                        "status": "failed", 
                        "details": {"error": f"Wrong product_id: {result.get('product_id')}"}
                    }
                    print(f"❌ Affiliate tracking failed - wrong product_id")
                    return
                
                print(f"✅ First click tracked successfully: {result['id']}")
                
            # Test second click to verify multiple clicks work
            click_payload2 = {
                "product_id": "weihrauch-2-0", 
                "affiliate_url": "https://joachim-kaeser.de/products/weihrauch-60-kapseln?ref=vitaguide",
                "source": "app"
            }
            
            print("  Testing second click...")
            async with self.session.post(f"{BASE_URL}/track/click", json=click_payload2) as response:
                if response.status != 200:
                    self.results["affiliate_tracking"] = {
                        "status": "failed", 
                        "details": {"error": f"Second click failed: HTTP {response.status}"}
                    }
                    print(f"❌ Second click failed - HTTP {response.status}")
                    return
                
                result2 = await response.json()
                print(f"✅ Second click tracked successfully: {result2['id']}")
                
            self.results["affiliate_tracking"] = {
                "status": "passed", 
                "details": {
                    "message": "Affiliate click tracking working correctly",
                    "first_click_id": result["id"],
                    "second_click_id": result2["id"]
                }
            }
            
        except Exception as e:
            self.results["affiliate_tracking"] = {
                "status": "failed", 
                "details": {"error": str(e)}
            }
            print(f"❌ Affiliate tracking failed - {str(e)}")
    
    async def test_diary_endpoints(self):
        """Test diary CRUD and trends endpoints (regression test)"""
        print("\n🔍 Testing Diary Endpoints (Regression)...")
        
        try:
            # Test POST /api/diary
            diary_entry = {
                "mood": 4,
                "sleep": 3,
                "stress": 3,
                "water": 6,
                "exercise": 30
            }
            
            print("  Testing POST /api/diary...")
            async with self.session.post(f"{BASE_URL}/diary", json=diary_entry) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.results["diary_endpoints"] = {
                        "status": "failed", 
                        "details": {"error": f"POST /diary HTTP {response.status}: {error_text}"}
                    }
                    print(f"❌ POST /diary failed - HTTP {response.status}")
                    return
                
                result = await response.json()
                required_fields = ["id", "date", "mood", "sleep", "stress", "water", "exercise"]
                missing_fields = [field for field in required_fields if field not in result]
                if missing_fields:
                    self.results["diary_endpoints"] = {
                        "status": "failed", 
                        "details": {"error": f"POST /diary missing fields: {missing_fields}"}
                    }
                    print(f"❌ POST /diary failed - missing fields: {missing_fields}")
                    return
                
                print("✅ POST /diary successful")
                
            # Test GET /api/diary
            print("  Testing GET /api/diary...")
            async with self.session.get(f"{BASE_URL}/diary") as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.results["diary_endpoints"] = {
                        "status": "failed", 
                        "details": {"error": f"GET /diary HTTP {response.status}: {error_text}"}
                    }
                    print(f"❌ GET /diary failed - HTTP {response.status}")
                    return
                
                entries = await response.json()
                if not isinstance(entries, list):
                    self.results["diary_endpoints"] = {
                        "status": "failed", 
                        "details": {"error": "GET /diary response is not a list"}
                    }
                    print("❌ GET /diary failed - response is not a list")
                    return
                
                print(f"✅ GET /diary successful - {len(entries)} entries")
                
            # Test GET /api/diary/trends
            print("  Testing GET /api/diary/trends...")
            async with self.session.get(f"{BASE_URL}/diary/trends") as response:
                if response.status != 200:
                    error_text = await response.text()
                    self.results["diary_endpoints"] = {
                        "status": "failed", 
                        "details": {"error": f"GET /diary/trends HTTP {response.status}: {error_text}"}
                    }
                    print(f"❌ GET /diary/trends failed - HTTP {response.status}")
                    return
                
                trends = await response.json()
                required_fields = ["entries", "tips", "summary"]
                missing_fields = [field for field in required_fields if field not in trends]
                if missing_fields:
                    self.results["diary_endpoints"] = {
                        "status": "failed", 
                        "details": {"error": f"GET /diary/trends missing fields: {missing_fields}"}
                    }
                    print(f"❌ GET /diary/trends failed - missing fields: {missing_fields}")
                    return
                
                print("✅ GET /diary/trends successful")
                
            self.results["diary_endpoints"] = {
                "status": "passed", 
                "details": {
                    "message": "All diary endpoints working correctly",
                    "entry_count": len(entries)
                }
            }
            
        except Exception as e:
            self.results["diary_endpoints"] = {
                "status": "failed", 
                "details": {"error": str(e)}
            }
            print(f"❌ Diary endpoints failed - {str(e)}")
    
    async def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting VitaGuide Backend Testing...")
        print(f"Testing against: {BASE_URL}")
        
        await self.test_health_check()
        await self.test_products_api()
        await self.test_symptom_analysis()
        await self.test_affiliate_tracking()
        await self.test_diary_endpoints()
        
        return self.results
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*60)
        print("🧪 VITAGUIDE BACKEND TEST RESULTS")
        print("="*60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results.values() if result["status"] == "passed")
        failed_tests = sum(1 for result in self.results.values() if result["status"] == "failed")
        
        for test_name, result in self.results.items():
            status_icon = "✅" if result["status"] == "passed" else "❌" if result["status"] == "failed" else "⏳"
            print(f"{status_icon} {test_name}: {result['status'].upper()}")
            if result["status"] == "failed":
                print(f"   Error: {result['details'].get('error', 'Unknown error')}")
            elif result["status"] == "passed":
                print(f"   Details: {result['details'].get('message', 'Success')}")
        
        print("\n" + "-"*60)
        print(f"📊 SUMMARY: {passed_tests}/{total_tests} tests passed, {failed_tests} failed")
        
        if failed_tests > 0:
            print("❌ SOME TESTS FAILED - Check details above")
            return False
        else:
            print("✅ ALL TESTS PASSED")
            return True


async def main():
    async with VitaGuideBackendTester() as tester:
        results = await tester.run_all_tests()
        success = tester.print_summary()
        
        # Save results to file for test_result.md update
        with open("/app/backend_test_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        return success

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test runner failed: {e}")
        sys.exit(1)