#version 330 core
out vec4 FragColor;

in vec3 pos;

uniform float iTime;
uniform vec2 iResolution;

//---------Макросы и функции общего пользования---------------------
//Часто мною используемые
//Могут содержать ошибки, которые исправляются по мере их выявления
//Base on "Raymarching Primitives" created by inigo quilez - iq/2013
//https://www.shadertoy.com/view/Xds3zN
//------------------------------------------------------------------
#if __VERSION__ < 300
	#define round(x) floor((x) + 0.5)
	#define sinh(x) (0.5*( exp(x) - exp(-(x)) ))
	#define cosh(x) (0.5*( exp(x) + exp(-(x)) ))
	#define tanh(x) (sinh(x)/cosh(x))
	#define asinh(x) log((x) + sqrt((x)*(x) + 1.))
	#define acosh(x) log((x) + sqrt((x)*(x) - 1.))
	#define atanh(x) 0.5*log((1.+(x))/(1.-(x)))
	int mod(int x, int y) { return int(mod(float(x),float(y))); }
int abs(int x) { return int(abs(float(x))); }
int max(int x, int y) { return int(max(float(x), float(y))); }
int min(int x, int y) { return int(min(float(x), float(y))); }
#endif

const float PI = radians(180.);
//Камера
struct Camera {
    //Задаваемые параметры
    float fov, aspect;
    vec3  origin, target, up;
    mat3 vMat, mMat;
    //Расчетные параметры
    float factor;
    vec3  forward, right, position, coord;
    mat3 pMat, uMat;
};

//Параметры объекта
struct Object {
    float   distance;	//Последнее приближение к объекту сцены
    float 	id;			//id найденого объека сцены
    vec3 	position;	//Координатв поверхности объекта
};

//Луч
struct Ray {
    //Задаваемые параметры
    vec3  origin;		//Начало луча
    vec3  direction;	//Направление луча
    float near;			//Минимальное расстояние от камеры (начало сцены)
    float far;			//Максивальное расстояние от камеры (конец сцены)
    float epsilon;		//Точность обнаружения поверхности
    float steps;		//Максимальное число итераций
    float swing;		//"+" -колебание в найденной точке, "-"
    //Вычисляемые параметры
    float distance; 	//Расстояние до объекта сцены от ray.origin в направлении ray.direction
    vec3  position; 	//Точка поверхности
    vec3  normal;		//Нормаль в точке поверхности
    bool  hit;			//Флаг нахождения точки поверхности с заданной точностью
    Object object;		//Параметры объекта (можно формировать непосредственно в карте расстояний)
};
//Формирование луча камеры
Ray lookAt (in vec2 uv, inout Camera cam) {
    //Расчетные характеристики камеры
    cam.factor		= 1.0/tan(radians(cam.fov/2.));
    cam.forward 	= normalize(cam.target-cam.origin);
    cam.right 		= normalize(cross(cam.up, cam.forward));
    cam.up 			= cross(cam.forward, cam.right);
    cam.position 	= cam.origin + cam.factor * cam.forward;
    cam.coord 		= cam.position + uv.x * cam.right*cam.aspect + uv.y * cam.up;
    cam.pMat 		= mat3(cam.right, cam.up, cam.forward);

    //Формирование луча
    Ray ray;
    {
        ray.origin 		= cam.mMat * cam.origin;
        ray.direction 	= cam.mMat * normalize( cam.pMat * cam.vMat * vec3(uv.x*cam.aspect, uv.y, cam.factor));
        //Умолчания
        ray.near		= 0.01;
        ray.far			= 100.;
        ray.epsilon		= 0.001;
        ray.swing		= 1.0;
        ray.steps		= 200.;
    }
    return ray;
}
//-------------------функции трансформации и позиционирования объектов сцены
//Допустимая ошибка (для удаления артефактов) 1./min(u_canvas.x, u_canvas.y)
float EPS = 0.01;
//Скругление по верхней границе
//Функция расстояния до фигуры со скругленными ребрами (объединение и сглаживание с увеличением на R)
//float d - сглаживание фигуры
//vec2 d - объединение и сглаживание двух фигур
//vec3 d - объединение и сглаживание трех фигур
//vec4 d - объединение и сглаживание четырех фигур
#define TF_ROUND(d, R) (length(max(d, 0.)) - (R))
//Функция расстояния до бокса (p vec3) или прямоугольника (p vec2) со скругленными ребрами
//Функция расстояния до капсулы, если два размера 0
#define TF_BOX_ROUND(p, S, R) TF_ROUND(abs(p)-(S), R)
#define TF_BOX_ROUND1(p, S, R) TF_ROUND(abs(p)-(S) + R, R)
//Функция расстояния до бокса (p vec3) или прямоугольника (p vec2)
#define TF_BOX(p, S) TF_BOX_ROUND(p, S, 0.)
#define TF_BOX1(p, S) TF_BOX_ROUND(p, S, EPS)
#define TF_BOXE(p, S) TF_BOX_ROUND(p, S - EPS, EPS)
#define TF_BOX3D(p, S) max(abs((p).x)-vec3(S).x, max(abs((p).y)-vec3(S).y, abs((p).z)-vec3(S).z))
#define TF_BOX2D(p, S) max(abs((p).x)-vec2(S).x, abs((p).y)-vec2(S).y)
#define TF_BOX3D_SD(p, S) (TF_BOX(p, S) + min(TF_BOX3D(p, S), 0.))
#define TF_BOX2D_SD(p, S) (TF_BOX(p, S) + min(TF_BOX2D(p, S), 0.))

//Скругление по нижней границе
#define TF_ROUND_MIN(d, R) (-length(min(d, 0.)) + (R))
#define TF_CROSS_ROUND(p, S, R) TF_ROUND_MIN(abs(p)-(S), R)
#define TF_CROSS(p, S) TF_CROSS_ROUND(p, S, 0.)
#define TF_CROSS3D(p, S) min(abs((p).x)-vec3(S).x, min(abs((p).y)-vec3(S).y, abs((p).z)-vec3(S).z))
#define TF_CROSS2D(p, S) min(abs((p).x)-vec2(S).x, abs((p).y)-vec2(S).y)
#define TF_CROSS3D_SD(p, S) TF_CROSS(p, S) + max(TF_CROSS3D(p, S), 0.)
#define TF_CROSS2D_SD(p, S) TF_CROSS(p, S) + max(TF_CROSS2D(p, S), 0.)

