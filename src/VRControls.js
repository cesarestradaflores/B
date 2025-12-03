// -----------------------------------------------------------------
// --- VRControls.js (CORREGIDO PARA META QUEST 3 - GIRO MEJORADO)
// -----------------------------------------------------------------

import * as THREE from 'three';
import { Config } from './Config.js';

export class VRControls {
    constructor(camera, renderer, player, scene, cameraContainer) {
        this.camera = camera;
        this.renderer = renderer;
        this.player = player;
        this.scene = scene;
        this.cameraContainer = cameraContainer;
        
        this.controllers = [];
        this.raycaster = new THREE.Raycaster();
        
        // NUEVO: Sistema de detección de giro mejorado
        this.gazeState = {
            currentLane: 1,          // Carril actual (0, 1, 2)
            targetLane: 1,           // Carril objetivo
            gazeAngle: 0,            // Ángulo actual de mirada
            lastGazeAngle: 0,        // Último ángulo registrado
            gazeTimer: 0,            // Temporizador para confirmación
            gazeThreshold: 0.3,      // Umbral mínimo para detección
            hysteresis: 0.1,         // Histéresis para evitar cambios accidentales
            confirmedAngle: 0,       // Ángulo confirmado (sin histéresis)
            returningToCenter: false,// Indica si está regresando al centro
            centerThreshold: 0.15,   // Umbral para considerar "centro"
            minGazeDuration: 0.3     // Tiempo mínimo mirando para cambiar
        };
        
        // Estados de botones para Meta Quest 3
        this.buttonStates = {
            A: { pressed: false, lastPressed: false },
            B: { pressed: false, lastPressed: false },
            X: { pressed: false, lastPressed: false },
            Y: { pressed: false, lastPressed: false },
            Grip: { pressed: false, lastPressed: false },
            Trigger: { pressed: false, lastPressed: false }
        };
        
        this.setupControllers();
        console.log("✅ VRControls Meta Quest 3 - Sistema de giro mejorado");
    }
    
    setupControllers() {
        if (!this.renderer.xr.enabled) {
            console.warn("WebXR no está habilitado");
            return;
        }
        
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            this.scene.add(controller);
            this.controllers.push(controller);
            
            // Configurar eventos específicos para Meta Quest 3
            this.setupMetaQuestEvents(controller, i);
            
            // Añadir rayo visual (opcional)
            this.addControllerRay(controller, i);
        }
        
