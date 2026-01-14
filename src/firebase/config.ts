import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
// These values are safe to expose publicly
const firebaseConfig = {
     apiKey: "AIzaSyCvLo_ct6hpT-9YtNwsOsl8jQhrG7AG5-k",
     authDomain: "schedule-5bf3f.firebaseapp.com",
     projectId: "schedule-5bf3f",
     storageBucket: "schedule-5bf3f.firebasestorage.app",
     messagingSenderId: "873645947107",
     appId: "1:873645947107:web:41f15f2d0f3671c1f26dd6",
     measurementId: "G-2ZES5ZER8R"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

export default app