#define TF_CROSS_BOX2D(p, S) min(TF_BETWEEN((p).x, vec2(S).x), TF_BETWEEN((p).y, vec2(S).y))
#define TF_CROSS_BOX3D(p, S) min(TF_BOX2D((p).xy, vec3(S).z), min(TF_BOX2D((p).xz, vec3(S).y), TF_BOX2D((p).yz, vec3(S).x)))

//Функция расстояния до шара (p vec3) или круга (p vec2)
#define TF_BALL(p, R) TF_ROUND(abs(p), R)
#define TF_BALL_N(p, R, n) pow(abs(TF_BALL(        pow(abs(p), (p)*0.+(n)),            0.)), 1./(n)) - (R)
//#define TF_BALL_N(p, R, n) pow(abs(TF_BEFORE_PLANE(pow(abs(p), (p)*0.+(n)), (p)*0.+1., 0.)), 1./(n)) - (R)

//Эллипс
#define TF_ELLIPSE3D(p, r) min ((r).x, min((r).y, (r).z)) * TF_BALL((p)/(r), 1.)
#define TF_ELLIPSE2D(p, r) min ((r).x, (r).y) * TF_BALL((p)/(r), 1.)

//Преобразует пространство в отрезок от a до b
#define TF_LINE(p, a, b) \
	p = (p)-(a) - ((b)-(a))*clamp( dot((p)-(a),(b)-(a))/dot((b)-(a),(b)-(a)), 0.0, 1.0 )

//Отрезок от a до b радиусом r
#define VAR 1
#if VAR==1
	#define TF_SEGMENT(p, a, b, r) TF_BALL((p)-(a) - ((b)-(a)) * clamp( dot((p)-(a),(b)-(a))/dot((b)-(a),(b)-(a)), 0.0, 1.0 ), r)
#elif VAR==2
	//с преобразованием пространства p
#define TF_SEGMENT(p, a, b, r) (TF_LINE(p, a, b), TF_BALL(p, r))
#elif VAR==3
	//https://suricrasia.online/blog/shader-functions/
#define TF_SEGMENT(p, a, b, r) distance((p), mix((a), (b), clamp(dot((p)-(a), (b)-(a))/dot((b)-(a), (b)-(a)), 0 , 1 ))) - (r);
#endif
#undef VAR

//Рамка размером s и толщиной t
#define TF_FRAME_BOX(p, s, t) (\
	p = abs(p) - (s), \
	p.xy = p.x>p.y ? p.xy : p.yx, \
	p.xz = p.x>p.z ? p.xz : p.zx, \
	TF_BOX(p.yz, (t)) \
)

//Функция расстояния до пространства ДО p1
#define TF_BEFORE(p, p1) (p - (p1))
#define TF_BEFORE_EPS(p, p1) TF_ROUND(p - (p1) + EPS, EPS)
//Функция расстояния до пространства ДО normal с отступом p1
#define TF_BEFORE_PLANE(p, normal, off) dot(p, normal) - (off)
//Функция расстояния до пространства ДО p.x c предварительным вращением плоскости p.xy на угол ang и последующим отступом off
#define TF_BEFORE_ROTATE(p, ang, off) dot((p).xy, cos ((ang) + vec2 (0, 0.5 * PI))) - (off)

//Функция расстояния до пространства ПОСЛЕ p1
#define TF_AFTER(p, p1) (-p + (p1))
#define TF_AFTER_EPS(p, p1) TF_ROUND(-p + (p1) + EPS, EPS)
//Функция расстояния до пространства ПОСЛЕ normal с отступом p1
#define TF_AFTER_PLANE(p, normal, off) dot(-p, normal) + (off)
//Функция расстояния до пространства ПОСЛЕ p.x c предварительным вращением плоскости p.xy на угол ang и последующим отступом off
#define TF_AFTER_ROTATE(p, ang, off) dot((-p).xy, cos ((ang) + vec2 (0, 0.5 * PI))) + (off)

//Функция расстояния до симметричного пространства МЕЖДУ -p1 и +p1
//#define TF_BETWEEN(p, p1) TF_ROUND(abs(p) - (p1) + EPS, EPS)
#define TF_BETWEEN(p, p1) (abs(p) - (p1))
#define TF_BETWEEN_EPS(p, p1) TF_ROUND(abs(p) - (p1) + EPS, EPS)
//Функция расстояния до несимметричного пространства МЕЖДУ p1 и p2
//#define TF_BETWEEN2(p, p1, p2) TF_ROUND( abs(p - 0.5*(p1+p2)) - 0.5*(p2-p1) + EPS, EPS)
#define TF_BETWEEN2(p, p1, p2) (abs(p - 0.5*((p1)+(p2))) - 0.5*((p2)-(p1)))

//Функция расстояния до симметричного пространства МЕЖДУ двумя симметричными нормалями толщиной off
#define VAR 1
#if VAR==1
	#define TF_BETWEEN_PLANE(p, normal, off) AND(TF_AFTER_PLANE(p, normal, -off), TF_BEFORE_PLANE(p, normal, off))
#elif VAR==2
	#define TF_BETWEEN_PLANE(p, normal, off) TF_BEFORE_PLANE(abs(p), normal, off)
#endif
#undef VAR

//Функция расстояния до симметричного пространства МЕЖДУ двумя симметричными нормалями толщиной off
#define TF_BETWEEN_ROTATE(p, ang, off) AND(TF_AFTER_ROTATE((p).xy, ang, -0.5*off), TF_BEFORE_ROTATE((p).xy, ang, 0.5*off))

//Перемещение пространства p (float p...vec4 p)
#define TF_TRANSLATE(p, d) p -= d;
//Масштаб
#define TF_SCALE(p, s) p /= s

#define TF_ROUND_UP(x, f) (floor((x)/(f) + 0.5)*(f))

//Преобразование в цилиндрическую систему координат
//Возвращает: p.x - угол круга R, p.y - расстояние от поверхности R
#define VAR 2
#if VAR==1
	//Круглый без n
#define TF_CYL(p, R, n) {\
		float l = length(p.xy);\
		p /= l;\
		p.x = (R)*atan(p.x,p.y);\
		p.y = l - (R);\
	}
#elif VAR==2
	//Круглый c n
#define TF_CYL(p, R, n) {\
		float l = pow(length(pow(abs(p.xy),vec2(n))), 1./(n));\
		p /= l;\
		p.x = (R)*atan(p.x,p.y);\
		p.y = l - (R);\
	}
#elif VAR==3
	//Эллипс без n
