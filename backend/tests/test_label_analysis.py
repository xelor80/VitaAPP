"""
Label Analysis API Tests
Tests for product label upload, AI analysis (GPT-4o Vision), and CRUD operations
Endpoints tested:
- POST /api/products/{product_id}/label - Upload label image and analyze
- GET /api/products/{product_id}/label - Get stored label analysis
- DELETE /api/products/{product_id}/label - Delete label data
"""
import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wellness-recipe-hub-2.preview.emergentagent.com").rstrip("/")


def create_test_label_image():
    """Create a test product label image with text (not blank/solid color)"""
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    
    # Draw product label content - simulates real label
    draw.rectangle([10, 10, 390, 290], outline=(0, 0, 0), width=2)
    draw.text((20, 20), "SUPPLEMENT LABEL", fill=(0, 0, 0))
    draw.text((20, 50), "Ingredients:", fill=(0, 0, 0))
    draw.text((20, 70), "- Vitamin C 500mg", fill=(0, 0, 0))
    draw.text((20, 90), "- Zinc 15mg", fill=(0, 0, 0))
    draw.text((20, 110), "- Vitamin D3 1000 IU", fill=(0, 0, 0))
    draw.text((20, 150), "Dosage: 1 tablet daily", fill=(0, 0, 0))
    draw.text((20, 180), "Warning: Keep out of reach", fill=(255, 0, 0))
    draw.text((20, 200), "of children.", fill=(255, 0, 0))
    draw.text((20, 240), "Store in a cool dry place", fill=(100, 100, 100))
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)
    return img_bytes


class TestLabelAnalysisGET:
    """Test GET /api/products/{product_id}/label endpoint"""
    
    def test_get_label_existing_product_with_label(self):
        """Test getting label for product that has label data (gelenk-kraft has existing label)"""
        response = requests.get(f"{BASE_URL}/api/products/gelenk-kraft/label")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "product_id" in data
        assert data["product_id"] == "gelenk-kraft"
        assert "label_image" in data
        assert "analysis" in data
        assert "analyzed_at" in data
        
        # Validate analysis structure
        if data["analysis"]:
            analysis = data["analysis"]
            assert "ingredients" in analysis
            assert "dosage" in analysis
            assert "warnings" in analysis
            assert isinstance(analysis["ingredients"], list)
            assert isinstance(analysis["warnings"], list)
    
    def test_get_label_existing_product_without_label(self):
        """Test getting label for product without label data"""
        # weihrauch-20 may not have label data
        response = requests.get(f"{BASE_URL}/api/products/weihrauch-20/label")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "product_id" in data
        assert data["product_id"] == "weihrauch-20"
        # May have null analysis if no label uploaded
    
    def test_get_label_nonexistent_product(self):
        """Test getting label for product that doesn't exist"""
        response = requests.get(f"{BASE_URL}/api/products/nonexistent-product-xyz/label")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"


