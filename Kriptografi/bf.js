// State management untuk navigasi halaman
let currentPage = 1;
const totalPages = 4;
let bruteForceInterval;
let dictInterval;
let birthdayTimeout; // Global variable to manage the timeout
let pyodide = null;
let pyodideReady = false;

async function initPyodide() {
    if (pyodideReady) return;
    const outputEl = document.getElementById('attackResult');
    outputEl.innerHTML = `<p class="text-blue-400">Memuat Pyodide untuk simulasi yang lebih akurat...</p>`;
    try {
        pyodide = await loadPyodide();
        await pyodide.runPythonAsync(`
            import string
            import itertools
            
            def simulate_brute_force_py(password_target, max_len=5):
                """
                Simulates a brute-force attack to find a password.
                Returns a list of all guesses up to the found password.
                """
                charset = string.ascii_lowercase + string.digits
                guesses = []
                
                for length in range(1, max_len + 1):
                    for p in itertools.product(charset, repeat=length):
                        guess = "".join(p)
                        guesses.append(guess)
                        if guess == password_target:
                            return {'found': True, 'guesses': guesses}

                return {'found': False, 'guesses': guesses}
        `);
        pyodideReady = true;
        outputEl.innerHTML = `<p class="text-green-400">Pyodide siap. Simulasi akan lebih akurat.</p>`;
    } catch (error) {
        console.error("Pyodide loading failed:", error);
        outputEl.innerHTML = `<p class="text-red-400">ERROR: Gagal memuat Pyodide. Coba muat ulang halaman.</p>`;
    }
}