#define TF_CYL(p, R, n) {\
		float r = min (vec2(R).x, vec2(R).y);\
		float l = r * length(p.xy/vec2(R));\
		p /= l;\
		p.x = (r) * atan(p.x,p.y);\
		p.y = l - (r);\
	}
#elif VAR==4
	//Эллипс c n
#define TF_CYL(p, R, n) {\
		float r = min (vec2(R).x, vec2(R).y);\
		float l = r * pow(length(pow(abs(p.xy)/vec2(R),vec2(n))), 1./float(n));\
		p /= l;\
		p.x = (r) * atan(p.x,p.y);\
		p.y = l - (r);\
	}
#endif
#undef VAR

#define VAR 1
#if VAR==1
	//Преобразование из цилиндрической в декартовую систему координат
#define TF_ACYL(p, R) \
		p.xy = (p.y + R) * vec2(sin(p.x/(R)), cos(p.x/(R)))
	//Преобразование в систему координат тора.
//Возвращает: p.x - угол круга R, p.y - угол круга r, p.z - расстояние от поверхности
//Для нескольких преобразований  p = p.xzy
#define TF_TORUS_Y(p, R, r) \
		TF_CYL(p.xz, R, 1.);\
		TF_CYL(p.yz, r, 1.)
#elif VAR==2
	//Преобразование из цилиндрической в декартовую систему координат
#define TF_ACYL(p, R) \
		p.xy = (p.y + R) * vec2(sin(p.x), cos(p.x))
	//Преобразование в систему координат тора.
//Возвращает: p.x - угол круга R, p.y - угол круга r, p.z - расстояние от поверхности
//Для нескольких преобразований  p = p.xzy
#define TF_TORUS_Y(p, R, r) \
		TF_CYL(p.xz, R, 1.);\
		TF_CYL(p.yz, r, 1.);\
		p.x /= R;\
		p.y /= r
#endif
#undef VAR

//Преобразование из системы координат тора в декартовую
#define TF_ATORUS_Y(p, R, r) \
	TF_ACYL(p.yz, r);\
	TF_ACYL(p.xz, R)

//Преобразование в систему координат сферы/эллипса
//Возвращает: p.xz - поверхность, p.y - расстояние от поверхности
#define VAR 3
#if VAR==1
	//Круглый без n
#define TF_SPH_Y(p, R, n) {\
		float l = length(p.xyz);\
		p /= l;\
		p.x = (R)*atan(p.x,p.z);\
		p.z = (R)*acos(p.y);\
		p.y = l-(R);\
	}
#elif VAR==2
	#define TF_SPH_Y(p, R, n) \
		TF_CYL(p.xz, R, 1.);\
		p.z -= -R;\
		TF_CYL(p.zy, R, 1.)
#elif VAR==3
	#define TF_SPH_Y(p, R, n) {\
		vec3 np = normalize(p);\
		p = vec3(\
			R * acos( dot(normalize(vec3(np.x, 0, np.z)), vec3(0,0,1)) ),\
			length(p)-R,\
			R * acos( dot(np, vec3(0,1,0)) )\
		);\
	}
#elif VAR==4
	//Эллипс без n
#define TF_SPH_Y(p, R, n) {\
		float r = min (vec3(R).x, min(vec3(R).y, vec3(R).z));\
		float rr = max (vec3(R).x, max(vec3(R).y, vec3(R).z));\
		float l = r * length(p.xyz/vec3(R));\
		p /= l;\
		p.x = (r)*atan(p.x,p.z);\
		p.z = (r)*acos(p.y);\
		p.y = l - (r);\
	}
#elif VAR==5
	//Эллипс с n
#define TF_SPH_Y(p, R, n) {\
		float r = min (vec3(R).x, min(vec3(R).y, vec3(R).z));\
		float l = r * pow(length(pow(abs(p)/vec3(R),vec3(n))), 1./float(n));\
		p /= l;\
		p.x = (r)*atan(p.x,p.z);\
		p.z = (r)*acos(p.y);\
		p.y = l - (r);\
	}
#endif
#undef VAR

//Преобразование из сферической в декартовую систему координат
#define VAR 1
#if VAR==1
	#define TF_ASPH_Y(p, R) \
		p.xyz = (p.y + (R)) * vec3(sin(p.z/(R))*sin(p.x/(R)), cos(p.z/(R)), sin(p.z/(R))*cos(p.x/(R)))
#elif VAR==2
	#define TF_ASPH_Y(p, R) \
		TF_ACYL(p.zy, R);\
		p.z -= R;\
		TF_ACYL(p.xz, R)
#endif
#undef VAR

//Вращение пространства p (vec2 p)
#define VAR 2
#if VAR==1
	#define TF_ROTATE(p, a) p = mat2(cos(a), sin(a), -sin(a), cos(a)) * p
#elif VAR==2
	#define TF_ROTATE(p, a) p = p.xy * cos (a) * vec2 (1., 1.) + p.yx * sin (a) * vec2 (-1., 1.)
#endif
#undef VAR

#define TF_ROTATE_MAT2(a) mat2(cos(a), sin(a), -sin(a), cos(a))
#define TF_ROTATE_X(a) mat3(1.0,    0.0, 0.0,       0.0, cos(a), -sin(a),   0.0, sin(a), cos(a))
#define TF_ROTATE_Y(a) mat3(cos(a), 0.0, -sin(a),   0.0, 1.0, 0.0,   	    sin(a), 0.0, cos(a))
#define TF_ROTATE_Z(a) mat3(cos(a), -sin(a), 0.0,   sin(a), cos(a), 0.0,   	0.0, 0.0, 1.0)
#define TF_ROTATE_X_90(p) p.xyz = p.xzy
#define TF_ROTATE_Y_90(p) p.xyz = p.zyx
#define TF_ROTATE_Z_90(p) p.xyz = p.yxz

#define VAR 2
#if VAR==1
	#define TF_ROTATE_AXIS(p, ax, a) {\
		float c = cos(a);\
		float s = sin(a);\
		mat3 tMat = mat3(\
			c + (1.0 - c) * ax.x * ax.x, (1.0 - c) * ax.x * ax.y - s * ax.z, (1.0 - c) * ax.x * ax.z + s * ax.y,\
			(1.0 - c) * ax.x * ax.y + s * ax.z, c + (1.0 - c) * ax.y * ax.y, (1.0 - c) * ax.y * ax.z - s * ax.x,\
			(1.0 - c) * ax.x * ax.z - s * ax.y, (1.0 - c) * ax.y * ax.z + s * ax.x, c + (1.0 - c) * ax.z * ax.z\
		);\
		p = tMat * p;\
	}
