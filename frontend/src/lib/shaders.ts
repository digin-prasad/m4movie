/**
 * Vertex Shader - "Living Continuous Surface"
 * - Features:
 *   - Gaussian Displacement (Smooth Bulge)
 *   - Surface Rotation (3D Tilt)
 *   - Independent Motion (Breathing/Floating)
 */
export const vortexVertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;     
  uniform float uHover;    

  attribute float aRandom; // 0.0 to 1.0 unique per instance
  
  varying vec2 vUv;
  varying float vDist;
  varying float vScale;

  mat4 rotationMatrix(vec3 axis, float angle) {
      axis = normalize(axis);
      float s = sin(angle);
      float c = cos(angle);
      float oc = 1.0 - c;
      
      return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                  oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                  0.0,                                0.0,                                0.0,                                1.0);
  }

  void main() {
    vUv = uv;
    
    vec4 instanceCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec4 worldPos = instanceMatrix * vec4(position, 1.0);
    
    float dist = distance(uMouse, instanceCenter.xy);
    
    // CONFIG
    float radius = 9.0;             
    float amplitude = 3.5;          
    float xyPush = 0.2;             
    
    // 1. INDEPENDENT MOTION ("Breathing")
    // Each item floats slowly on its own timeline
    // Speed varies by aRandom, Phase varies by aRandom
    float breatheSpeed = 0.5 + (aRandom * 0.5); // 0.5x to 1.0x speed
    float breathePhase = aRandom * 6.28;        // 0 to 2PI
    float breathe = sin((uTime * breatheSpeed) + breathePhase) * 0.3; // +/- 0.3 units Z
    
    // Apply breathing to initial center
    vec3 baseCenter = instanceCenter.xyz;
    baseCenter.z += breathe;

    // 2. INTERACTION PHYSICS
    float k = 1.0 / (radius * radius);
    float influence = exp(-k * dist * dist);
    influence *= uHover;

    vec2 dir = normalize(baseCenter.xy - uMouse);
    if (dist < 0.001) dir = vec2(0.0, 0.0);
    
    // PUSH (XY)
    vec2 pushOffset = dir * influence * xyPush;
    
    // LIFT (Z)
    float zOffset = influence * amplitude;
    
    vec3 finalCenter = baseCenter + vec3(pushOffset, zOffset);
    
    // 3. SCALE
    float scale = 1.0 + (influence * 1.5); 
    
    // 4. ROTATION (Tilt)
    vec3 tiltAxis = vec3(-dir.y, dir.x, 0.0);
    float tiltAngle = -influence * 0.6; 
    
    mat4 rotMat = rotationMatrix(tiltAxis, tiltAngle);
    
    // APPLY TRANSFORMS
    vec4 localPos = vec4(position, 1.0);
    localPos.xyz *= scale;
    localPos = rotMat * localPos;
    
    worldPos.xyz = finalCenter + localPos.xyz;

    vDist = dist;
    vScale = scale;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

/**
 * Fragment Shader
 */
export const vortexFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  
  varying vec2 vUv;
  varying float vDist;
  varying float vScale;

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Focus logic
    float focus = smoothstep(1.0, 2.0, vScale);
    
    // Background: Dark gray/black
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 bgColor = vec3(gray * 0.15); 
    
    // Foreground: Normal
    vec3 fgColor = texColor.rgb;
    
    vec3 finalColor = mix(bgColor, fgColor, focus);
    
    // Slight sheen
    finalColor += vec3(0.05) * focus;
    
    // Opacity
    float opacity = 0.5 + (0.5 * focus);

    gl_FragColor = vec4(finalColor, opacity);
  }
`;
