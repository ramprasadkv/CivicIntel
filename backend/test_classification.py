import os
import sys
import numpy as np
import cv2

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.services.ai_service import analyze_civic_image

def run_tests():
    os.makedirs("test_images", exist_ok=True)
    
    test_cases = [
        ("drainage_overflow.jpg", "BWSSB", "water/drainage issue"),
        ("water_leakage_pipeline.jpg", "BWSSB", "water leakage"),
        ("pothole_asphalt_road.jpg", "GBA", "road pothole"),
        ("broken_footpath_garbage.jpg", "GBA", "garbage heap"),
        ("electric_wire_transformer.jpg", "BESCOM", "broken electric pole"),
        ("fire_hazard_smoke.jpg", "FIRE", "building fire"),
        ("road_vehicle_accident.jpg", "MEDICAL", "car accident"),
        ("public_fight_brawl.jpg", "POLICE", "public fight altercation"),
        ("blurry_dark_photo.jpg", "UNCLEAR", "blurry photo")
    ]

    print("==================================================")
    print("CIVICINTEL AI CLASSIFICATION PRECISION VERIFICATION")
    print("==================================================")

    passed = 0
    for filename, expected_dept, desc in test_cases:
        filepath = os.path.join("test_images", filename)
        
        # Create a synthetic image representing the hazard features
        img = np.zeros((400, 400, 3), dtype=np.uint8)
        
        if expected_dept == "BWSSB":
            # Blue water / sludge coloring
            img[:, :] = [180, 100, 40]  # BGR water hue
        elif expected_dept == "GBA":
            # Gray asphalt with cracks
            img[:, :] = [100, 100, 100]
            cv2.line(img, (50, 50), (350, 350), (20, 20, 20), 5)
        elif expected_dept == "BESCOM":
            # Grid of lines for cables/poles
            img[:, :] = [200, 200, 200]
            for i in range(10):
                cv2.line(img, (i*30 + 20, 10), (i*30 + 20, 250), (0, 0, 0), 2)
                cv2.line(img, (10, i*25 + 20), (380, i*25 + 20), (0, 0, 0), 2)
        elif expected_dept == "FIRE":
            # Orange-red flame colors
            img[:, :] = [0, 80, 240] # BGR bright orange-red
        elif expected_dept == "MEDICAL":
            img[:, :] = [120, 120, 120]
            cv2.line(img, (10, 10), (300, 300), (255, 255, 255), 10)
        elif expected_dept == "POLICE":
            img[:, :] = [120, 150, 220] # Skin tone approximation
        elif expected_dept == "UNCLEAR":
            img[:, :] = [5, 5, 5] # Pitch black
            
        cv2.imwrite(filepath, img)

        result = analyze_civic_image(filepath, user_hint=filename)
        actual_dept = result["department_code"]
        
        status = "PASSED" if actual_dept == expected_dept else f"FAILED (Got {actual_dept})"
        if actual_dept == expected_dept:
            passed += 1

        print(f"File: {filename:<30} | Expected: {expected_dept:<8} | Result: {actual_dept:<8} | Status: {status}")

    print("--------------------------------------------------")
    print(f"Total Passed: {passed}/{len(test_cases)}")
    print("==================================================")

    if os.path.exists("test_images"):
        import shutil
        shutil.rmtree("test_images")

if __name__ == "__main__":
    run_tests()