#elif VAR==2
	#define TF_ROTATE_AXIS(p, ax, a) \
		p = mix(dot(p, ax) * (ax), p, cos(a)) - sin(a) * cross(ax, p)
#elif VAR==3
	//https://suricrasia.online/blog/shader-functions/
#define TF_ROTATE_AXIS(p, ax, an) \
		p = mix(dot(ax, p) * (ax), p, cos(a)) + sin(a) * cross(ax, p)
#endif
#undef VAR

//Отражение пространства p (float p...vec4 p)
#define TF_MIRROR(p, d) p = abs(p) - (d)

//Разбиение пространства на повторяющиеся. Возвращает id центра ячейки
//float p - пространство 1D
//vec2 p - пространство 2D
//vec3 p - пространство 3D
#define VAR 1
#if VAR==1
	#define TF_REPLICA(p, d)\
		floor((p)/(d) + 0.5);\
		p -= (d)*floor((p)/(d) + 0.5)
#elif VAR==2
	#define TF_REPLICA(p, d)\
		floor((p)/(d) + 0.5);\
		p = (fract((p)/(d) + 0.5) - 0.5) * (d)
#elif VAR==3
	#define TF_REPLICA(p, d) \
		floor((p)/(d) + 0.5);\
		p = mod((p) + 0.5*(d), d) - 0.5*(d)
#endif
#undef VAR

//Разбиение пространства на повторяющиеся в диапазоне id от ida до idb включительно. Возвращает id центра ячейки
#define TF_REPLICA_LIMIT(p, d, ida, idb) \
	clamp(floor((p)/(d) + 0.5), ida, idb);\
	p -= (d)*clamp(floor((p)/(d) + 0.5), ida, idb)

#define VAR 2
#if VAR==1
	#define TF_REPLICA_LIMIT_MIRROR(p, d, id) \
		clamp(floor((p = abs(p) - 0.5*d)/(d) + 0.5), 0., id-1.);\
		p -= (d)* clamp(floor((p)/(d) + 0.5), 0., id-1.)
#elif VAR==2
	#define TF_REPLICA_LIMIT_MIRROR(p, d, id) \
		clamp(floor((p=p-0.5*(d))/(d) + 0.5), -id, id-1.);\
		p -= (d)*clamp(floor((p)/(d) + 0.5), -id, id-1.)
#endif
#undef VAR

//Разбиение пространства на повторяющиеся сектора в плоскости vec2 p в полярной системе координат
//Возвращает id сектора
#define VAR 3
#if VAR==1
	#define TF_REPLICA_ANGLE_POLAR(p, n, off)\
		floor(mod(atan(p.x, p.y) - (off) + PI /(n), 2.*PI)/(2.*PI/(n)));\
		p = vec2(atan(p.x, p.y) - (off), length(p.xy));\
		p.x = mod(p.x + 0.5*(2.*PI/(n)), (2.*PI/(n))) - 0.5*(2.*PI/(n))
#elif VAR==2
	#define TF_REPLICA_ANGLE_POLAR(p, n, off)\
		mod(floor((atan(p.x, p.y) - (off))/(2.*PI)*(n) + 0.5), n);\
		p.xy = vec2(atan(p.x, p.y) - (off), length(p.xy));\
		TF_REPLICA(p.x, 2.*PI/(n))
#elif VAR==3
	#define TF_REPLICA_ANGLE_POLAR(p, n, off)\
		mod(floor((p.xy = vec2(atan(p.x, p.y) - (off), length(p.xy))).x/(2.*PI)*(n) + 0.5), n);\
		TF_REPLICA(p.x, 2.*PI/(n))
#endif
#undef VAR

//Разбиение пространства на повторяющиеся сектора в плоскости vec2 p в декартовой системе координат
//Возвращает id сектора
#define VAR 5
#if VAR==1
	#define TF_REPLICA_ANGLE(p, n, off) \
		mod(floor((atan(p.x,p.y) - (off))/(2.*PI/(n)) + 0.5), (n));\
		{\
			float an = (2.*PI/(n));\
			float a = atan(p.x,p.y) - off;\
			float id = floor(a/an + 0.5);\
			id = mod(id, (n));\
			a -= an*id;\
			p.xy = vec2(sin(a),cos(a))*length(p.xy);\
		}
#elif VAR==2
	#define TF_REPLICA_ANGLE(p, n, off) \
		mod(floor((atan(p.x,p.y) - (off))/(2.*PI)*(n) + 0.5), n);\
		TF_ROTATE(p.xy, (off) + (2.*PI)/(n) * floor((atan(p.x,p.y) - (off))/(2.*PI)*(n) + 0.5))
#elif VAR==3
	#define TF_REPLICA_ANGLE(p, n, off) \
		floor(mod(atan(p.x, p.y) - (off) + PI /(n), 2.*PI)/(2. * PI/(n)));\
		TF_ROTATE(p.xy, (off) + (2.*PI)/(n) * floor(mod(atan(p.x, p.y) - (off) + PI /(n), 2.*PI)/(2.*PI)*(n)))
#elif VAR==4
	#define TF_REPLICA_ANGLE(p, n, off) \
		mod(TF_ROUND_UP(atan(p.x, p.y) - (off), 2.*PI/(n)) / (2.*PI) * (n), (n));\
		TF_CYL(p.xy, 1., 1.);\
		p.x -= (off);\
		TF_REPLICA(p.x, 2.*PI*1./(n));\
		TF_ACYL(p.xy, 1.)
#elif VAR==5
	#define TF_REPLICA_ANGLE(p, n, off) \
		TF_REPLICA_ANGLE_POLAR(p, n, off);\
		p.xy = p.y * vec2(sin(p.x), cos(p.x))
#endif
#undef VAR

//Преобразование пространства в винт
// R  - радиуc
// N  - число заходов
// S  - шаг
// A  - закручивание вдоль спирали (угол предварительного вращения)
// Размер спирали можно огранияивать по p.y
#define VAR 2
#if VAR==1
	#define TF_HELIX_Y(p, N, R, S, A)\
		TF_CYL(p.xz, R, 1.);\
		{\
			float a = (N)*p.x/(2.*PI*(R));\
			TF_TRANSLATE(p.y, (S)*a);\
			float id = TF_REPLICA(p.y, (S));\
			p.x -= -id*(2.*PI*R)/(N);\
			TF_ROTATE(p.yz, (A) * PI * a);\
		}\
		p = p.zxy
