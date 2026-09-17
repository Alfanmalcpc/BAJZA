// firebase-pet.js — Firebase Configuration specifically for Virtual Aquarium / Pet
// Project: baja-pet

const petFirebaseConfig = {
  apiKey: "AIzaSyBDqnLVyH4Dr3biOof0oUI4Jwj2CV0C91U",
  authDomain: "baja-pet.firebaseapp.com",
  databaseURL: "https://baja-pet-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "baja-pet",
  storageBucket: "baja-pet.firebasestorage.app",
  messagingSenderId: "738699451334",
  appId: "1:738699451334:web:511dd72c9da4bef93570c7",
  measurementId: "G-HT0TYM91QZ"
};

// Initialize secondary Firebase app for Pet / Aquarium
const petApp = firebase.initializeApp(petFirebaseConfig, "petApp");
const petDb = petApp.database();
