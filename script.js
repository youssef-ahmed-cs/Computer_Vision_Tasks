// Configuration
// Use current domain dynamically so it works both locally and on deployment server
const API_URL = window.location.origin;
const GEMSTONE_EMOJIS = {
  Emerald: "💚",
  Fake_Emerald: "🟢",
  Fake_Ruby: "🔴",
  Fake_Turquoise: "🔵",
  Ruby: "❤️",
  Turquoise: "💙",
};

// Gemstone Descriptions
const GEMSTONE_DESCRIPTIONS = {
  Emerald:
    "Natural green beryllium aluminum silicate. Highly valued for its vibrant green color.",
  Fake_Emerald:
    "Imitation or synthetic emerald. Often made from glass or other materials to mimic natural emerald.",
  Ruby: "Natural deep red corundum. One of the most precious gemstones, valued for its intense red hue.",
  Fake_Ruby:
    "Imitation or synthetic ruby. Artificially created to replicate the appearance of natural ruby.",
  Turquoise:
    "Natural blue-green phosphate mineral. Known for its distinctive turquoise color and unique patterns.",
  Fake_Turquoise:
    "Synthetic or imitation turquoise. Often made from resin, plastic, or dyed materials.",
};

// Gemstone Categories
const GEMSTONE_CATEGORIES = {
  REAL: ["Emerald", "Ruby", "Turquoise"],
  FAKE: ["Fake_Emerald", "Fake_Ruby", "Fake_Turquoise"],
};

// State
let currentMode = "single";
let isProcessing = false;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  checkAPIStatus();
  // loadSupportedClasses(); // Removed - no longer displayed on UI
});

// Check API Status
async function checkAPIStatus() {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) {
      updateAPIStatus(true);
    } else {
      updateAPIStatus(false);
    }
  } catch (error) {
    updateAPIStatus(false);
  }
}

// Update API Status
function updateAPIStatus(isActive) {
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  if (isActive) {
    statusIndicator.classList.add("active");
    statusText.textContent = "API Connected";
  } else {
    statusIndicator.classList.remove("active");
    statusText.textContent = "API Disconnected";
    showToast(
      "API is not connected. Make sure the server is running.",
      "warning",
    );
  }
}

// Load Supported Classes
async function loadSupportedClasses() {
  try {
    const response = await fetch(`${API_URL}/classes`);
    const data = await response.json();

    const classesGrid = document.getElementById("classesGrid");
    classesGrid.innerHTML = "";

    data.classes.forEach((className) => {
      const classCard = document.createElement("div");
      const isReal = GEMSTONE_CATEGORIES.REAL.includes(className);
      const borderColor = isReal
        ? "border-green-400 hover:border-green-500"
        : "border-red-400 hover:border-red-500";
      const bgColor = isReal
        ? "from-green-50 to-emerald-50"
        : "from-red-50 to-pink-50";
      const badgeColor = isReal
        ? "bg-green-200 text-green-800"
        : "bg-red-200 text-red-800";

      classCard.className = `bg-gradient-to-br ${bgColor} p-6 rounded-xl text-center border-2 border-transparent ${borderColor} transition-all duration-300 hover:scale-105 hover:shadow-lg`;
      classCard.innerHTML = `
        <div class="mb-3">
          <span class="text-4xl">${GEMSTONE_EMOJIS[className] || "💎"}</span>
        </div>
        <div class="font-bold text-gray-800 text-base mb-2">${className.replace(/_/g, " ")}</div>
        <span class="inline-block ${badgeColor} px-3 py-1 rounded-full text-xs font-semibold mb-3">${isReal ? "AUTHENTIC" : "IMITATION"}</span>
        <div class="text-gray-600 text-xs leading-relaxed h-12 overflow-hidden">${GEMSTONE_DESCRIPTIONS[className] || ""}</div>
      `;
      classCard.setAttribute(
        "title",
        GEMSTONE_DESCRIPTIONS[className] || className,
      );
      classesGrid.appendChild(classCard);
    });
  } catch (error) {
    console.error("Error loading classes:", error);
  }
}

