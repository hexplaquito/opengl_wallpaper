#version 330 core
layout(location=0) out vec4 FragColor;
layout(location=1) out vec4 BrightColor;

in vec3 pos;

uniform float iTime;
uniform vec2 iResolution;

vec2  normCoord(vec2 c) {vec2 r = iResolution.xy; return (2.*c-r)/min(r.x, r.y);}
vec3  rotateVec(vec3 v, vec2 r) {float cy = cos(r.x), sy = sin(r.x), cp = cos(r.y), sp = sin(r.y); return v * mat3(cy, -sp * sy, cp * -sy, 0.0, cp, -sp,sy, sp * cy, cp * cy);}
float N1(vec2  p){ vec3 a = fract(p.xyx * .1031); a += dot(a, a.yzx + 33.33); return fract((a.x + a.y) * a.z); }
vec2  N2(vec3  p){ p = fract(p * vec3(.1031,.1030,.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xx + p.yz) * p.zy); }
vec3  N3(vec2  p){ vec3 a = fract(p.xyx * vec3(.1031,.1030,.0973)); a += dot(a, a.yxz + 33.33); return fract((a.xxy + a.yzz) * a.zyx); }
// vec4  getBBOff(vec2 o) {return texture(iChannel0, (gl_FragCoord.xy + o) / iResolution.xy);}

#define rot3 mat3(0.64, -0.48, -0.60, 0.19,  0.86, -0.48, 0.74,  0.19,  0.64);
#define yScale 7.
//Returns vec2(scalar, sideId (0 - 4))
vec2 getH(vec3 ro, vec3 rd, float a) {
	vec2 hit = ro.xz + rd.xz * a;
	vec2 oldTile;

	for(int i = 0; i < 50; i ++) {
	  //Get Tile
	  vec2 tile = floor(hit);
	  //Get height
	  vec3 v = vec3(tile, iTime) * rot3;
	  float h = min(mod(tile.x, 2.), mod(tile.y, 2.)) * yScale * (N1(tile) * .8 + .2);
	  //Hit new height
	  a = (h-ro.y) / rd.y;
	  //Return if hits in same tile
	  vec2 tileO = tile - floor(ro + rd * a).xz;
	  if(tileO == vec2(0.)) return vec2(a, 2.);
	  if(sign(tileO.x) == sign(rd.x) || sign(tileO.y) == sign(rd.z)) {
	  	vec2 as = abs(ro.xz - hit) / abs(rd.xz);
	  	a = rd.x < rd.z ? as.y : as.x; //WOW
	  	vec2 sideIDV = (oldTile - tile) * vec2(1., -2.);
	  	float sideID = sideIDV.x == 0. ? sideIDV.y : sideIDV.x;
	  	sideID += 2.;
	  	return vec2(a, sideID);
	  }
		// find next planes in xz
		vec2 nx_planes = tile + max(vec2(0.), sign(rd.xz));
		// find additional vector lengths to reach them
		vec2 ta = (nx_planes - hit) / rd.xz;
    // get minimum
    float m = min(ta.x, ta.y);
    // march by minimum and go a little into next cell
    hit += rd.xz * (m * 1.001);
		oldTile = tile;
	}
	return vec2(-1.);
}

vec3 windowP(float r) {
	return mix(vec3(1., .6, .4), vec3(.4, .7, 1.), r) * 3.;
}

vec3 getNV(float id){
	id -= 2.;
	return vec3(
		id * float(abs(id) == 1.),
		float(abs(id) < .5),
		-id / 2. * float(abs(id) == 2.)
	);
}

