// -----------------------------------------------------------------
// --- VRControls.js (CORREGIDO - CARRILES Y MENÚS FUNCIONALES)
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
        
        // SISTEMA DE GIRO DE CABEZA CORREGIDO
        this.gazeState = {
            currentLane: 1,
            targetLane: 1,
            gazeAngle: 0,
            lastGazeAngle: 0,
            gazeTimer: 0,
            gazeThreshold: Config.VR_SETTINGS.GAZE_THRESHOLD,
            hysteresis: 0.15, // Aumentado para mejor filtrado
            confirmedAngle: 0,
            returningToCenter: false,
            centerThreshold: 0.2, // Aumentado
            minGazeDuration: 0.4, // Aumentado
            directionLock: false, // Evita cambios múltiples
            lastDirection: 0
        };
        
        // Estados de botones para Meta Quest 3
        this.buttonStates = {
            A: { pressed: false, lastPressed: false },
            B: { pressed: false, lastPressed: false },
            X: { pressed: false, lastPressed: false },
            Y: { pressed: false, lastPressed: false },
            Grip: { pressed: false, lastPressed: false },
            Trigger: { pressed: false, lastPressed: false },
            Menu: { pressed: false, lastPressed: false }
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
            
            this.setupMetaQuestEvents(controller, i);
            this.addControllerRay(controller, i);
        }
        
        console.log("🎮 Controladores configurados para Meta Quest 3");
    }
    
    setupMetaQuestEvents(controller, index) {
        // Eventos básicos
        controller.addEventListener('selectstart', () => this.onSelectStart(index));
        controller.addEventListener('selectend', () => this.onSelectEnd(index));
        controller.addEventListener('squeezestart', () => this.onSqueezeStart(index));
        controller.addEventListener('squeezeend', () => this.onSqueezeEnd(index));
        
        // Conexión
        controller.addEventListener('connected', (event) => {
            this.onControllerConnected(event, index);
        });
    }
    
    onControllerConnected(event, index) {
        const controllerType = event.data.targetRayMode || 'unknown';
        const profiles = event.data.profiles || [];
        
        console.log(`✅ Controlador ${index} conectado:`, {
            tipo: controllerType,
            perfiles: profiles,
            handedness: event.data.handedness
        });
        
        // Detectar Meta Quest
        if (profiles.includes('oculus-touch-v3') || 
            profiles.includes('meta-quest-touch-plus') ||
            profiles.includes('meta-quest-touch-pro')) {
            console.log(`🎮 Meta Quest detectado en controlador ${index}`);
        }
    }
    
    addControllerRay(controller, index) {
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
        
        if (controllerIndex === 0) { // Izquierdo - Saltar
            if (this.player && this.player.state !== 'dead') {
                this.player.jump();
                this.vibrateController(controllerIndex, 0.3, 100);
            }
        } else if (controllerIndex === 1) { // Derecho - Rodar
            if (this.player && this.player.state !== 'dead') {
                this.player.roll();
                this.vibrateController(controllerIndex, 0.3, 100);
            }
        }
    }
    
    onSelectEnd(controllerIndex) {
        console.log(`🎮 Trigger ${controllerIndex} liberado`);
    }
    
    onSqueezeStart(controllerIndex) {
        console.log(`🎮 Grip ${controllerIndex} presionado`);
        
        this.buttonStates.Grip.pressed = true;
        
        if (!this.buttonStates.Grip.lastPressed) {
            this.buttonStates.Grip.lastPressed = true;
            
            // Toggle del menú de pausa
            if (this.player && this.player.game && this.player.game.toggleVRPauseMenu) {
                this.player.game.toggleVRPauseMenu();
                this.vibrateController(controllerIndex, 0.5, 150);
            }
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
        
        // 2. Actualizar detección de giro de cabeza CORREGIDO
        this.updateHeadGazeControls(deltaTime);
        
        // 3. Actualizar posición de cámara
        this.updateCameraPosition();
        
        // 4. Debug opcional
        if (Math.random() < 0.01) {
            this.debugGazeState();
        }
    }
    
    updateButtonStates(deltaTime) {
        if (!this.renderer.xr.getSession()) return;
        
        const session = this.renderer.xr.getSession();
        if (!session.inputSources) return;
        
        session.inputSources.forEach((inputSource, index) => {
            if (inputSource.gamepad) {
                const gamepad = inputSource.gamepad;
                
                // Botón A/X (índice 4 en Quest)
                const buttonA = gamepad.buttons[4];
                if (buttonA && buttonA.pressed && !this.buttonStates.A.lastPressed) {
                    console.log(`🎮 Botón A/X presionado en controlador ${index}`);
                    this.buttonStates.A.pressed = true;
                    this.buttonStates.A.lastPressed = true;
                    
                    // Pausar con botón A/X
                    if (this.player && this.player.game && this.player.game.toggleVRPauseMenu) {
                        this.player.game.toggleVRPauseMenu();
                    }
                    
                    this.vibrateController(index, 0.7, 200);
                } else if (!buttonA?.pressed) {
                    this.buttonStates.A.lastPressed = false;
                }
                
                // Botón B/Y (índice 5 en Quest)
                const buttonB = gamepad.buttons[5];
                if (buttonB && buttonB.pressed && !this.buttonStates.B.lastPressed) {
                    console.log(`🎮 Botón B/Y presionado en controlador ${index}`);
                    this.buttonStates.B.pressed = true;
                    this.buttonStates.B.lastPressed = true;
                    
                    // Salir de menú
                    if (this.player && this.player.game && this.player.game.hideVRMenu) {
                        this.player.game.hideVRMenu();
                        this.player.game.resumeGameFromVRMenu();
                    }
                    
                    this.vibrateController(index, 0.5, 150);
                } else if (!buttonB?.pressed) {
                    this.buttonStates.B.lastPressed = false;
                }
                
                // Botón Menú (índice 2)
                const menuButton = gamepad.buttons[2];
                if (menuButton && menuButton.pressed && !this.buttonStates.Menu.lastPressed) {
                    console.log(`🎮 Botón Menú presionado`);
                    this.buttonStates.Menu.pressed = true;
                    this.buttonStates.Menu.lastPressed = true;
                    
                    // Menú del sistema
                    this.vibrateController(index, 0.4, 100);
                } else if (!menuButton?.pressed) {
                    this.buttonStates.Menu.lastPressed = false;
                }
            }
        });
    }
    
    // NUEVO SISTEMA DE GIRO CORREGIDO
    updateHeadGazeControls(deltaTime) {
        if (!this.camera) return;
        
        // Obtener dirección de mirada
        const gazeDirection = new THREE.Vector3();
        this.camera.getWorldDirection(gazeDirection);
        
        // Calcular ángulo de giro (solo en eje XZ, ignorar Y)
        const currentAngle = Math.atan2(gazeDirection.x, gazeDirection.z);
        this.gazeState.gazeAngle = currentAngle;
        
        // Calcular ángulo absoluto
        const absAngle = Math.abs(currentAngle);
        
        // Determinar si está en zona central
        const isInCenter = absAngle < this.gazeState.centerThreshold;
        
        // Sistema de dirección bloqueada para evitar cambios múltiples
        if (isInCenter) {
            this.gazeState.directionLock = false;
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
                this.gazeState.directionLock = false;
            }
            return;
        }
        
        // Verificar si supera el umbral
        if (absAngle > this.gazeState.gazeThreshold) {
            // Determinar dirección
            const direction = currentAngle < 0 ? -1 : 1;
            
            // Si la dirección está bloqueada, ignorar
            if (this.gazeState.directionLock && direction !== this.gazeState.lastDirection) {
                return;
            }
            
            this.gazeState.gazeTimer += deltaTime;
            
            // Solo confirmar después del tiempo mínimo
            if (this.gazeState.gazeTimer >= this.gazeState.minGazeDuration) {
                // Bloquear dirección para evitar cambios múltiples
                if (!this.gazeState.directionLock) {
                    this.gazeState.directionLock = true;
                    this.gazeState.lastDirection = direction;
                }
                
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
            
            // Si vuelve al centro, resetear después de un tiempo
            if (absAngle < this.gazeState.centerThreshold) {
                this.gazeState.confirmedAngle = 0;
                this.gazeState.directionLock = false;
            }
        }
        
        // Actualizar último ángulo
        this.gazeState.lastGazeAngle = currentAngle;
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
    
    updateCameraPosition() {
        if (this.cameraContainer && this.player) {
            const playerPos = this.player.group.position;
            
            // Suavizar el seguimiento
            this.cameraContainer.position.x += (playerPos.x - this.cameraContainer.position.x) * 0.1;
            this.cameraContainer.position.z += (playerPos.z - this.cameraContainer.position.z) * 0.1;
        }
    }
    
    vibrateController(controllerIndex, intensity, duration) {
        if (!this.renderer.xr.isPresenting) return;
        
        const controller = this.controllers[controllerIndex];
        if (controller && controller.inputSource && controller.inputSource.hapticActuators) {
            const actuator = controller.inputSource.hapticActuators[0];
            if (actuator) {
                actuator.pulse(intensity, duration).catch(err => {
                    console.log("⚠️ Háptica no disponible:", err);
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
            carrilTarget: this.gazeState.targetLane,
            bloqueado: this.gazeState.directionLock,
            regresando: this.gazeState.returningToCenter
        });
    }
    
    // Método para forzar cambio de carril (debug)
    forceChangeLane(direction) {
        const currentLane = this.gazeState.currentLane;
        const targetLane = THREE.MathUtils.clamp(currentLane + direction, 0, 2);
        
        if (targetLane !== currentLane) {
            this.changeLaneByGaze(targetLane);
            console.log(`🔧 Cambio forzado de carril: ${currentLane} -> ${targetLane}`);
        }
    }
}