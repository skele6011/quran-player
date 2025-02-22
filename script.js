const audioElement = document.getElementById('quranAudio');
const currentTrackElement = document.getElementById('currentTrack');
const trackSelect = document.getElementById('trackSelect');
const loopStartSelect = document.getElementById('loopStart');
const loopEndSelect = document.getElementById('loopEnd');
const toggleLoopBtn = document.getElementById('toggleLoop');
let currentTrackIndex = 1;
const totalTracks = 15;
let isLooping = false;
let loopStart = 1;
let loopEnd = totalTracks;

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

const targetVolumeSlider = document.getElementById('targetVolume');
const volumeValueDisplay = document.getElementById('volumeValue');
const toggleNormalizerBtn = document.getElementById('toggleNormalizer');
const currentVolumeDisplay = document.getElementById('currentVolume');


const source = audioContext.createMediaElementSource(audioElement);
source.connect(analyser);
analyser.connect(audioContext.destination);


const compressor = audioContext.createDynamicsCompressor();
const gainNode = audioContext.createGain();

let normalizerEnabled = false;


source.disconnect();
source.connect(compressor);
compressor.connect(gainNode);
gainNode.connect(analyser);


compressor.threshold.value = -50;
compressor.knee.value = 40;
compressor.ratio.value = 12;
compressor.attack.value = 0;
compressor.release.value = 0.25;


analyser.fftSize = 256;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

function updateVolumeNormalizer() {
    const targetLevel = parseFloat(targetVolumeSlider.value);
    volumeValueDisplay.textContent = targetLevel.toFixed(1);
    
    if (normalizerEnabled) {
        const currentVolume = getRMSVolume();
        const ratio = targetLevel / (currentVolume || 1);
        gainNode.gain.value = Math.min(Math.max(ratio, 0), 4);
    }
}

function getRMSVolume() {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += (dataArray[i] / 255) ** 2;
    }
    return Math.sqrt(sum / dataArray.length);
}

function updateVolumeMeter() {
    const volume = getRMSVolume() * 100;
    currentVolumeDisplay.style.width = `${Math.min(volume, 100)}%`;
    requestAnimationFrame(updateVolumeMeter);
}

toggleNormalizerBtn.addEventListener('click', () => {
    normalizerEnabled = !normalizerEnabled;
    toggleNormalizerBtn.textContent = `Normalizer: ${normalizerEnabled ? 'ON' : 'OFF'}`;
    gainNode.gain.value = normalizerEnabled ? 1 : 1;
});

targetVolumeSlider.addEventListener('input', updateVolumeNormalizer);

function draw() {
    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    canvasCtx.fillStyle = '#f0f0f0';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    for(let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        canvasCtx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }

    if (normalizerEnabled) {
        updateVolumeNormalizer();
    }
}

for (let i = 1; i <= totalTracks; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Track ${i}`;
    trackSelect.appendChild(option);
}

// Populate loop selectors
[loopStartSelect, loopEndSelect].forEach(select => {
    for (let i = 1; i <= totalTracks; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Track ${i}`;
        select.appendChild(option);
    }
});
loopEndSelect.value = totalTracks;

function loadAndPlayTrack(index) {
    const audioPath = `audio/tiktokQuran${index}.mp3`;
    audioElement.src = audioPath;
    audioElement.play().then(() => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });
    currentTrackElement.textContent = `Track ${index}`;
    trackSelect.value = index;
}


draw();

audioElement.addEventListener('ended', () => {
    if (isLooping) {
        currentTrackIndex = currentTrackIndex >= loopEnd ? loopStart : currentTrackIndex + 1;
    } else {
        currentTrackIndex = currentTrackIndex >= totalTracks ? 1 : currentTrackIndex + 1;
    }
    loadAndPlayTrack(currentTrackIndex);
});

trackSelect.addEventListener('change', (e) => {
    currentTrackIndex = parseInt(e.target.value);
    loadAndPlayTrack(currentTrackIndex);
});

toggleLoopBtn.addEventListener('click', () => {
    isLooping = !isLooping;
    toggleLoopBtn.textContent = `Loop: ${isLooping ? 'ON' : 'OFF'}`;
    toggleLoopBtn.classList.toggle('active');
});

[loopStartSelect, loopEndSelect].forEach(select => {
    select.addEventListener('change', () => {
        loopStart = parseInt(loopStartSelect.value);
        loopEnd = parseInt(loopEndSelect.value);
        
        if (loopStart > loopEnd) {
            [loopStartSelect.value, loopEndSelect.value] = [loopEnd, loopStart];
            [loopStart, loopEnd] = [loopEnd, loopStart];
        }
        
        if (isLooping && (currentTrackIndex < loopStart || currentTrackIndex > loopEnd)) {
            currentTrackIndex = loopStart;
            loadAndPlayTrack(currentTrackIndex);
        }
    });
});

loadAndPlayTrack(currentTrackIndex);


updateVolumeMeter();
