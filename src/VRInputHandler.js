// -----------------------------------------------------------------
// --- VRInputHandler.js (MANEJO AVANZADO DE INPUTS VR)
// -----------------------------------------------------------------

import { Config } from './Config.js';

export class VRInputHandler {
    constructor(renderer, game) {
        this.renderer = renderer;
        this.game = game;
        
        // Estado de la sesión VR
        this.session = null;
        this.isVRActive = false;
        
        // Controladores y gamepads
        this.controllers = [];
        this.gamepads = [];
        this.controllerModels = new Map();
        
        // Estado de botones
        this.buttonStates = {
            A: { pressed: false, justPressed: false, justReleased: false },
            B: { pressed: false, justPressed: false, justReleased: false },
            X: { pressed: false, justPressed: false, justReleased: false },
            Y: { pressed: false, justPressed: false, justReleased: false },
            Trigger: { pressed: false, value: 0, justPressed: false },
            Grip: { pressed: false, value: 0, justPressed: false },
            Thumbstick: { pressed: false, x: 0, y: 0, justPressed: false },
            Menu: { pressed: false, justPressed: false }
        };
        
        // Configuración de mapeo
        this.buttonMapping = this.detectControllerType();
        
        // Rayos de selección
        this.selectionRays = [];
        this.currentSelection = null;
        
        // Polling
        this.pollingActive = false;
        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / 90; // 90Hz
        
        this.init();
    }
    
    init() {
        console.log("🎮 Inicializando VR Input Handler...");
        
        if (!this.renderer.xr.enabled) {
            console.warn("⚠️ WebXR no está habilitado en el renderer");
            return;
        }
        
        this.setupEventListeners();
        this.createControllerModels();
        
        console.log("✅ VR Input Handler inicializado");
        console.log("📱 Controlador detectado:", this.buttonMapping.type);
    }
    
    detectControllerType() {
        // Detectar tipo de controlador basado en user agent y características
        const ua = navigator.userAgent;
        
        if (ua.includes('Oculus')) {
            return {
                type: 'Oculus Touch',
                mapping: {
                    trigger: 0,
                    grip: 1,
                    menu: 2,
                    thumbstick: 3,
                    A: 4,
                    B: 5,
                    X: 6,
                    Y: 7
                },
                axes: {
                    thumbstickX: 2,
                    thumbstickY: 3
                }
            };
        } else if (ua.includes('Valve') || ua.includes('SteamVR')) {
            return {
                type: 'Valve Index',
                mapping: {
                    trigger: 0,
                    grip: 1,
                    menu: 2,
                    A: 3,
                    B: 4,
                    thumbstick: 5
                },
                axes: {
                    thumbstickX: 0,
                    thumbstickY: 1
                }
            };
        } else if (ua.includes('Windows Mixed Reality')) {
            return {
                type: 'WMR',
                mapping: {
                    trigger: 0,
                    grip: 1,
                    menu: 2,
                    thumbstick: 3
                },
                axes: {
                    thumbstickX: 0,
                    thumbstickY: 1
                }
            };
        } else {
            // Mapeo genérico para WebXR
            return {
                type: 'Generic WebXR',
                mapping: {
                    trigger: 0,
                    grip: 1,
                    menu: 2,
                    thumbstick: 3,
                    A: 4,
                    B: 5
                },
                axes: {
                    thumbstickX: 2,
                    thumbstickY: 3
                }
            };
        }
    }
    
    setupEventListeners() {
        // Escuchar inicio/fin de sesión VR
        this.renderer.xr.addEventListener('sessionstart', (event) => {
            this.onSessionStart(event);
        });
        
        this.renderer.xr.addEventListener('sessionend', () => {
            this.onSessionEnd();
        });
        
        // Escuchar cambios en gamepads
        window.addEventListener('gamepadconnected', (event) => {
            this.onGamepadConnected(event);
        });
        
        window.addEventListener('gamepaddisconnected', (event) => {
            this.onGamepadDisconnected(event);
        });
        
        console.log("🎮 Event listeners configurados");
    }
    