function showPage(pageNumber) {
    currentPage = pageNumber;
    stopAllSimulations(); // Menghentikan simulasi jika pengguna pindah halaman
    document.querySelectorAll('.page-container').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageNumber}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${pageNumber}`).classList.add('active');

    document.getElementById('currentPageNum').textContent = pageNumber;
    document.getElementById('prevBtn').disabled = (pageNumber === 1);
    document.getElementById('nextBtn').disabled = (pageNumber === totalPages);
}

function navigatePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        showPage(newPage);
    }
}

// --- Fungsi Kripto ---
const INDONESIAN_FREQ = { 'a': 21.37, 'n': 9.69, 'i': 8.16, 'e': 8.01, 't': 6.09, 'u': 5.56, 'r': 5.43, 's': 5.25, 'd': 4.79, 'k': 4.41, 'l': 3.99, 'm': 3.93, 'g': 3.19, 'p': 2.94, 'b': 2.76, 'h': 2.37, 'o': 1.96, 'y': 1.62, 'j': 1.15, 'c': 0.74, 'w': 0.16, 'f': 0.14, 'v': 0.05, 'z': 0.04, 'q': 0.01, 'x': 0.01 };
function calculateLanguageScore(text) {
    const textFreq = {}; let totalChars = 0;
    for (const char of text.toLowerCase()) { if (INDONESIAN_FREQ[char]) { textFreq[char] = (textFreq[char] || 0) + 1; totalChars++; } }
    if (totalChars === 0) return Infinity;
    for (const char in textFreq) { textFreq[char] = (textFreq[char] / totalChars) * 100; }
    let score = 0;
    for (const char in INDONESIAN_FREQ) { const observed = textFreq[char] || 0; const expected = INDONESIAN_FREQ[char]; score += Math.pow(observed - expected, 2) / expected; }
    return score;
}
function binaryConverter(mode) {
    const input = document.getElementById('binaryInput').value; const outputElement = document.getElementById('binaryOutput');
    if (!input) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    try { if (mode === 'toBinary') { outputElement.textContent = input.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' '); } else { outputElement.textContent = input.split(' ').map(bin => bin ? String.fromCharCode(parseInt(bin, 2)) : '').join(''); } } catch(e) { outputElement.textContent = 'ERROR: String biner tidak valid.'; }
}
function caesarCipher(mode) {
    const text = document.getElementById('caesarInput').value; const shift = parseInt(document.getElementById('caesarShift').value); const outputElement = document.getElementById('caesarOutput');
    if (!text) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    if (isNaN(shift)) { outputElement.textContent = 'ERROR: Nilai shift harus angka.'; return; }
    let result = '';
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char.match(/[a-z]/i)) {
            const code = text.charCodeAt(i); let shiftedCode;
            if ((code >= 65) && (code <= 90)) { shiftedCode = (mode === 'encrypt') ? (code - 65 + shift) % 26 + 65 : (code - 65 - shift + 26*100) % 26 + 65; }
            else if ((code >= 97) && (code <= 122)) { shiftedCode = (mode === 'encrypt') ? ((code - 97 + shift) % 26) + 97 : ((code - 97 - shift + 26*100) % 26) + 97; }
            result += String.fromCharCode(shiftedCode);
        } else { result += char; }
    }
    outputElement.textContent = result;
}
function vigenereCipher(mode) {
    const text = document.getElementById('vigenereInput').value; const key = document.getElementById('vigenereKey').value.toUpperCase().replace(/[^A-Z]/g, ''); const outputElement = document.getElementById('vigenereOutput');
    if (!text || !key) { outputElement.textContent = 'ERROR: Teks dan Kunci dibutuhkan.'; return; }
    let result = ''; let keyIndex = 0;
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i); const isUpper = charCode >= 65 && charCode <= 90; const isLower = charCode >= 97 && charCode <= 122;
        if (isUpper || isLower) {
            const keyChar = key.charCodeAt(keyIndex % key.length) - 65; const shift = mode === 'encrypt' ? keyChar : -keyChar; const base = isUpper ? 65 : 97;
            result += String.fromCharCode((charCode - base + shift + 26) % 26 + base); keyIndex++;
        } else { result += text[i]; }
    }
    outputElement.textContent = result;
}
function base64(mode) {
    const input = document.getElementById('base64Input').value;
    const outputElement = document.getElementById('base64Output');
    if (!input) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    try {
        outputElement.textContent = (mode === 'encode') ? btoa(input) : atob(input);
    } catch (e) {
        outputElement.textContent = 'ERROR: Input tidak valid untuk Base64.';
    }
}
async function getSha256(text) {
    const textAsBuffer = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
async function generateSha256() {
    const input = document.getElementById('shaInput').value;
    const outputElement = document.getElementById('shaOutput');
    if (!input) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    try {
        outputElement.textContent = await getSha256(input);
    } catch (e) {
        outputElement.textContent = 'Gagal membuat hash.';
    }
}
const morseCodeMap = {'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---','K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-','U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.','0':'-----', ' ':'/'};
const reversedMorseMap = Object.fromEntries(Object.entries(morseCodeMap).map(a => a.reverse()));
function morseConverter(mode) {
    const input = document.getElementById('morseInput').value;
    const outputElement = document.getElementById('morseOutput');
    if (!input) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    try {
        if (mode === 'toMorse') {
            outputElement.textContent = input.toUpperCase().split('').map(char => morseCodeMap[char] || '').join(' ');
        } else {
            outputElement.textContent = input.split(' ').map(code => reversedMorseMap[code] || '').join('');
        }
    } catch (e) {
        outputElement.textContent = 'ERROR: Kode Morse tidak valid.';
    }
}
function atbashCipher() {
    const input = document.getElementById('atbashInput').value;
    const outputElement = document.getElementById('atbashOutput');
    if (!input) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    let result = '';
    for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        if (code >= 65 && code <= 90) { result += String.fromCharCode(90 - (code - 65)); }
        else if (code >= 97 && code <= 122) { result += String.fromCharCode(122 - (code - 97)); }
        else { result += input[i]; }
    }
    outputElement.textContent = result;
}
function rot13Cipher() {
    const input = document.getElementById('rot13Input').value;
    const outputElement = document.getElementById('rot13Output');
    if (!input) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    let result = '';
    for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        if (code >= 65 && code <= 90) { result += String.fromCharCode(((code - 65 + 13) % 26) + 65); }
        else if (code >= 97 && code <= 122) { result += String.fromCharCode(((code - 97 + 13) % 26) + 97); }
        else { result += input[i]; }
    }
    outputElement.textContent = result;
}
function a1z26Converter(mode) {
    const input = document.getElementById('a1z26Input').value;
    const outputElement = document.getElementById('a1z26Output');
    if (!input) { outputElement.textContent = 'Tidak ada input terdeteksi.'; return; }
    try {
        if (mode === 'toA1Z26') {
            outputElement.textContent = input.toUpperCase().split('').map(char => { const code = char.charCodeAt(0); return (code >= 65 && code <= 90) ? code - 64 : ''; }).filter(Boolean).join('-');
        } else {
            outputElement.textContent = input.split(/[\s-]+/).map(num => { const n = parseInt(num); return (n >= 1 && n <= 26) ? String.fromCharCode(n + 64) : ''; }).join('');
        }
    } catch (e) {
        outputElement.textContent = 'ERROR: Input tidak valid.';
    }
}
function autoTranslate() {
    const input = document.getElementById('autoTranslateInput').value.trim(); const outputElement = document.getElementById('autoTranslateOutput');
    if (!input) { outputElement.innerHTML = '<p class="text-gray-500">Menunggu input untuk dianalisis...</p>'; return; }
    outputElement.innerHTML = '<p class="text-blue-400">Menganalisis...</p>';
    setTimeout(() => {
        let results = [];
        let bestCaesar = { shift: -1, score: Infinity, text: '' };
        for (let i = 1; i < 26; i++) {
            let decrypted = '';
            for (let j = 0; j < input.length; j++) {
                let char = input[j]; if (char.match(/[a-z]/i)) { const code = input.charCodeAt(j); let shiftedCode; if ((code >= 65) && (code <= 90)) { shiftedCode = ((code - 65 - i + 26) % 26) + 65; } else if ((code >= 97) && (code <= 122)) { shiftedCode = ((code - 97 - i + 26) % 26) + 97; } decrypted += String.fromCharCode(shiftedCode); } else { decrypted += char; }
            }
            const score = calculateLanguageScore(decrypted); if (score < bestCaesar.score) { bestCaesar = { shift: i, score: score, text: decrypted }; }
        }
        if(bestCaesar.score < 500) { const name = bestCaesar.shift === 13 ? 'ROT13 / Caesar' : 'Caesar'; results.push({ name: name, confidence: 'Tinggi', details: `Shift=${bestCaesar.shift}`, result: bestCaesar.text }); }
        let resultsHTML = '';
        if (results.length > 0) {
            resultsHTML = results.map(r => `<div class="border-t border-gray-700 pt-3"><p class="font-bold font-sans text-gray-200">${r.name}</p><p class="text-sm text-gray-500 font-sans">Keyakinan: <span class="text-blue-400">${r.confidence}</span> | Detail: ${r.details}</p><p class="mt-1 p-2 bg-green-900/50 rounded text-green-400 break-words">${r.result}</p></div>`).join('');
        } else { resultsHTML = '<p class="text-red-400">Analisis Gagal.</p><p class="text-gray-500 text-sm mt-2">Penyebab: Teks terlalu pendek, menggunakan enkripsi kompleks, atau bukan enkripsi yang didukung.</p>'; }
        outputElement.innerHTML = resultsHTML;
    }, 500);
}

// --- Simulasi Serangan ---
function stopAllSimulations() {
    clearInterval(bruteForceInterval);
    clearInterval(dictInterval);
    clearTimeout(birthdayTimeout);
    const attemptsEl = document.getElementById('attackAttempts');
    if (attemptsEl && !attemptsEl.innerHTML.includes('DIHENTIKAN')) {
        attemptsEl.innerHTML += `<span>\n>_ SIMULASI DIHENTIKAN.</span>`;
    }
}

async function simulateAttack(type) {
    stopAllSimulations();
    const password = document.getElementById('passwordInput').value.trim().toLowerCase();
    const attemptsEl = document.getElementById('attackAttempts');
    const resultEl = document.getElementById('attackResult');
    if (!password && type !== 'birthday') { 
        resultEl.innerHTML = '<p class="text-red-400">ERROR: Target kata sandi dibutuhkan.</p>'; 
        return; 
    }
    if (password.length > 5 && type !== 'birthday') {
        resultEl.innerHTML = '<p class="text-red-400">ERROR: Panjang kata sandi maksimum adalah 5 karakter.</p>';
        return;
    }
    attemptsEl.innerHTML = '';
    resultEl.innerHTML = '<p class="text-blue-400">Memulai simulasi...</p>';

    const bruteForceBtn = document.querySelector("#page-3 button[onclick=\"simulateAttack('brute')\"]");

    if (type === 'brute') {
        if (!pyodideReady) {
            bruteForceBtn.disabled = true;
            bruteForceBtn.textContent = 'Memuat Python...';
            await initPyodide();
            bruteForceBtn.disabled = false;
            bruteForceBtn.textContent = 'Brute-Force';
        }
        if (pyodideReady) {
            simulateBruteForce(password, attemptsEl, resultEl);
        }
    } else if (type === 'dict') { 
        simulateDictionaryAttack(password, attemptsEl, resultEl); 
    } else if (type === 'algebraic') { 
        simulateAlgebraicAttack(attemptsEl, resultEl); 
    } else if (type === 'birthday') { 
        simulateBirthdayAttack(attemptsEl, resultEl); 
    } else if (type === 'rainbow') { 
        simulateRainbowAttack(password, attemptsEl, resultEl); 
    }
}

async function simulateRainbowAttack(password, attemptsEl, resultEl) {
    // Contoh tabel pelangi yang diperluas
    const rainbowTable = {
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8': 'password',
        '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5': '12345',
        '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729dc7a9b099b21': 'test',
        '8d969eef6ecad3c29a3a629280e686016a3e1a6be17f3000676450c265e31742': 'admin',
        '65e84be33532fb784c4812967676691c6b1275d263919c016e788b156b823519': 'qwerty',
        '1ee19d554a3262ce46d926b484501a357f1396a848c081e6d6346766433a0b12': 'halo',
        'e4a2d8e95088f1d392336307843d2230ed8b2e1e0a2944b20531c0e352d19b7d': 'sayang'
    };
    
    attemptsEl.innerHTML = `<span>>_ Memulai serangan Rainbow Table...</span>\n`;
    attemptsEl.innerHTML += `<span>>_ Mencari kecocokan hash dari database kata sandi umum...</span>\n`;
    resultEl.innerHTML = `<p class="text-blue-400">Menganalisis hash target...</p>`;
    
    // Hash kata sandi input
    const targetHash = await getSha256(password);
    
    attemptsEl.innerHTML += `<span>>_ Hash Target: ${targetHash.substring(0,20)}...</span>\n`;
    attemptsEl.innerHTML += `<span>>_ Mencari hash di dalam tabel...</span>`;
    attemptsEl.scrollTop = attemptsEl.scrollHeight;

    // Simulasi pencarian instan
    setTimeout(() => {
        const foundPassword = rainbowTable[targetHash];
        if (foundPassword) {
            resultEl.innerHTML = `<p class="text-red-400 font-bold">TARGET DITEMUKAN!</p><p>Hash ditemukan di tabel, kata sandi adalah: <strong>"${foundPassword}"</strong>.</p><p class="text-sm mt-2"><b>Pelajaran:</b> Kata sandi umum tidak aman bahkan jika di-hash.</p>`;
        } else {
            resultEl.innerHTML = `<p class="text-green-400 font-bold">TARGET AMAN</p><p>Hash kata sandi Anda tidak ditemukan dalam tabel pelangi kami.</p>`;
        }
    }, 1000);
}

async function simulateBirthdayAttack(attemptsEl, resultEl) {
    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const stringLength = 3; // Fixed length for collision search
    let attempts = 0;
    const maxAttempts = 5000;
    const generatedHashMap = new Map();

    attemptsEl.innerHTML = `<span>>_ Memulai Serangan Birthday...</span>\n<span>>_ Tujuan: Menemukan dua input berbeda yang menghasilkan hash yang sama.</span>\n`;
    resultEl.innerHTML = `<p class="text-blue-400">Mencari tabrakan hash (collision)...</p>`;

    function stopAfterTimeout() {
        resultEl.innerHTML = `<p class="text-yellow-400 font-bold">SIMULASI SELESAI</p><p>Tidak ada tabrakan ditemukan dalam ${maxAttempts} percobaan. Coba lagi.</p>`;
        stopAllSimulations();
    }

    // Set a timeout for the entire simulation
    let simulationRunning = true; // Use a flag instead of just checking the timeout ID
    const timeoutId = setTimeout(() => {
        simulationRunning = false;
        stopAfterTimeout();
    }, 10000); // 10 seconds timeout

    function attackStep() {
        if (!simulationRunning) {
            return;
        }

        let randomString = '';
        for (let i = 0; i < stringLength; i++) {
            randomString += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        attempts++;

        getSha256(randomString).then(randomHash => {
            if (generatedHashMap.has(randomHash)) {
                const originalString = generatedHashMap.get(randomHash);
                // Pastikan stringnya berbeda
                if (originalString !== randomString) {
                    resultEl.innerHTML = `<p class="text-orange-400 font-bold">TABRAKAN HASH DITEMUKAN!</p>
                                    <p>Ditemukan setelah <strong>${attempts}</strong> percobaan.</p>
                                    <p class="mt-2 text-sm font-sans">Input 1: <b>"${originalString}"</b></p>
                                    <p class="text-sm font-sans">Input 2: <b>"${randomString}"</b></p>
                                    <p class="mt-1 text-sm font-mono">Keduanya menghasilkan hash yang sama: ${randomHash.substring(0, 20)}...</p>`;
                    simulationRunning = false;
                    clearTimeout(timeoutId); // Clear the timeout since we found a collision
                    stopAllSimulations(); // Stop all intervals/timeouts
                    return;
                }
            }

            generatedHashMap.set(randomHash, randomString);
            attemptsEl.innerHTML += `<span>>_ Mencoba: "${randomString}" -> HASH: ${randomHash.substring(0, 10)}...</span>\n`;
            attemptsEl.scrollTop = attemptsEl.scrollHeight;

            // Lanjutkan jika belum ditemukan
            if (simulationRunning && attempts < maxAttempts) {
                setTimeout(attackStep, 50);
            }
        }).catch(error => {
            console.error("Error during hashing:", error);
            attemptsEl.innerHTML += `<span>>_ ERROR: Gagal membuat hash.</span>\n`;
            simulationRunning = false;
            clearTimeout(timeoutId);
            stopAllSimulations();
        });
    }
    attackStep();
}

function simulateAlgebraicAttack(attemptsEl, resultEl) {
    attemptsEl.innerHTML = `<span>>_ Menganalisis algoritma secara matematis...</span>\n<span>>_ Serangan ini tidak dapat disimulasikan secara visual.</span>`;
    resultEl.innerHTML = `<p class="text-blue-400">Menganalisis struktur kata sandi...</p>`;
    setTimeout(() => {
        resultEl.innerHTML = `<p class="text-green-400 font-bold">INFO</p><p>Serangan aljabar mengeksploitasi kelemahan matematis internal dalam algoritma enkripsi itu sendiri, bukan pada kata sandi pengguna. Ini adalah serangan teoritis yang sangat canggih dan tidak relevan untuk kata sandi sehari-hari.</p>`;
    }, 1000);
}

function simulateDictionaryAttack(password, attemptsEl, resultEl) {
    const dictionary = ['12345', 'qwerty', 'password', 'admin', 'rahasia', 'test', 'saya', 'katasandi', 'komputer', 'google', 'user', '12345678'];
    let attempts = 0; 
    let found = false;
    
    attemptsEl.innerHTML = `<span>>_ Memulai serangan Kamus...</span>\n<span>>_ Database Kamus: ${dictionary.length} kata.</span>\n`;
    
    dictInterval = setInterval(() => {
        if (attempts >= dictionary.length) { 
            clearInterval(dictInterval); 
            if (!found) { 
                resultEl.innerHTML = `<p class="text-green-400 font-bold">TARGET TIDAK DITEMUKAN</p><p>Kata sandi tidak ada di kamus simulasi.</p>`; 
            } 
            return; 
        }
        const currentGuess = dictionary[attempts]; 
        attemptsEl.innerHTML += `<span>>_ Mencoba: "${currentGuess}"...</span>\n`; 
        attemptsEl.scrollTop = attemptsEl.scrollHeight;
        
        if (currentGuess.toLowerCase() === password.toLowerCase()) { 
            found = true; 
            clearInterval(dictInterval); 
            resultEl.innerHTML = `<p class="text-red-400 font-bold">TARGET DITEMUKAN!</p><p>Ditemukan dalam <strong>${attempts + 1}</strong> percobaan.</p>`; 
        }
        attempts++;
    }, 150);
}

async function simulateBruteForce(password, attemptsEl, resultEl) {
    attemptsEl.innerHTML = `<span>>_ Memulai serangan Brute-Force (Python)...</span>\n<span>>_ Menghitung kombinasi, silakan tunggu...</span>\n`;
    
    const python_func = pyodide.globals.get('simulate_brute_force_py');
    const result = python_func(password, 5);
    
    const guesses = result.get('guesses').toJs({dict_converter: Object.fromEntries});
    let attemptCount = 0;

    bruteForceInterval = setInterval(() => {
        if (attemptCount >= guesses.length) {
            clearInterval(bruteForceInterval);
            attemptsEl.innerHTML += `<span>>_ Pencarian selesai. Target tidak ditemukan.</span>`;
            resultEl.innerHTML = `<p class="text-green-400 font-bold">TARGET AMAN</p><p>Kata sandi tidak ditemukan dalam kombinasi yang dicoba.</p>`;
            return;
        }

        const guess = guesses[attemptCount];
        attemptsEl.innerHTML += `<span>>_ Mencoba: "${guess}"...</span>\n`;
        attemptsEl.scrollTop = attemptsEl.scrollHeight;

        if (guess === password) {
            clearInterval(bruteForceInterval);
            attemptsEl.innerHTML += `<span>>_ Ditemukan! Menghasilkan ${attemptCount + 1} percobaan.</span>`;
            resultEl.innerHTML = `<p class="text-red-400 font-bold">TARGET DITEMUKAN!</p><p>Ditemukan dalam <strong>${attemptCount + 1}</strong> percobaan. Kata sandi adalah: <strong>"${password}"</strong>.</p>`;
            return;
        }
        attemptCount++;
    }, 10); // Adjust delay for speed
}

// Initialize Pyodide on page load
window.onload = initPyodide;