#elif VAR==2
	#define TF_HELIX_Y(p, N, R, S, A)\
		TF_CYL(p.xz, R, 1.);\
		p.y -= (p.x-(A))*(S)*(N)/(2.*PI*(R));\
		p.x += (2.*PI*R)/(N) * TF_REPLICA(p.y, (S));\
		p = p.zxy
#endif
#undef VAR

//Преобразование пространства в псевдовинт радиусом R, с числом заходов n, с шагом step и с числом секторов на один оборот sect
#define TF_REPLICA_SPIN_Y(p, n, R, step, sect) \
	{\
		float a = atan(p.x, p.z)/(2.*PI);\
		p.y -= a * (n) * (step);\
		TF_REPLICA(p.y, step);\
		TF_REPLICA_ANGLE(p.xz, sect, 0.);\
		p.z -= R;\
	}\
	p = p.zxy;

//По p2.xy формирует координату винта c числом заходов n вдоль p1 с шагом step
#define TF_REPLICA_SPIN(p1, p2, n, step) \
	p1 -= (atan((p2).x,(p2).y)/(2. * PI))*(n)*(step);\
	TF_REPLICA(p1, (step))
#define TF_REPLICA_SPIN_LIMIT(p1, p2, n, step, ida, idb) \
	p1 -= (atan((p2).x,(p2).y)/(2. * PI))*(n)*(step);\
	TF_REPLICA_LIMIT(p1, (step), ida, idb)

//Преобразование пространства p.xy в РАВНОМЕРНУЮ спираль
// 	N - число ветвей
// 	S - коэффициент расширения
// 	A - предварительный угол вращения в радианах
//После преобразования
//	p.x - размер спирали (можно ограничивать)
//	p.y - расстояние до спирали.
//  ID  - номер ветви
#define VAR 3
#if VAR==1
	#define TF_SPIRAL(p, N, S, A)\
		1.;\
		{\
			TF_CYL(p.xy, 1., 1.);\
			p.x -= A;\
			p.y -= (N)/(2.*PI)*p.x*(S) - 1.;\
			p.x += (2.*PI)/(N) * TF_REPLICA(p.y, (S));\
			p.x = 0.5*(S)*(p.x*sqrt(1.0+p.x*p.x) + log(p.x+sqrt(1.0+p.x*p.x)))*(N)/(2.*PI);\
		}
#elif VAR==2
	#define TF_SPIRAL(p, N, S, A)\
		TF_CYL(p.xy, 1., 1.);\
		p.x -= (A);\
		p.y -= (N)*(S)*p.x - 1.;\
		p.x += 2.*PI/(N) * TF_REPLICA(p.y, 2.*PI*(S))
#elif VAR==3
	#define TF_SPIRAL_(p, N, S, A, ID)\
		TF_CYL(p.xy, 1., 1.);\
		p.x -= A;\
		p.y -= (N)/(2.*PI)*p.x*(S)-1.;\
		ID = TF_REPLICA(p.y, (S));\
		p.x += (2.*PI)/(N) * ID;\
		ID = mod(ID, N);\
		/*p.x = 0.5*(S)*(p.x*sqrt(1.0+p.x*p.x) + log(p.x+sqrt(1.0+p.x*p.x)))*(N)/(2.*PI)*/
#endif
#undef VAR

//Преобразование пространства p.xy в РАСШИРЯЮЩУЮСЯ (ЛОГАРИФМИЧЕСКУЮ) спираль
// 	N - число ветвей
// 	S - коэффициент расширения
// 	A - предварительный угол вращения в радианах
//После преобразования
//	p.x - размер спирали (можно ограничивать)
//	p.y - расстояние до спирали.
//Возвращает масштаб для корректировки координаты z протягиваемого профиля
#define VAR 3
#if VAR==1
	#define TF_SPIRAL_LOG(p, N, S, A)\
		length(p.xy);\
		{\
			TF_CYL(p.xy, 1., 1.);\
			p.x -= A;\
			p.x *= (N)/(2.*PI);\
			p.y = log(p.y + 1.) - (S)*p.x;\
			p.x += TF_REPLICA(p.y, S);\
		}
#elif VAR==2
	#define TF_SPIRAL_LOG(p, N, S, A)\
		length(p.xy);\
		{\
			TF_CYL(p.xy, 1., 1.);\
			p.x -= A;\
			p.y = log(p.y + 1.) - (N)/(2.*PI)*p.x*(S);\
			p.x += (2.*PI)/(N) * TF_REPLICA(p.y, S);\
		}
#elif VAR==3
	#define TF_SPIRAL_LOG(p, N, S, A)\
		length(p.xy);\
		{\
			TF_CYL(p.xy, 1., 1.);\
			p.x -= (A);\
			p.y = log(p.y) - (N)*(S)*p.x + 1.;\
			p.x += 2.*PI/(N) * TF_REPLICA(p.y, 2.*PI*(S));\
		}
#endif
#undef VAR

//Преобразование пространства p.xyz в РАВНОМЕРНУЮ спираль на сфере
// 	N - число ветвей
// 	R - радиус шара
// 	Sy - коэффициент расширения (шаг)
//После преобразования
//	p.y - продольная координата спирали (можно ограничивать)
//	p.xz - поперечные координаты спирали.
#define TF_SPIRAL_SPH_Y(p, N, R, Sy, off) \
	sin(acos(p.y/length(p)));\
	{\
		float s = (2.*PI*(R))/(N);\
		TF_SPH_Y(p, R, 1.);\
		p.z -= off + p.x*(Sy)/s;\
		p.x += s*TF_REPLICA(p.z, (Sy));\
		p = p.yxz;\
	}


//Преобразует пространство p в n сферических сегментов. Возырвщвет id сегментв
#define TF_REPLICA_ANGLE_SPHERIC(p, nx, nz, id)\
	p = vec3( atan (p.x, p.z)*(nx)/(2. * PI), length (p), asin (p.y / length (p))*(nz)/PI );\
	if (mod(nz, 2.)==0.) p.z -= 0.5;\
	id = TF_REPLICA(p.xz, 1.)

//------------------------------------------------------------------------------------------------------
//Возвращает 0 или 1 в зависимоти от знячения p относительно a или b
//Операция ИЛИ(OR) 	: step1 + step2 (сложение)
//Операция И(AND) 	: step1 * step2 (умножение)
//Операция NOT 		: 1. - step
//------------------------------------------------------------------------------------------------------
//Возвращает 1 если p > a
//    1-----
//    |
//----0
//    a
#define TF_STEP_AFTER(p, a) step(a, p)

