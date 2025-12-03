// -----------------------------------------------------------------
// --- main.js (ACTUALIZAR)
// -----------------------------------------------------------------
import { Game } from './Game.js';

// Hacer la instancia del juego global para acceder desde los controles de audio
window.game = null;

// Detectar dispositivo antes de iniciar
function detectVRDevice() {
    console.log("🔍 Detectando capacidades VR...");
    
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-vr')
            .then(supported => {
                if (supported) {
                    console.log("✅ WebXR VR soportado");
                    
                    // Verificar si es Meta Quest
                    const userAgent = navigator.userAgent.toLowerCase();
                    if (userAgent.includes('quest') || userAgent.includes('oculus')) {
                        console.log("🎮 Meta Quest detectado - Configurando controles específicos");
                        document.getElementById('vr-instructions').innerHTML = 
                            "🎮 META QUEST 3: Trigger para saltar/rodar • Grip para pausa • A/B para menú";
                    }
                } else {
                    console.log("⚠️ WebXR VR no soportado - Usando modo normal");
                }
            })
            .catch(err => {
                console.log("⚠️ Error detectando VR:", err);
            });
    } else {
        console.log("❌ WebXR no disponible");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Detectar dispositivo primero
    detectVRDevice();
    
    // Inicializar juego
    window.game = new Game();
    
    // Resto del código existente...
    const startButton = document.getElementById('start-game-button');
    const restartButton = document.getElementById('restart-button');

    if (!startButton || !restartButton) {
        console.error("No se pudieron encontrar los botones de inicio o reinicio.");
        return;
    }

    startButton.addEventListener('click', () => {
        console.log("Botón de inicio presionado.");
        window.game.startGame();
    });

    restartButton.addEventListener('click', () => {
        console.log("Botón de reinicio presionado.");
        window.game.restartGame();
    });
    
    window.game.init().catch(err => {
        console.error("Error al inicializar el juego:", err);
        const loadingScreen = document.getElementById('loading-screen');
        const errorScreen = document.getElementById('error-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (errorScreen) errorScreen.style.display = 'flex';
    });
});