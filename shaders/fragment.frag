#version 330 core
out vec4 FragColor;

in vec3 pos;

uniform float iTime;
uniform vec2 iResolution;

// Milky way settings
#define BAND_ANGLE 0.675
#define BAND_WIDTH 0.303
#define CORE_POS  0.356
#define CORE_MOVEMENT_SCALE 1.661
#define BAND_BRIGHT 1.077
#define POSTERIZE 5.753
#define POSTER_MIX 0.25

// Star settings
#define STAR_DENSITY 0.802
#define FLASHY_CHANCE 0.22
#define SHOOT_PERIOD 4.0

// Tree settings
#define TREE_LINE_DIST 0.654
#define TREE_SPACING 0.112
#define TREE_WIDTH 0.239

// milky way color settings
const vec3 BAND_DEEP = vec3(0.1, 0.32, 0.7);
const vec3 BAND_MID = vec3(0.48, 0.32, 0.9);
const vec3 BAND_HOT = vec3(1.0, 0.52, 0.78);
const vec3 BAND_CORE = vec3(1.0, 0.93, 0.86);

// sky color settings
const vec3 SKY_EDGE = vec3(0.085, 0.14, 0.37);
const vec3 SKY_MID  = vec3(0.03, 0.062, 0.22);
const vec3 CENTER = vec3(0.01, 0.014, 0.065);
const vec3 EDGE_GLOW = vec3(0.5, 0.33, 0.68);
const vec2 GLOW_DIR = vec2(-0.8, -0.5);

// tree color settings
const vec3 TREE_NEAR = vec3(0.028, 0.030, 0.090);
const vec3 TREE_FAR  = vec3(0.085, 0.085, 0.230);
const vec3 TREE_RIM  = vec3(0.520, 0.440, 0.950);

/************************ Noise stuff *****************************/
float hash11(float value)
{
    value = fract(value * 0.1031);
    value *= value + 21.423;
    value *= value + value;
    return fract(value);
}