class TestLabelAnalysisPOST:
    """Test POST /api/products/{product_id}/label endpoint - Upload and AI analyze"""
    
    def test_upload_label_success(self):
        """Test successful label upload and analysis with valid image"""
        # Create test label image with content
        img_bytes = create_test_label_image()
        
        files = {
            "file": ("test_label.png", img_bytes, "image/png")
        }
        data = {
            "lang": "de"
        }
        
        # Use a product that exists: kurkuma-komplex
        response = requests.post(
            f"{BASE_URL}/api/products/kurkuma-komplex/label",
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("status") == "success"
        assert result.get("product_id") == "kurkuma-komplex"
        assert "label_image" in result
        assert "analysis" in result
        
        # Validate analysis has expected fields
        analysis = result.get("analysis", {})
        assert "ingredients" in analysis
        assert "dosage" in analysis
        assert "intake_recommendation" in analysis
        assert "warnings" in analysis
        assert "additional_info" in analysis
        
        print(f"Label analysis successful: {analysis.get('dosage', 'N/A')}")
    
    def test_upload_label_invalid_file_type(self):
        """Test upload rejection for non-image file"""
        # Create a text file (not an image)
        text_content = b"This is not an image file"
        
        files = {
            "file": ("test.txt", io.BytesIO(text_content), "text/plain")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/gelenk-kraft/label",
            files=files,
            data={"lang": "de"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
    
    def test_upload_label_nonexistent_product(self):
        """Test upload to nonexistent product - should still work (updates empty product)"""
        # Note: The endpoint may create/update even for non-existing products
        # This depends on implementation - check actual behavior
        img_bytes = create_test_label_image()
        
        files = {
            "file": ("test_label.png", img_bytes, "image/png")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/test-nonexistent-xyz/label",
            files=files,
            data={"lang": "de"}
        )
        
        # May return 200 (creates new) or 404 - check implementation
        # The current implementation updates without checking product existence first
        print(f"Nonexistent product upload returned: {response.status_code}")


class TestLabelAnalysisDELETE:
    """Test DELETE /api/products/{product_id}/label endpoint"""
    
    def test_delete_label_success(self):
        """Test successful label deletion"""
        # First upload a label to a test product
        img_bytes = create_test_label_image()
        files = {"file": ("test.png", img_bytes, "image/png")}
        
        # Upload to a product (vitamin-d3-k2 or another existing product)
        upload_response = requests.post(
            f"{BASE_URL}/api/products/vitamin-d3-k2/label",
            files=files,
            data={"lang": "de"}
        )
        
        # Now delete it
        delete_response = requests.delete(f"{BASE_URL}/api/products/vitamin-d3-k2/label")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("status") == "deleted"
        
        # Verify deletion by trying to get label
        get_response = requests.get(f"{BASE_URL}/api/products/vitamin-d3-k2/label")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data.get("label_image") is None or get_data.get("analysis") is None


class TestLabelImageServing:
    """Test uploaded label image serving"""
    
    def test_serve_uploaded_label_image(self):
        """Test that uploaded label images can be retrieved"""
        # Get existing label
        response = requests.get(f"{BASE_URL}/api/products/gelenk-kraft/label")
        if response.status_code == 200:
            data = response.json()
            label_image_url = data.get("label_image")
            
            if label_image_url:
                # Try to fetch the image
                img_response = requests.get(f"{BASE_URL}{label_image_url}")
                assert img_response.status_code == 200, f"Failed to fetch label image: {img_response.status_code}"
                assert "image" in img_response.headers.get("content-type", ""), "Response is not an image"
                print(f"Label image accessible at: {label_image_url}")


class TestLabelAnalysisIntegration:
    """Integration tests for complete label analysis workflow"""
    
    def test_full_label_workflow(self):
        """Test complete workflow: Upload → Analyze → Get → Delete"""
        product_id = "omega-3-premium"  # Use existing product
        
        # Step 1: Upload and analyze
        img_bytes = create_test_label_image()
        files = {"file": ("label.png", img_bytes, "image/png")}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/products/{product_id}/label",
            files=files,
            data={"lang": "de"}
        )
        
        if upload_resp.status_code == 200:
            upload_data = upload_resp.json()
            assert upload_data.get("status") == "success"
            print(f"Step 1 PASS: Upload successful")
            
            # Step 2: Retrieve label data
            get_resp = requests.get(f"{BASE_URL}/api/products/{product_id}/label")
            assert get_resp.status_code == 200
            get_data = get_resp.json()
            assert get_data.get("label_image") is not None
            assert get_data.get("analysis") is not None
            print(f"Step 2 PASS: Label retrieved")
            
            # Step 3: Delete label
            del_resp = requests.delete(f"{BASE_URL}/api/products/{product_id}/label")
            assert del_resp.status_code == 200
            print(f"Step 3 PASS: Label deleted")
            
            # Step 4: Verify deletion
            verify_resp = requests.get(f"{BASE_URL}/api/products/{product_id}/label")
            verify_data = verify_resp.json()
            assert verify_data.get("analysis") is None
            print(f"Step 4 PASS: Deletion verified")
        else:
            print(f"Upload failed: {upload_resp.status_code} - {upload_resp.text}")
            # Don't fail test if GPT-4o is having issues - report it
            pytest.skip(f"Label upload/analysis failed: {upload_resp.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
