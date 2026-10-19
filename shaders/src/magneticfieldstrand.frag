#version 330 core
out vec4 FragColor;

in vec3 pos;

uniform float iTime;
uniform vec2 iResolution;

vec3 palette( in float t)
{
    return vec3(0.5, 0.5, 0.5) + vec3(0.5, 0.5, 0.5)*cos( 6.283185*(vec3(1.0, 1.0, 1.0)*t+vec3(0.00, 0.33, 0.67)) );
}

// Ray-Box Intersection
bool intersectBox(vec3 org, vec3 drc, vec3 bxMin, vec3 bxMax, out float ner, out float far)
{
    vec3 inv = 1.0 / (drc + 1e-6);
    vec3 btm = inv * (bxMin - org);
    vec3 top = inv * (bxMax - org);
    vec3 tmin = min(btm, top);
    vec3 tmax = max(btm, top);
    ner = max(tmin.x, max(tmin.y, tmin.z));
    far = min(tmax.x, min(tmax.y, tmax.z));
    return ner < far && far > 0.0;
}

void main()
{
    //    vec2 p = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

    const float VOLUMNSIZE = 1.5;
    const int STEPS = 18;
    const float SPLIT = 72.;
    const float EDGE = 0.9;

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime * 0.3;

    vec3 org = vec3(3.5 * sin(t), 3.5, 3.5 * cos(t));
    vec3 cmr[3];
    cmr[2] = normalize(vec3(0.0) - org);
    cmr[0] = normalize(cross(cmr[2], vec3(0.0, 1.0, 0.0)));
    cmr[1] = normalize(cross(cmr[0], cmr[2]));

    vec3 raydrc = normalize(uv.x * cmr[0] + uv.y * cmr[1] + VOLUMNSIZE * cmr[2]);
    vec3 bxMin = vec3(-1.5), bxMax = vec3(1.5);
    float near, far;

    vec3 finalColor = vec3(0.0);

    if (intersectBox(org, raydrc, bxMin, bxMax, near, far))
    {
        float near = max(near, 0.0),
        stepSize = (far - near) / float(STEPS),
        march = near,
        accumulatedGlow = 0.0;
        vec3 color = vec3(0.0);

        for (int i = 0; i < STEPS; i++)
        {
            vec3 pos = org + raydrc * march;
            float r = length(pos);

            if (r > 0.15 && r < 1.4)
            {
                float falloff = 1.0 - smoothstep(0.2, 1.4, r);
                float cosTheta = pos.z / r;
                float stream = (1.0 - cosTheta * cosTheta) / r;
                float phi = atan(pos.y, pos.x);
                float strand = sin(phi * SPLIT);

                float lineMask = smoothstep(EDGE, EDGE * 1.01,  sin(stream * SPLIT)) * smoothstep(EDGE, EDGE * 1.01, strand);

                accumulatedGlow += lineMask * falloff * stepSize;
            }

            march += stepSize;
        }

        finalColor = palette(sin(15. * accumulatedGlow + t)) * accumulatedGlow  * 15.;
    }

    finalColor = pow(finalColor, vec3(0.5));

    FragColor = vec4(finalColor, 0.0);
}