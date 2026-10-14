// firebase-twibbon.js — Twibbon Gerak Secure Backend Gateway
// Terhubung aman ke Backend BAJA (/api/firebase/db/twibbon) — ZERO API KEY DI CLIENT!

const twibbonDB = new window.BajaDatabaseService('twibbon');

// Mock storage adapter for backward compatibility if needed
const twibbonStorage = {
  ref: (path) => ({
    put: async (data) => ({ ref: { getDownloadURL: async () => data } }),
    getDownloadURL: async () => ''
  })
};
