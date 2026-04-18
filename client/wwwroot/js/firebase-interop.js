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
