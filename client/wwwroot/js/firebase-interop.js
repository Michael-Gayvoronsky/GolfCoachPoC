// MOCK MODE — real Firebase/Cloudinary credentials not required
// To restore real auth, replace the top section with the original Firebase SDK calls.

let _dotNetRef = null;
let _mockToken = null;

export async function initializeFirebase(config, dotNetRef) {
    _dotNetRef = dotNetRef;
    await dotNetRef.invokeMethodAsync("OnAuthStateChanged", null);
}

export async function signInWithEmail(email, _password) {
    _mockToken = "mock-token-" + Date.now();
    const user = { uid: "mock-uid", email, displayName: email.split("@")[0], token: _mockToken };
    if (_dotNetRef) await _dotNetRef.invokeMethodAsync("OnAuthStateChanged", user);
    return _mockToken;
}

export async function signUpWithEmail(email, _password) {
    return signInWithEmail(email, _password);
}

export async function signInWithGoogle() {
    _mockToken = "mock-google-token-" + Date.now();
    const user = { uid: "mock-google-uid", email: "demo@example.com", displayName: "Demo User", token: _mockToken };
    if (_dotNetRef) await _dotNetRef.invokeMethodAsync("OnAuthStateChanged", user);
    return _mockToken;
}

export async function firebaseSignOut() {
    _mockToken = null;
    if (_dotNetRef) await _dotNetRef.invokeMethodAsync("OnAuthStateChanged", null);
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
export function uploadToCloudinary(inputEl, cloudName, uploadPreset, dotNetRef) {
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
