// firebase-twibbon.js — Firebase Config specifically for Twibbon Gerak
// Uses the secondary 'baja-twibon' project

const twibbonFirebaseConfig = {
  apiKey: "AIzaSyCCQzPFgS_Ngr35-FEtqCNjQjo_vXg4l6M",
  authDomain: "baja-twibon.firebaseapp.com",
  databaseURL: "https://baja-twibon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "baja-twibon",
  storageBucket: "baja-twibon.appspot.com",
  messagingSenderId: "1059954321037",
  appId: "1:1059954321037:web:38fef987b795e0f4a124c4",
  measurementId: "G-BQT2CL8KVX"
};

// Initialize secondary Firebase app
const twibbonApp = firebase.initializeApp(twibbonFirebaseConfig, "twibbonApp");

// Expose the database and storage objects for Twibbon
const twibbonDB = twibbonApp.database();
let twibbonStorage;

try {
  twibbonStorage = twibbonApp.storage();
} catch (e) {
  console.warn("Storage not initialized properly on twibbonApp.", e);
}
