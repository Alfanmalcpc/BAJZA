// firebase-multiplay.js — Secondary Firebase Config for Photobooth Multiplayer

const mpFirebaseConfig = {
  apiKey: "AIzaSyDOco4URrTX8LEUHAyzBHnTh3qYSkSANWQ",
  authDomain: "baja-multiplay-photobooth.firebaseapp.com",
  databaseURL: "https://baja-multiplay-photobooth-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "baja-multiplay-photobooth",
  storageBucket: "baja-multiplay-photobooth.firebasestorage.app",
  messagingSenderId: "24017302998",
  appId: "1:24017302998:web:beeae381d6160c6511e077",
  measurementId: "G-M9PPZEKFB3"
};

// Initialize Secondary Firebase App for Multiplayer Database
const mpApp = firebase.initializeApp(mpFirebaseConfig, "MultiplayerApp");
const mpDb = mpApp.database();