vec4 worldTx(vec2 h, vec3 p) {
	vec3 tn = N3(-floor(p.xz));
	if(h.y != 2.) {
		//Side
	  vec2 wall = vec2(p.x + p.z, p.y);
	  wall *= vec2(floor(tn.x * 9. + 4.), 10.);
	  float window = step(abs(.5 - fract(wall.x)), .35); //Frame
	  window *= step(fract(wall.y), tn.y * .8 + .2); //Floors
	  bool rf = window > .1;
	  window = max(0., window * N1(floor(wall)) * 2. - 1.3);
	  vec3 clr = windowP(tn.z) * window;
	  clr += max(0., 1.- p.y) * vec3(.8, .5, .2);
	  return vec4(clr, rf);
	}
	if(mod(ceil(p.x), 2.) + mod(ceil(p.z), 2.) == 0.) {
		//Roof
		if(tn.x < .9 || p.y < 6.) return vec4(0.);
		vec2 rc = fract(p.xz);
		float d = .05 / distance(rc, vec2(.5));
		d *= sin(iTime * (tn.y * 3. + 6.) + 628.);
		return vec4(1., .2, .1, 0.) * d;
	}
	//Street
	vec3 rv = vec3(.8, .5, .2);
	vec2 sc = fract(p.xz / 2.);
	if(sc.x < sc.y) sc = sc.yx;
	if(sc.x > .5) {
		if(abs(sc.y - .25) < .2) rv /= 2.;
	} else {
		vec2 corner = floor(sc * 4.) / 2.;
		if(distance(sc, corner) > .05) rv /= 2.;
	}
	//Cars
  float t = iTime * 2.;
  vec2 pt = p.xz * 2. - vec2(0., t);
	if(mod(floor(pt.x), 4.) == 1.) {
		if(N1(floor(pt)) < .1)
		rv += vec3(1., .2, .1) * max(0., .1 / distance(fract(pt), vec2(.5)) - .2);
	}
	pt = p.xz * 2. + vec2(t, 0.);
	if(mod(floor(pt.y), 4.) == 1.) {
		if(N1(floor(pt)) < .1)
		rv += vec3(1., .2, .1) * max(0., .1 / distance(fract(pt), vec2(.5)) - .2);
	}
	pt = p.xz * 2. + vec2(0., t);
	if(mod(floor(pt.x), 4.) == 0.) {
		if(N1(floor(pt)) < .1)
		rv += vec3(1.) * max(0., .1 / distance(fract(pt), vec2(.5)) - .2);
	}
	pt = p.xz * 2. - vec2(t, 0.);
	if(mod(floor(pt.y), 4.) == 0.) {
		if(N1(floor(pt)) < .1)
		rv += vec3(1.) * max(0., .1 / distance(fract(pt), vec2(.5)) - .2);
	}
	return vec4(rv, 0.);
}

void main()
{
    vec2 uv = normCoord(gl_FragCoord.xy) / 10.;
    vec3 ro = vec3(0., 22., iTime);
	vec3 rd = normalize(vec3(uv, 1.));
	rd = rotateVec(rd, vec2(-2.2, .6));
    
      float a = ((yScale/2.)-ro.y) / rd.y;
    
      float blur = abs(log(a / 33.)) * .03;
      uv += blur * N2(vec3(iTime, uv * 10000.));
      rd = normalize(vec3(uv, 1.));
	rd = rotateVec(rd, vec2(1., .6));
    
	//Hit bottom
	a = (yScale-ro.y) / rd.y;
    vec2 h = getH(ro, rd, a);
    if(h == vec2(-1.)) return;
    vec3 p = ro + rd * h.x;
    
    vec4 wtx = mix(worldTx(h, p), vec4(.2, .1, .5, 0.), clamp(1. - 30. / h.x, 0., 1.));
    if(wtx.a > .5) {
    	rd = reflect(rd, getNV(h.y));
     	h = getH(p, rd, .5);
    
      	vec3 p2 = p + rd * h.x;
    
       	wtx += worldTx(h, p2) * .4;
    }
    wtx = mix(wtx, vec4(4., 3., 6., 1.), clamp(.07 - p.y / 100., 0., 1.));

    float brightness = dot(wtx.xyz, vec3(0.2126, 0.7152, 0.0722));
    if(brightness > 1.0)
    	BrightColor = wtx;
    else
    	BrightColor = vec4(0.0);
        
    FragColor = wtx;
	// FragColor = mix(wtx, getBBOff(vec2(0.)), clamp(blur * 14., 0., .9));

}