// photobooth-mp.js — Socket.IO WebRTC Signaling for Multiplayer Photobooth

let socket = null;
// Gunakan URL yang sama dengan host (misal http://localhost:3000 jika dev).
// Jika di deploy ke domain yang sama, bisa gunakan '/'
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : ''; // Gunakan string kosong agar socket.io mendeteksi otomatis host saat ini di production

function initMultiplayerSocket() {
  if (socket) return;
  
  // Socket.io-client harus sudah dimuat via CDN di photobooth.html
  socket = io(BACKEND_URL);

  socket.on('connect', () => {
    console.log('[MP] Connected to signaling server');
  });

  socket.on('user-connected', async (userId) => {
    console.log('[MP] User connected:', userId);
    // Jika saya adalah Host, saya harus menginisiasi WebRTC Offer ke user baru
    if (isHost && stream) {
      document.getElementById('mpStatusMsg').textContent = 'Teman bergabung. Menghubungkan kamera...';
      await makeWebRTCOffer();
    }
  });

  socket.on('webrtc-offer', async (data) => {
    console.log('[MP] Received offer');
    if (!isHost) {
      await handleWebRTCOffer(data);
    }
  });

  socket.on('webrtc-answer', async (data) => {
    console.log('[MP] Received answer');
    if (isHost && peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    }
  });

  socket.on('ice-candidate', async (data) => {
    console.log('[MP] Received ICE candidate');
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    }
  });

  socket.on('sync-capture', () => {
    console.log('[MP] Remote triggered capture');
    const btn = document.getElementById('btnCapture');
    if (btn && !btn.disabled) {
      // Simulasikan klik pada tombol capture tanpa trigger sync balik (mencegah loop)
      isSyncingCapture = true;
      btn.click();
      setTimeout(() => isSyncingCapture = false, 500);
    }
  });

  socket.on('user-disconnected', (userId) => {
    console.log('[MP] User disconnected:', userId);
    document.getElementById('mpStatusMsg').textContent = 'Teman terputus. Beralih ke mode solo...';
    stopMultiplayerSession();
  });
}

function stopMultiplayerSession() {
  isMultiplayer = false;
  isHost = false;
  currentRoomId = null;
  
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  if (remoteVideo) {
    remoteVideo.srcObject = null;
  }
  
  if (typeof remoteVideoWrap !== 'undefined' && remoteVideoWrap) {
    remoteVideoWrap.style.display = 'none';
    remoteVideoWrap.style.flex = '0';
  }
  
  if (typeof camContainer !== 'undefined' && camContainer) {
    camContainer.classList.remove('mp-active');
    // Jika cameraRatio didefinisikan secara global
    if (typeof cameraRatio !== 'undefined') {
      camContainer.style.aspectRatio = cameraRatio;
    }
  }
  
  if (typeof badgeLocal !== 'undefined' && badgeLocal) {
    badgeLocal.style.display = 'none';
  }
}

async function startMultiplayerSession(roomId, role) {
  isMultiplayer = true;
  isHost = (role === 'host');
  currentRoomId = roomId;

  initMultiplayerSocket();
  socket.emit('join-room', roomId);

  document.getElementById('txtRoomId').textContent = roomId;
  document.getElementById('mpStatusMsg').textContent = isHost ? 'Menunggu teman bergabung...' : 'Berhasil bergabung! Menunggu kamera host...';
  
  // Tampilkan panel room
  document.getElementById('mpRoomBlock').style.display = 'block';
  document.getElementById('mpAuthBlock').style.display = 'none';
  document.getElementById('paneJoin').style.display = isHost ? 'none' : 'block';
  document.getElementById('paneCreate').style.display = isHost ? 'block' : 'none';
  
  // Sesuaikan Layout Video
  badgeLocal.style.display = 'block';
  remoteVideoWrap.style.display = 'flex';
  remoteVideoWrap.style.flex = '1';

  // Pastikan kamera lokal menyala
  if (!stream && typeof startCamera === 'function') {
    await startCamera('user'); 
  }
}

// Konfigurasi STUN Server untuk NAT traversal
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function createPeerConnection() {
  if (peerConnection) {
    peerConnection.close();
  }
  
  peerConnection = new RTCPeerConnection(rtcConfig);

  // Tambahkan track lokal ke koneksi P2P
  if (stream) {
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });
  }

  // Saat track dari teman diterima
  peerConnection.ontrack = (event) => {
    console.log('[MP] Received remote track');
    remoteVideo.srcObject = event.streams[0];
    
    // Tampilkan overlay sukses
    const overlay = document.getElementById('mpAnimOverlay');
    if(overlay) {
      overlay.style.display = 'flex';
      setTimeout(() => { overlay.style.display = 'none'; }, 3000);
    }
    document.getElementById('mpStatusMsg').textContent = 'Kamera saling terhubung!';
  };

  // Kumpulkan ICE Candidate dan kirim via Socket.io
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && currentRoomId) {
      socket.emit('ice-candidate', {
        roomId: currentRoomId,
        candidate: event.candidate
      });
    }
  };

  return peerConnection;
}

async function makeWebRTCOffer() {
  createPeerConnection();
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('webrtc-offer', {
      roomId: currentRoomId,
      sdp: peerConnection.localDescription
    });
  } catch (err) {
    console.error('Error creating offer:', err);
  }
}

async function handleWebRTCOffer(data) {
  createPeerConnection();
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('webrtc-answer', {
      roomId: currentRoomId,
      sdp: peerConnection.localDescription
    });
  } catch (err) {
    console.error('Error handling offer:', err);
  }
}

// Flag agar tidak looping
let isSyncingCapture = false;

function syncCaptureToRemote() {
  // Hanya kirim jika belum dalam status menerima sinkronisasi
  if (isMultiplayer && socket && currentRoomId && !isSyncingCapture) {
    socket.emit('sync-capture', currentRoomId);
  }
}

// Ekspos fungsi ke global window agar bisa dipanggil dari photobooth.html
window.startMultiplayerSession = startMultiplayerSession;
window.stopMultiplayerSession = stopMultiplayerSession;
window.syncCaptureToRemote = syncCaptureToRemote;
