import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 Firebase
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar Firestore
const db = getFirestore(app);

export { db };