    createControllerModels() {
        // Crear modelos visuales para los controladores
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            
            // Crear rayo de selección
            const rayGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -Config.VR_CONTROLS.RAY_LENGTH)
            ]);
            
            const rayMaterial = new THREE.LineBasicMaterial({
                color: i === 0 ? 0xff4444 : 0x4488ff,
                opacity: Config.VR_CONTROLS.RAY_OPACITY,
                transparent: true,
                linewidth: 2
            });
            
            const ray = new THREE.Line(rayGeometry, rayMaterial);
            ray.visible = false;
            controller.add(ray);
            this.selectionRays[i] = ray;
            
            // Crear modelo del controlador (cubo simple por ahora)
            const controllerGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.15);
            const controllerMaterial = new THREE.MeshBasicMaterial({
                color: i === 0 ? 0xff4444 : 0x4488ff,
                opacity: 0.7,
                transparent: true
            });
            
            const controllerModel = new THREE.Mesh(controllerGeometry, controllerMaterial);
            controller.add(controllerModel);
            this.controllerModels.set(controller, controllerModel);
            
            // Eventos de select
            controller.addEventListener('selectstart', (event) => {
                this.onSelectStart(event, i);
            });
            
            controller.addEventListener('selectend', (event) => {
                this.onSelectEnd(event, i);
            });
            
            controller.addEventListener('squeezestart', (event) => {
                this.onSqueezeStart(event, i);
            });
            
            controller.addEventListener('squeezeend', (event) => {
                this.onSqueezeEnd(event, i);
            });
            
            this.controllers.push(controller);
            
            // Agregar a la escena si existe
            if (this.game && this.game.scene) {
                this.game.scene.add(controller);
            }
        }
        
        console.log("🎮 Modelos de controladores creados");
    }
    
    onSessionStart(event) {
        console.log('🚀 Sesión VR iniciada');
        this.session = event.session;
        this.isVRActive = true;
        this.pollingActive = true;
        
        // Mostrar rayos de selección
        this.selectionRays.forEach(ray => {
            if (ray) ray.visible = true;
        });
        
        // Iniciar polling de gamepads
        this.startGamepadPolling();
        
        // Notificar al juego
        if (this.game && this.game.onVRStart) {
            this.game.onVRStart();
        }
    }
    
    onSessionEnd() {
        console.log('📴 Sesión VR finalizada');
        this.session = null;
        this.isVRActive = false;
        this.pollingActive = false;
        
        // Ocultar rayos de selección
        this.selectionRays.forEach(ray => {
            if (ray) ray.visible = false;
        });
        
        // Notificar al juego
        if (this.game && this.game.onVREnd) {
            this.game.onVREnd();
        }
    }
    
    onGamepadConnected(event) {
        console.log('🎮 Gamepad conectado:', event.gamepad.id);
        this.updateGamepadList();
    }
    
    onGamepadDisconnected(event) {
        console.log('🎮 Gamepad desconectado:', event.gamepad.id);
        this.updateGamepadList();
    }
    
    updateGamepadList() {
        this.gamepads = navigator.getGamepads();
    }
    
    startGamepadPolling() {
        const pollGamepads = () => {
            if (!this.pollingActive || !this.session) return;
            
            this.updateGamepadList();
            this.processAllGamepads();
            
            // Actualizar estado de "justPressed" y "justReleased"
            this.updateButtonTransitions();
            
            // Procesar inputs específicos
            this.processInputActions();
            
            // Actualizar rayos de selección
            this.updateSelectionRays();
            
            // Continuar polling
            requestAnimationFrame(pollGamepads);
        };
        
        pollGamepads();
        console.log("🎮 Polling de gamepads iniciado");
    }
    
    processAllGamepads() {
        this.gamepads.forEach((gamepad, index) => {
            if (gamepad) {
                this.processGamepadInput(gamepad, index);
            }
        });
    }
    
    processGamepadInput(gamepad, index) {
        if (!gamepad.buttons || !gamepad.axes) return;
        
        const mapping = this.buttonMapping.mapping;
        
        // Procesar botones
        if (mapping.trigger !== undefined && gamepad.buttons[mapping.trigger]) {
            this.updateButtonState('Trigger', gamepad.buttons[mapping.trigger]);
        }
        
        if (mapping.grip !== undefined && gamepad.buttons[mapping.grip]) {
            this.updateButtonState('Grip', gamepad.buttons[mapping.grip]);
        }
        
        if (mapping.A !== undefined && gamepad.buttons[mapping.A]) {
            this.updateButtonState('A', gamepad.buttons[mapping.A]);
        }
        
        if (mapping.B !== undefined && gamepad.buttons[mapping.B]) {
            this.updateButtonState('B', gamepad.buttons[mapping.B]);
        }
        
        if (mapping.X !== undefined && gamepad.buttons[mapping.X]) {
            this.updateButtonState('X', gamepad.buttons[mapping.X]);
        }
        
        if (mapping.Y !== undefined && gamepad.buttons[mapping.Y]) {
            this.updateButtonState('Y', gamepad.buttons[mapping.Y]);
        }
        
        if (mapping.thumbstick !== undefined && gamepad.buttons[mapping.thumbstick]) {
            this.updateButtonState('Thumbstick', gamepad.buttons[mapping.thumbstick]);
        }
        
        if (mapping.menu !== undefined && gamepad.buttons[mapping.menu]) {
            this.updateButtonState('Menu', gamepad.buttons[mapping.menu]);
        }
        
        // Procesar ejes (sticks)
        if (this.buttonMapping.axes) {
            const axes = this.buttonMapping.axes;
            
            if (axes.thumbstickX !== undefined && axes.thumbstickY !== undefined) {
                const x = gamepad.axes[axes.thumbstickX];
                const y = gamepad.axes[axes.thumbstickY];
                
                // Aplicar deadzone
                const deadzone = Config.VR_CONTROLS.DEADZONE;
                const magnitude = Math.sqrt(x * x + y * y);
                
                if (magnitude > deadzone) {
                    this.buttonStates.Thumbstick.x = x;
                    this.buttonStates.Thumbstick.y = y;
                } else {
                    this.buttonStates.Thumbstick.x = 0;
                    this.buttonStates.Thumbstick.y = 0;
                }
            }
        }
    }
    
    updateButtonState(buttonName, button) {
        const state = this.buttonStates[buttonName];
        const wasPressed = state.pressed;
        const isPressed = button.pressed;
        const value = button.value || 0;
        
        state.pressed = isPressed;
        state.value = value;
        
        // Solo actualizar justPressed/justReleased en el siguiente frame
        if (!wasPressed && isPressed) {
            state.justPressed = true;
        } else if (wasPressed && !isPressed) {
            state.justReleased = true;
        }
    }
    
    updateButtonTransitions() {
        // Reset justPressed y justReleased para el próximo frame
        for (const buttonName in this.buttonStates) {
            const state = this.buttonStates[buttonName];
            state.justPressed = false;
            state.justReleased = false;
        }
    }
    
    processInputActions() {
        // Procesar acciones basadas en el estado de los botones
        
        // Botón A/X para pausa
        if (this.buttonStates.A.justPressed || this.buttonStates.X.justPressed) {
            console.log("🎮 Botón A/X presionado - Toggle Pause");
            if (this.game && this.game.toggleVRPauseMenu) {
                this.game.toggleVRPauseMenu();
            }
        }
        
        // Botón B/Y para salir del menú
        if (this.buttonStates.B.justPressed || this.buttonStates.Y.justPressed) {
            if (this.game && this.game.vrMenuSystem && this.game.vrMenuSystem.isActive) {
                console.log("🎮 Botón B/Y presionado - Salir del menú");
                this.game.hideVRMenu();
            }
        }
        
        // Botón Menu para menú del sistema
        if (this.buttonStates.Menu.justPressed) {
            console.log("🎮 Botón Menu presionado");
            // Podría usarse para menús del sistema o debug
        }
        
        // Stick para movimiento (si se implementara movimiento libre)
        if (Math.abs(this.buttonStates.Thumbstick.x) > 0.5 ||
            Math.abs(this.buttonStates.Thumbstick.y) > 0.5) {
            // Ejemplo: movimiento con stick
            // this.processThumbstickMovement();
        }
        
        // Trigger para acciones de juego
        if (this.buttonStates.Trigger.justPressed) {
            console.log("🎮 Trigger presionado");
            // Podría usarse para disparar, agarrar, etc.
        }
    }
    
    updateSelectionRays() {
        // Actualizar posición y dirección de los rayos
        this.controllers.forEach((controller, index) => {
            const ray = this.selectionRays[index];
            if (ray && this.isVRActive) {
                // El rayo ya está configurado en el controlador
                // Podemos agregar efectos visuales aquí
                
                // Efecto de pulso si el trigger está presionado
                if (this.buttonStates.Trigger.pressed) {
                    const pulse = (Math.sin(Date.now() * 0.01) + 1) * 0.2 + 0.8;
                    ray.material.opacity = Config.VR_CONTROLS.RAY_OPACITY * pulse;
                } else {
                    ray.material.opacity = Config.VR_CONTROLS.RAY_OPACITY;
                }
            }
        });
    }
    
    onSelectStart(event, controllerIndex) {
        console.log(`🎮 Select start en controlador ${controllerIndex}`);
        
        // Si hay un menú VR activo, verificar selección
        if (this.game && this.game.vrMenuSystem && this.game.vrMenuSystem.isActive) {
            this.checkVRMenuSelection(controllerIndex);
        } else {
            // Acción normal del juego (saltar/rodar)
            if (controllerIndex === 0 && this.game && this.game.player) {
                this.game.player.jump();
            } else if (controllerIndex === 1 && this.game && this.game.player) {
                this.game.player.roll();
            }
        }
    }
    
    onSelectEnd(event, controllerIndex) {
        console.log(`🎮 Select end en controlador ${controllerIndex}`);
    }
    
    onSqueezeStart(event, controllerIndex) {
        console.log(`🎮 Squeeze start en controlador ${controllerIndex}`);
        
        // Botón Grip para menú rápido
        if (this.game && this.game.isGameStarted && !this.game.isGameOver) {
            if (this.game.showVRPauseMenu) {
                this.game.showVRPauseMenu();
            }
        }
    }
    
    onSqueezeEnd(event, controllerIndex) {
        console.log(`🎮 Squeeze end en controlador ${controllerIndex}`);
    }
    
    checkVRMenuSelection(controllerIndex) {
        if (!this.game || !this.game.vrMenuSystem || !this.game.vrMenuSystem.isActive) return;
        
        const controller = this.controllers[controllerIndex];
        if (!controller) return;
        
        // Crear raycaster desde el controlador
        const raycaster = new THREE.Raycaster();
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(controller.quaternion);
        
        raycaster.set(controller.position, direction);
        
        // Verificar colisión con el menú VR
        if (this.game.vrMenuSystem.menuElement) {
            const intersects = raycaster.intersectObject(this.game.vrMenuSystem.menuElement, true);
            
            if (intersects.length > 0) {
                console.log("🎯 Colisión con menú VR detectada");
                
                // Aquí podrías implementar lógica para determinar qué botón fue seleccionado
                // Por ahora, el manejo de clics está en los event listeners HTML
                
                // Efecto visual de confirmación
                const ray = this.selectionRays[controllerIndex];
                if (ray) {
                    ray.material.color.setHex(0x00FF00);
                    setTimeout(() => {
                        ray.material.color.setHex(controllerIndex === 0 ? 0xff4444 : 0x4488ff);
                    }, 200);
                }
            }
        }
    }
    
    // Métodos públicos para consultar estado
    isButtonPressed(buttonName) {
        return this.buttonStates[buttonName]?.pressed || false;
    }
    
    isButtonJustPressed(buttonName) {
        return this.buttonStates[buttonName]?.justPressed || false;
    }
    
    getButtonValue(buttonName) {
        return this.buttonStates[buttonName]?.value || 0;
    }
    
    getThumbstickDirection() {
        return {
            x: this.buttonStates.Thumbstick.x,
            y: this.buttonStates.Thumbstick.y
        };
    }
    
    // Método para vibrar controlador (si el dispositivo lo soporta)
    vibrateController(controllerIndex, intensity = 0.5, duration = 100) {
        if (!this.gamepads[controllerIndex] || !this.gamepads[controllerIndex].vibrationActuator) {
            return;
        }
        
        try {
            this.gamepads[controllerIndex].vibrationActuator.playEffect("dual-rumble", {
                startDelay: 0,
                duration: duration,
                weakMagnitude: intensity,
                strongMagnitude: intensity * 0.5
            });
        } catch (error) {
            console.warn("⚠️ No se pudo activar vibración:", error);
        }
    }
    
    // Limpieza
    dispose() {
        this.pollingActive = false;
        this.session = null;
        this.isVRActive = false;
        
        // Remover controladores de la escena
        this.controllers.forEach(controller => {
            if (this.game && this.game.scene) {
                this.game.scene.remove(controller);
            }
        });
        
        this.controllers = [];
        this.selectionRays = [];
        this.controllerModels.clear();
        
        console.log("🧹 VR Input Handler limpiado");
    }
    
    // Método de debug
    debugButtons() {
        console.group('🎮 Estado de Botones VR');
        for (const [buttonName, state] of Object.entries(this.buttonStates)) {
            console.log(`${buttonName}:`, {
                pressed: state.pressed,
                value: state.value?.toFixed(2),
                justPressed: state.justPressed,
                justReleased: state.justReleased
            });
        }
        console.groupEnd();
    }
}

// Función helper para detectar capacidades del dispositivo
VRInputHandler.detectVRCapabilities = function() {
    const capabilities = {
        hasWebXR: 'xr' in navigator,
        hasGamepadAPI: 'getGamepads' in navigator,
        hasVibration: 'vibrationActuator' in Gamepad.prototype,
        hasHaptics: false,
        maxControllers: 0
    };
    
    // Verificar gamepads conectados
    const gamepads = navigator.getGamepads();
    capabilities.maxControllers = gamepads.filter(gp => gp).length;
    
    // Verificar soporte de hápticos
    if (gamepads[0]) {
        capabilities.hasHaptics = 'hapticActuators' in gamepads[0] || 
                                 'vibrationActuator' in gamepads[0];
    }
    
    return capabilities;
};