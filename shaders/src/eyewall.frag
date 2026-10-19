#version 330 core
 out vec4 FragColor;

in vec3 pos;

uniform float iTime;
uniform vec2 iResolution;

float h(vec2 p) { return fract(sin(dot(p, vec2(93.17, 17.71))) * 31337.17); }

void main()
{
    vec2 p = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    vec2 ziel = vec2(1.1 * sin(iTime * 0.7) + 0.4 * sin(iTime * 2.3), 0.6 * cos(iTime * 0.9));
    float s = 4.0;
    vec2 g = p * s;
    g.x += 0.5 * mod(floor(g.y), 2.0);                                     // versetzte reihen
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 mitte = (id + 0.5 - vec2(0.5 * mod(id.y, 2.0), 0.0)) / s;
    float gr = 0.30 + 0.14 * h(id);

    // lid: mandelform aus zwei kreisboegen, schliesst sich beim blinzeln
    float takt = iTime * (0.25 + 0.4 * h(id + 3.0)) + h(id + 1.0) * 9.0;
    float zu = smoothstep(0.93, 0.97, fract(takt)) * (1.0 - smoothstep(0.97, 1.0, fract(takt)));
    float offen = gr * (0.62 - 0.6 * zu);
    float mandel = max(length(f - vec2(0.0, -gr + offen)) - gr, length(f + vec2(0.0, -gr + offen)) - gr);

    vec3 haut = mix(vec3(0.16, 0.07, 0.10), vec3(0.28, 0.12, 0.14), h(id + 8.0));
    vec3 col = haut * (0.7 + 0.3 * smoothstep(0.0, 0.25, mandel));
    if (mandel < 0.0) {
        vec2 blick = normalize(ziel - mitte) * min(length(ziel - mitte) * 0.25, 0.11);
        float iris = length(f - blick) - gr * 0.42;
        float pupille = length(f - blick) - gr * (0.16 + 0.05 * sin(iTime * 2.0 + h(id) * 6.0));
        vec3 farbe = 0.5 + 0.5 * cos(6.28 * (h(id + 5.0) * 0.6 + vec3(0.55, 0.35, 0.15)));
        col = vec3(0.92, 0.9, 0.86) - 0.25 * smoothstep(-0.1, 0.0, mandel);  // augapfel, am rand schattig
        float streifen = 0.75 + 0.25 * sin(atan(f.y - blick.y, f.x - blick.x) * 24.0);
        col = mix(col, farbe * streifen, smoothstep(0.01, 0.0, iris));
        col = mix(col, vec3(0.02), smoothstep(0.01, 0.0, pupille));
        col += 0.8 * smoothstep(0.03, 0.0, length(f - blick - vec2(-0.05, 0.06)) - 0.015);
    }

    col = mix(col, vec3(0.05, 0.02, 0.03), smoothstep(0.02, 0.0, abs(mandel)));
    col = pow(col, vec3(0.4545));
    FragColor = vec4(col, 1.0);
}