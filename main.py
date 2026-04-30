from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import numpy as np
from PIL import Image
import io
import os
from pathlib import Path

# Global model and TensorFlow (lazy loaded)
model = None
tf = None
keras = None
layers = None


def load_tensorflow():
    """Lazy load TensorFlow to avoid blocking startup"""
    global tf, keras, layers
    if tf is None:
        import tensorflow as tf_import
        from tensorflow import keras as keras_import
        from tensorflow.keras import layers as layers_import

        tf = tf_import
        keras = keras_import
        layers = layers_import
        print("✅ TensorFlow loaded")
    return tf, keras, layers


# Initialize FastAPI app
app = FastAPI(
    title="CNN Image Classification API",
    description="Classify gemstone images using CNN model",
    version="1.0.0",
)

# Add CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (HTML, CSS, JS, etc.)
app.mount("/static", StaticFiles(directory="."), name="static")

# Model configuration
IMG_SIZE = (150, 150)
CLASS_NAMES = [
    "Emerald",
    "Fake_Emerald",
    "Fake_Ruby",
    "Fake_Turquoise",
    "Ruby",
    "Turquoise",
]
MODEL_PATH = "models/cnn_best.keras"

# Global model variable
model = None


def create_cnn_model():
    """Create the CNN model architecture"""
    _, keras, layers = load_tensorflow()

    inputs = keras.Input(shape=(150, 150, 3))

    # Rescaling pixel values
    x = layers.Rescaling(1.0 / 255)(inputs)

    # Convolutional Block 1
    x = layers.Conv2D(32, 3, activation="relu", padding="same")(x)
    x = layers.MaxPooling2D()(x)

    # Convolutional Block 2
    x = layers.Conv2D(64, 3, activation="relu", padding="same")(x)
    x = layers.MaxPooling2D()(x)

    # Convolutional Block 3
    x = layers.Conv2D(128, 3, activation="relu", padding="same")(x)
    x = layers.MaxPooling2D()(x)

    # Convolutional Block 4
    x = layers.Conv2D(256, 3, activation="relu", padding="same")(x)
    x = layers.MaxPooling2D()(x)

    # Global Average Pooling
    x = layers.GlobalAveragePooling2D()(x)

    # Dropout
    x = layers.Dropout(0.25)(x)

    # Fully connected layer
    x = layers.Dense(512, activation="relu")(x)

    # Output Layer
    outputs = layers.Dense(6, activation="softmax")(x)

    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"]
    )
    return model


def load_model():
    """Load the trained model"""
    global model

    _, keras, _ = load_tensorflow()

    if os.path.exists(MODEL_PATH):
        try:
            print(f"Loading model from {MODEL_PATH}")
            model = keras.models.load_model(MODEL_PATH)
            print("✅ Model loaded successfully!")
        except Exception as e:
            print(f"⚠️  Error loading model from file: {e}")
            model = None
    else:
        print(f"Model file not found at {MODEL_PATH}")
        print(
            "To use predictions, please provide models/cnn_best.keras or upload the trained model"
        )
        model = None

    return model


def preprocess_image(image_data: bytes):
    """Preprocess image for model prediction"""
    # Open image
    img = Image.open(io.BytesIO(image_data)).convert("RGB")

    # Resize to model input size
    img = img.resize(IMG_SIZE)

    # Convert to numpy array
    img_array = np.array(img)

    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)

    return img_array


@app.on_event("startup")
async def startup_event():
    """Startup event - minimal initialization"""
    print("🚀 API Server starting...")
    print("⏳ TensorFlow and model will be loaded on first request")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve index.html (landing page) at root URL"""
    try:
        with open("index.html", "r") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Welcome to CNN Image Classification API</h1><p>index.html not found</p>"


@app.get("/predict", response_class=HTMLResponse)
async def predict_page():
    """Serve predict.html"""
    try:
        with open("predict.html", "r") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Prediction Page</h1><p>predict.html not found</p>"


@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "message": "Welcome to CNN Image Classification API",
        "endpoints": {
            "predict": "POST /api/predict",
            "predict-batch": "POST /api/predict-batch",
            "health": "GET /api/health",
            "classes": "GET /api/classes",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": model is not None}


@app.get("/classes")
async def get_classes():
    """Get list of supported classes"""
    return {"classes": CLASS_NAMES, "number_of_classes": len(CLASS_NAMES)}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Predict gemstone classification from uploaded image

    Args:
        file: Image file (JPG, PNG, etc.)

    Returns:
        Prediction results with class probabilities
    """
    global model
    
    # Lazy load model on first request
    if model is None:
        print("Loading model on first prediction request...")
        load_model()
    
    if model is None:
        raise HTTPException(
            status_code=503, detail="Model not available. Please ensure models/cnn_best.keras exists."
        )

    try:
        # Check if file is an image
        if file.content_type not in [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/gif",
            "image/webp",
        ]:
            raise HTTPException(
                status_code=400, detail="File must be an image (JPG, PNG, GIF, WEBP)"
            )

        # Read file
        contents = await file.read()

        # Preprocess image
        img_array = preprocess_image(contents)

        # Make prediction
        predictions = model.predict(img_array, verbose=0)
        predicted_class_idx = np.argmax(predictions[0])
        predicted_class = CLASS_NAMES[predicted_class_idx]
        confidence = float(predictions[0][predicted_class_idx])

        # Prepare response with all class probabilities
        class_probabilities = {
            CLASS_NAMES[i]: float(predictions[0][i]) for i in range(len(CLASS_NAMES))
        }

        return {
            "filename": file.filename,
            "predicted_class": predicted_class,
            "confidence": confidence,
            "all_predictions": class_probabilities,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.post("/predict-batch")
async def predict_batch(files: list[UploadFile] = File(...)):
    """
    Predict gemstone classification for multiple images

    Args:
        files: List of image files

    Returns:
        List of prediction results
    """
    global model
    
    # Lazy load model on first request
    if model is None:
        print("Loading model on first prediction request...")
        load_model()
    
    if model is None:
        raise HTTPException(
            status_code=503, detail="Model not available. Please ensure models/cnn_best.keras exists."
        )

    results = []

    for file in files:
        try:
            if file.content_type not in [
                "image/jpeg",
                "image/png",
                "image/jpg",
                "image/gif",
                "image/webp",
            ]:
                results.append(
                    {"filename": file.filename, "error": "File must be an image"}
                )
                continue

            contents = await file.read()
            img_array = preprocess_image(contents)
            predictions = model.predict(img_array, verbose=0)
            predicted_class_idx = np.argmax(predictions[0])
            predicted_class = CLASS_NAMES[predicted_class_idx]
            confidence = float(predictions[0][predicted_class_idx])

            class_probabilities = {
                CLASS_NAMES[i]: float(predictions[0][i])
                for i in range(len(CLASS_NAMES))
            }

            results.append(
                {
                    "filename": file.filename,
                    "predicted_class": predicted_class,
                    "confidence": confidence,
                    "all_predictions": class_probabilities,
                }
            )

        except Exception as e:
            results.append({"filename": file.filename, "error": str(e)})

    return {"results": results}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
