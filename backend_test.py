#!/usr/bin/env python3
"""
Backend Testing Script for FamilyCare Organizer App
Tests Caregiver Resource Finder Feature Endpoints
"""

import asyncio
import httpx
import json
import uuid
from typing import Dict, Optional, List

# Backend URL from frontend/.env
BACKEND_URL = "https://care-recipient-app.preview.emergentagent.com/api"

class CaregiverResourceFinderTest:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_user = {
            "email": f"test_resources_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPassword123!",
            "name": "Resource Finder Test User"
        }
        self.saved_resource_id = None
        self.headers = {"Content-Type": "application/json"}

    def log(self, message: str):
        print(f"[TEST] {message}")

    async def register_user(self) -> bool:
        """Register a test user"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/auth/register",
                    json=self.test_user,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["token"]
                    self.headers["Authorization"] = f"Bearer {self.auth_token}"
                    self.log(f"✅ User registered successfully with token: {self.auth_token[:20]}...")
                    return True
                else:
                    self.log(f"❌ User registration failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ User registration error: {str(e)}")
            return False

    async def test_get_resource_categories(self) -> bool:
        """Test GET /api/resources/categories - Get list of resource categories"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/resources/categories",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if response has categories key
                    if "categories" not in data:
                        self.log(f"❌ Categories test FAILED - Expected 'categories' key in response")
                        return False
                    
                    categories = data["categories"]
                    
                    # Check if categories is a list
                    if not isinstance(categories, list):
                        self.log(f"❌ Categories test FAILED - Expected categories to be list, got {type(categories)}")
                        return False
                    
                    # Check if categories have required fields
                    required_keys = {"id", "name", "icon", "description"}
                    for category in categories:
                        if not all(key in category for key in required_keys):
                            self.log(f"❌ Categories test FAILED - Category missing required keys: {category}")
                            return False
                    
                    # Check for expected categories
                    category_ids = {cat["id"] for cat in categories}
                    expected_categories = {"home_care", "government_programs", "dementia_support", "mental_health", "legal_financial", "medical_equipment"}
                    
                    if not expected_categories.issubset(category_ids):
                        self.log(f"❌ Categories test FAILED - Missing expected categories")
                        self.log(f"   Expected: {expected_categories}")
                        self.log(f"   Found: {category_ids}")
                        return False
                    
                    self.log("✅ Resource categories test PASSED")
                    self.log(f"   Found {len(categories)} categories: {', '.join(category_ids)}")
                    return True
                else:
                    self.log(f"❌ Categories test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Categories test error: {str(e)}")
            return False

    async def test_categories_require_auth(self) -> bool:
        """Test that GET /api/resources/categories requires authentication"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/resources/categories",
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Categories auth test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Categories auth test FAILED: Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Categories auth test error: {str(e)}")
            return False

    async def test_resource_search(self) -> bool:
        """Test POST /api/resources/search - AI-powered resource search"""
        try:
            search_data = {
                "location": "Toronto, Ontario, Canada",
                "category": "dementia_support"
            }

            async with httpx.AsyncClient(timeout=60.0) as client:  # Extended timeout for AI
                response = await client.post(
                    f"{self.base_url}/resources/search",
                    json=search_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check required fields in response
                    required_fields = {"resources", "essential_resources", "total_count"}
                    if not all(field in data for field in required_fields):
                        self.log(f"❌ Resource search FAILED - Missing required response fields")
                        self.log(f"   Expected: {required_fields}")
                        self.log(f"   Found: {set(data.keys())}")
                        return False
                    
                    # Check if resources is a list
                    if not isinstance(data["resources"], list):
                        self.log(f"❌ Resource search FAILED - resources should be a list")
                        return False
                    
                    # Check if essential_resources is a list
                    if not isinstance(data["essential_resources"], list):
                        self.log(f"❌ Resource search FAILED - essential_resources should be a list")
                        return False
                    
                    # Check resource structure (if any resources returned)
                    all_resources = data["resources"] + data["essential_resources"]
                    if all_resources:
                        resource_required_fields = {"name", "description"}
                        for resource in all_resources[:3]:  # Check first 3
                            if not all(field in resource for field in resource_required_fields):
                                self.log(f"❌ Resource search FAILED - Resource missing required fields: {resource}")
                                return False
                    
                    # Check that we got some results
                    if data["total_count"] == 0:
                        self.log(f"❌ Resource search FAILED - No resources returned")
                        return False
                    
                    self.log("✅ Resource search test PASSED")
                    self.log(f"   Found {len(data['resources'])} AI resources")
                    self.log(f"   Found {len(data['essential_resources'])} essential resources")
                    self.log(f"   Total count: {data['total_count']}")
                    
                    if data["resources"]:
                        self.log(f"   Sample resource: {data['resources'][0]['name']}")
                    
                    return True
                else:
                    self.log(f"❌ Resource search FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Resource search error: {str(e)}")
            return False

    async def test_search_require_auth(self) -> bool:
        """Test that POST /api/resources/search requires authentication"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            search_data = {
                "location": "Toronto, Ontario, Canada",
                "category": "dementia_support"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/resources/search",
                    json=search_data,
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Search auth test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Search auth test FAILED: Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Search auth test error: {str(e)}")
            return False

    async def test_save_resource(self) -> bool:
        """Test POST /api/resources/saved - Save a resource bookmark"""
        try:
            resource_data = {
                "name": "Alzheimer Society of Toronto",
                "description": "Comprehensive support services for families dealing with dementia including support groups, educational programs, and respite care assistance.",
                "category": "dementia_support",
                "website": "https://alzheimertoronto.org",
                "phone": "416-322-6560",
                "address": "20 Eglinton Avenue West, Suite 1600, Toronto, ON M4R 1K8",
                "email": "info@alzheimertoronto.org",
                "notes": "Excellent first-time family support program",
                "location_searched": "Toronto, Ontario, Canada"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/resources/saved",
                    json=resource_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check required response fields
                    if "message" not in data or "resource" not in data:
                        self.log(f"❌ Save resource FAILED - Missing response fields")
                        self.log(f"   Response: {data}")
                        return False
                    
                    # Check if resource has resource_id
                    resource = data["resource"]
                    if "resource_id" not in resource:
                        self.log(f"❌ Save resource FAILED - No resource_id in saved resource")
                        return False
                    
                    # Check if resource_id has expected prefix
                    resource_id = resource["resource_id"]
                    if not resource_id.startswith("res_"):
                        self.log(f"❌ Save resource FAILED - Invalid resource_id format: {resource_id}")
                        return False
                    
                    # Store for later deletion test
                    self.saved_resource_id = resource_id
                    
                    self.log("✅ Save resource test PASSED")
                    self.log(f"   Resource saved with ID: {resource_id}")
                    self.log(f"   Name: {resource['name']}")
                    self.log(f"   Category: {resource['category']}")
                    return True
                else:
                    self.log(f"❌ Save resource FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Save resource error: {str(e)}")
            return False

    async def test_save_resource_require_auth(self) -> bool:
        """Test that POST /api/resources/saved requires authentication"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            resource_data = {
                "name": "Test Resource",
                "description": "Test description",
                "category": "dementia_support"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/resources/saved",
                    json=resource_data,
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Save resource auth test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Save resource auth test FAILED: Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Save resource auth test error: {str(e)}")
            return False

    async def test_get_saved_resources(self) -> bool:
        """Test GET /api/resources/saved - Get user's saved resources"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/resources/saved",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if response is a list
                    if not isinstance(data, list):
                        self.log(f"❌ Get saved resources FAILED - Expected list, got {type(data)}")
                        return False
                    
                    # Check if our saved resource is in the list
                    if self.saved_resource_id:
                        found_resource = False
                        for resource in data:
                            if resource.get("resource_id") == self.saved_resource_id:
                                found_resource = True
                                # Verify resource structure
                                required_fields = {"resource_id", "name", "description", "category"}
                                if not all(field in resource for field in required_fields):
                                    self.log(f"❌ Get saved resources FAILED - Resource missing required fields")
                                    return False
                                break
                        
                        if not found_resource:
                            self.log(f"❌ Get saved resources FAILED - Previously saved resource not found")
                            return False
                    
                    self.log("✅ Get saved resources test PASSED")
                    self.log(f"   Found {len(data)} saved resources")
                    if data:
                        self.log(f"   Sample resource: {data[0]['name']}")
                    return True
                else:
                    self.log(f"❌ Get saved resources FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Get saved resources error: {str(e)}")
            return False

    async def test_get_saved_resources_require_auth(self) -> bool:
        """Test that GET /api/resources/saved requires authentication"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/resources/saved",
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Get saved resources auth test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Get saved resources auth test FAILED: Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Get saved resources auth test error: {str(e)}")
            return False

    async def test_delete_saved_resource(self) -> bool:
        """Test DELETE /api/resources/saved/{resource_id} - Delete a saved resource"""
        try:
            if not self.saved_resource_id:
                self.log("❌ Delete saved resource FAILED - No saved resource ID available")
                return False

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/resources/saved/{self.saved_resource_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check for success message
                    if "message" not in data:
                        self.log(f"❌ Delete saved resource FAILED - Missing success message")
                        return False
                    
                    # Verify resource is actually deleted by trying to get saved resources
                    get_response = await client.get(
                        f"{self.base_url}/resources/saved",
                        headers=self.headers
                    )
                    
                    if get_response.status_code == 200:
                        saved_resources = get_response.json()
                        # Check if deleted resource is still in the list
                        for resource in saved_resources:
                            if resource.get("resource_id") == self.saved_resource_id:
                                self.log(f"❌ Delete saved resource FAILED - Resource still exists after deletion")
                                return False
                    
                    self.log("✅ Delete saved resource test PASSED")
                    self.log(f"   Resource {self.saved_resource_id} successfully deleted")
                    return True
                else:
                    self.log(f"❌ Delete saved resource FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Delete saved resource error: {str(e)}")
            return False

    async def test_delete_saved_resource_require_auth(self) -> bool:
        """Test that DELETE /api/resources/saved/{resource_id} requires authentication"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            fake_resource_id = "res_fakeid123"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/resources/saved/{fake_resource_id}",
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Delete saved resource auth test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Delete saved resource auth test FAILED: Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Delete saved resource auth test error: {str(e)}")
            return False

    async def test_delete_nonexistent_resource(self) -> bool:
        """Test deleting a non-existent resource returns appropriate response"""
        try:
            fake_resource_id = f"res_{uuid.uuid4().hex[:12]}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/resources/saved/{fake_resource_id}",
                    headers=self.headers
                )
                
                # Accept either 404 (not found) or 200 (no-op delete)
                if response.status_code in [200, 404]:
                    self.log("✅ Delete nonexistent resource test PASSED")
                    self.log(f"   Response: {response.status_code}")
                    return True
                else:
                    self.log(f"❌ Delete nonexistent resource FAILED: Unexpected status {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Delete nonexistent resource error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all Caregiver Resource Finder tests"""
        self.log("=" * 80)
        self.log("STARTING CAREGIVER RESOURCE FINDER FEATURE TESTS")
        self.log("=" * 80)
        
        test_results = []
        
        # 1. Setup - Register user
        self.log("\n1. SETUP - Registering user...")
        if not await self.register_user():
            self.log("❌ CRITICAL FAILURE: Could not register user")
            return False

        # 2. Test GET /api/resources/categories
        self.log("\n2. TESTING GET /api/resources/categories...")
        test_results.append(("Get Categories", await self.test_get_resource_categories()))

        # 3. Test categories authentication
        self.log("\n3. TESTING categories authentication requirement...")
        test_results.append(("Categories Auth", await self.test_categories_require_auth()))

        # 4. Test POST /api/resources/search
        self.log("\n4. TESTING POST /api/resources/search (AI-powered search)...")
        test_results.append(("Resource Search", await self.test_resource_search()))

        # 5. Test search authentication
        self.log("\n5. TESTING search authentication requirement...")
        test_results.append(("Search Auth", await self.test_search_require_auth()))

        # 6. Test POST /api/resources/saved
        self.log("\n6. TESTING POST /api/resources/saved (save resource)...")
        test_results.append(("Save Resource", await self.test_save_resource()))

        # 7. Test save resource authentication
        self.log("\n7. TESTING save resource authentication requirement...")
        test_results.append(("Save Resource Auth", await self.test_save_resource_require_auth()))

        # 8. Test GET /api/resources/saved
        self.log("\n8. TESTING GET /api/resources/saved (get saved resources)...")
        test_results.append(("Get Saved Resources", await self.test_get_saved_resources()))

        # 9. Test get saved resources authentication
        self.log("\n9. TESTING get saved resources authentication requirement...")
        test_results.append(("Get Saved Auth", await self.test_get_saved_resources_require_auth()))

        # 10. Test DELETE /api/resources/saved/{resource_id}
        self.log("\n10. TESTING DELETE /api/resources/saved/{resource_id} (delete saved resource)...")
        test_results.append(("Delete Saved Resource", await self.test_delete_saved_resource()))

        # 11. Test delete authentication
        self.log("\n11. TESTING delete saved resource authentication requirement...")
        test_results.append(("Delete Resource Auth", await self.test_delete_saved_resource_require_auth()))

        # 12. Test delete nonexistent resource
        self.log("\n12. TESTING delete nonexistent resource handling...")
        test_results.append(("Delete Nonexistent", await self.test_delete_nonexistent_resource()))

        # Summary
        self.log("\n" + "=" * 80)
        self.log("CAREGIVER RESOURCE FINDER TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name:30} | {status}")
            if result:
                passed += 1
            else:
                failed += 1
        
        self.log(f"\nTotal Tests: {len(test_results)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        
        overall_success = failed == 0
        status = "✅ ALL TESTS PASSED" if overall_success else f"❌ {failed} TEST(S) FAILED"
        self.log(f"\nOVERALL RESULT: {status}")
        self.log("=" * 80)
        
        return overall_success

async def main():
    """Main test execution"""
    tester = CaregiverResourceFinderTest()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)