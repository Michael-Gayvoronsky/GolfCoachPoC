const FIREBASE_VERSION = "10.14.1";
const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let auth = null;

export async function initializeFirebase(config, dotNetRef) {
    const { initializeApp } = await import(`${BASE}/firebase-app.js`);
    const { getAuth, onAuthStateChanged } = await import(`${BASE}/firebase-auth.js`);

    const app = initializeApp(config);
    auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const token = await user.getIdToken();
            await dotNetRef.invokeMethodAsync("OnAuthStateChanged", {
                uid: user.uid,
                email: user.email ?? "",
                displayName: user.displayName ?? "",
                token,
            });
        } else {
            await dotNetRef.invokeMethodAsync("OnAuthStateChanged", null);
        }
    });
}

export async function signInWithEmail(email, password) {
    const { signInWithEmailAndPassword } = await import(`${BASE}/firebase-auth.js`);
    const result = await signInWithEmailAndPassword(auth, email, password);
    return await result.user.getIdToken();
}

export async function signUpWithEmail(email, password) {
    const { createUserWithEmailAndPassword } = await import(`${BASE}/firebase-auth.js`);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return await result.user.getIdToken();
}

export async function signInWithGoogle() {
    const { signInWithPopup, GoogleAuthProvider } = await import(`${BASE}/firebase-auth.js`);
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return await result.user.getIdToken();
}

export async function firebaseSignOut() {
    const { signOut } = await import(`${BASE}/firebase-auth.js`);
    await signOut(auth);
}

export async function getIdToken() {
    if (!auth?.currentUser) return null;
    return await auth.currentUser.getIdToken(true);
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

// Uploads the selected file to Cloudinary and returns the secure CDN URL.
// Calls dotNetRef.OnUploadProgress(pct) during upload.
export function uploadToCloudinary(inputEl, cloudName, uploadPreset, dotNetRef) {
    return new Promise((resolve, reject) => {
        const file = inputEl.files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

        xhr.upload.addEventListener("progress", e => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                dotNetRef.invokeMethodAsync("OnUploadProgress", pct);
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
                resolve(JSON.parse(xhr.responseText).secure_url);
            } else {
                reject(xhr.responseText);
            }
        });

        xhr.addEventListener("error", () => reject("Upload failed"));
        xhr.send(formData);
    });
}