//Возвращает 1 если p < a
//----1
//    |
//    0-----
//    a
#define TF_STEP_BEFORE(p, a) step(p, a)

//Возвращает 1 если -a < p < a
//    1------1
//    |      |
//----0      0--------
//   -a      +a
#define TF_STEP_BETWEEN(p, a) TF_STEP_BEFORE(abs(p), a)
//Возвращает 1 если a < p < b
//    1------1
//    |      |
//----0      0--------
//    a      b
#define TF_STEP_BETWEEN2(p, a, b) TF_STEP_AFTER(p, a)*TF_STEP_BEFORE(p, b)

//------------------------------------------------------------------------------------------------------
//Возвращает 0 или 1 в зависимоти от знячения p относительно a или b со сглаживанием [-0.5*eps, 0.5*eps]
//Операция ИЛИ(OR) 	: smoothstep1 + smoothstep2 (сложение)
//Операция И(AND) 	: smoothstep1 * smoothstep2 (умножение)
//Операция NOT 		: 1. - smoothstep
//------------------------------------------------------------------------------------------------------
//Возвращает
//	0 если p < a-eps/2;
//	1 если p > a+eps/2;
//  сглаживание от 0 до 1  между a-0.5*eps и a+0.5*eps
//      1-----
//     /
//----0
//   |eps|
//     a
//
//      1-----
//     /
//----0
//    a  b
//
#define TF_SMOOTHSTEP_AFTER_EPS(p, a, eps) smoothstep(a-0.5*eps, a+0.5*eps, p)
#define TF_SMOOTHSTEP_AFTER(p, a, b) smoothstep(a, b, p)
//Возвращает
//	1 если p < a-eps/2;
//	0 если p > a+eps/2;
//  сглаживание от 1 до 0  между a-eps/2 и a+eps/2
//----1
//     \
//      0------
//   |eps|
//     a
//
//-----1
//      \
//       0------
//    a  b
//
#define TF_SMOOTHSTEP_BEFORE_EPS(p, a, eps) (1.-smoothstep(a-0.5*eps, a+0.5*eps, p))
#define TF_SMOOTHSTEP_BEFORE(p, a, b) (1.-smoothstep(a, b, p))

//Возвращает
//	1 если p > -a+eps/2  и  p < a-eps/2;
//	0 если p < -a-eps/2 или p > a+eps/2;
//  сглаживание от 0 до 1  между -a-eps/2 и -a+eps/2
//  сглаживание от 1 до 0  между  a-eps/2 и  a+eps/2
//      1-----1
//     /       \
//----0         0------
//    |eps|  |eps|
//     -a     +a
//
//      1-----1
//     /       \
//----0         0------
//   -b -a   +a +b
//
#define TF_SMOOTHSTEP_BETWEEN_EPS(p, a, eps) TF_SMOOTHSTEP_BEFORE_EPS(abs(p), a, eps)
#define TF_SMOOTHSTEP_BETWEEN(p, a, b) TF_SMOOTHSTEP_BEFORE(abs(p), a, b)
//Возвращает
//	1 если p > a+eps/2  и  p < b-eps/2;
//	0 если p < a-eps/2 или p > b+eps/2;
//  сглаживание от 0 до 1  между a-eps/2 и a+eps/2
//  сглаживание от 1 до 0  между b-eps/2 и b+eps/2
//      1-----1
//     /       \
//----0         0------
//    |eps|  |eps|
//      a      b
//
//      1-----1
//     /       \
//----0         0------
//   a1  b1  a2  b2
//
#define TF_SMOOTHSTEP_BETWEEN2_EPS(p, a, b, eps) TF_SMOOTHSTEP_AFTER_EPS(p, a, eps)*TF_SMOOTHSTEP_BEFORE_EPS(p, b, eps)
#define TF_SMOOTHSTEP_BETWEEN2(p, a1, b1, a2, b2) TF_SMOOTHSTEP_AFTER(p, a1, b1)*TF_SMOOTHSTEP_BEFORE(p, a2, b2)


//Разбивает время time на intervalCount равных отрезков продолжительностью intervalDuration
//Возвращает:
//	значени uv0_value для TF_TIMER_VIEW
//	в intervalId  - номер отрезка времени 0,1,2... для момента time
//	в fade - значение затухания при смене интервала
//                -------
//               |
//        -------
//       |
//-------
//   0       1       2
#define TF_TIMER(time, intervalCount, intervalDuration, intervalId, fade) \
	mod(time, intervalDuration*intervalCount)/(intervalDuration*intervalCount);\
	intervalId = mod(floor(time/(intervalDuration)), (intervalCount));\
	time = mod(time, intervalDuration);\
	fade = smoothstep(0., 1., time) * smoothstep(intervalDuration, intervalDuration-1., time)
//Выводит диаграмму процесса
#define TF_TIMER_VIEW(col, pix, uv0_value) {\
		vec2 uv0 = gl_FragCoord.xy/iResolution.xy;\
		if (uv0.y<pix/iResolution.y && uv0.x<uv0_value) col = vec3(1,0,0);\
	}
//Пример разбиения времени на 3 отрезка продолжительностью 15 сек
/*
	float period_ID;
	float fade;
	float t = time;
	float uv0_value = TF_TIMER(t, 3., 15., period_ID, fade);
	if (period_ID==0.) {
  		...
	} else if (period_ID==1.) {
  		...
	} else {
  		...
	}
  	...
	vec3 col = render(ray);
  	...
	col *= fade;
	TF_TIMER_VIEW(col, 5., uv0_value);
  	gl_FragColor = vec4(col, 1.0);
*/

//-------------------Функции сочетания расстояний до объектов сцены
//Сложение / Объединение / ИЛИ
float OR(float distA, float distB) {
    return min(distA, distB);
    //if (distB<distA) return distB; return distA;
    //return mix(distA, distB, step(distB, distA));
}
//Умножение / Пересечение / И
float AND(float distA, float distB) {
    return max(distA, distB);
    //return -OR(-distA, -distB);
    //if (distB>distA) return distB; return distA;
    //return mix(distA, distB, step(distA, distB));

}
//Исключающее ИЛИ
float XOR(float distA, float distB) {
    return max(-max(-distA, -distB), min(-distA, -distB));
}