        console.log("🎮 Controladores configurados para Meta Quest 3");
    }
    
    setupMetaQuestEvents(controller, index) {
        // Mapeo de botones para Meta Quest 3
        controller.addEventListener('selectstart', () => this.onSelectStart(index));
        controller.addEventListener('selectend', () => this.onSelectEnd(index));
        controller.addEventListener('squeezestart', () => this.onSqueezeStart(index));
        controller.addEventListener('squeezeend', () => this.onSqueezeEnd(index));
        
        // Evento para detectar conexión y tipo de controlador
        controller.addEventListener('connected', (event) => {
            this.onControllerConnected(event, index);
        });
        
        console.log(`🎮 Controlador ${index} configurado para Meta Quest`);
    }
    
    onControllerConnected(event, index) {
        const controllerType = event.data.targetRayMode || 'unknown';
        const profiles = event.data.profiles || [];
        
        console.log(`✅ Controlador ${index} conectado:`, {
            tipo: controllerType,
            perfiles: profiles,
            handedness: event.data.handedness
        });
        
        // Detectar específicamente Meta Quest
        if (profiles.includes('oculus-touch-v3') || 
            profiles.includes('meta-quest-touch-plus') ||
            profiles.includes('meta-quest-touch-pro')) {
            console.log(`🎮 Meta Quest detectado en controlador ${index}`);
            
            // Configuración específica para botones de Quest
            this.setupMetaQuestButtonMapping(index);
        }
    }
    
    setupMetaQuestButtonMapping(controllerIndex) {
        // Mapeo de botones para Meta Quest 3:
        // - Trigger (índice 0): Trigger principal
        // - Grip (índice 1): Botón de agarre
        // - Botón A/X (índice 4): Depende de la mano
        // - Botón B/Y (índice 5): Depende de la mano
        // - Thumbstick (índice 3): Stick analógico
        
        console.log(`🎮 Mapeo de botones configurado para Meta Quest 3`);
        
        // Añadir visualización de botones en debug
        if (Config.DEBUG_SETTINGS.LOG_PERFORMANCE) {
            this.startButtonMonitoring(controllerIndex);
        }
    }
    
    startButtonMonitoring(controllerIndex) {
        const monitorInterval = setInterval(() => {
            if (!this.renderer.xr.isPresenting) {
                clearInterval(monitorInterval);
                return;
            }
            
            const controller = this.controllers[controllerIndex];
            if (controller && controller.inputSource && controller.inputSource.gamepad) {
                const gamepad = controller.inputSource.gamepad;
                
                // Monitorear estado de botones específicos
                this.monitorMetaQuestButtons(gamepad, controllerIndex);
            }
        }, 1000); // Monitorear cada segundo
    }
    
    monitorMetaQuestButtons(gamepad, controllerIndex) {
        const buttonStates = {
            A: gamepad.buttons[4]?.pressed || false,
            B: gamepad.buttons[5]?.pressed || false,
            X: gamepad.buttons[4]?.pressed || false, // Mismo que A en otra mano
            Y: gamepad.buttons[5]?.pressed || false, // Mismo que B en otra mano
            Grip: gamepad.buttons[1]?.pressed || false,
            Trigger: gamepad.buttons[0]?.pressed || false,
            Thumbstick: gamepad.buttons[3]?.pressed || false
        };
        
        // Log para debug
        if (Object.values(buttonStates).some(state => state)) {
            console.log(`🎮 Botones activos ${controllerIndex}:`, 
                Object.entries(buttonStates)
                    .filter(([_, pressed]) => pressed)
                    .map(([name]) => name)
                    .join(', ')
            );
        }
    }
    
    addControllerRay(controller, index) {
        // Rayo visual para debug
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        
        const material = new THREE.LineBasicMaterial({ 
            color: index === 0 ? 0xff0000 : 0x0000ff,
            opacity: 0.3,
            transparent: true
        });
        
        const line = new THREE.Line(geometry, material);
        line.scale.z = 3;
        controller.add(line);
    }
    
    onSelectStart(controllerIndex) {
        console.log(`🎮 Trigger ${controllerIndex} presionado`);
        
        // Acciones según el controlador
        if (controllerIndex === 0) { // Izquierdo - Saltar
            this.player.jump();
            this.vibrateController(controllerIndex, 0.3, 100);
        } else if (controllerIndex === 1) { // Derecho - Rodar
            this.player.roll();
            this.vibrateController(controllerIndex, 0.3, 100);
        }
    }
    
    onSelectEnd(controllerIndex) {
        console.log(`🎮 Trigger ${controllerIndex} liberado`);
    }
    
    onSqueezeStart(controllerIndex) {
        console.log(`🎮 Grip ${controllerIndex} presionado`);
        
        // Botón Grip para menú rápido
        this.buttonStates.Grip.pressed = true;
        
        if (!this.buttonStates.Grip.lastPressed) {
            this.buttonStates.Grip.lastPressed = true;
            
            // Alternar menú rápido (pausa)
            if (this.player.game && this.player.game.toggleVRPauseMenu) {
                this.player.game.toggleVRPauseMenu();
            }
            
            this.vibrateController(controllerIndex, 0.5, 150);
        }
    }
    
    onSqueezeEnd(controllerIndex) {
        console.log(`🎮 Grip ${controllerIndex} liberado`);
        this.buttonStates.Grip.pressed = false;
        this.buttonStates.Grip.lastPressed = false;
    }
    
    update(deltaTime) {
        if (!this.renderer.xr.isPresenting) return;
        
        // 1. Actualizar detección de botones
        this.updateButtonStates(deltaTime);
        
        // 2. Actualizar detección de giro de cabeza (MEJORADO)
        this.updateHeadGazeControls(deltaTime);
        
        // 3. Actualizar posición de cámara
        this.updateCameraPosition();
        
        // 4. Verificar botones para pausa
        this.checkPauseButtons();
    }
    
    updateButtonStates(deltaTime) {
        if (!this.renderer.xr.getSession()) return;
        
        const session = this.renderer.xr.getSession();
        if (!session.inputSources) return;
        
        session.inputSources.forEach((inputSource, index) => {
            if (inputSource.gamepad) {
                const gamepad = inputSource.gamepad;
                
                // Detectar botón A/X (índice 4 en Quest)
                const buttonA = gamepad.buttons[4];
                if (buttonA && buttonA.pressed && !this.buttonStates.A.lastPressed) {
                    console.log(`🎮 Botón A/X presionado en controlador ${index}`);
                    this.buttonStates.A.pressed = true;
                    this.buttonStates.A.lastPressed = true;
                    
                    // Pausar con botón A/X
                    if (this.player.game && this.player.game.toggleVRPauseMenu) {
                        this.player.game.toggleVRPauseMenu();
                    }
                    
                    this.vibrateController(index, 0.7, 200);
                } else if (!buttonA?.pressed) {
                    this.buttonStates.A.lastPressed = false;
                }
                
                // Detectar botón B/Y (índice 5 en Quest)
                const buttonB = gamepad.buttons[5];
                if (buttonB && buttonB.pressed && !this.buttonStates.B.lastPressed) {
                    console.log(`🎮 Botón B/Y presionado en controlador ${index}`);
                    this.buttonStates.B.pressed = true;
                    this.buttonStates.B.lastPressed = true;
                    
                    // Acción con botón B/Y (salir de menú)
                    if (this.player.game && this.player.game.hideVRMenu) {
                        this.player.game.hideVRMenu();
                    }
                    
                    this.vibrateController(index, 0.5, 150);
                } else if (!buttonB?.pressed) {
                    this.buttonStates.B.lastPressed = false;
                }
                
                // Detectar botón Menú (índice 2 en algunos controladores)
                const menuButton = gamepad.buttons[2];
                if (menuButton && menuButton.pressed && !this.buttonStates.X.lastPressed) {
                    console.log(`🎮 Botón Menú presionado`);
                    this.buttonStates.X.pressed = true;
                    this.buttonStates.X.lastPressed = true;
                } else if (!menuButton?.pressed) {
                    this.buttonStates.X.lastPressed = false;
                }
            }
        });
    }
    
    // NUEVO: Sistema de giro de cabeza mejorado
    updateHeadGazeControls(deltaTime) {
        if (!this.camera) return;
        
        // Obtener dirección de mirada
        const gazeDirection = new THREE.Vector3();
        this.camera.getWorldDirection(gazeDirection);
        
        // Calcular ángulo de giro (solo en eje XZ, ignorar Y)
        const currentAngle = Math.atan2(gazeDirection.x, gazeDirection.z);
        
        // Calcular cambio desde el último ángulo
        const angleDelta = Math.abs(currentAngle - this.gazeState.lastGazeAngle);
        
        // Actualizar estado
        this.gazeState.gazeAngle = currentAngle;
        
        // Sistema de histéresis mejorado
        this.updateGazeHysteresis(currentAngle, deltaTime);
        
        // Actualizar último ángulo
        this.gazeState.lastGazeAngle = currentAngle;
        
        // Debug opcional
        if (Config.DEBUG_SETTINGS.LOG_PERFORMANCE && Math.random() < 0.005) {
            this.debugGazeState();
        }
    }
    
    updateGazeHysteresis(currentAngle, deltaTime) {
        const absAngle = Math.abs(currentAngle);
        
        // Determinar si está en zona central
        const isInCenter = absAngle < this.gazeState.centerThreshold;
        
        // Detectar si está regresando al centro
        if (isInCenter) {
            this.gazeState.returningToCenter = false;
        } else if (this.gazeState.confirmedAngle !== 0 && 
                   Math.sign(currentAngle) !== Math.sign(this.gazeState.confirmedAngle)) {
            // Cambió de dirección - probablemente regresando al centro
            this.gazeState.returningToCenter = true;
        }
        
        // Si está regresando al centro, ignorar detecciones
        if (this.gazeState.returningToCenter) {
            if (isInCenter) {
                // Llegó al centro, resetear todo
                this.gazeState.returningToCenter = false;
                this.gazeState.confirmedAngle = 0;
                this.gazeState.gazeTimer = 0;
            }
            return; // No procesar mientras regresa
        }
        
        // Verificar si supera el umbral
        if (absAngle > this.gazeState.gazeThreshold) {
            this.gazeState.gazeTimer += deltaTime;
            
            // Solo confirmar después del tiempo mínimo
            if (this.gazeState.gazeTimer >= this.gazeState.minGazeDuration) {
                // Determinar dirección
                const direction = currentAngle < 0 ? -1 : 1;
                
                // Solo cambiar si el ángulo confirmado es diferente
                const targetAngle = direction * this.gazeState.gazeThreshold;
                
                if (Math.sign(this.gazeState.confirmedAngle) !== Math.sign(targetAngle)) {
                    this.gazeState.confirmedAngle = targetAngle;
                    
                    // Calcular carril objetivo
                    let targetLane = this.gazeState.currentLane + direction;
                    targetLane = THREE.MathUtils.clamp(targetLane, 0, 2);
                    
                    // Solo cambiar si es diferente del actual
                    if (targetLane !== this.gazeState.currentLane) {
                        this.gazeState.targetLane = targetLane;
                        this.changeLaneByGaze(targetLane);
                        this.gazeState.currentLane = targetLane;
                        
                        console.log(`👁️ Cambio de carril por mirada: ${targetLane} (ángulo: ${currentAngle.toFixed(2)})`);
                        
                        // Vibración sutil
                        this.vibrateController(0, 0.2, 50);
                    }
                }
            }
        } else {
            // Está en zona central o por debajo del umbral
            this.gazeState.gazeTimer = Math.max(0, this.gazeState.gazeTimer - deltaTime * 2);
            
            // Si vuelve al centro, resetear ángulo confirmado después de un tiempo
            if (absAngle < this.gazeState.centerThreshold) {
                this.gazeState.confirmedAngle = 0;
            }
        }
    }
    
    changeLaneByGaze(targetLane) {
        const currentLane = this.player.currentLane;
        
        if (targetLane !== currentLane) {
            const direction = targetLane > currentLane ? 1 : -1;
            
            // Llamar al método strafe del jugador
            this.player.strafe(direction);
            
            // Actualizar estado de gaze
            this.gazeState.currentLane = targetLane;
        }
    }
    
    checkPauseButtons() {
        // Verificación adicional para botones de pausa
        // (Ya se maneja en updateButtonStates)
    }
    
    updateCameraPosition() {
        // Mantener cámara alineada con el jugador
        if (this.cameraContainer && this.player) {
            const playerPos = this.player.group.position;
            const cameraPos = this.cameraContainer.position;
            
            // Solo actualizar si hay diferencia significativa
            if (Math.abs(playerPos.x - cameraPos.x) > 0.01 ||
                Math.abs(playerPos.z - cameraPos.z) > 0.01) {
                
                this.cameraContainer.position.x = playerPos.x;
                this.cameraContainer.position.z = playerPos.z;
            }
        }
    }
    
    vibrateController(controllerIndex, intensity, duration) {
        if (!this.renderer.xr.isPresenting) return;
        
        const controller = this.controllers[controllerIndex];
        if (controller && controller.inputSource && controller.inputSource.hapticActuators) {
            const actuator = controller.inputSource.hapticActuators[0];
            if (actuator) {
                actuator.pulse(intensity, duration).catch(err => {
                    // Silenciar errores de háptica no soportada
                    if (Config.DEBUG_SETTINGS.LOG_PERFORMANCE) {
                        console.log("⚠️ Háptica no disponible:", err);
                    }
                });
            }
        }
    }
    
    debugGazeState() {
        console.log("👁️ Estado Gaze:", {
            ángulo: this.gazeState.gazeAngle.toFixed(3),
            confirmado: this.gazeState.confirmedAngle.toFixed(3),
            temporizador: this.gazeState.gazeTimer.toFixed(2),
            carrilActual: this.gazeState.currentLane,
            regresandoAlCentro: this.gazeState.returningToCenter,
            enCentro: Math.abs(this.gazeState.gazeAngle) < this.gazeState.centerThreshold
        });
    }
    
    // Método para probar botones
    testMetaQuestButtons() {
        console.log("🎮 Probando botones Meta Quest 3...");
        
        const testInterval = setInterval(() => {
            if (!this.renderer.xr.isPresenting) {
                clearInterval(testInterval);
                return;
            }
            
            const session = this.renderer.xr.getSession();
            if (session && session.inputSources) {
                session.inputSources.forEach((inputSource, index) => {
                    if (inputSource.gamepad) {
                        console.log(`🎮 Controlador ${index}:`, 
                            inputSource.gamepad.buttons.map((btn, i) => 
                                btn.pressed ? `B${i}` : null
                            ).filter(b => b).join(', ') || 'Ninguno'
                        );
                    }
                });
            }
        }, 2000);
    }
    
    // Configurar sensibilidad
    setGazeSensitivity(sensitivity) {
        // sensitivity: 0 (baja) a 1 (alta)
        this.gazeState.gazeThreshold = 0.4 - (sensitivity * 0.3); // 0.1 a 0.4
        this.gazeState.minGazeDuration = 0.4 - (sensitivity * 0.3); // 0.1 a 0.4
        console.log(`👁️ Sensibilidad de mirada ajustada: ${sensitivity}`);
    }
    
    cleanup() {
        // Limpiar event listeners
        this.controllers.forEach(controller => {
            if (controller) {
                controller.removeEventListener('selectstart', () => {});
                controller.removeEventListener('selectend', () => {});
                controller.removeEventListener('squeezestart', () => {});
                controller.removeEventListener('squeezeend', () => {});
                controller.removeEventListener('connected', () => {});
            }
        });
        
        console.log("🧹 VRControls limpiado");
    }
}