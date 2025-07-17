from flask import Flask, request, render_template, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v3 import preprocess_input
from PIL import Image, UnidentifiedImageError
import numpy as np
import json
import io
import os
import base64
from werkzeug.utils import secure_filename

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load the pre-trained MobileNetV3 model
try:
    model = load_model("mbNetV2model2.keras")
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

# Load class mapping for predictions
try:
    with open("index_to_class_mapping.json", "r") as f:
        class_labels = json.load(f)
except FileNotFoundError:
    print("Error: index_to_class_mapping.json not found")
    exit(1)
except json.JSONDecodeError:
    print("Error: Invalid JSON in index_to_class_mapping.json")
    exit(1)

# Configuration
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(img_bytes, target_size=(256, 256)):
    """
    Preprocess image for MobileNetV3 prediction.
    Resizes to 256x256, converts to RGB, applies MobileNetV3 preprocessing.
    """
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img = img.resize(target_size, Image.BILINEAR)
        x = np.array(img)
        x = preprocess_input(x)
        x = np.expand_dims(x, axis=0)
        return x
    except UnidentifiedImageError:
        raise ValueError("Uploaded file is not a valid image")
    except Exception as e:
        raise ValueError(f"Error processing image: {str(e)}")

@app.route('/')
def index():
    """Serve the frontend index.html template."""
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')  # Your about page

@app.route('/features')
def features():
    return render_template('features.html')  # Your features page

@app.route('/predict', methods=['POST'])
def predict():
    """
    Handle file uploads via multipart/form-data (from previous version).
    Expects a file in request.files['file'].
    Returns JSON with prediction and confidence (percentage).
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file format. Use JPG, PNG, or WEBP'}), 400

    try:
        img_bytes = file.read()
        if len(img_bytes) > MAX_FILE_SIZE:
            return jsonify({'error': 'File size exceeds 10MB limit'}), 400

        processed = preprocess_image(img_bytes)
        preds = model.predict(processed)
        class_index = str(np.argmax(preds[0]))
        confidence = float(np.max(preds[0]))
        print(f"Predictions: {preds[0]}, Class: {class_index}, Confidence: {confidence}")
        label = class_labels.get(class_index, "Unknown")

        return jsonify({
            'prediction': label,
            'confidence': round(confidence * 100, 2)
        })

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Handle base64-encoded images from DermaScan frontend.
    Expects JSON payload with 'image' field (base64-encoded).
    Returns JSON with condition and confidence (0-1).
    """
    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400

    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'Missing image field in JSON'}), 400

    base64_string = data['image']
    if ';base64,' in base64_string:
        base64_string = base64_string.split(';base64,')[1]

    try:
        img_bytes = base64.b64decode(base64_string)
        if len(img_bytes) > MAX_FILE_SIZE:
            return jsonify({'error': 'Image size exceeds 10MB limit'}), 400

        processed = preprocess_image(img_bytes)
        preds = model.predict(processed)
        class_index = str(np.argmax(preds[0]))
        confidence = float(np.max(preds[0]))
        print(f"Predictions: {preds[0]}, Class: {class_index}, Confidence: {confidence}")
        label = class_labels.get(class_index, "Unknown")

        return jsonify({
            'condition': label,
            'confidence': confidence
        })

    except base64.binascii.Error:
        return jsonify({'error': 'Invalid base64 encoding'}), 400
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.errorhandler(404)
def not_found(e):
    """Serve index.html for 404 errors to support SPA routing."""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)