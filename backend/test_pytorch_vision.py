import os
import sys
import torch
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

def test_mobilenet():
    print("Loading PyTorch MobileNetV2 model...")
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    model.eval()
    print("PyTorch MobileNetV2 loaded successfully!")

if __name__ == "__main__":
    test_mobilenet()
