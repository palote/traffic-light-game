// src/firebase.config.ts

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Tu configuración real de Firebase:
const firebaseConfig = {
  apiKey: "AIzaSyC8YgUCS8A6FeHXPocKIQCKzrl1zzMkGB4",
  authDomain: "traffic-ligths-game.firebaseapp.com",
  databaseURL: "https://traffic-ligths-game-default-rtdb.firebaseio.com",
  projectId: "traffic-ligths-game",
  storageBucket: "traffic-ligths-game.firebasestorage.app",
  messagingSenderId: "365086368348",
  appId: "1:365086368348:web:e1d39d3b351b913aa23c99",
  measurementId: "G-73PXXPXK71",
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos la base de datos en tiempo real (Realtime Database)
export const database = getDatabase(app);