float hash12(vec2 value)
{
    vec3 p3 = fract(vec3(value.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 21.423);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 value)
{
    vec3 p3 = fract(vec3(value.xyx) * vec3(0.1031, 0.103, 0.0973));
    p3 += dot(p3, p3.yzx + 21.423);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float grid_noise(vec2 value)
{
    vec2 grid_cell = floor(value);
    vec2 cell_pos = fract(value);
    vec2 v = cell_pos * cell_pos * (3.0 - 2.0 * cell_pos);

    float a = hash12(grid_cell);
    float b = hash12(grid_cell + vec2(1.0, 0.0));
    float c = hash12(grid_cell + vec2(0.0, 1.0));
    float d = hash12(grid_cell + vec2(1.0, 1.0));
    return mix(mix(a, b, v.x), mix(c, d, v.x), v.y);
}

float fbm(vec2 value)
{
    float v = 0.0;
    float amp = 0.5;

    mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 8; i++)
    {
        v += amp * grid_noise(value);
        value = rotation * value * 2.0 + 17.1;
        amp *= 0.5;
    }

    return v;
}

/******************************* Milky way stuff **************************************/

float milky_way_shape(vec2 value, out float haze)
{
    vec2 dir = vec2(cos(BAND_ANGLE), sin(BAND_ANGLE));
    vec2 nrm = vec2(-dir.y, dir.x);
    float along = dot(value, dir);
    float across = dot(value, nrm);

    vec2 q = value * 2.2 + vec2(iTime * 0.008 * CORE_MOVEMENT_SCALE, 0.0);
    float warp = fbm(q + 1.5 * fbm(q * 1.7));
    across += (warp - 0.5) * 0.35;

    // center
    float d = along - CORE_POS;
    float core = exp(-d * d * 2.5);
    float width = BAND_WIDTH * (0.75 + 0.75 * core);

    float mask = exp(-across * across / (width * width));

    float arms = fbm(value * 5.0 + warp * 2.0);
    float glow =  mask * (0.2 + 1.25 * arms * arms) * (0.5 + 0.95 * core);

    float r = fbm(vec2(along * 2.2, across * 6.5) + 4.7);
    float lanes = pow(1.0 - abs(r * 2.0 - 1.0), 4.0);
    float lane_mask = exp(-across * across / (width * width * 0.2));
    glow *= 1.0 - 0.85 * lanes * lane_mask;

    haze = exp(-across * across / (width * width * 4.0)) * (0.6 + 0.4 * core);
    return glow;
}

float posterize(float x, float steps)
{
    if (steps <= 0.0) return x;

    float s = x * steps;
    float stepped = (floor(s) + smoothstep(0.40, 0.60, fract(s))) / steps;

    return mix(x, stepped, POSTER_MIX);
}

vec3 band_ramp(float x)
{
    vec3 c = mix(BAND_DEEP, BAND_MID, smoothstep(0.08, 0.35, x));
    c = mix(c, BAND_HOT, smoothstep(0.35, 0.70, x));
    c = mix(c, BAND_CORE, smoothstep(0.70, 1.0, x));

    return c;
}

// i hate how i cant name things point
vec3 milky_way(vec2 p)
{
    float haze;
    float glow = milky_way_shape(p, haze);
    glow = posterize(clamp(glow * BAND_BRIGHT, 0.0, 1.2), POSTERIZE);

    return band_ramp(glow) * glow + BAND_DEEP * haze * 0.22;
}

/************************ Star Stuff **********************/
// for clustering stars
float band_mask_cheap(vec2 p)
{
    vec2 nrm = vec2(-sin(BAND_ANGLE), cos(BAND_ANGLE));
    float a = dot(p, nrm);
    return exp(-a * a / (BAND_WIDTH * BAND_WIDTH * 1.5));
}

vec3 star_tint(float h)
{
    // I should move these colors to not be hard coded but idk why I would change them anyway
    vec3 c = mix(vec3(0.7, 0.82, 1), vec3(1.0, 0.97, 0.94), smoothstep(0.2, 0.6, h));
    c = mix(c, vec3(1.0, 0.78, 0.66), smoothstep(0.85, 1.00, h));
    return c;
}

vec3 star_layer(vec2 p, float cells, float size, float gain, float seed)
{
    vec2 grid = p * cells;
    vec2 id = floor(grid);
    float pix = cells / iResolution.y; // pixel for pixie
    vec3 col = vec3(0.0);

    for(int y = -1; y <= 1; ++y)
    {
        for(int x = -1; x <= 1; ++x)
        {
            vec2 cid = id + vec2(float(x), float(y)); //sid from ice age

            float m = band_mask_cheap((cid + 0.5)/cells);
            if (hash12(cid * 1.37 + seed) > STAR_DENSITY * (0.5 + 2.0 * m)) continue;

            // twinkle twinkle little star
            // i need food
            vec2 h = hash22(cid + seed);
            vec2 sp = cid + 0.15 + 0.7 * h;
            float d = length(grid - sp) / pix;
            float b = pow(hash12(cid + seed + 3.1), 3.0);

            float tw = 0.6 + 0.4 * sin(iTime * (1.0 + 4.0 * h.x) + h.y * 6.2831);

            float r = size * (0.6 + 0.8 * b);
            float shape = exp(-d * d / (r * r)) + 0.08 * exp(-d / (r * 3.0));
            col += star_tint(hash12(cid + seed + 7.7)) * shape * b * tw * gain;
        }
    }

    return col;
}

// the anime flashy star thing you know what im talking abt
vec3 flashy_stars(vec2 p)
{
    float cells = 4.2;
    vec2 grid = p * cells;
    vec2 id = floor(grid);
    float pix = 1.0 / iResolution.y;
    vec3 col = vec3(0.0);

    // i havent done this before so this is a bit of a guess
    // creating new stars instead of designated other ones then doing the little effects based on time
    for(int y = -1; y <= 1; ++y)
    {
        for(int x = -1; x <= 1; ++x)
        {
            // what if i comment more quirky things to showcase how *quirky* i am
            // no one reads these things anyway ask my coworkers
            vec2 cid = id + vec2(float(x), float(y));
            if (hash12(cid + 91.7) > FLASHY_CHANCE) continue;

            vec2 h = hash22(cid + 12.3);
            vec2 sp = (cid + 0.25 + 0.5 * h) / cells;
            vec2 q = p - sp;

            float len = (0.04 + 0.05 * h.x) * (0.85 + 0.15 * sin(iTime * 4.7 + h.y * 20.0));
            float thin = 0.9 * pix;

            float core = exp(-dot(q, q) / (5.0 * pix * pix));
            float halo = 0.35 * exp(-length(q) / (len * 0.12));

            // h - horizontal | v - vertical
            float spikeH = exp(-q.y * q.y / (thin * thin)) * exp(-abs(q.x) / (len * 0.35));
            float spikeV = exp(-q.x * q.x / (thin * thin)) * exp(-abs(q.y) / (len * 0.35));

            // glints
            vec2 qd = mat2(0.7071, -0.7071, 0.7071, 0.7071) * q; // 45 degree rot mat
            float diag =  exp(-qd.y * qd.y / (thin * thin)) * exp(-abs(qd.x) / (len * 0.10))
            + exp(-qd.x * qd.x / (thin * thin)) * exp(-abs(qd.y) / (len * 0.10));

            float twinkle = 0.75 + 0.25 * sin(iTime * 2.3 + h.x * 40.0);
            vec3 tint = mix(vec3(0.75, 0.88, 1.0), vec3(1.0, 0.85, 0.95), h.y);
            col += tint * (core * 1.4 + halo + 0.9 * (spikeH + spikeV) + diag) * twinkle;
        }
    }
    return col;
}

// I should make this in a separate meteor section (im not fun at parties)
vec3 shooting_stars(vec2 uv)
{
    float slot = floor(iTime / SHOOT_PERIOD);
    float lt = iTime - slot * SHOOT_PERIOD;
    if (hash11(slot * 3.17) > 0.65) return vec3(0.0);

    float dur = 0.1 + 0.4 * hash11(slot * 7.3);
    float prog = lt / dur;
    if (prog > 1.0) return vec3(0.0);

    vec2 start = (vec2(hash11(slot * 1.7), hash11(slot * 2.9)) - 0.5) * vec2(1.2, 0.7);
    float ang = hash11(slot * 5.1) * 6.2831;
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 head = start + dir * prog * 0.25;

    float tail = 0.16 * smoothstep(0.0, 0.3, prog);
    vec2 pa = uv - head;
    float back = clamp(dot(pa, -dir), 0.0, tail);
    float d = length(pa + dir * back);
    float pix = 1.0 / iResolution.y;

    float fade = smoothstep(0.0, 0.08, prog) * (1.0 - smoothstep(0.55, 1.0, prog));
    float low_taper_fade = 1.0 - back / max(tail, 1e-4);
    float line = exp(-d * d / (pix * pix * 1.5)) * low_taper_fade * low_taper_fade;
    float glow = 0.25 * exp(-d / (pix * 6.0)) * low_taper_fade; // look  let me have fun
    float head_glow = exp(-dot(pa, pa) / (pix * pix * 6.0));

    return vec3(0.85, 0.92, 1.0) * (line + glow + head_glow) * fade * 1.4;
}

/******************************* Tree stuff *************************/
// this is a bit new to me as well
// im going for like
// wintery conifer trees
float conifer(vec2 uv, vec2 tip, float width, float seed)
{
    float tip_dist = length(tip);
    vec2 axis = tip / tip_dist;
    float out_dist = dot(uv, axis);
    float across = axis.x * uv.y - axis.y * uv.x;
    float t = out_dist - tip_dist;
    if (t < 0.0) return length(vec2(across, t));

    float f = fract(t / out_dist * 8.0 + seed);
    float tier = smoothstep(0.0, 0.85, f) - smoothstep(0.85, 1.0, f);
    float w = t * width * (0.65 + 0.35 * tier);
    return abs(across) - w;
}

float tree_row(vec2 uv, float side, float line_dist, float width, float seed)
{
    vec2 dir = vec2(cos(BAND_ANGLE), sin(BAND_ANGLE));
    vec2 nrm = vec2(-dir.y, dir.x) * side;

    float h = dot(uv, nrm);
    if (h <= 0.0) return 1e5;

    float s = dot(uv, dir) * line_dist / h;
    float cell = floor(s/TREE_SPACING);

    float d = 1e5;
    for (int k = -2; k <= 2; ++k)
    {
        float id = cell + float(k);
        float r1 = hash11(id * 1.36 + seed);
        float r2 = hash11(id * 2.71 + seed);

        vec2 tip = nrm * line_dist + dir * (id + 0.5 + (r1 - 0.5) * 0.6) * TREE_SPACING;
        tip *= mix(0.82, 1.08, r2);
        tip += vec2(-tip.y, tip.x) * 0.008 * sin(iTime * 0.8 + id);

        d = min(d, conifer(uv, tip, width * line_dist / length(tip), r1));
    }

    return d;
}

vec3 add_trees(vec3 col, vec2 uv)
{
    float pix = 1.0 / iResolution.y;
    vec2 dir = vec2(cos(BAND_ANGLE), sin(BAND_ANGLE));
    vec2 nrm = vec2(-dir.y, dir.x);
    float h = abs(dot(uv, nrm));

    float d_near = min(tree_row(uv,  1.0, TREE_LINE_DIST, TREE_WIDTH, 37.0),
                       tree_row(uv, -1.0, TREE_LINE_DIST, TREE_WIDTH, 49.0));
    float d_far  = min(tree_row(uv,  1.0, TREE_LINE_DIST * 1.15, TREE_WIDTH, 11.0),
                       tree_row(uv, -1.0, TREE_LINE_DIST * 1.15, TREE_WIDTH, 23.0));

    float wall = TREE_LINE_DIST * 1.45 + 0.05 * (grid_noise(vec2(dot(uv, dir) * 4.0, 5.0)) - 0.5);
    d_far = min(d_far, wall - h);
    float d_all = min(d_far, d_near);

    float depth = smoothstep(TREE_LINE_DIST * 0.85, TREE_LINE_DIST * 1.5, h);

    col += TREE_RIM * 0.12 * exp(-max(d_all, 0.0) / 0.04);

    col = mix(col, TREE_FAR, 1.0 - smoothstep(-pix, pix, d_far));
    float inside = 1.0 - smoothstep(-pix, pix, d_near);
    col = mix(col, TREE_NEAR * (1.3 - 0.7 * depth), inside);

    float outer = 1.0 - smoothstep(-pix, pix, d_all);
    float rim = outer * smoothstep(-0.006, 0.0, d_all) * (1.0 - depth);
    col += TREE_RIM * rim * 0.35;

    return col;
}

/***********************************Sky *****************************/

vec3 sky_gradient(vec2 uv)
{
    float r = length(uv);

    vec3 c = mix(CENTER, SKY_MID, smoothstep(0.0, 0.45, r));
    c = mix(c, SKY_EDGE, smoothstep(0.35, 0.95, r));

    float side = clamp(0.4 + 0.6 * dot(uv, normalize(GLOW_DIR)), 0.0, 1.0);
    c += EDGE_GLOW * smoothstep(0.65, 1.05, r) * side;
    return c;
}

void main()
{
    vec2 uv = pos.xy;

    vec3 col = sky_gradient(uv);
    col += milky_way(uv);

    vec3 stars = star_layer(uv, 140.0, 0.5, 0.9, 1.0)
    + star_layer(uv,  60.0, 0.8, 1.6, 17.0)
    + star_layer(uv, 22.0, 1.2, 2.5, 43.0);
    col += stars;
    col += flashy_stars(uv);
    col += shooting_stars(uv);

//    col = add_trees(col, uv);

    col = col * 1.1 / (1.0 + 0.25 * col);
    col *= 1.0 - 0.15 * dot(uv, uv);
    col += (hash12(pos.xy) - 0.5)/ 255.0;

    FragColor = vec4(col, 1.0f);
}