import os

broken_path = r'c:\Users\ACER\Documents\dokumen Alfan\PENGEMBANGAN BAJA WEB\frontend\src\pages\tools\trash-register.html'
recovered_path = r'c:\Users\ACER\Documents\dokumen Alfan\PENGEMBANGAN BAJA WEB\frontend\src\pages\tools\recovered.js'

with open(broken_path, 'r', encoding='utf-8') as f:
    broken_lines = f.readlines()

# The first 178 lines of the broken file are correct.
top_html = broken_lines[:178]

auth_logic = """
function checkAuthStatus() {
  if (typeof auth === 'undefined') {
    setTimeout(checkAuthStatus, 100);
    return;
  }
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      document.getElementById('unauthOverlay').style.display = 'none';
      loadMyDevices();
      
      const script = document.createElement('script');
      script.src = '/src/services/firebase-iot.js';
      document.body.appendChild(script);
    } else {
      currentUser = null;
      document.getElementById('unauthOverlay').style.display = 'flex';
      document.getElementById('myDevicesList').innerHTML = '<div class="tm-monitor-card" style="text-align:center;color:var(--text-2);">Silakan login untuk melihat perangkat.</div>';
    }
  });
}
checkAuthStatus();

"""

with open(recovered_path, 'r', encoding='utf-8') as f:
    recovered_content = f.read()

# Assemble the file
with open(broken_path, 'w', encoding='utf-8') as f:
    f.writelines(top_html)
    f.write(auth_logic)
    f.write(recovered_content)

print('File successfully reassembled and overwritten!')