// Initialize Event Listeners
function initializeEventListeners() {
  // Mode switching
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", switchMode);
  });

  // Single image upload
  const uploadArea = document.getElementById("uploadArea");
  const singleImageInput = document.getElementById("singleImageInput");

  uploadArea.addEventListener("click", () => singleImageInput.click());
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleSingleDrop);
  singleImageInput.addEventListener("change", handleSingleImageSelect);

  // Batch upload
  const batchUploadArea = document.getElementById("batchUploadArea");
  const batchImageInput = document.getElementById("batchImageInput");

  batchUploadArea.addEventListener("click", () => batchImageInput.click());
  batchUploadArea.addEventListener("dragover", handleDragOver);
  batchUploadArea.addEventListener("dragleave", handleDragLeave);
  batchUploadArea.addEventListener("drop", handleBatchDrop);
  batchImageInput.addEventListener("change", handleBatchImageSelect);

  // Upload another buttons
  document
    .getElementById("uploadAnotherBtn")
    .addEventListener("click", resetSingleMode);
  document
    .getElementById("uploadAnotherBatchBtn")
    .addEventListener("click", resetBatchMode);
}

// Mode Switching
function switchMode(e) {
  const newMode =
    e.target.dataset.mode || e.target.closest(".mode-btn").dataset.mode;
  currentMode = newMode;

  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === newMode);
  });

  document.querySelectorAll(".mode-section").forEach((section) => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  if (newMode === "single") {
    const singleMode = document.getElementById("singleMode");
    singleMode.classList.add("active");
    singleMode.style.display = "block";
  } else {
    const batchMode = document.getElementById("batchMode");
    batchMode.classList.add("active");
    batchMode.style.display = "block";
  }
}

// Drag and Drop
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("dragover");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("dragover");
}

function handleSingleDrop(e) {
  e.preventDefault();
  document.getElementById("uploadArea").classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith("image/")) {
      processSingleImage(file);
    } else {
      showToast("Please drop an image file", "warning");
    }
  }
}

function handleBatchDrop(e) {
  e.preventDefault();
  document.getElementById("batchUploadArea").classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length > 0) {
      processBatchImages(imageFiles);
    } else {
      showToast("Please drop image files", "warning");
    }
  }
}

// Single Image Selection
function handleSingleImageSelect(e) {
  if (e.target.files.length > 0) {
    processSingleImage(e.target.files[0]);
  }
}

async function processSingleImage(file) {
  if (isProcessing) return;
  isProcessing = true;

  // Show loading state
  document.getElementById("uploadArea").style.display = "none";
  document.getElementById("singleLoadingContainer").style.display = "flex";

  try {
    // Create FormData
    const formData = new FormData();
    formData.append("file", file);

    // Send to API
    const response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Prediction failed");
    }

    const result = await response.json();
    displaySingleResult(file, result);
  } catch (error) {
    console.error("Error:", error);
    showToast("Error processing image: " + error.message, "danger");
    resetSingleMode();
  } finally {
    isProcessing = false;
  }
}

function displaySingleResult(file, result) {
  // Hide loading, show results
  document.getElementById("singleLoadingContainer").style.display = "none";
  document.getElementById("singleResultContainer").style.display = "grid";

  // Display image
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("resultImage").src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Display prediction
  const className = result.predicted_class;
  const confidence = (result.confidence * 100).toFixed(2);

  document.getElementById("predictedClassName").textContent = className.replace(
    "_",
    " ",
  );
  document.getElementById("predictedClassName").style.color = "white";
  document.getElementById("confidence").textContent = `${confidence}%`;

  // Display probabilities
  const probabilityList = document.getElementById("probabilityList");
  probabilityList.innerHTML = "";

  // Sort predictions by probability
  const sorted = Object.entries(result.all_predictions).sort(
    (a, b) => b[1] - a[1],
  );

  sorted.forEach(([classLabel, probability]) => {
    const percentage = (probability * 100).toFixed(1);
    const item = document.createElement("div");
    item.className = "probability-item";
    item.innerHTML = `
            <div class="probability-label">${classLabel.replace("_", " ")}</div>
            <div class="probability-bar">
                <div class="probability-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="probability-value">${percentage}%</div>
        `;
    probabilityList.appendChild(item);
  });

  showToast("✓ Prediction complete!", "success");
}

function resetSingleMode() {
  document.getElementById("uploadArea").style.display = "block";
  document.getElementById("singleResultContainer").style.display = "none";
  document.getElementById("singleLoadingContainer").style.display = "none";
  document.getElementById("singleImageInput").value = "";
}

// Batch Image Selection
function handleBatchImageSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length > 0) {
    processBatchImages(files);
  }
}

