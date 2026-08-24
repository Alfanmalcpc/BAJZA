// photobooth-mp.js — Socket.IO + WebRTC Multiplayer Photobooth
// PENTING: File ini dimuat di <head>, sebelum DOM siap.
// Semua akses elemen DOM HARUS dilakukan di dalam fungsi (lazy), bukan saat script dimuat!

let socket = null;
let mpIceCandidateQueue = [];
let isSyncingCapture = false;

// Variabel state MP (akan di-set bersama dengan variabel yang ada di photobooth.html)
// Variabel berikut HARUS sudah ada di scope global photobooth.html:
// isMultiplayer, isHost, currentRoomId, peerConnection, stream

const BACKEND_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : '';  // String kosong = ikuti domain hosting saat production

// ──────────────────────────────────────
// HELPER: Ambil elemen DOM secara lazy
// ──────────────────────────────────────
function mpEl(id) {
  return document.getElementById(id);
}

// ──────────────────────────────────────
// ICE CANDIDATE QUEUEING
// ──────────────────────────────────────
async function flushIceCandidates() {
  while (mpIceCandidateQueue.length > 0) {
    const c = mpIceCandidateQueue.shift();
    try {
      if (peerConnection) await peerConnection.addIceCandidate(c);
    } catch (e) {
      console.warn('[MP] Error flushing ICE candidate:', e);
    }
  }
}

// ──────────────────────────────────────
// INISIALISASI SOCKET
// ──────────────────────────────────────
function initMultiplayerSocket() {
  if (socket && socket.connected) return;  // Jangan buat ulang jika masih aktif

  socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[MP] Terhubung ke signaling server. ID:', socket.id);
    if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = '🔗 Terhubung ke server...';
  });

  socket.on('connect_error', (err) => {
    console.error('[MP] Gagal koneksi ke server:', err.message);
    if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = '❌ Gagal koneksi ke server sinyal.';
  });

  // Host: teman masuk → mulai buat WebRTC offer
  socket.on('user-connected', async (userId) => {
    console.log('[MP] User masuk ke room:', userId);
    if (isHost && stream) {
      if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = '🤝 Teman bergabung! Menghubungkan kamera...';
      await makeWebRTCOffer();
    }
  });

  // Guest: terima offer dari host
  socket.on('webrtc-offer', async (data) => {
    console.log('[MP] Menerima offer dari host');
    if (!isHost) {
      await handleWebRTCOffer(data);
    }
  });

  // Host: terima answer dari guest
  socket.on('webrtc-answer', async (data) => {
    console.log('[MP] Menerima answer dari guest');
    if (isHost && peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushIceCandidates();
      } catch (e) {
        console.error('[MP] Gagal setRemoteDescription (host):', e);
      }
    }
  });

  // Keduanya: terima ICE candidate
  socket.on('ice-candidate', async (data) => {
    if (!peerConnection) return;
    const candidate = new RTCIceCandidate(data.candidate);
    // Hanya tambahkan jika remoteDescription sudah ada, kalau belum → antri dulu
    if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (e) {
        console.warn('[MP] Gagal addIceCandidate:', e);
      }
    } else {
      console.log('[MP] ICE candidate dimasukkan ke antrian (remote desc belum siap)');
      mpIceCandidateQueue.push(candidate);
    }
  });

  // Sync jepretan dari lawan
  socket.on('sync-capture', () => {
    console.log('[MP] Perintah capture diterima dari teman');
    const btn = mpEl('btnCapture');
    if (btn && !btn.disabled) {
      isSyncingCapture = true;
      btn.click();
      setTimeout(() => { isSyncingCapture = false; }, 600);
    }
  });

  // Teman keluar
  socket.on('user-disconnected', (userId) => {
    console.log('[MP] User keluar:', userId);
    if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = '😢 Teman terputus. Kembali ke mode solo...';
    stopMultiplayerSession();
  });
}

// ──────────────────────────────────────
// BUAT PEER CONNECTION (WebRTC)
// ──────────────────────────────────────
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free TURN server dari OpenRelay untuk menembus NAT ketat
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

function createPeerConnection() {
  // Tutup koneksi lama jika ada
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  mpIceCandidateQueue = [];  // Reset antrian ICE
  peerConnection = new RTCPeerConnection(rtcConfig);

  // Tambahkan semua track dari kamera lokal
  if (stream) {
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  } else {
    console.warn('[MP] Stream lokal belum siap saat createPeerConnection dipanggil!');
  }

  // ─── Event: Menerima video dari teman ───
  peerConnection.ontrack = (event) => {
    console.log('[MP] ontrack: menerima stream dari teman');
    const remoteVideo = mpEl('remoteVideo');
    const remoteVideoWrap = mpEl('remoteVideoWrap');

    if (remoteVideo) {
      const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      remoteVideo.srcObject = remoteStream;
      remoteVideo.play().catch(e => console.warn('[MP] remoteVideo.play() error:', e));
    }

    if (remoteVideoWrap) {
      remoteVideoWrap.style.display = '';
      remoteVideoWrap.style.flex = '1';
      remoteVideoWrap.style.width = '';
      remoteVideoWrap.style.overflow = '';
    }

    // Tandai mode multiplayer aktif di camContainer
    const camContainer = mpEl('camContainer');
    if (camContainer) camContainer.classList.add('mp-active');

    // Tampilkan overlay animasi sukses
    const overlay = mpEl('mpAnimOverlay');
    if (overlay) {
      overlay.classList.add('show');
      setTimeout(() => overlay.classList.remove('show'), 3000);
    }

    if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = '✅ Kamera saling terhubung! Siap berpose!';

    isMultiplayer = true;
  };

  // ─── Event: ICE Candidate siap dikirim ───
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && currentRoomId && socket) {
      socket.emit('ice-candidate', {
        roomId: currentRoomId,
        candidate: event.candidate
      });
    }
  };

  // ─── Event: Monitor status koneksi ───
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log('[MP] connectionState:', state);
    if (state === 'failed' || state === 'disconnected') {
      if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = `⚠️ Koneksi P2P ${state}, mencoba ulang...`;
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('[MP] iceConnectionState:', peerConnection.iceConnectionState);
  };

  return peerConnection;
}

