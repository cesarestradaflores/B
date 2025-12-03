// -----------------------------------------------------------------
// --- Game.js (VR PRIMERA PERSONA - CON SISTEMA DE MENÚS VR)
// -----------------------------------------------------------------

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

import { Config } from './Config.js';
import { Player } from './Player.js';
import { GameWorld } from './GameWorld.js';
import { ObstacleManager } from './ObstacleManager.js';
import { VRControls } from './VRControls.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            Config.CAMERA_FOV,
            Config.CAMERA_ASPECT,
            Config.CAMERA_NEAR,
            Config.CAMERA_FAR
        );
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        // Sistema CSS3D para menús VR
        this.cssRenderer = null;
        this.cssScene = null;
        
        this.player = null;
        this.world = null;
        this.obstacleManager = null;
        this.assets = {};

        this.isVRMode = false;
        this.vrControls = null;
        this.cameraContainer = new THREE.Group();

        // Sistema de menús VR
        this.vrMenuSystem = {
            isActive: false,
            type: null, // 'gameover' o 'pause'
            menuElement: null,
            menuContainer: null,
            menuDistance: 2.0,
            controllers: []
        };

        this.audioListener = null;
        this.backgroundMusic = null;
        this.coinSound = null;
        this.powerUpSound = null;
        this.isMusicPlaying = false;

        this.isGameStarted = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.gameSpeed = Config.GAME_START_SPEED;
        this.score = 0;
        this.distance = 0;
        this.difficultyLevel = 1;

        this.activePowerUps = {
            magnet: { active: false, timer: 0 },
            double: { active: false, timer: 0 }
        };

        this.ui = {
            score: document.getElementById('score'),
            distance: document.getElementById('distance'),
            gameOver: document.getElementById('game-over'),
            loadingScreen: document.getElementById('loading-screen'),
            loadingBar: document.getElementById('loading-bar'),
            loadingText: document.getElementById('loading-text'),
            errorScreen: document.getElementById('error-screen'),
            uiContainer: document.getElementById('ui-container'),
            modalOverlay: document.getElementById('modal-overlay'),
            rulesModal: document.getElementById('rules-modal'),
            pauseButton: document.getElementById('pause-button'),
            pauseMenu: document.getElementById('pause-menu')
        };

        this.powerUpIndicators = {
            magnet: document.createElement('div'),
            double: document.createElement('div')
        };

        this.setupPowerUpUI();
        
        this.frameCount = 0;
        this.collisionDebugEnabled = false;
        this.debugStatsTimer = 0;
        
        // Para controles VR
        this.lastButtonState = { A: false, B: false, X: false, Y: false };
        this.buttonCheckInterval = null;
    }

    async init() {
        console.log("Iniciando el juego con VR primera persona y menús VR...");

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.setupWebXR();

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        document.body.appendChild(this.renderer.domElement);

        this.setupCameraContainer();

        this.setupAudio();

        this.scene.fog = new THREE.Fog(Config.FOG_COLOR, Config.FOG_NEAR, Config.FOG_FAR);
        
        this.cameraContainer.position.set(0, Config.VR_SETTINGS.PLAYER_HEIGHT, 0);
        this.camera.position.set(0, 0, 0);

        try {
            this.assets = await this.preloadAssets();
            this.ui.loadingScreen.style.display = 'none';
            console.log("✅ Assets cargados, mostrando modal de reglas.");
            
        } catch (error) {
            console.error("❌ Error al cargar assets:", error);
            this.ui.loadingScreen.style.display = 'none';
            this.ui.errorScreen.style.display = 'flex';
            return Promise.reject(error);
        }
        
        this.world = new GameWorld(this.scene, this.assets);
        this.player = new Player(this.scene, this.assets);
        this.obstacleManager = new ObstacleManager(this.scene, this.assets);

        this.setupVRControls();
        this.setupVRMenuSystem(); // NUEVO: Sistema de menús VR

        this.setupLights();
        this.loadEnvironment('Recursos/sunset_jhbcentral_4k.hdr'); 

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        document.addEventListener('keydown', this.player.onKeyDown.bind(this.player), false);

        console.log("✅ Iniciación completa. VR primera persona con menús configurada.");
        
        return Promise.resolve();
    }

    setupVRMenuSystem() {
        console.log("🔄 Configurando sistema de menús VR...");
        
        // 1. Crear renderizador CSS3D
        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0';
        this.cssRenderer.domElement.style.pointerEvents = 'none';
        this.cssRenderer.domElement.style.zIndex = '999';
        document.body.appendChild(this.cssRenderer.domElement);
        
        this.cssScene = new THREE.Scene();
        
        // 2. Crear contenedor del menú VR
        this.createVRMenuContainer();
        
        // 3. Configurar controles VR para menús
        this.setupVRMenuControls();
        
        console.log("✅ Sistema de menús VR configurado");
    }

    createVRMenuContainer() {
        // Crear elemento HTML para el menú
        this.vrMenuSystem.menuContainer = document.createElement('div');
        this.vrMenuSystem.menuContainer.id = 'vr-menu-container';
        this.vrMenuSystem.menuContainer.style.cssText = `
            position: absolute;
            width: 500px;
            min-height: 400px;
            background: rgba(20, 20, 30, 0.98);
            border: 4px solid #00FF41;
            border-radius: 20px;
            padding: 40px;
            color: white;
            font-family: 'Arial', sans-serif;
            text-align: center;
            box-shadow: 0 0 80px rgba(0, 255, 65, 0.7);
            backdrop-filter: blur(15px);
            display: none;
            pointer-events: auto;
            z-index: 1000;
            transform-style: preserve-3d;
            box-sizing: border-box;
        `;
        
        // Contenido inicial
        this.vrMenuSystem.menuContainer.innerHTML = `
            <div id="vr-menu-title" style="font-size: 3rem; color: #00FF41; margin-bottom: 30px; 
                 text-shadow: 0 0 15px #00FF41; font-weight: bold;"></div>
            
            <div id="vr-menu-content" style="margin: 40px 0; font-size: 1.3rem; line-height: 1.6;"></div>
            
            <div id="vr-menu-buttons" style="display: flex; flex-direction: column; gap: 20px; margin-top: 30px;"></div>
            
            <div id="vr-menu-instructions" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid rgba(255,255,255,0.2); 
                 font-size: 1rem; color: #888; font-style: italic;">
                Usa el rayo del controlador para seleccionar opciones
            </div>
        `;
        
        document.body.appendChild(this.vrMenuSystem.menuContainer);
        
        // Crear objeto CSS3D
        this.vrMenuSystem.menuElement = new THREE.CSS3DObject(this.vrMenuSystem.menuContainer);
        this.vrMenuSystem.menuElement.scale.set(0.002, 0.002, 0.002);
        this.cssScene.add(this.vrMenuSystem.menuElement);
        
        console.log("✅ Contenedor de menú VR creado");
    }

    setupVRMenuControls() {
        if (!this.renderer.xr.enabled) return;
        
        // Configurar controladores para menús
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            // Agregar rayo visual
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -3)
            ]);
            
            const material = new THREE.LineBasicMaterial({ 
                color: i === 0 ? 0xff4444 : 0x4488ff,
                opacity: 0.6,
                transparent: true,
                linewidth: 2
            });
            
            const line = new THREE.Line(geometry, material);
            controller.add(line);
            
            // Eventos
            controller.addEventListener('selectstart', (event) => this.onVRMenuSelect(event, i));
            controller.addEventListener('squeezestart', (event) => this.onVRSqueeze(event, i));
            
            this.vrMenuSystem.controllers.push(controller);
            this.scene.add(controller);
        }
        
        // Iniciar polling de botones
        this.startVRButtonPolling();
        
        console.log("✅ Controles VR para menús configurados");
    }

    startVRButtonPolling() {
        // Polling para detectar botones del gamepad
        const checkVRButtons = () => {
            if (!this.renderer.xr.isPresenting || !this.isVRMode) {
                requestAnimationFrame(checkVRButtons);
                return;
            }
            
            const session = this.renderer.xr.getSession();
            if (session && session.inputSources) {
                session.inputSources.forEach((inputSource, index) => {
                    if (inputSource.gamepad) {
                        const gamepad = inputSource.gamepad;
                        
                        // Botón A/X (dependiendo del controlador)
                        const buttonA = gamepad.buttons[0] || gamepad.buttons[4];
                        const buttonB = gamepad.buttons[1] || gamepad.buttons[5];
                        
                        // Botón A/X para pausa
                        if (buttonA && buttonA.pressed && !this.lastButtonState.A) {
                            console.log("🎮 Botón A/X presionado en VR");
                            if (this.isGameStarted && !this.isGameOver) {
                                this.toggleVRPauseMenu();
                            }
                            this.lastButtonState.A = true;
                        } else if (!buttonA.pressed) {
                            this.lastButtonState.A = false;
                        }
                        
                        // Botón B/Y para salir del menú
                        if (buttonB && buttonB.pressed && !this.lastButtonState.B && this.vrMenuSystem.isActive) {
                            console.log("🎮 Botón B/Y presionado en VR");
                            this.hideVRMenu();
                            this.lastButtonState.B = true;
                        } else if (!buttonB.pressed) {
                            this.lastButtonState.B = false;
                        }
                    }
                });
            }
            
            requestAnimationFrame(checkVRButtons);
        };
        
        checkVRButtons();
    }

    onVRMenuSelect(event, controllerIndex) {
        if (!this.vrMenuSystem.isActive) return;
        
        console.log("🎯 Selección en menú VR detectada");
        
        // Aquí implementaríamos detección de clic en botones específicos
        // Por ahora manejamos con event listeners en los botones HTML
    }

    onVRSqueeze(event, controllerIndex) {
        // Botón de grip para pausa alternativa
        if (this.isGameStarted && !this.isGameOver && !this.vrMenuSystem.isActive) {
            console.log("🎮 Botón grip presionado - Mostrando menú de pausa");
            this.showVRPauseMenu();
        }
    }

    showVRGameOverMenu() {
        console.log("💀 Mostrando menú Game Over en VR");
        
        this.vrMenuSystem.isActive = true;
        this.vrMenuSystem.type = 'gameover';
        
        // Configurar contenido
        document.getElementById('vr-menu-title').textContent = '¡GAME OVER!';
        document.getElementById('vr-menu-title').style.color = '#FF4444';
        document.getElementById('vr-menu-title').style.textShadow = '0 0 20px rgba(255, 68, 68, 0.8)';
        
        const content = `
            <div style="margin-bottom: 30px; font-size: 1.4rem;">
                Has sido atrapado por los zombies
            </div>
            <div style="background: rgba(255, 68, 68, 0.15); padding: 25px; border-radius: 12px; 
                 border-left: 5px solid #FF4444; border-right: 5px solid #FF4444;">
                <div style="display: flex; justify-content: space-between; margin: 12px 0; font-size: 1.2rem;">
                    <span>Puntuación Final:</span>
                    <span style="color: #FF4444; font-weight: bold; font-size: 1.3rem;">${this.score}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 12px 0; font-size: 1.2rem;">
                    <span>Distancia Recorrida:</span>
                    <span style="color: #FF4444; font-weight: bold; font-size: 1.3rem;">${Math.floor(this.distance)}m</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 12px 0; font-size: 1.2rem;">
                    <span>Monedas Recolectadas:</span>
                    <span style="color: #FF4444; font-weight: bold; font-size: 1.3rem;">${Math.floor(this.score / 10)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 12px 0; font-size: 1.2rem;">
                    <span>Tiempo de Supervivencia:</span>
                    <span style="color: #FF4444; font-weight: bold; font-size: 1.3rem;">${Math.floor(this.distance / this.gameSpeed)}s</span>
                </div>
            </div>
        `;
        
        document.getElementById('vr-menu-content').innerHTML = content;
        
        // Crear botones
        const buttonsHTML = `
            <button id="vr-restart-btn" class="vr-menu-btn" 
                    style="background: linear-gradient(135deg, #FF4444 0%, #CC0000 100%); padding: 18px;">
                🔄 REINICIAR NIVEL
            </button>
            <button id="vr-mainmenu-btn" class="vr-menu-btn" 
                    style="background: linear-gradient(135deg, #666666 0%, #333333 100%); padding: 18px;">
                🏠 MENÚ PRINCIPAL
            </button>
        `;
        
        document.getElementById('vr-menu-buttons').innerHTML = buttonsHTML;
        
        // Mostrar menú
        this.vrMenuSystem.menuContainer.style.display = 'block';
        this.positionVRMenu();
        
        // Agregar event listeners
        setTimeout(() => {
            document.getElementById('vr-restart-btn').addEventListener('click', () => this.onVRRestartClick());
            document.getElementById('vr-mainmenu-btn').addEventListener('click', () => this.onVRMainMenuClick());
        }, 50);
        
        // Pausar el juego completamente
        this.pauseGameForVRMenu();
        
        console.log("✅ Menú Game Over VR mostrado");
    }

    showVRPauseMenu() {
        console.log("⏸️ Mostrando menú de pausa en VR");
        
        this.vrMenuSystem.isActive = true;
        this.vrMenuSystem.type = 'pause';
        
        // Configurar contenido
        document.getElementById('vr-menu-title').textContent = 'JUEGO EN PAUSA';
        document.getElementById('vr-menu-title').style.color = '#00FF41';
        document.getElementById('vr-menu-title').style.textShadow = '0 0 15px rgba(0, 255, 65, 0.8)';
        
        const content = `
            <div style="margin-bottom: 30px; font-size: 1.4rem;">
                El juego está pausado
            </div>
            <div style="background: rgba(0, 255, 65, 0.15); padding: 25px; border-radius: 12px; 
                 border-left: 5px solid #00FF41; border-right: 5px solid #00FF41;">
                <div style="font-size: 1.2rem; margin-bottom: 15px;">
                    <strong>Estado Actual:</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                    <span>Puntuación:</span>
                    <span style="color: #00FF41; font-weight: bold;">${this.score}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                    <span>Distancia:</span>
                    <span style="color: #00FF41; font-weight: bold;">${Math.floor(this.distance)}m</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                    <span>Velocidad:</span>
                    <span style="color: #00FF41; font-weight: bold;">${this.gameSpeed.toFixed(1)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('vr-menu-content').innerHTML = content;
        
        // Crear botones
        const buttonsHTML = `
            <button id="vr-resume-btn" class="vr-menu-btn" 
                    style="background: linear-gradient(135deg, #00FF41 0%, #008800 100%); padding: 18px;">
                ▶️ REANUDAR JUEGO
            </button>
            <button id="vr-restart-pause-btn" class="vr-menu-btn" 
                    style="background: linear-gradient(135deg, #FFA500 0%, #CC8400 100%); padding: 18px;">
                🔄 REINICIAR NIVEL
            </button>
            <button id="vr-mainmenu-pause-btn" class="vr-menu-btn" 
                    style="background: linear-gradient(135deg, #666666 0%, #333333 100%); padding: 18px;">
                🏠 MENÚ PRINCIPAL
            </button>
        `;
        
        document.getElementById('vr-menu-buttons').innerHTML = buttonsHTML;
        
        // Mostrar menú
        this.vrMenuSystem.menuContainer.style.display = 'block';
        this.positionVRMenu();
        
        // Agregar event listeners
        setTimeout(() => {
            document.getElementById('vr-resume-btn').addEventListener('click', () => this.onVRResumeClick());
            document.getElementById('vr-restart-pause-btn').addEventListener('click', () => this.onVRRestartClick());
            document.getElementById('vr-mainmenu-pause-btn').addEventListener('click', () => this.onVRMainMenuClick());
        }, 50);
        
        // Pausar el juego completamente
        this.pauseGameForVRMenu();
        
        console.log("✅ Menú Pausa VR mostrado");
    }

    positionVRMenu() {
        if (!this.camera || !this.vrMenuSystem.menuElement) return;
        
        // Obtener posición y dirección de la cámara
        const cameraWorldPosition = new THREE.Vector3();
        const cameraWorldDirection = new THREE.Vector3();
        
        this.camera.getWorldPosition(cameraWorldPosition);
        this.camera.getWorldDirection(cameraWorldDirection);
        
        // Posicionar menú frente a la cámara
        const menuPosition = cameraWorldPosition.clone()
            .add(cameraWorldDirection.multiplyScalar(this.vrMenuSystem.menuDistance));
        
        this.vrMenuSystem.menuElement.position.copy(menuPosition);
        
        // Hacer que el menú mire hacia la cámara
        this.vrMenuSystem.menuElement.lookAt(cameraWorldPosition);
        
        // Rotar para que el texto sea legible
        this.vrMenuSystem.menuElement.rotateY(Math.PI);
        
        // Ajustar altura ligeramente
        this.vrMenuSystem.menuElement.position.y += 0.3;
    }

    pauseGameForVRMenu() {
        console.log("⏸️ Pausando juego para menú VR");
        
        this.isPaused = true;
        this.clock.stop();
        
        // Pausar música
        if (this.backgroundMusic && this.isMusicPlaying) {
            this.backgroundMusic.pause();
        }
        
        // Pausar animaciones Three.js (equivalente a Time.timeScale = 0)
        this.scene.traverse((object) => {
            if (object.mixer) {
                object.mixer.timeScale = 0;
            }
        });
        
        // Pausar actualizaciones del mundo
        if (this.world) {
            this.world.update = function() {}; // Sobrescribir temporalmente
        }
        
        console.log("✅ Juego pausado completamente");
    }

    resumeGameFromVRMenu() {
        console.log("▶️ Reanudando juego desde menú VR");
        
        this.isPaused = false;
        this.clock.start();
        
        // Reanudar música
        if (this.backgroundMusic && !this.isMusicPlaying) {
            this.backgroundMusic.play();
            this.isMusicPlaying = true;
        }
        
        // Reanudar animaciones Three.js
        this.scene.traverse((object) => {
            if (object.mixer) {
                object.mixer.timeScale = 1;
            }
        });
        
        // Restaurar actualizaciones del mundo
        if (this.world) {
            this.world.update = GameWorld.prototype.update;
        }
        
        console.log("✅ Juego reanudado");
    }

    onVRRestartClick() {
        console.log("🔄 Reiniciando desde menú VR");
        this.hideVRMenu();
        this.resumeGameFromVRMenu();
        
        if (this.restartGame) {
            this.restartGame();
        }
    }

    onVRResumeClick() {
        console.log("▶️ Reanudando desde menú VR");
        this.hideVRMenu();
        this.resumeGameFromVRMenu();
    }

    onVRMainMenuClick() {
        console.log("🏠 Volviendo al menú principal desde VR");
        this.hideVRMenu();
        this.resumeGameFromVRMenu();
        
        if (this.resetToMainMenu) {
            this.resetToMainMenu();
        }
    }

    hideVRMenu() {
        console.log("👻 Ocultando menú VR");
        
        this.vrMenuSystem.isActive = false;
        this.vrMenuSystem.type = null;
        
        if (this.vrMenuSystem.menuContainer) {
            this.vrMenuSystem.menuContainer.style.display = 'none';
        }
        
        // Limpiar event listeners
        const buttons = ['vr-restart-btn', 'vr-mainmenu-btn', 'vr-resume-btn', 
                        'vr-restart-pause-btn', 'vr-mainmenu-pause-btn'];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            }
        });
    }

    toggleVRPauseMenu() {
        if (this.vrMenuSystem.isActive && this.vrMenuSystem.type === 'pause') {
            this.hideVRMenu();
            this.resumeGameFromVRMenu();
        } else if (!this.vrMenuSystem.isActive) {
            this.showVRPauseMenu();
        }
    }

    // ========== MÉTODOS EXISTENTES (modificados) ==========

    setupCameraContainer() {
        this.scene.add(this.cameraContainer);
        this.cameraContainer.add(this.camera);
        console.log("✅ Contenedor de cámara VR configurado");
    }

    setupWebXR() {
        this.renderer.xr.enabled = true;
        
        const vrButton = VRButton.createButton(this.renderer);
        vrButton.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: rgba(0, 255, 65, 0.3);
            border: 2px solid #00FF41;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            z-index: 100;
        `;
        document.body.appendChild(vrButton);
        
        this.renderer.xr.addEventListener('sessionstart', () => {
            console.log('🚀 Sesión VR iniciada - Primera persona activada');
            this.onVRStart();
        });
        
        this.renderer.xr.addEventListener('sessionend', () => {
            console.log('📴 Sesión VR finalizada');
            this.onVREnd();
        });
        
        console.log("✅ WebXR configurado - Primera persona inmersiva");
    }

    onVRStart() {
        this.isVRMode = true;
        this.player.enableVRMode();
        
        if (this.player.group) {
            this.player.group.visible = false;
        }
        
        this.cameraContainer.position.set(
            this.player.group.position.x,
            Config.VR_SETTINGS.PLAYER_HEIGHT,
            this.player.group.position.z
        );
        
        window.dispatchEvent(new CustomEvent('game-vr-start'));
        
        console.log("🎮 Modo VR primera persona activado - Eres el personaje");
    }

    onVREnd() {
        this.isVRMode = false;
        this.player.disableVRMode();
        
        if (this.player.group) {
            this.player.group.visible = true;
        }
        
        // Si hay menú VR activo, ocultarlo
        if (this.vrMenuSystem.isActive) {
            this.hideVRMenu();
            this.resumeGameFromVRMenu();
        }
        
        this.cameraContainer.position.set(0, Config.CAMERA_START_Y, Config.CAMERA_START_Z);
        this.cameraContainer.lookAt(0, 0, 0);
        
        window.dispatchEvent(new CustomEvent('game-vr-end'));
        
        console.log("🖥️ Modo VR desactivado - Volviendo a tercera persona");
    }

    setupVRControls() {
        if (this.renderer.xr.enabled && this.player) {
            this.vrControls = new VRControls(this.camera, this.renderer, this.player, this.scene, this.cameraContainer);
            console.log("✅ Controles VR primera persona configurados");
        }
    }

    setupAudio() {
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        
        this.backgroundMusic = new THREE.Audio(this.audioListener);
        
        const audioLoader = new THREE.AudioLoader();
        
        audioLoader.load('Recursos/Subway Surfers.mp3', (buffer) => {
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(0.3);
            console.log("✅ Música cargada correctamente");
        }, undefined, (error) => {
            console.error("❌ Error al cargar la música:", error);
        });

        this.coinSound = new THREE.Audio(this.audioListener);
        audioLoader.load('Recursos/SonidoMoneda.mp3', (buffer) => {
            this.coinSound.setBuffer(buffer);
            this.coinSound.setVolume(0.5);
            console.log("✅ Sonido de monedas cargado correctamente");
        }, undefined, (error) => {
            console.error("❌ Error al cargar el sonido de monedas:", error);
        });

        this.powerUpSound = new THREE.Audio(this.audioListener);
        audioLoader.load('Recursos/SonidoMoneda.mp3', (buffer) => {
            this.powerUpSound.setBuffer(buffer);
            this.powerUpSound.setVolume(0.8);
            console.log("✅ Sonido de power-ups cargado correctamente");
        }, undefined, (error) => {
            console.error("❌ Error al cargar el sonido de power-ups:", error);
        });
    }

    setupPowerUpUI() {
        const powerUpContainer = document.createElement('div');
        powerUpContainer.id = 'powerup-container';
        powerUpContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        this.powerUpIndicators.magnet.id = 'magnet-indicator';
        this.powerUpIndicators.magnet.style.cssText = `
            background: rgba(255, 0, 0, 0.3);
            border: 2px solid #FF0000;
            border-radius: 10px;
            padding: 10px;
            color: white;
            font-weight: bold;
            min-width: 140px;
            text-align: center;
            display: none;
            transition: all 0.3s ease;
            font-size: 14px;
        `;
        this.powerUpIndicators.magnet.innerHTML = '🎯 IMÁN: <span class="timer">0.0s</span>';

        this.powerUpIndicators.double.id = 'double-indicator';
        this.powerUpIndicators.double.style.cssText = `
            background: rgba(255, 255, 0, 0.3);
            border: 2px solid #FFFF00;
            border-radius: 10px;
            padding: 10px;
            color: white;
            font-weight: bold;
            min-width: 140px;
            text-align: center;
            display: none;
            transition: all 0.3s ease;
            font-size: 14px;
        `;
        this.powerUpIndicators.double.innerHTML = '🔧 DOBLE: <span class="timer">0.0s</span>';

        powerUpContainer.appendChild(this.powerUpIndicators.magnet);
        powerUpContainer.appendChild(this.powerUpIndicators.double);
        document.body.appendChild(powerUpContainer);
    }

    activatePowerUp(type) {
        console.log(`🎯 ACTIVANDO POWER-UP: ${type}`);
        
        const duration = Config.POWERUP_DURATION[type];
        
        this.activePowerUps[type].active = true;
        this.activePowerUps[type].timer = duration;
        
        this.powerUpIndicators[type].style.display = 'block';
        this.powerUpIndicators[type].style.background = type === 'magnet' 
            ? 'rgba(255, 0, 0, 0.7)' 
            : 'rgba(255, 255, 0, 0.7)';
        
        this.playPowerUpSound();
        this.showPowerUpNotification(type);
        
        console.log(`✅ Power-up ACTIVADO: ${type} por ${duration}s`);
    }

    updatePowerUps(deltaTime) {
        for (const [type, powerUp] of Object.entries(this.activePowerUps)) {
            if (powerUp.active) {
                powerUp.timer -= deltaTime;
                
                const indicator = this.powerUpIndicators[type];
                const timerElement = indicator.querySelector('.timer');
                if (timerElement) {
                    timerElement.textContent = `${Math.max(0, powerUp.timer).toFixed(1)}s`;
                }
                
                if (powerUp.timer < 3.0) {
                    const blink = (Math.sin(Date.now() * 0.02) + 1) * 0.3 + 0.4;
                    indicator.style.opacity = blink;
                }
                
                if (powerUp.timer <= 0) {
                    console.log(`⏰ Power-up ${type} terminó - Desactivando`);
                    this.deactivatePowerUp(type);
                }
            }
        }
    }

    deactivatePowerUp(type) {
        console.log(`🔚 DESACTIVANDO POWER-UP: ${type}`);
        
        this.activePowerUps[type].active = false;
        this.activePowerUps[type].timer = 0;
        
        this.powerUpIndicators[type].style.display = 'none';
        this.powerUpIndicators[type].style.opacity = '1';
        
        console.log(`❌ Power-up DESACTIVADO: ${type}`);
    }

    showPowerUpNotification(type) {
        const notification = document.createElement('div');
        const powerUpInfo = {
            magnet: { text: '🎯 IMÁN ACTIVADO!', color: '#FF0000', subtext: 'Atrae monedas automáticamente' },
            double: { text: '🔧 DOBLE PUNTUACIÓN!', color: '#FFFF00', subtext: 'Monedas valen 20 puntos' }
        };
        
        const info = powerUpInfo[type];
        
        notification.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${info.color}DD;
            color: white;
            padding: 25px 50px;
            border-radius: 15px;
            font-size: 28px;
            font-weight: bold;
            z-index: 1000;
            animation: powerUpNotification 3s ease-in-out;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            text-align: center;
            border: 3px solid white;
            box-shadow: 0 0 30px ${info.color};
        `;
        
        notification.innerHTML = `
            <div style="margin-bottom: 10px;">${info.text}</div>
            <div style="font-size: 18px; opacity: 0.9;">${info.subtext}</div>
            <div style="font-size: 16px; opacity: 0.7; margin-top: 5px;">15 segundos</div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes powerUpNotification {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
                15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                25% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                75% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                85% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        }, 3000);
    }

    playPowerUpSound() {
        if (this.powerUpSound) {
            this.powerUpSound.stop();
            this.powerUpSound.play();
        }
    }

    playBackgroundMusic() {
        if (this.backgroundMusic && !this.isMusicPlaying) {
            this.backgroundMusic.play();
            this.isMusicPlaying = true;
            console.log("🎵 Música de fondo iniciada");
        }
    }

    playCoinSound() {
        if (this.coinSound) {
            this.coinSound.stop();
            this.coinSound.play();
        }
    }

    pauseBackgroundMusic() {
        if (this.backgroundMusic && this.isMusicPlaying) {
            this.backgroundMusic.pause();
            this.isMusicPlaying = false;
            console.log("⏸️ Música de fondo pausada");
        }
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.isMusicPlaying = false;
            console.log("⏹️ Música de fondo detenida");
        }
    }

    resetToMainMenu() {
        console.log("🔄 Reiniciando a menú principal...");
        
        this.stopBackgroundMusic();
        
        // Ocultar menú VR si está activo
        if (this.vrMenuSystem.isActive) {
            this.hideVRMenu();
        }
        
        this.isGameStarted = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = Config.GAME_START_SPEED;
        this.difficultyLevel = 1;
        
        for (const type in this.activePowerUps) {
            this.activePowerUps[type].active = false;
            this.activePowerUps[type].timer = 0;
            if (this.powerUpIndicators[type]) {
                this.powerUpIndicators[type].style.display = 'none';
                this.powerUpIndicators[type].style.opacity = '1';
            }
        }
        
        if (this.obstacleManager) {
            this.obstacleManager.reset();
        }
        
        if (this.player) this.player.reset();
        if (this.world) this.world.reset();
        
        this.ui.uiContainer.style.display = 'none';
        this.ui.gameOver.style.display = 'none';
        this.ui.pauseButton.style.display = 'none';
        this.ui.pauseMenu.style.display = 'none';
        
        this.ui.modalOverlay.style.display = 'flex';
        this.ui.rulesModal.style.display = 'block';

        const introMusic = document.getElementById('intro-music');
        if (introMusic) {
            introMusic.currentTime = 0;
            if (!introMusic.muted) {
                introMusic.play().catch(e => console.log('Error al reanudar música:', e));
            }
        }
        
        console.log("✅ Menú principal cargado correctamente");
    }

    startGame() {
        this.clock.start();
        console.log("🚀 INICIANDO JUEGO - VR Primera Persona con Menús");
        
        this.checkInitialCollisions();
        
        this.ui.modalOverlay.style.display = 'none';
        this.ui.rulesModal.style.display = 'none';
        this.ui.uiContainer.style.display = 'block';
        this.ui.pauseButton.style.display = 'block';

        this.isGameStarted = true;
        this.isGameOver = false;
        
        this.playBackgroundMusic();
        this.resetGameLogic();
        this.animate();
    }

    checkInitialCollisions() {
        console.log("🔍 VERIFICANDO COLISIONES INICIALES...");
        
        const playerBox = this.player.getBoundingBox();
        console.log("📍 Posición inicial del jugador:", {
            x: this.player.group.position.x.toFixed(2),
            y: this.player.group.position.y.toFixed(2), 
            z: this.player.group.position.z.toFixed(2)
        });

        console.log(`🎯 Obstáculos al inicio: ${this.obstacleManager.obstacles.length}`);
    }

    resetGameLogic() {
        console.log("🔄 Reseteando juego...");
        
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = Config.GAME_START_SPEED;
        this.difficultyLevel = 1;
        this.frameCount = 0;
        this.debugStatsTimer = 0;

        for (const type in this.activePowerUps) {
            this.activePowerUps[type].active = false;
            this.activePowerUps[type].timer = 0;
            this.powerUpIndicators[type].style.display = 'none';
        }

        this.ui.score.textContent = `Puntos: 0`;
        this.ui.distance.textContent = `Distancia: 0m`;

        if (this.obstacleManager) {
            this.obstacleManager.reset();
        }
        
        if (this.player) this.player.reset();
        if (this.world) this.world.reset();

        console.log("✅ Juego reiniciado - Listo para empezar");
    }

    restartGame() {
        this.clock.start();
        console.log("🔄 Reiniciando el juego...");
        
        this.ui.gameOver.style.display = 'none';
        this.isGameOver = false;
        this.isPaused = false;
        
        // Ocultar menú VR si está activo
        if (this.vrMenuSystem.isActive) {
            this.hideVRMenu();
        }
        
        this.playBackgroundMusic();
        this.resetGameLogic();
        this.animate();
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 50;
        this.scene.add(dirLight);
        
        console.log("💡 Luces configuradas");
    }

    loadEnvironment(hdrPath) {
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load(hdrPath, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.background = texture;
            this.scene.environment = texture;
            console.log("✅ Fondo HDR cargado.");
        }, undefined, (err) => {
            console.warn("⚠️ No se pudo cargar el fondo HDR. Usando fondo azul por defecto.", err);
            this.scene.background = new THREE.Color(0x87CEEB);
        });
    }

    updateDifficulty() {
        const newDifficulty = Math.floor(this.distance / Config.DIFFICULTY_INTERVAL) + 1;
        
        if (newDifficulty > this.difficultyLevel) {
            this.difficultyLevel = newDifficulty;
            
            const speedIncrease = 2 * this.difficultyLevel;
            this.gameSpeed = Math.min(
                Config.GAME_START_SPEED + speedIncrease, 
                Config.GAME_MAX_SPEED
            );
            
            if (this.obstacleManager) {
                this.obstacleManager.baseSpawnRate = Math.max(
                    0.5, 
                    2 - (this.difficultyLevel * 0.3)
                );
            }
            
            console.log(`📈 ¡Dificultad Nivel ${this.difficultyLevel}! Velocidad: ${this.gameSpeed.toFixed(1)}`);
        }
    }

    preloadAssets() {
        console.log("📦 Precargando assets...");
        const fbxLoader = new FBXLoader();
        const textureLoader = new THREE.TextureLoader();
        const totalAssets = 15;
        let loadedCount = 0;

        const updateProgress = () => {
            loadedCount++;
            const progress = (loadedCount / totalAssets) * 100;
            this.ui.loadingBar.style.width = `${progress}%`;
            this.ui.loadingText.textContent = `${Math.round(progress)}%`;
            console.log(`📊 Progreso de carga: ${progress}%`);
        };

        const loadPromise = (path, assetName) => {
            return new Promise((resolve, reject) => {
                fbxLoader.load(path, (obj) => {
                    updateProgress();
                    console.log(`✅ ${assetName} cargado: ${path}`);
                    resolve(obj);
                }, undefined, (err) => {
                    console.error(`❌ Error cargando ${assetName} (${path}):`, err);
                    reject(err);
                });
            });
        };

        const loadTexturePromise = (path, textureName) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(path, (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    console.log(`✅ Textura cargada: ${textureName}`);
                    resolve(texture);
                }, undefined, (err) => {
                    console.error(`❌ Error cargando textura ${textureName} (${path})`, err);
                    reject(err);
                });
            });
        };

        return new Promise(async (resolve, reject) => {
            try {
                // RUTAS CORREGIDAS según tus archivos
                const assetPaths = {
                    coin: 'Recursos/Low Poly Coin.fbx',
                    barrier: 'Recursos/concrete_road_barrier4k.fbx',
                    car: 'Recursos/covered_car4k.fbx',
                    rock: 'Recursos/moon_rock_4k.fbx',
                    barrel: 'Recursos/Barrel.fbx',
                    dartboard: 'Recursos/dartboard_4k.fbx', 
                    pipeWrench: 'Recursos/pipe_wrench_4k.fbx', 
                    playerModel: 'Recursos/character.fbx',
                    animRun: 'Recursos/Fast Run.fbx',
                    animJump: 'Recursos/Jump.fbx',
                    animDie: 'Recursos/Death.fbx',
                    animRoll: 'Recursos/Sprinting Forward Roll.fbx',
                    animLeft: 'Recursos/Left.fbx',
                    animRight: 'Recursos/Right.fbx',
                    zombieModel: 'Recursos/Zombie Walk1.fbx'
                };

                console.log("🎨 Cargando texturas...");
                const [
                    carTexture,
                    barrierDiffTexture,
                    barrierDispTexture,
                    rockDiffTexture,
                    rockDispTexture,
                    barrelTexture, 
                    dartboardTexture, 
                    pipeWrenchTexture 
                ] = await Promise.all([
                    loadTexturePromise('Recursos/covered_car_diff_4k.jpg', 'carTexture'),
                    loadTexturePromise('Recursos/concrete_road_barrier_diff_4k.jpg', 'barrierDiffTexture'),
                    loadTexturePromise('Recursos/concrete_road_barrier_disp_4k.png', 'barrierDispTexture'),
                    loadTexturePromise('Recursos/moon_rock_03_diff_4k.jpg', 'rockDiffTexture'),
                    loadTexturePromise('Recursos/moon_rock_03_disp_4k.png', 'rockDispTexture'),
                    loadTexturePromise('Recursos/Barrel_01.png', 'barrelTexture'), 
                    loadTexturePromise('Recursos/dartboard_diff_4k.jpg', 'dartboardTexture'), 
                    loadTexturePromise('Recursos/pipe_wrench_diff_4k.jpg', 'pipeWrenchTexture') 
                ]);

                console.log("🔄 Cargando modelos FBX...");
                const [
                    coin, 
                    barrier, 
                    car, 
                    rock,
                    barrel, 
                    dartboard,
                    pipeWrench, 
                    playerModel,
                    animRun,
                    animJump,
                    animDie,
                    animRoll,
                    animLeft,
                    animRight,
                    zombieModel
                    
                ] = await Promise.all([
                    loadPromise(assetPaths.coin, 'coin'),
                    loadPromise(assetPaths.barrier, 'barrier'),
                    loadPromise(assetPaths.car, 'car'),
                    loadPromise(assetPaths.rock, 'rock'),
                    loadPromise(assetPaths.barrel, 'barrel'),
                    loadPromise(assetPaths.dartboard, 'dartboard'), 
                    loadPromise(assetPaths.pipeWrench, 'pipeWrench'), 
                    loadPromise(assetPaths.playerModel, 'playerModel'),
                    loadPromise(assetPaths.animRun, 'animRun'),
                    loadPromise(assetPaths.animJump, 'animJump'),
                    loadPromise(assetPaths.animDie, 'animDie'),
                    loadPromise(assetPaths.animRoll, 'animRoll'),
                    loadPromise(assetPaths.animLeft, 'animLeft'),
                    loadPromise(assetPaths.animRight, 'animRight'),
                    loadPromise(assetPaths.zombieModel, 'zombieModel')
                ]);

                // Aplicar texturas
                console.log("✨ Aplicando texturas a modelos...");
                
                const applyTexture = (model, texture, textureName) => {
                    model.traverse(child => {
                        if (child.isMesh && child.material) {
                            child.material.map = texture;
                            child.material.needsUpdate = true;
                        }
                    });
                    console.log(`✅ Textura aplicada: ${textureName}`);
                };

                const applyTextureWithDisplacement = (model, diffTexture, dispTexture, textureName) => {
                    model.traverse(child => {
                        if (child.isMesh && child.material) {
                            child.material.map = diffTexture;
                            child.material.displacementMap = dispTexture;
                            child.material.displacementScale = textureName.includes('barrier') ? 0.1 : 0.05;
                            child.material.needsUpdate = true;
                        }
                    });
                    console.log(`✅ Textura con displacement aplicada: ${textureName}`);
                };

                applyTexture(car, carTexture, 'car');
                applyTextureWithDisplacement(barrier, barrierDiffTexture, barrierDispTexture, 'barrier');
                applyTextureWithDisplacement(rock, rockDiffTexture, rockDispTexture, 'rock');
                applyTexture(barrel, barrelTexture, 'barrel');
                applyTexture(dartboard, dartboardTexture, 'dartboard');
                applyTexture(pipeWrench, pipeWrenchTexture, 'pipeWrench');

                // Configurar escalas
                console.log("📏 Configurando escalas...");
                coin.scale.set(0.005, 0.005, 0.005);           
                barrier.scale.set(0.01, 0.01, 0.01);           
                car.scale.set(0.015, 0.015, 0.015);            
                barrel.scale.set(0.02, 0.02, 0.02);            
                dartboard.scale.set(0.03, 0.03, 0.03);    
                pipeWrench.scale.set(0.03, 0.03, 0.03); 
                zombieModel.scale.set(0.011, 0.011, 0.011);

                // Configurar sombras
                console.log("🌑 Configurando sombras...");
                [coin, barrier, car, rock, barrel, dartboard, pipeWrench, playerModel].forEach(model => {
                    model.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                });

                console.log("🎉 ¡Todos los assets cargados y configurados!");

                resolve({
                    coin: coin,
                    playerModel: playerModel,
                    barrier: barrier,
                    car: car,
                    rock: rock,
                    barrel: barrel, 
                    dartboard: dartboard, 
                    pipeWrench: pipeWrench, 
                    obstacleBarriers: [barrier, car, rock, barrel], 
                    animRun: animRun,
                    animJump: animJump,
                    animDie: animDie,
                    animRoll: animRoll,
                    animLeft: animLeft,
                    animRight: animRight,
                    zombieModel: zombieModel
                });

            } catch (error) {
                console.error("💥 Error fatal en preloadAssets:", error);
                reject(error);
            }
        });
    }

    checkCollisions() {
        if (this.isGameOver || this.vrMenuSystem.isActive) return;

        const playerBox = this.player.getBoundingBox();
        const playerPosition = this.player.group.position;

        this.frameCount++;
        this.debugStatsTimer++;

        // Mostrar stats de debug cada 5 segundos
        if (this.debugStatsTimer > 300 && this.collisionDebugEnabled) {
            console.log(`📊 Frame ${this.frameCount} - Distancia: ${this.distance.toFixed(0)}m`);
            console.log(`📍 Jugador: X=${playerPosition.x.toFixed(2)}, Z=${playerPosition.z.toFixed(2)}`);
            this.debugStatsTimer = 0;
        }

        // Verificar colisiones con obstáculos
        for (let i = 0; i < this.obstacleManager.obstacles.length; i++) {
            const obstacle = this.obstacleManager.obstacles[i];
            if (!obstacle.isActive) continue;
            
            const obstacleBox = obstacle.getBoundingBox();
            
            if (playerBox.intersectsBox(obstacleBox)) {
                console.log("🚨 ¡COLISIÓN CON OBSTÁCULO! Game Over");
                console.log(`📍 Obstáculo ${i}:`, {
                    type: obstacle.type,
                    position: {
                        x: obstacle.mesh.position.x.toFixed(2),
                        y: obstacle.mesh.position.y.toFixed(2),
                        z: obstacle.mesh.position.z.toFixed(2)
                    }
                });
                
                // NUEVO: Mostrar menú VR de Game Over
                if (this.isVRMode) {
                    this.showVRGameOverMenu();
                }
                
                this.gameOver("COLISIÓN CON OBSTÁCULO");
                return;
            }
        }

        // Verificar colisiones con monedas
        for (let i = this.obstacleManager.coins.length - 1; i >= 0; i--) {
            const coin = this.obstacleManager.coins[i];
            if (!coin.isActive) continue;
            
            const coinBox = coin.getBoundingBox();
            if (playerBox.intersectsBox(coinBox)) {
                console.log("💰 Moneda recolectada!");
                this.obstacleManager.collectCoin(coin);
                
                let points = 10;
                if (this.activePowerUps.double.active) {
                    points = 20;
                    console.log("✅ Bonus doble aplicado: +20 puntos");
                }
                
                this.score += points;
                this.ui.score.textContent = `Puntos: ${this.score}`;
                this.playCoinSound();
            }
        }

        // Verificar colisiones con power-ups
        for (let i = this.obstacleManager.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.obstacleManager.powerUps[i];
            if (!powerUp.isActive) continue;
            
            const powerUpBox = powerUp.getBoundingBox();
            
            if (playerBox.intersectsBox(powerUpBox)) {
                console.log(`⚡ ¡COLISIÓN CON POWER-UP! Tipo: ${powerUp.powerUpType}`);
                
                const powerUpType = powerUp.powerUpType;
                
                this.obstacleManager.collectPowerUp(powerUp);
                
                if (powerUpType && (powerUpType === 'magnet' || powerUpType === 'double')) {
                    console.log(`🎯 Activando power-up: ${powerUpType}`);
                    this.activatePowerUp(powerUpType);
                } else {
                    console.error("❌ Tipo de power-up inválido:", powerUpType);
                }
                break;
            }
        }
    }
    
    gameOver(reason = "DESCONOCIDO") {
        if (this.isGameOver) return;

        console.log("🛑 ================================");
        console.log("🛑 GAME OVER - INICIANDO SECUENCIA");
        console.log(`🛑 Razón: ${reason}`);
        console.log(`🛑 Distancia: ${this.distance.toFixed(0)}m`);
        console.log(`🛑 Puntuación: ${this.score}`);
        console.log("🛑 ================================");

        this.isGameOver = true;
        this.pauseBackgroundMusic();

        if (this.player) {
            this.player.die();
        }

        // Solo mostrar menú tradicional si NO estamos en VR
        if (!this.isVRMode && this.player && this.player.mixer) {
            const dieAction = this.player.actions.die;

            const onDieAnimationFinished = (e) => {
                if (e.action === dieAction) {
                    console.log("💀 Animación 'die' terminada. Mostrando menú de Game Over.");

                    document.getElementById('final-score').textContent = this.score;
                    document.getElementById('final-distance').textContent = Math.floor(this.distance) + 'm';
                    document.getElementById('final-coins').textContent = Math.floor(this.score / 10);
                    document.getElementById('final-time').textContent = Math.floor(this.distance / this.gameSpeed) + 's';

                    this.ui.gameOver.style.display = 'block';

                    this.player.mixer.removeEventListener('finished', onDieAnimationFinished);
                }
            };

            this.player.mixer.addEventListener('finished', onDieAnimationFinished);
        } else if (!this.isVRMode) {
            this.ui.gameOver.style.display = 'block';
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Redimensionar renderizador CSS3D
        if (this.cssRenderer) {
            this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        }
        
        console.log("🔄 Ventana redimensionada");
    }

    animate() {
        if (!this.isGameStarted) {
            return;
        }

        if (this.renderer.xr.isPresenting) {
            this.renderer.setAnimationLoop(this.render.bind(this));
        } else {
            requestAnimationFrame(this.animate.bind(this));
            this.render();
        }
    }

    render() {
        if (this.isPaused && !this.vrMenuSystem.isActive) {
            return; 
        }

        const delta = this.clock.getDelta();

        // Actualizar controles VR
        if (this.vrControls && this.isVRMode) {
            this.vrControls.update(delta);
        }

        if (this.player) {
            this.player.update(delta);
            
            // En VR primera persona, la cámara sigue al jugador
            if (this.isVRMode) {
                this.cameraContainer.position.x = this.player.group.position.x;
                this.cameraContainer.position.z = this.player.group.position.z;
                
                // Ajustar altura durante saltos
                if (this.player.state === Config.PLAYER_STATE.JUMPING) {
                    this.cameraContainer.position.y = Config.VR_SETTINGS.PLAYER_HEIGHT + this.player.group.position.y;
                } else {
                    this.cameraContainer.position.y = Config.VR_SETTINGS.PLAYER_HEIGHT;
                }
                
                // Actualizar posición del menú VR si está activo
                if (this.vrMenuSystem.isActive) {
                    this.positionVRMenu();
                }
            }
        }

        if (this.isGameOver) {
            if (this.world) {
                this.world.zombieCatch(delta);
            }
            this.renderer.render(this.scene, this.camera);
            
            // Renderizar menú CSS3D si está activo
            if (this.vrMenuSystem.isActive && this.cssRenderer) {
                this.cssRenderer.render(this.cssScene, this.camera);
            }
            return;
        }

        const playerPosition = this.player.group.position;

        // Actualizar mundo
        this.world.update(delta, this.gameSpeed, playerPosition);
        
        // Actualizar obstáculos
        if (this.obstacleManager) {
            this.obstacleManager.update(
                delta, 
                this.gameSpeed, 
                this.distance, 
                playerPosition,
                this.activePowerUps
            );
        }

        // En modo normal, cámara sigue al jugador en 3ra persona
        if (!this.isVRMode) {
            this.cameraContainer.position.z = playerPosition.z + Config.CAMERA_START_Z;
            this.cameraContainer.position.x = playerPosition.x;
        }

        // Actualizar distancia y UI
        this.distance += this.gameSpeed * delta;
        this.ui.distance.textContent = `Distancia: ${this.distance.toFixed(0)}m`;
        
        // Actualizar power-ups
        this.updatePowerUps(delta);
        
        // Actualizar dificultad
        this.updateDifficulty();
        
        // Verificar colisiones
        this.checkCollisions();

        // Renderizar escena 3D principal
        this.renderer.render(this.scene, this.camera);
        
        // Renderizar menú CSS3D si está activo
        if (this.vrMenuSystem.isActive && this.cssRenderer) {
            this.cssRenderer.render(this.cssScene, this.camera);
        }
    }
}