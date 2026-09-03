const fs = require('fs');
const path = require('path');

const brokenPath = path.join(__dirname, 'trash-register.html');

try {
  let content = fs.readFileSync(brokenPath, 'utf8');
  let lines = content.split('\n');
  
  // Baris 739 (indeks 738) sampai baris 966 (indeks 965)
  // Tapi indeks baris mungkin bergeser 1, jadi kita cari string uniknya:
  const startStr = " ======================================================";
  const endStr = "// ─── Register: Buat Perangkat Baru ──────────────────";
  
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(startStr) && startIndex === -1) {
      startIndex = i;
    }
    if (lines[i].includes(endStr)) {
      endIndex = i;
      break;
    }
  }
  
  if (startIndex !== -1 && endIndex !== -1) {
    // Hapus baris dari startIndex sampai tepat sebelum endIndex
    lines.splice(startIndex, endIndex - startIndex);
    fs.writeFileSync(brokenPath, lines.join('\n'), 'utf8');
    console.log('BERHASIL menghapus duplikat buildArduinoCode!');
  } else {
    console.log('TIDAK DITEMUKAN indeksnya!', startIndex, endIndex);
  }
} catch (error) {
  console.error("Gagal memperbaiki:", error);
}
