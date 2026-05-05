// MOCK MODE — real Firebase/Cloudinary credentials not required
// To restore real auth, replace this section with the original Firebase SDK calls.

let _mockToken = null;

export async function initializeFirebase(_config, _dotNetRef) {
    // no-op: C# handles initial signed-out state by default
}

export async function signInWithEmail(_email, _password) {
    _mockToken = "mock-token-" + Date.now();
    return _mockToken;
}

export async function signUpWithEmail(_email, _password) {
    _mockToken = "mock-token-" + Date.now();
    return _mockToken;
}

export async function signInWithGoogle() {
    _mockToken = "mock-google-token-" + Date.now();
    return _mockToken;
}

export async function firebaseSignOut() {
    _mockToken = null;
}

export async function getIdToken() {
    return _mockToken;
}

// Returns { name, type, size, previewUrl } for the selected file, or null
export function getFileInfo(inputEl) {
    const file = inputEl.files[0];
    if (!file) return null;
    return {
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
    };
}

export function revokeObjectUrl(url) {
    URL.revokeObjectURL(url);
}

// MOCK upload — returns a placeholder image URL instead of uploading to Cloudinary
export function uploadToCloudinary(_inputEl, _cloudName, _uploadPreset, dotNetRef) {
    return new Promise((resolve) => {
        let pct = 0;
        const interval = setInterval(() => {
            pct = Math.min(pct + 20, 100);
            dotNetRef.invokeMethodAsync("OnUploadProgress", pct);
            if (pct === 100) {
                clearInterval(interval);
                resolve("https://placehold.co/640x360?text=Media+Placeholder");
            }
        }, 150);
    });
}
