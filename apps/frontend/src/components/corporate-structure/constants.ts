// Scale factors for the expanded universe (3.5x spacing)
export const SCALE = {
  ENTITY_DISTANCE: 3.5,  // Multiply all positions by this
  ENTITY_SIZE: 2.0,      // Double entity sizes
  FOG_NEAR: 80,          // Depth fog start
  FOG_FAR: 400,          // Depth fog end
  ZOOM_MIN: 50,          // Minimum zoom distance
  ZOOM_MAX: 300,         // Maximum zoom distance
};

// Camera defaults for the expanded universe
export const CAMERA = {
  DEFAULT_POSITION: [100, 60, 120] as [number, number, number],
  DEFAULT_TARGET: [0, 10, 0] as [number, number, number],
  FOV: 55,
  NEAR: 0.5,
  FAR: 1000,
};

// Ship defaults
export const SHIP = {
  INITIAL_POSITION: [50, 15, 50] as [number, number, number],
  INITIAL_ROTATION: [0, -Math.PI / 4, 0] as [number, number, number],
};

// Physics parameters for spaceship flight
export const FLIGHT_PHYSICS = {
  BASE_MAX_SPEED: 1.2,
  BOOST_MAX_SPEED: 3.6,      // 3x when boosting
  BASE_ACCELERATION: 4.0,
  BOOST_ACCELERATION: 12.0,  // 3x when boosting
  BASE_DRAG: 3.0,
  BASE_TURN_SPEED: 2.5,
  BASE_TURN_DRAG: 5.0,
  MAX_TURN_RATE: 0.04,
};

// Orbit mode parameters
export const ORBIT_MODE = {
  RADIUS: 20,          // Distance from entity center
  HEIGHT: 8,           // Height above entity
  SPEED: 0.3,          // Radians per second
  TRANSITION_DURATION: 1.5, // Seconds to transition into orbit
};

// Portal parameters
export const PORTAL = {
  DETECTION_RADIUS: 25,  // Distance to activate portal prompt
  WARP_DURATION: 2.5,    // Seconds for warp animation
};

// Flow type colors
export const FLOW_COLORS = {
  ownership: '#3b82f6',     // Blue
  license: '#a855f7',       // Purple
  services: '#22c55e',      // Green
  distribution: '#f59e0b',  // Amber
  revenue: '#06b6d4',       // Cyan
};