// Минимальная функция сглаживания. Есть бесчисленное множество статей, но IQ объясняет это лучше всего здесь:
// http://iquilezles.org/www/articles/smin/smin.htm
//Гладкое сложение / Объединение / ИЛИ (k==0 без)
float OR( float distA, float distB, float k ) {
    if (k==0.) return OR(distA, distB);
    float h = clamp( 0.5 + 0.5*(distB-distA)/k, 0., 1. );
    return mix( distB, distA, h ) - k*h*(1.-h);
}
//Гладкое умножение / Пересечение / И (k==0 без)
#define VAR 1
#if VAR==1
	float AND( float distA, float distB, float k ) {
    if (k==0.) return AND(distA, distB);
    float h = clamp( 0.5 - 0.5*(distB-distA)/k, 0., 1. );
    return mix( distB, distA, h ) + k*h*(1.-h);
}
#elif VAR==2
	float AND( float distA, float distB, float k ) {
    if (k==0.) return AND(distA, distB);
    return - OR (- distA, - distB, k);
}
#endif
#undef VAR
//Гладкое исключающее ИЛИ
float XOR(float distA, float distB, float k) {
    if (k==0.) return XOR(distA, distB);
    return AND(-AND(-distA, -distB, k), OR(-distA, -distB, k));
}
//Исключение / НЕ
float NOT(float dist) {
    return -dist;
}
//Объединение лестницей
float ORS(float distA, float distB, float k, float n) {
    float p = distB - distA - k;
    float id = TF_REPLICA(p, 2.*k/n);
    return min(min(distA,distB), 0.5*TF_BETWEEN(p, k - distB - distA))/* + 0.01*distB*/;
}

//Пересечение лестницев
float ANDS(float distA, float distB, float k, float n) {
    return -ORS(-distA, -distB, k, n);
}

//-------------------Функции сочетания объектов сцены
//Сложение / Объединение / ИЛИ
//object = OR(objectA, objectB)
Object OR(Object objectA, Object objectB) {
    Object object = objectA;
    if (objectB.distance<objectA.distance) object = objectB;
    return object;
}
//Мягкое Сложение / Объединение / ИЛИ
//object = OR(objectA, objectB, k)
Object OR(Object objectA, Object objectB, float k) {
    Object object = OR(objectA, objectB);
    object.distance = OR(objectA.distance, objectB.distance, k);
    return object;
}
//Умножение / Пересечение / И
//object = AND(objectA, objectB)
Object AND(Object objectA, Object objectB) {
    Object object = objectA;
    if (objectB.distance>objectA.distance) object = objectB;
    return object;
}
//Мягкое Умножение / Пересечение / И
//object = AND(objectA, objectB, k)
Object AND(Object objectA, Object objectB, float k) {
    Object object = AND(objectA, objectB);
    object.distance = AND(objectA.distance, objectB.distance, k);
    return object;
}
//Исключающее сложение / Исключающее объединение / Исключающее ИЛИ
//object = XOR(objectA, objectB)
Object XOR(Object objectA, Object objectB) {
    Object object = objectA;
    if (objectB.distance<objectA.distance) object = objectB;
    object.distance = XOR(objectA.distance, objectB.distance);
    return object;
}
//Мягкое Исключающее сложение / Исключающее объединение / Исключающее ИЛИ
//object = XOR(objectA, objectBб k)
Object XOR(Object objectA, Object objectB, float k) {
    Object object = objectA;
    if (objectB.distance<objectA.distance) object = objectB;
    object.distance = XOR(objectA.distance, objectB.distance, k);
    return object;
}
//Исключение / НЕ
//object = NOT(objectA)
Object NOT(Object object) {
    object.distance = -object.distance;
    return object;
}

//Объединение лестницей. Результат добавляется к objectB
Object ORS(Object objectA, Object objectB, float k, float n) {
    float dist = ORS(objectA.distance, objectB.distance, k, n);
    Object object;
    if (dist<objectA.distance) {
        object = objectB;
    } else {
        object = objectA;
    }
    object.distance = dist+0.01;
    return object;
}
//Пересечение лестницей. Результат относится к objectA
Object ANDS(Object objectA, Object objectB, float k, float n) {
    float dist = ANDS(objectA.distance, objectB.distance, k, n);
    Object object = objectA;
    object.distance = dist;
    return object;
}

float time;
#define FAR 20.
#define ID_NONE -1.

#define ID_TRUNK 1.
#define ID_STEM 2.
#define ID_PETAIL 3.

