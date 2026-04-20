const FIREBASE_VERSION = "10.14.1";
const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let auth = null;
let storage = null;

export async function initializeFirebase(config, dotNetRef) {
    const { initializeApp } = await import(`${BASE}/firebase-app.js`);
    const { getAuth, onAuthStateChanged } = await import(`${BASE}/firebase-auth.js`);
    const { getStorage } = await import(`${BASE}/firebase-storage.js`);

    const app = initializeApp(config);
    auth = getAuth(app);
    storage = getStorage(app);

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

// Uploads the selected file to Firebase Storage and returns the public download URL.
// Calls dotNetRef.OnUploadProgress(pct) during upload.
export async function uploadToStorage(inputEl, dotNetRef) {
    const { ref, uploadBytesResumable, getDownloadURL } = await import(`${BASE}/firebase-storage.js`);
    const file = inputEl.files[0];
    const path = `media/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);

    return new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on(
            "state_changed",
            snapshot => {
                const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                dotNetRef.invokeMethodAsync("OnUploadProgress", pct);
            },
            err => reject(err.message),
            async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
    });
}
