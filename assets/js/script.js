document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const openModalBtn = document.getElementById('open-modal-btn');
    const modal = document.getElementById('device-validator-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    
    const cameraSelect = document.getElementById('camera-select');
    const micSelect = document.getElementById('mic-select');
    const videoPreview = document.getElementById('video-preview');
    const audioVerifiedBadge = document.getElementById('audio-verified-badge');
    const audioVisualizer = document.querySelector('.audio-visualizer');

    // --- Variables de estado ---
    let currentStream;
    let audioContext;
    let analyser;
    let visualizerAnimationId;

    // --- Lógica del Visualizador de Audio ---
    const DOT_COUNT = 20;
    for (let i = 0; i < DOT_COUNT; i++) {
        const dot = document.createElement('div');
        dot.classList.add('visualizer-dot');
        audioVisualizer.appendChild(dot);
    }
    const visualizerDots = audioVisualizer.querySelectorAll('.visualizer-dot');

    // --- Funciones Principales ---

    /**
     * Detiene todos los tracks de un stream (cámara y micrófono)
     * @param {MediaStream} stream - El stream a detener.
     */
    function stopStream(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (visualizerAnimationId) {
            cancelAnimationFrame(visualizerAnimationId);
            visualizerAnimationId = null;
        }
        if (audioContext) {
            audioContext.close().catch(e => console.error("Error al cerrar AudioContext:", e));
            audioContext = null;
        }
    }

    /**
     * Obtiene y lista los dispositivos de video y audio en los <select>
     */
    async function getDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const audioDevices = devices.filter(device => device.kind === 'audioinput');

            cameraSelect.innerHTML = videoDevices.map(device => 
                `<option value="${device.deviceId}">${device.label || `Cámara ${cameraSelect.length + 1}`}</option>`
            ).join('');

            micSelect.innerHTML = audioDevices.map(device => 
                `<option value="${device.deviceId}">${device.label || `Micrófono ${micSelect.length + 1}`}</option>`
            ).join('');
        } catch (error) {
            console.error('Error al enumerar dispositivos:', error);
            alert('No se pudo acceder a los dispositivos. Asegúrate de haber otorgado los permisos necesarios.');
        }
    }

    /**
     * Dibuja el visualizador de audio basándose en el nivel del micrófono
     */
    function drawVisualizer() {
        if (!analyser) return;

        visualizerAnimationId = requestAnimationFrame(drawVisualizer);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (const amplitude of dataArray) {
            sum += Math.pow((amplitude / 128.0) - 1, 2);
        }
        const volume = Math.sqrt(sum / dataArray.length);
        
        visualizerDots.forEach((dot, index) => {
            const activationLevel = (index + 1) / DOT_COUNT;
            if (volume > activationLevel * 0.1) { // 0.1 es un factor de sensibilidad
                dot.style.backgroundColor = '#007bff';
                dot.style.transform = `scale(${1 + volume * 2})`;
            } else {
                dot.style.backgroundColor = '#d1d5db';
                dot.style.transform = 'scale(1)';
            }
        });
    }

    /**
     * Inicia el stream de video y audio con los dispositivos seleccionados
     */
    async function startStream() {
        stopStream(currentStream); // Detener stream anterior

        const videoDeviceId = cameraSelect.value;
        const audioDeviceId = micSelect.value;

        if (!videoDeviceId || !audioDeviceId) {
            console.warn("No hay dispositivos seleccionados.");
            return;
        }

        const constraints = {
            video: { deviceId: { exact: videoDeviceId } },
            audio: { deviceId: { exact: audioDeviceId } }
        };

        try {
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoPreview.srcObject = currentStream;
            
            // Configurar visualizador de audio
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(currentStream);
            source.connect(analyser);
            
            // NO conectamos el analyser al destination para evitar feedback (escucharte a ti mismo)
            // Si quisieras escuchar el micrófono (¡CUIDADO CON EL FEEDBACK!):
            // analyser.connect(audioContext.destination);

            audioVerifiedBadge.classList.remove('hidden'); // Mostrar "Audio Verificado"
            drawVisualizer(); // Iniciar visualización

        } catch (error) {
            console.error('Error al acceder a los medios:', error);
            alert(`Error al acceder a tus dispositivos: ${error.name}. Revisa los permisos.`);
            audioVerifiedBadge.classList.add('hidden');
        }
    }
    
    // --- Funciones para manejar el Modal ---

    function openModal() {
        modal.classList.remove('hidden');
        // Pedimos los dispositivos y arrancamos el stream al abrir
        getDevices().then(startStream);
    }

    function closeModal() {
        stopStream(currentStream);
        modal.classList.add('hidden');
        audioVerifiedBadge.classList.add('hidden');
    }

    // --- Event Listeners ---
    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
        // Aquí puedes guardar los deviceId seleccionados si lo necesitas
        console.log('Dispositivos confirmados:');
        console.log('Cámara:', cameraSelect.value, cameraSelect.options[cameraSelect.selectedIndex].text);
        console.log('Micrófono:', micSelect.value, micSelect.options[micSelect.selectedIndex].text);
        closeModal();
        alert("¡Dispositivos configurados correctamente! \n Cuanto tardamos Pablo en implementarlo en nuestra plataforma?? 😁");
        prompt( "no era chiste, tirame un esfuerzo jeje");
    });
    
    // Cambiar de dispositivo al seleccionar otro en el dropdown
    cameraSelect.addEventListener('change', startStream);
    micSelect.addEventListener('change', startStream);
});