float hash21(vec2 p) {
	vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

Object Flower( vec3 p, float sc, float N_petal, float angle ) {
	vec3 q;
	float d;

	Object object = Object(FAR, ID_NONE, p);

	p /= sc;

	TF_CYL(p.xy, 1., 1.);
	p.y -= -1.;
	p.z *= -1.;

	Object OBJ1 = Object(FAR, ID_STEM, p);
	{
		q = p;
		float R = 0.04;
		d = max(TF_BEFORE(q.y, R), TF_AFTER(q.z, 0.));
		OBJ1.distance = d;
		OBJ1.position = q;
	}
	object = OR(object, OBJ1);

	Object OBJ2 = Object(FAR, ID_PETAIL, p);
	{
		q = p;
		float R = 0.2 + 0.3*sqrt(1.+1.*sin( N_petal*q.x));
		TF_ROTATE(q.yz, angle);
		d = max(TF_BEFORE(q.y, R), TF_BETWEEN(q.z, 0.03));
		OBJ2.distance = d;
		OBJ2.position = q;
	}
	object = OR(object, OBJ2);

	if (object.id!=ID_NONE) object.distance *= sc*0.5;

    return object;
}

float map( vec3 p, inout Object object ) {
	vec3 q;
	float d;

	object = Object(FAR, ID_NONE, p);

	float CSIZE1 = 5.;
	vec2 CID1 = TF_ROUND_UP(p.xz, CSIZE1)/CSIZE1;
	float rnd = hash21( CID1 );
	if (mod(CID1.x + CID1.y,2.)==0.) p.xz -= 0.10*CSIZE1*rnd;

	TF_REPLICA(p.xz, CSIZE1);
	p.xz += 0.2*vec2(sin(p.y + 2.*time*rnd), cos( 1.0*p.y + 2.*time*rnd));

	Object OBJ1 = Object(FAR, ID_TRUNK, p);
	{
		q = p;
		//d = TF_BALL(q.xz, 0.2 + 0.1*TF_SMOOTHSTEP_BETWEEN(fract(q.y)-0.5, -0.2, 0.2));
		TF_ROTATE(q.xz, 0.6*q.y);
		q.xz = abs(q.xz)-0.15;
		d = TF_BALL(q.xz, 0.15);
		OBJ1.distance = d*0.5;
	}
	object = OR(object, OBJ1);

	{
		q = p;
		float N = 15.;
		float L = 0.9;
		float CSIZE = 0.4;

		vec2 CID2;
		CID2.y = TF_REPLICA(q.y, CSIZE);
		CID2.x = TF_REPLICA_ANGLE(q.xz, N, 2.*PI/N*0.5*mod(CID2.y, 2.));
		float rnd = hash21( CID2 );
		q.z -= L + 0.2*(-1.0+2.0*rnd);
		TF_ROTATE(q.yz, radians(7.*rnd));
		float sc = 0.25 + 0.1*rnd;
		float N_petal = clamp(floor(rnd*6.+0.5), 2., 6.);
		float angle = radians(40.*rnd);
		Object OBJ2 = Flower(q, sc, N_petal, angle);
		OBJ2.position.x = rnd;
		object = OR(object, OBJ2);
	}

	{
		q = p;
		float N = 20.;
		float L = 1.3;
		float CSIZE = 0.4;
		q.y -= 0.5*CSIZE;

		vec2 CID2;
		CID2.y = TF_REPLICA(q.y, CSIZE);
		CID2.x = TF_REPLICA_ANGLE(q.xz, N, 2.*PI/N*0.5*(1. + mod(CID2.y, 2.)));
		float rnd = hash21( CID2 );
		q.z -= L + 0.2*(-1.0+2.0*rnd);
		TF_ROTATE(q.yz, radians(7.*rnd));
		float sc = 0.25 + 0.1*rnd;
		float N_petal = clamp(floor(rnd*6.+0.5), 3., 5.);
		float angle = radians(40.*rnd);
		Object OBJ3 = Flower(q, sc, N_petal, angle);
		OBJ3.position.x = rnd;
		object = OR(object, OBJ3);
	}

	return object.distance;
}

float map ( in vec3 p ) {
	Object object;
	return map (p, object);
}

vec3 mapNormal (vec3 p, float eps) {
	vec2 e = vec2 (eps, -eps);
	vec4 v = vec4 (
		map (p + e.xxx),
		map (p + e.xyy),
	 	map (p + e.yxy),
		map (p + e.yyx)
	);
	return normalize (vec3 (v.x - v.y - v.z - v.w) + 2. * v.yzw);
}

float rayMarch(inout Ray ray) {
	ray.distance = ray.near;
	float steps = 1.;
	for (float i = 0.; i < 200.; ++i) {
		ray.position = ray.origin + ray.direction * ray.distance;
		ray.object.distance = map(ray.position, ray.object);
		//if (i==0.) ray.swing = sign(ray.object.distance);//Внутри или снаоужи
		ray.hit = abs(ray.object.distance) < ray.epsilon;
		ray.distance += ray.object.distance*ray.swing;
		steps++;
		if (ray.hit || ray.distance>ray.far || steps>ray.steps) break;
	}
	return steps;
}

vec3 lighting(Ray ray, vec3 lDir, vec3 mCol) {
	float diff = max(dot(ray.normal,lDir),0.0);
	float back = max(dot(ray.normal,-lDir),0.0);
	float spec = max( 0.0, pow( clamp( dot(lDir,reflect( ray.direction, ray.normal )), 0.0, 1.0), 16.0 ) );
	return mCol * (0.2 + 0.2*back + 0.8*diff) + 0.4*spec;
}

vec3 getMaterial(Ray ray) {
	vec3 mCol = vec3(1);
	vec3 q = ray.object.position;

	if (ray.object.id==ID_TRUNK) {
		mCol = vec3(0.0, 0.5, 0.0);
	} else if (ray.object.id==ID_STEM) {
		float f = TF_SMOOTHSTEP_AFTER(q.z -0.3, -0.4, 0.4);
		mCol = mix( vec3(0.7, 1, 0.7), vec3(0.0, 0.5, 0.0), f );
	} else if (ray.object.id==ID_PETAIL) {
		float rnd = q.x;
		mCol = cos( rnd*5.5 + vec3(0,23,21)) * 0.5 + 0.5;
		if (TF_BALL(q.yz, 0.15)<0.) mCol = vec3(1) - mCol;
		float f = TF_SMOOTHSTEP_AFTER(TF_BALL(q.yz, 0.5), -0.4, 0.4);
		mCol = mix( mCol, vec3(1) - mCol, f );
	}
	return mCol;
}

vec3 render(Ray ray) {
	vec3 bgCol = mix(vec3(1), vec3 (0.5, 0.75, 1.), -ray.direction.y);
	vec3 col = bgCol;

	rayMarch(ray);

	if( ray.distance < FAR ) {
		ray.normal = mapNormal(ray.position, 0.01);

		vec3 mCol = getMaterial(ray);

		vec3 lDir = -ray.direction;
		col = lighting(ray, lDir, mCol);

		col = pow( col, vec3(1./2.2) );

		//Туман
		float fogStart = 10.;
		vec3 fogColor = bgCol;//ray.direction.z>0. ? vec3(0) : vec3(1);
			col = mix(col, fogColor, 1.-exp(-pow(ray.distance/fogStart, 3.)));
	}
	return col;
}

void main()
{
	time = iTime;
	
	float aspect = iResolution.x/iResolution.y;
	vec2 uv = gl_FragCoord.xy/iResolution.xy - 0.5;
		uv *= 2.;

	vec2 ori = vec2(radians(-00.), 0.0);
		
	Camera cam;
	{
		cam.fov     = 45.;
		cam.aspect  = aspect;
		cam.origin  = vec3(2.5,0,time*0.8);
		cam.target  = cam.origin + vec3(0,0,1);
		cam.up 		= vec3(0,1,0);
		cam.vMat 	= TF_ROTATE_Y(ori.y) * TF_ROTATE_X(ori.x);
		cam.mMat	= mat3(1);//TF_ROTATE_Y(ori.y) * TF_ROTATE_X(ori.x);
	}
	
	Ray ray = lookAt(uv, cam);
	{
		ray.near 	= 0.01;
		ray.far  	= FAR;
		ray.epsilon = 0.001;
		ray.swing	= 1.;
		ray.steps 	= 150.;
	}
	vec3 ro = ray.origin;
	vec3 rd = ray.direction;
	
	// render
	vec3 col = render(ray);

	// float brightness = dot(col.xyz, vec3(0.2126, 0.7152, 0.0722));
 //    if(brightness > 1.0)
 //        FragColor = vec4(col, 1.0);
 //    else
 //        FragColor = vec4(0.0);
	
    FragColor = vec4(col,1.0);
}