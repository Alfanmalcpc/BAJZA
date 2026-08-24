const { Server } = require('socket.io');

function initSocket(server) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    // Ganti dengan URL Vercel Anda setelah deploy, contoh:
    // 'https://baja-web.vercel.app',
    /\.vercel\.app$/,   // Izinkan semua subdomain vercel.app
  ];

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Izinkan request tanpa origin (misalnya dari Postman atau server-side)
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(o =>
          typeof o === 'string' ? o === origin : o.test(origin)
        );
        callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    // Izinkan WebSocket dan polling sebagai fallback
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Join Room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`[Socket] ${socket.id} joined room ${roomId}`);
      
      // Beritahu pengguna lain di room yang sama bahwa ada yang bergabung
      socket.to(roomId).emit('user-connected', socket.id);
    });

    // WebRTC Signaling: Offer
    socket.on('webrtc-offer', (data) => {
      socket.to(data.roomId).emit('webrtc-offer', {
        sender: socket.id,
        sdp: data.sdp
      });
    });

    // WebRTC Signaling: Answer
    socket.on('webrtc-answer', (data) => {
      socket.to(data.roomId).emit('webrtc-answer', {
        sender: socket.id,
        sdp: data.sdp
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('ice-candidate', (data) => {
      socket.to(data.roomId).emit('ice-candidate', {
        sender: socket.id,
        candidate: data.candidate
      });
    });

    // Sync Capture Event
    socket.on('sync-capture', (roomId) => {
      socket.to(roomId).emit('sync-capture');
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit('user-disconnected', socket.id);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });
}

module.exports = initSocket;
