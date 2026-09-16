import os
import sys
import numpy as np
import cv2

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.services.ai_service import analyze_civic_image

def test_all_7_departments():
    print("==========================================================")
    print("CIVICINTEL 7-DEPARTMENT COMPREHENSIVE ROUTING TEST SUITE")
    print("==========================================================")

    test_cases = [
        ("sewage_overflow.jpg", "BWSSB", "sewage overflow leakage drain"),
        ("water_pipeline_leak.jpg", "BWSSB", "water leakage pipeline"),
        ("drainage_muck_flooding.jpg", "BWSSB", "drainage overflow flooded street"),
        ("pothole_asphalt_road.jpg", "GBA", "pothole road crack asphalt"),
        ("garbage_dump_heap.jpg", "GBA", "garbage waste accumulation dump"),
        ("dangling_wires_pole.jpg", "BESCOM", "electric utility pole wire cable"),
        ("building_fire_flames.jpg", "FIRE", "fire smoke flame burn"),
        ("car_crash_accident.jpg", "MEDICAL", "road accident car collision"),
        ("street_fight_brawl.jpg", "POLICE", "public fight brawl altercation assault")
    ]

    passed = 0
    for filename, expected_dept, hint in test_cases:
        np.random.seed(42)
        noise = np.random.randint(0, 50, (400, 400, 3), dtype=np.uint8)
        
        if expected_dept == "BWSSB":
            base = np.full((400, 400, 3), [180, 120, 30], dtype=np.uint8)
        elif expected_dept == "FIRE":
            base = np.full((400, 400, 3), [0, 80, 240], dtype=np.uint8)
        elif expected_dept == "BESCOM":
            base = np.full((400, 400, 3), [210, 210, 210], dtype=np.uint8)
            for i in range(12):
                cv2.line(base, (i*30+10, 0), (i*30+10, 400), (0,0,0), 2)
                cv2.line(base, (0, i*30+10), (400, i*30+10), (0,0,0), 2)
        else:
            base = np.full((400, 400, 3), [100, 100, 100], dtype=np.uint8)

        img = cv2.add(base, noise)
        cv2.imwrite(filename, img)

        res = analyze_civic_image(filename, user_hint=hint)
        actual = res["department_code"]

        status = "PASSED" if actual == expected_dept else f"FAILED (Got {actual})"
        if actual == expected_dept:
            passed += 1

        print(f"Test File: {filename:<26} | Expected: {expected_dept:<8} | Got: {actual:<8} | Status: {status}")
        
        if os.path.exists(filename):
            os.remove(filename)

    print("----------------------------------------------------------")
    print(f"Overall Accuracy: {passed}/{len(test_cases)} Passed ({(passed/len(test_cases))*100:.1f}%)")
    print("==========================================================")

if __name__ == "__main__":
    test_all_7_departments()