async function processBatchImages(files) {
  if (isProcessing) return;
  if (files.length === 0) {
    showToast("Please select at least one image", "warning");
    return;
  }

  isProcessing = true;
  const startTime = Date.now();

  // Show loading state
  document.getElementById("batchUploadArea").style.display = "none";
  document.getElementById("batchLoadingContainer").style.display = "flex";
  document.getElementById("totalImages").textContent = files.length;
  document.getElementById("processedImages").textContent = "0";

  try {
    // Create FormData
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Send to API
    const response = await fetch(`${API_URL}/predict-batch`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Batch prediction failed");
    }

    const result = await response.json();
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

    displayBatchResults(result.results, files, timeTaken);
  } catch (error) {
    console.error("Error:", error);
    showToast("Error processing batch: " + error.message, "danger");
    resetBatchMode();
  } finally {
    isProcessing = false;
  }
}

function displayBatchResults(predictions, files, timeTaken) {
  // Hide loading, show results
  document.getElementById("batchLoadingContainer").style.display = "none";
  document.getElementById("batchResultsContainer").style.display = "block";

  // Update stats
  document.getElementById("processedImages").textContent = predictions.filter(
    (p) => !p.error,
  ).length;
  document.getElementById("timeTaken").textContent = `${timeTaken}s`;

  // Display results
  const resultsGrid = document.getElementById("batchResultsGrid");
  resultsGrid.innerHTML = "";

  predictions.forEach((result, index) => {
    const file = files[index];
    const card = document.createElement("div");
    card.className = "result-card";

    if (result.error) {
      card.innerHTML = `
                <div class="result-card-error-art">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <div class="result-card-content">
                    <div class="result-card-filename">${result.filename}</div>
                    <div class="result-card-class">Could not classify</div>
                    <div class="result-card-confidence"><span>Error</span><strong>${result.error}</strong></div>
                </div>
            `;
    } else {
      const confidence = (result.confidence * 100).toFixed(1);
      const emoji = GEMSTONE_EMOJIS[result.predicted_class] || "💎";

      card.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="${result.filename}">
                <div class="result-card-content">
                    <div class="result-card-filename">${result.filename}</div>
                    <div class="result-card-class">${emoji} ${result.predicted_class.replace("_", " ")}</div>
                    <div class="result-card-confidence">
                        <span>Confidence</span>
                        <strong>${confidence}%</strong>
                    </div>
                </div>
            `;

      card.addEventListener("click", () => {
        showDetailedResult(result, file);
      });
    }

    resultsGrid.appendChild(card);
  });

  showToast("✓ Batch processing complete!", "success");
}

function showDetailedResult(result, file) {
  const modal = document.getElementById("detailModal");
  const content = document.getElementById("detailModalContent");

  if (!modal || !content) {
    alert(`${result.predicted_class}: ${(result.confidence * 100).toFixed(2)}%`);
    return;
  }

  const predictions = Object.entries(result.all_predictions || {}).sort(
    (a, b) => b[1] - a[1],
  );

  content.innerHTML = `
    <h2 class="modal-title">${result.predicted_class.replace("_", " ")}</h2>
    <p class="modal-subtitle">${result.filename || file.name} · ${(result.confidence * 100).toFixed(2)}% confidence</p>
    <div class="probability-list">
      ${predictions
        .map(([name, prob]) => {
          const percentage = (prob * 100).toFixed(1);
          return `
            <div class="probability-item">
              <div class="probability-label">${name.replace("_", " ")}</div>
              <div class="probability-bar"><div class="probability-fill" style="width:${percentage}%"></div></div>
              <div class="probability-value">${percentage}%</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function resetBatchMode() {
  document.getElementById("batchUploadArea").style.display = "block";
  document.getElementById("batchResultsContainer").style.display = "none";
  document.getElementById("batchLoadingContainer").style.display = "none";
  document.getElementById("batchImageInput").value = "";
}

// Toast Notifications
function showToast(message, type = "info") {
  const toast = document.getElementById("errorToast");
  toast.textContent = message;

  toast.className = `toast ${type}`;
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Keep API status updated
setInterval(checkAPIStatus, 10000);

document.addEventListener("click", (event) => {
  const modal = document.getElementById("detailModal");
  if (!modal) return;

  if (
    event.target.id === "detailModal" ||
    event.target.closest("#closeDetailModal")
  ) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
});