// ──────────────────────────────────────
// HOST: Buat Offer
// ──────────────────────────────────────
async function makeWebRTCOffer() {
  createPeerConnection();
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc-offer', {
      roomId: currentRoomId,
      sdp: peerConnection.localDescription
    });
    console.log('[MP] Offer dikirim ke room:', currentRoomId);
  } catch (err) {
    console.error('[MP] Gagal membuat offer:', err);
    if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = '❌ Gagal membuat koneksi.';
  }
}

// ──────────────────────────────────────
// GUEST: Terima Offer & Balas Answer
// ──────────────────────────────────────
async function handleWebRTCOffer(data) {
  createPeerConnection();
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    await flushIceCandidates();  // Flush ICE yang mungkin sudah antri

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('webrtc-answer', {
      roomId: currentRoomId,
      sdp: peerConnection.localDescription
    });
    console.log('[MP] Answer dikirim ke room:', currentRoomId);
  } catch (err) {
    console.error('[MP] Gagal menangani offer:', err);
    if (mpEl('mpStatusMsg')) mpEl('mpStatusMsg').textContent = '❌ Gagal menerima koneksi.';
  }
}

// ──────────────────────────────────────
// MULAI SESI MULTIPLAYER
// ──────────────────────────────────────
async function startMultiplayerSession(roomId, role) {
  console.log('[MP] Mulai sesi:', role, 'di room:', roomId);

  isMultiplayer = false;  // Akan di-set true saat ontrack terpanggil
  isHost = (role === 'host');
  currentRoomId = roomId;

  // Pastikan socket siap
  initMultiplayerSocket();

  // Tunggu socket terhubung jika belum
  if (!socket.connected) {
    await new Promise((resolve) => socket.once('connect', resolve));
  }

  socket.emit('join-room', roomId);

  // Update UI
  if (mpEl('txtRoomId')) mpEl('txtRoomId').textContent = roomId;
  if (mpEl('mpStatusMsg')) {
    mpEl('mpStatusMsg').textContent = isHost
      ? '⏳ Menunggu teman bergabung...'
      : '🔍 Bergabung ke room, menunggu kamera host...';
  }
  if (mpEl('mpRoomBlock')) mpEl('mpRoomBlock').style.display = 'block';
  if (mpEl('mpAuthBlock')) mpEl('mpAuthBlock').style.display = 'none';

  // Tampilkan remoteVideoWrap walau belum ada stream (siapkan layout)
  const remoteVideoWrap = mpEl('remoteVideoWrap');
  if (remoteVideoWrap) {
    remoteVideoWrap.style.display = 'flex';
    remoteVideoWrap.style.flex = '1';
    remoteVideoWrap.style.width = '';
    remoteVideoWrap.style.overflow = '';
  }

  const badgeLocal = mpEl('badgeLocal');
  if (badgeLocal) badgeLocal.style.display = 'block';

  // Pastikan kamera lokal sudah menyala
  if (!stream && typeof startCamera === 'function') {
    await startCamera('user');
  }
}

// ──────────────────────────────────────
// HENTIKAN SESI MULTIPLAYER
// ──────────────────────────────────────
function stopMultiplayerSession() {
  console.log('[MP] Menghentikan sesi multiplayer');

  isMultiplayer = false;
  isHost = false;
  currentRoomId = null;

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  mpIceCandidateQueue = [];

  // Reset remote video
  const remoteVideo = mpEl('remoteVideo');
  if (remoteVideo) remoteVideo.srcObject = null;

  const remoteVideoWrap = mpEl('remoteVideoWrap');
  if (remoteVideoWrap) {
    remoteVideoWrap.style.display = 'none';
    remoteVideoWrap.style.flex = '0';
    remoteVideoWrap.style.width = '0';
    remoteVideoWrap.style.overflow = 'hidden';
  }

  const camContainer = mpEl('camContainer');
  if (camContainer) {
    camContainer.classList.remove('mp-active');
  }

  const badgeLocal = mpEl('badgeLocal');
  if (badgeLocal) badgeLocal.style.display = 'none';
}

// ──────────────────────────────────────
// SINKRONISASI JEPRETAN KE TEMAN
// ──────────────────────────────────────
function syncCaptureToRemote() {
  if (isMultiplayer && socket && socket.connected && currentRoomId && !isSyncingCapture) {
    socket.emit('sync-capture', currentRoomId);
  }
}

// ──────────────────────────────────────
// EKSPOS KE GLOBAL WINDOW
// ──────────────────────────────────────
window.startMultiplayerSession = startMultiplayerSession;
window.stopMultiplayerSession  = stopMultiplayerSession;
window.syncCaptureToRemote     = syncCaptureToRemote;
