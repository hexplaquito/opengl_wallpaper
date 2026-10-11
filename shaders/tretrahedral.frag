#version 330 core
out vec4 FragColor;

in vec3 pos;

uniform float iTime;
uniform vec2 iResolution;

const float IFS_SCALE = 1.8;
const vec3 SHIFT_VEC = vec3(1.0) * (IFS_SCALE - 1.0);

vec3 ifs_color, color, id;

void rot(inout vec2 p, float a) {
    float c = cos(a), s = sin(a);
    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float cube(vec3 p) {
    vec3 d = abs(p) - 2.0;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}


// I let Gemini make some changes to improve performance,
// given my original template: https://www.shadertoy.com/view/N33SR7


// iters is now a dynamic int, allowing early exit
float de(vec3 z, vec3 ro, int max_iters) {
    vec3 zz = abs(ro - z);
    float shell = max(max(zz.x, zz.y), zz.z * 0.5) - 0.3;

    float dd = 3.7;
    id = round(z / dd);
    z.xz -= dd * id.xz;

    rot(z.xz, iTime * 0.25 * 2.0 * mod(length(id.xz), 2.0) + mod(length(z.xz),2.)  );

    float floor_val = z.y + 0.3 + 0.3 * mod(length(z.xz), 3.0);
    ifs_color = vec3(0.0);

    // --- OPTIMIZATION: BOUNDING BOX CHECK ---
    // The cube routine calculates distance to an unscaled size-2 box.
    // If we are far outside this bounds, no fractal geometry can physically exist here.
    float bound_dist = cube(z);

    int actual_iters = 0;
    if (bound_dist < 1.5) { // Only run the fractal loop if we are near/inside the volume
                            actual_iters = max_iters;
                            for (int i = 0; i < 7; i++) { // 7 is our absolute hard cap
                                                          if (i >= max_iters) break;

                                                          float t1 = min(0.0, z.x + z.y); z.xy -= t1;
                                                          float t2 = min(0.0, z.x + z.z); z.xz -= t2;
                                                          float t3 = min(0.0, z.y + z.z); z.yz -= t3;

                                                          z = z * IFS_SCALE - SHIFT_VEC;

                                                          ifs_color.x += step(0.0, z.x * z.y);
                                                          ifs_color.y += step(0.0, z.y * z.z);
                                                          ifs_color.z += step(0.0, z.z * z.x);
                            }
    }

    // Use the actual number of iterations completed to scale the distance accurately
    float dz = pow(IFS_SCALE, float(actual_iters));
    float fr = cube(z) / dz;

    floor_val += 0.4 * fr;

    return max(min(floor_val, fr), -shell);
}

// Lowered to 2 iterations max for normal generation to massively reduce tap costs
vec3 abnormal(vec3 p, vec3 ro) {
    vec2 dx = vec2(1.0, -1.0);
    vec2 dp = 0.001 * dx;
    return normalize(
        dx.xyy * de(p + dp.xyy, ro, 2)
        + dx.yyx * de(p + dp.yyx, ro, 2)
        + dx.yxy * de(p + dp.yxy, ro, 2)
        + dx.xxx * de(p + dp.xxx, ro, 2)
    );
}

void march(vec3 ro, vec3 rd) {
    float t = 0.0, numRF = 0.0;

    for(int i = 0; i < 300; i++) {
        vec3 p = ro + rd * t;

        // --- OPTIMIZATION: DISTANCE-BASED ITERATION SCALING ---
        // If we are far away from everything, we don't need high fractal detail.
        int dynamic_iters = 7;
        if (t > 20.0) dynamic_iters = 4;
        if (t > 50.0) dynamic_iters = 2;

        float d = de(p, ro, dynamic_iters);

        ifs_color = cos(ifs_color * 0.111111);
        ifs_color *= ifs_color;

        if (i > 9) {
            color += 0.041 * ifs_color * exp(-t * t * 0.125);
        }

        if (d < 1e-6) {
            if (numRF > 1.0) break;
            vec3 nn = abnormal(p, ro);
            rd = reflect(rd, nn);
            color *= vec3(1.2, 0.96, 0.24);
            ro += rd * 0.01;
            numRF += 1.0;
        }

        t += d * 0.8;
    }
}


void main()
{
    vec2 p = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float T = mod(iTime, 300.0) * 0.4;
    vec3 ro = vec3(0.0, 0.0, T);
    vec3 rd = normalize(vec3(p, 1.4));

    march(ro, rd);

    FragColor = vec4(1.0 - exp(-color * color), 0.0);
}