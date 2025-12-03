// -----------------------------------------------------------------
// --- Config.js (CONFIGURACIÓN VR PRIMERA PERSONA CON MENÚS)
// -----------------------------------------------------------------

export const Config = {
    // ===== CONFIGURACIÓN DE CARRILES =====
    LANE_WIDTH: 4,
    TOTAL_LANES: 3,

    // ===== CONFIGURACIÓN DEL JUGADOR =====
    PLAYER_START_Z: 0,
    CAMERA_START_Y: 6,
    CAMERA_START_Z: 15,
    
    // ===== CONFIGURACIÓN DE CÁMARA =====
    CAMERA_FOV: 75,
    CAMERA_ASPECT: window.innerWidth / window.innerHeight,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
    
    // ===== CONFIGURACIÓN DE VELOCIDAD DEL JUEGO =====
    GAME_START_SPEED: 12,
    GAME_MAX_SPEED: 40,
    GAME_SPEED_INCREASE: 0.2,

    // ===== CONFIGURACIÓN DE DIFICULTAD =====
    DIFFICULTY_INTERVAL: 1000,          // Cada 1000m aumenta la dificultad
    SPAWN_RATE_INCREASE: 0.3,           // Aumento de tasa de aparición

    // ===== CONFIGURACIÓN DE MOVIMIENTO =====
    JUMP_STRENGTH: 25,
    GRAVITY: -70,
    ROLL_DURATION: 0.7,
    
    // ===== ESTADOS DEL JUGADOR =====
    PLAYER_STATE: {
        RUNNING: 'running',
        JUMPING: 'jumping',
        ROLLING: 'rolling',
        DEAD: 'dead'
    },

    // ===== TIPOS DE OBSTÁCULOS =====
    OBSTACLE_TYPE: {
        BARRIER: 'barrier',
        WALL: 'wall',
        ROCK: 'rock',
        BARREL: 'barrel', 
        COIN: 'coin'
    },

    // ===== TIPOS DE POWER-UPS =====
    POWERUP_TYPE: {
        MAGNET: 'magnet',
        DOUBLE: 'double'
    },

    // ===== DURACIÓN DE POWER-UPS =====
    POWERUP_DURATION: {
        magnet: 15.0,
        double: 15.0
    },

    POWERUP_SPAWN_CHANCE: 0.08,

    // ===== CONFIGURACIÓN DE FOG/NIEBLA =====
    FOG_COLOR: 0x87CEEB,
    FOG_NEAR: 10,
    FOG_FAR: 300,

    // ===== CONFIGURACIÓN DE SPAWN/DESPAWN =====
    SPAWN_Z: -150,
    DESPAWN_Z: 20,

    // ===== CONFIGURACIÓN VR PRIMERA PERSONA MEJORADA =====
    VR_SETTINGS: {
        PLAYER_HEIGHT: 1.6,
        GAZE_THRESHOLD: 0.3,
        GAZE_DURATION: 0.5,
        CAMERA_SMOOTHING: 0.1,
        
        // NUEVO: Ajustes de cámara VR
        CAMERA_OFFSET_Y: 0.3,           // Offset vertical de la cámara
        CAMERA_LERP_SPEED: 0.1,         // Velocidad de interpolación
    },

    // ===== CONFIGURACIÓN DE MENÚS VR =====
    VR_MENU_SETTINGS: {
        MENU_DISTANCE: 2.0,             // Distancia del menú a la cámara (metros)
        MENU_WIDTH: 500,                // Ancho del menú en píxeles
        MENU_HEIGHT: 400,               // Altura del menú en píxeles
        MENU_SCALE: 0.002,              // Escala del menú en 3D
        
        // Estilos del menú
        FONT_SIZE_TITLE: '3rem',        // Tamaño de fuente del título
        FONT_SIZE_CONTENT: '1.3rem',    // Tamaño de fuente del contenido
        FONT_SIZE_BUTTON: '1.3rem',     // Tamaño de fuente de botones
        
        // Colores
        COLOR_PRIMARY: '#00FF41',       // Verde neón (principal)
        COLOR_SECONDARY: '#FF4444',     // Rojo (game over)
        COLOR_ACCENT: '#FFA500',        // Naranja (acento)
        COLOR_BACKGROUND: 'rgba(20, 20, 30, 0.98)', // Fondo oscuro semi-transparente
        
        // Efectos visuales
        OPACITY: 0.98,                  // Opacidad del fondo
        BLUR_AMOUNT: '15px',            // Cantidad de blur
        SHADOW_INTENSITY: '0 0 80px',   // Intensidad de sombra
        
        // Botones
        BUTTON_PADDING: '18px 25px',    // Padding de botones
        BUTTON_BORDER_RADIUS: '12px',   // Radio de borde de botones
        BUTTON_TRANSITION: 'all 0.3s ease', // Transición de botones
        
        // Animaciones
        ANIMATION_DURATION: 0.3,        // Duración de animaciones (segundos)
        FADE_IN_TIME: 0.5,              // Tiempo de fade in
        FADE_OUT_TIME: 0.3,             // Tiempo de fade out
    },
    
    // ===== CONTROLES VR =====
    VR_CONTROLS: {
        // Mapeo de botones (genérico - se adapta a diferentes controladores)
        BUTTON_MAPPING: {
            SELECT: 0,                  // Trigger principal
            GRIP: 1,                    // Botón de agarre
            A: 4,                       // Botón A (Oculus) / X (otros)
            B: 5,                       // Botón B (Oculus) / Y (otros)
            THUMBSTICK: 3,              // Stick analógico
            MENU: 2,                    // Botón de menú del sistema
        },
        
        // Nombres para UI
        PAUSE_BUTTON: 'A/X',           // Botón para pausa
        MENU_BUTTON: 'Grip',           // Botón para menú rápido
        BACK_BUTTON: 'B/Y',            // Botón para salir
        SELECT_BUTTON: 'Trigger',      // Botón para seleccionar
        
        // Sensibilidad
        RAY_LENGTH: 3.0,               // Longitud del rayo de selección
        RAY_OPACITY: 0.6,              // Opacidad del rayo visual
        DEADZONE: 0.1,                 // Zona muerta para sticks
    },

    // ===== CONFIGURACIÓN DE AUDIO =====
    AUDIO_SETTINGS: {
        MUSIC_VOLUME: 0.3,             // Volumen de música de fondo
        SFX_VOLUME: 0.5,               // Volumen de efectos de sonido
        COIN_VOLUME: 0.5,              // Volumen de sonido de monedas
        POWERUP_VOLUME: 0.8,           // Volumen de sonido de power-ups
        UI_VOLUME: 0.6,                // Volumen de sonidos de UI
    },

    // ===== CONFIGURACIÓN DE RENDIMIENTO =====
    PERFORMANCE_SETTINGS: {
        POOL_SIZE_OBSTACLES: 15,       // Tamaño del pool de obstáculos
        POOL_SIZE_COINS: 30,           // Tamaño del pool de monedas
        POOL_SIZE_POWERUPS: 10,        // Tamaño del pool de power-ups
        MAX_ACTIVE_OBSTACLES: 20,      // Máximo de obstáculos activos
        MAX_ACTIVE_COINS: 50,          // Máximo de monedas activas
        MAX_ACTIVE_POWERUPS: 5,        // Máximo de power-ups activos
        
        // LOD (Level of Detail)
        LOD_DISTANCE_NEAR: 50,         // Distancia para detalle cercano
        LOD_DISTANCE_MID: 100,         // Distancia para detalle medio
        LOD_DISTANCE_FAR: 200,         // Distancia para detalle lejano
    },

    // ===== CONFIGURACIÓN DE COLISIONES =====
    COLLISION_SETTINGS: {
        PLAYER_BOUNDING_PADDING: 0.1,  // Padding del bounding box del jugador
        OBSTACLE_BOUNDING_PADDING: 0.05, // Padding de bounding box de obstáculos
        COIN_COLLECTION_RADIUS: 0.5,   // Radio de colección de monedas
        POWERUP_COLLECTION_RADIUS: 0.8, // Radio de colección de power-ups
        
        // Ajustes por estado
        JUMP_COLLISION_MODIFIER: 0.2,  // Modificador de colisión al saltar
        ROLL_COLLISION_MODIFIER: 0.5,  // Modificador de colisión al rodar
    },

    // ===== CONFIGURACIÓN DE UI =====
    UI_SETTINGS: {
        SCORE_UPDATE_RATE: 0.1,        // Tasa de actualización de puntuación (segundos)
        DISTANCE_UPDATE_RATE: 0.5,     // Tasa de actualización de distancia (segundos)
        POWERUP_INDICATOR_DURATION: 0.5, // Duración de indicadores de power-up
        
        // Tamaños de texto
        SCORE_FONT_SIZE: '28px',
        DISTANCE_FONT_SIZE: '28px',
        POWERUP_FONT_SIZE: '14px',
        
        // Colores de UI
        UI_COLOR_PRIMARY: '#FFFFFF',   // Blanco
        UI_COLOR_SECONDARY: '#00FF41', // Verde neón
        UI_COLOR_ACCENT: '#FF4444',    // Rojo
    },

    // ===== CONFIGURACIÓN DE ANIMACIONES =====
    ANIMATION_SETTINGS: {
        TRANSITION_DURATION: 0.1,      // Duración de transición entre animaciones
        FADE_IN_DURATION: 0.1,         // Duración de fade in de animaciones
        FADE_OUT_DURATION: 0.1,        // Duración de fade out de animaciones
        
        // Velocidades de animación
        COIN_ROTATION_SPEED: 5,        // Velocidad de rotación de monedas
        POWERUP_FLOAT_SPEED: 3,        // Velocidad de flotación de power-ups
        POWERUP_ROTATION_SPEED: 3,     // Velocidad de rotación de power-ups
        ZOMBIE_ANIMATION_SPEED: 1.0,   // Velocidad de animación del zombie
    },

    // ===== CONFIGURACIÓN DE DEBUG =====
    DEBUG_SETTINGS: {
        SHOW_BOUNDING_BOXES: false,    // Mostrar bounding boxes
        SHOW_COLLISION_DEBUG: false,   // Mostrar información de colisiones
        LOG_COLLISIONS: true,          // Registrar colisiones en consola
        LOG_POWERUPS: true,            // Registrar power-ups en consola
        LOG_PERFORMANCE: false,        // Registrar rendimiento
        STATS_UPDATE_INTERVAL: 5,      // Intervalo de actualización de stats (segundos)
    },

    // ===== CONFIGURACIÓN DE VERSIONES =====
    VERSION: '1.0.0',
    BUILD_DATE: '2024-12-03',
    COMPATIBILITY: {
        THREEJS: '^0.167.0',
        WEBXR: '1.0',
        BROWSERS: ['Chrome 79+', 'Firefox 70+', 'Edge 79+']
    }
};

// Función para actualizar aspectos dinámicos
Config.updateAspectRatio = function() {
    Config.CAMERA_ASPECT = window.innerWidth / window.innerHeight;
};

// Función para obtener ajustes VR según el dispositivo
Config.getVRDeviceSettings = function() {
    // Esto podría expandirse para detectar dispositivos específicos
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    return {
        MENU_DISTANCE: isMobile ? 1.5 : 2.0,
        MENU_SCALE: isMobile ? 0.003 : 0.002,
        RAY_LENGTH: isMobile ? 2.0 : 3.0,
    };
};

// Exportar función helper para debug
Config.logConfig = function() {
    console.group('⚙️ Configuración del Juego');
    console.log('Versión:', Config.VERSION);
    console.log('VR Habilitado:', true);
    console.log('Velocidad Inicial:', Config.GAME_START_SPEED);
    console.log('Power-ups:', Config.POWERUP_TYPE);
    console.log('VR Menú Distance:', Config.VR_MENU_SETTINGS.MENU_DISTANCE);
    console.groupEnd();
};