const fragmentShader = /*glsl*/`
    precision highp float;

    // variable comes from external
    uniform float time;
    uniform vec3 viewAngle;
    uniform vec2 snowRange;
    uniform float transparency;
    uniform float CRACKS_SCALE;
    uniform float CRACKS_THICKNESS;
    uniform vec3 SNOW_COLOR;
    uniform vec3 FOG_COLOR;
    uniform float noiseScale;
    uniform vec3 baseColorL;
    uniform vec3 baseColorH;
    uniform vec3 CRACKS_COLOR;
    uniform bool enableSnow;
    
    // variable comes from vertex shader
    varying vec2 vUv;
    
    #pragma glslify: cnoise3 = require(glsl-noise/classic/3d.glsl)
    #define HASHSCALE3 vec3(.1031, .1030, .0973)
    #define PI 3.1415926535897932384626433832795

    //Define internal variable and constants
    const float THRESHOLD 	= 0.001;
    const float EPSILON 	= 5e-3;
    const float HEIGHT_POWER = 5.0;
    const float CRACKS_ALPHA = 0.8;
    const float REFRACTION = 0.5;
    const float BUBBLES_BRIGHTNESS = 0.8;
    const vec3 CRACKS_COLOR_TOP = vec3(1.6);

    //Currently no use at all
    const vec3 MOUNTAINS_COLOR = vec3(0.04,0.02,0.0);

    //float saturate(float x) { return min(max(x, 0.0), 1.0); }
    float mul(vec2 x) { return x.x*x.y; }

    mat3 fromEuler(vec3 ang) {
        vec2 a1 = vec2(sin(ang.x),cos(ang.x));
        vec2 a2 = vec2(sin(ang.y),cos(ang.y));
        vec2 a3 = vec2(sin(ang.z),cos(ang.z));
        mat3 m;
        m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
        m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
        m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
        return m;
    }

    bool intersectionPlane(vec3 o, vec3 d, out vec3 p) {
        float t = o.y / d.y;
        p = o - d * t;
        return bool(step(t,0.0));
    }

    bool intersectionZPlane(vec3 o, vec3 d, out vec3 p){
        float t = o.z / d.z;
        p = o - d * t;
        return bool(step(t,0.0));
    }

    bool intersectionTargetPlane(vec3 o, vec3 d, vec3 n, out vec3 p) 
    { 
        float cosTheta = dot(d, n); 
        if (cosTheta == 0.0) return false; 
        float t = -dot(o, n) / cosTheta; 
        p = o + d * t; 
        return bool(step(t, 0.0)); 
    }

    vec2 hash2( vec2 p )
    {
        //white noise
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
    }

    vec3 hash3( vec2 p )
    {
        vec3 q = vec3( dot(p,vec2(127.1,311.7)), 
        dot(p,vec2(269.5,183.3)), 
        dot(p,vec2(419.2,371.9)) );
        return fract(sin(q)*43758.5453);
    }
    
    float hash11(float x) {
        return fract(sin(x) * 43758.5453);
    }
    float hash12( vec2 p ) {
        float h = dot(p,vec2(127.1,311.7));	
        return fract(sin(h)*43758.5453123);
    }
    vec2 hash22(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * HASHSCALE3);
        p3 += dot(p3, p3.yzx+19.19);
        return fract((p3.xx+p3.yz)*p3.zy);
    }
    float hash13(in vec3 p) {
        p  = fract( p*0.3183099+.1 );
        p *= 17.0;
        return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
    }
    float noise11(in float p) {
        float i = floor( p );
        float f = fract( p );	
        float u = f*f*(3.0-2.0*f);
        return -1.0+2.0*mix(hash11(i),hash11(i+1.0),u);
    }
    float noise12( in vec2 p ) {
        vec2 i = floor( p );
        vec2 f = fract( p );	
        vec2 u = f*f*(3.0-2.0*f);
        return -1.0+2.0*mix( mix( hash12( i + vec2(0.0,0.0) ), 
                        hash12( i + vec2(1.0,0.0) ), u.x),
                    mix( hash12( i + vec2(0.0,1.0) ), 
                        hash12( i + vec2(1.0,1.0) ), u.x), u.y);
    }
    vec2 noise2( in vec2 p ) {
        vec2 i = floor( p );
        vec2 f = fract( p );	
        vec2 u = f*f*(3.0-2.0*f);
        return -1.0+2.0*mix( mix( hash22( i + vec2(0.0,0.0) ), 
                        hash22( i + vec2(1.0,0.0) ), u.x),
                    mix( hash22( i + vec2(0.0,1.0) ), 
                        hash22( i + vec2(1.0,1.0) ), u.x), u.y);
    }

    float noise13(in vec3 p) {
        vec3 i = floor( p );
        vec3 f = fract( p );	
        vec3 u = f*f*(3.0-2.0*f);
        
        float a = hash13( i + vec3(0.0,0.0,0.0) );
        float b = hash13( i + vec3(1.0,0.0,0.0) );    
        float c = hash13( i + vec3(0.0,1.0,0.0) );
        float d = hash13( i + vec3(1.0,1.0,0.0) ); 
        float v1 = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        
        a = hash13( i + vec3(0.0,0.0,1.0) );
        b = hash13( i + vec3(1.0,0.0,1.0) );    
        c = hash13( i + vec3(0.0,1.0,1.0) );
        d = hash13( i + vec3(1.0,1.0,1.0) );
        float v2 = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
            
        return abs(mix(v1,v2,u.z));
    }

    float fbm1(in float p) {
        float m = 2.0;
        float a = 1.0;
        float w = 1.0;
        float f = noise11( p );
        for(int i = 0; i < 8; i++) {
            p *= m; a /= 1.8;
            f += a*noise11( p );
            w += a;
        }
        return f / w;
    }

    float fbm2(in vec2 p, float t) {
        float m = 2.0;
        float a = 1.0;
        float w = 1.0;
        float f = noise12( p );
        for(int i = 0; i < 8; i++) {
            p *= m; a /= 1.5;
            f += a*noise12( p+t );
            w += a;
        }
        return f / w;
    }

    vec2 fbm22(in vec2 p) {
        float m = 2.0;
        float a = 1.0;
        float w = 1.0;
        vec2 f = noise2( p );
        for(int i = 0; i < 8; i++) {
            p *= m; a /= 1.2;
            f += a*noise2(p);
            w += a;
        }
        return f / w;
    }

    float fbmClouds(in vec2 p) {
        p *= 0.001;
        float m = 2.0;
        float a = 1.0;
        float w = 1.0;
        float f = noise12( p );
        for(int i = 0; i < 4; i++) {
            p *= m; a /= 1.5;
            f += a* abs(noise12( p ));
            w += a;
        }
        f /= w;
        //f = pow(max(f,0.0001),5.0);
        f = max((f - 0.4) / (1.0 - 0.4), 1e-4);
        f = sqrt(f);
        return f;
    }


    vec3 voronoi( in vec2 x )
    {
        vec2 n = floor(x);
        vec2 f = fract(x);

        //----------------------------------
        // first pass: regular voronoi
        //----------------------------------
        vec2 mg, mr;

        float md = 8.0;
        for( int j=-1; j<=1; j++ )
        for( int i=-1; i<=1; i++ )
        {
            vec2 g = vec2(float(i),float(j));
                vec2 o = hash2( n + g );
                #ifdef ANIMATE
            o = 0.5 + 0.5*sin( iTime + 6.2831*o );
            #endif	
            vec2 r = g + o - f;
            float d = dot(r,r);

            if( d<md )
            {
                md = d;
                mr = r;
                mg = g;
            }
        }

        //----------------------------------
        // second pass: distance to borders
        //----------------------------------
        md = 8.0;
        for( int j=-2; j<=2; j++ )
        for( int i=-2; i<=2; i++ )
        {
            vec2 g = mg + vec2(float(i),float(j));
                vec2 o = hash2( n + g );
                #ifdef ANIMATE
            o = 0.5 + 0.5*sin( iTime + 6.2831*o );
            #endif	
            vec2 r = g + o - f;

            if( dot(mr-r,mr-r)>0.00001 )
            md = min( md, dot( 0.5*(mr+r), normalize(r-mr) ) );
        }

        return vec3( md, mr );
    }

    float sdEllipsoid( in vec3 p, in vec3 r ) {
        float k0 = length(p/r);
        float k1 = length(p/(r*r));
        return k0*(k0-1.0)/k1;
    }

    float triangle(float x) {
        return abs(1.0 - mod(abs(x), 2.0)) * 2.0 - 1.0;
    }
    
    // gamma correction
    const float GAMMA = 2.2;
    const float iGAMMA = 1.0 / GAMMA;
    float toLinear(float c) { return pow(c,GAMMA); }
    vec2 toLinear(vec2 c) { return pow(c,vec2(GAMMA)); }
    vec3 toLinear(vec3 c) { return pow(c,vec3(GAMMA)); }
    float toSRGB(float c) { return pow(c,iGAMMA); }
    vec2 toSRGB(vec2 c) { return pow(c,vec2(iGAMMA)); }
    vec3 toSRGB(vec3 c) { return pow(c,vec3(iGAMMA)); }

    //for main func define
    float mapCracks1(vec3 p) {
        const float SCALE = 0.1;
        p.x += sin(p.z*0.2) * 2.0;
        p.x += triangle(p.z * 0.053) * 2.0;
        p.z += triangle(p.x * 0.103) * 2.0;
        return voronoi(p.xz*SCALE).x / SCALE * 0.9;
    }

    float mapCracks2(vec3 p) {
        const float SCALE = 0.25;
        p.x += triangle(p.z * 0.153) * 1.5;
        p.z += triangle(p.x * 0.203) * 1.5;
        return voronoi(p.xz*SCALE).x / SCALE * 0.9;
    }

    vec2 traceCracks1(vec3 ori, vec3 dir, out vec3 p) {
        float t = 0.0;
        float d = 0.0;
        for(int i = 0; i < 10; i++) {
            p = ori + dir * t;
            d = mapCracks1(p);
            if(d < THRESHOLD) break;
            t += d * 0.9;
        } 
        return vec2(d,t);
    }
    vec2 traceCracks2(vec3 ori, vec3 dir, float s, out vec3 p) {
        float t = 0.0;
        float d = 0.0;
        for(int i = 0; i < 8; i++) {
            p = ori + dir * t;
            d = mapCracks2(p*s);
            if(d < THRESHOLD) break;
            t += d * 0.9;
        } 
        return vec2(d,t);
    }
    vec2 traceCracks3(vec3 ori, vec3 dir, out vec3 p) {
        float t = 0.0;
        float d = 0.0;
        for(int i = 0; i < 3; i++) {
            p = ori + dir * t;
            d = mapCracks1(p*0.7);
            if(d < THRESHOLD) break;
            t += d;
        } 
        return vec2(d,t);
    }
    vec2 getNormalCracks1(vec3 p) {
        float t = mapCracks1(p);
        vec2 n;
        n.x = mapCracks1(vec3(p.x+EPSILON,p.y,p.z)) - t;
        n.y = mapCracks1(vec3(p.x,p.y,p.z+EPSILON)) - t;
        return normalize(n);
    }

    vec2 getNormalCracks2(vec3 p) {
        float t = mapCracks2(p);
        vec2 n;
        n.x = mapCracks2(vec3(p.x+EPSILON,p.y,p.z)) - t;
        n.y = mapCracks2(vec3(p.x,p.y,p.z+EPSILON)) - t;
        return normalize(n);
    }

    // sky
    vec3 getSkyColor(vec3 e, bool isReflection) {
        e.y = max(e.y,0.0);
        float yy = pow(e.y, 0.9);
        vec3 ret;
        ret.x = pow(1.0-yy-0.05,8.0) * 0.75;
        ret.y = pow(1.0-yy, 4.0) * 0.75;
        ret.z = pow(1.0-yy,2.0);
        
        
        float phi = atan(e.z,e.x) / PI;
        float h = (fbm1(phi*10.0)*0.5+0.5)*0.14-0.03;
        float mountains = isReflection ? 
            smoothstep(h+8.0*max(h,1e-5),h-0.01,e.y) :
            smoothstep(h+0.002,h,e.y);
        ret = mix(ret,MOUNTAINS_COLOR,
                mountains*(pow(e.y,0.3) * 0.15 + 0.85));
        
        h = (fbm1(phi*14.0)*0.5+0.5)*0.1-0.01;
        float mf = isReflection ? 
            smoothstep(h+8.0*max(h,1e-5),h-0.01,e.y) :
            smoothstep(h+0.002,h,e.y);
        ret = mix(ret,MOUNTAINS_COLOR,
                mf*(pow(e.y,0.5) * 0.5 + 0.5)*0.8*(1.0-mountains));
        
        
        // clouds
        vec3 p;
        intersectionPlane(vec3(0.0,300.0,0.0),e,p);
        ret = mix(ret,vec3(1.0), fbmClouds(p.xz)*(1.0-mountains)*(1.0-mf) * 0.7);
        
        return ret;
    }

    //snow
    float getSnowWindMask(in vec2 p, float t) {
        float amp = 0.5;
        float frq = 1.0;
        float wrt = t*2.0;
        p.x += sin(frq*p.y + wrt*0.9) * amp;
        p.y += cos(frq*p.x*1.5 + wrt*0.8) * amp;
        p.x += sin(frq*p.y*1.9 + wrt*0.7) * amp;
        p.y += cos(frq*p.x*1.7 + wrt*0.6) * amp;
        
        float wind = fbm2(p,t*8.0);
        wind = wind * 0.5 + 0.5;
        return wind * wind;
    }

    //如果你想改变雪的密度，有几个地方可以调整：

    //你可以改变循环的次数i，越多次循环表示越多层噪声叠加，雪的细节越丰富，但也越耗费性能。
    //你可以改变系数a的初始值和递减率，它们决定了不同尺度上噪声的权重，越大的a表示越高的密度。
    //你可以改变smoothstep函数的参数0.55和0.65，它们决定了雪覆盖度的阈值，越小的0.55表示越低的覆盖度，越大的0.65表示越高的覆盖度。
    //你可以改变pow函数的参数0.25，它决定了雪覆盖度的对比度，越小的参数表示越高的对比度。
    //你可以改变最后乘以的系数0.9，它决定了雪覆盖度的最大值，越大的系数表示越高的最大值。
    float getSnowMask(in vec2 p) {
        mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
        float a = 6.0;
        float w = 1.0;
        float f = noise12( p );
        for(int i = 0; i < 6; i++) {
            p = m * p; a /= 1.5;
            f += a * (abs(noise12( p )));
            w += a;
        }
        f /= w;
        f = smoothstep(snowRange.x,snowRange.y,f);
        f = pow(f,0.25);
        f = f * 0.9;
        
        return f;
    }

    vec3 getObjectColor(in vec3 p, const in vec3 cam, in vec3 e, in vec3 normal, in vec2 uvPosition) {
        vec3 op = p;
        vec3 dir = e;
        vec3 n = normal;
        float depth = length(p - cam);
        float depth_f = max(depth*0.8, 1.0);
        p *= CRACKS_SCALE;
        vec3 col;
        
        // global thickness modulation
        float gth = 0.6 + 0.8 * smoothstep(0.2,0.8, noise13(p*0.05));    
        gth *= CRACKS_THICKNESS;
        
        // crack depth
        vec3 cp;
        vec3 norm = vec3(1.0,noise2(p.xz*3.)*0.2);
        norm.yz += noise2(p.xz*10.)*0.2;
        norm.x *= depth_f;    
        norm = normalize(norm.yxz);
        e.xz += norm.xz * REFRACTION;
            
        traceCracks1(p,e,cp);
        vec2 cr1_normal = getNormalCracks1(cp);
        float crack_depth = abs(cp.y - p.y);
        crack_depth = pow(max(1.0-crack_depth*0.2/gth, 0.0),HEIGHT_POWER) * 0.6;
        crack_depth *= 0.5 + 0.5 * noise13(cp*vec3(0.7,10.0,0.7));
        crack_depth *= abs(cr1_normal.x) * 0.6 + 0.4;
        
        traceCracks2(p,e,1.0,cp);
        vec2 cr2_normal = getNormalCracks2(cp);
        float crack_depth_2 = abs(cp.y - p.y);
        crack_depth_2 = pow(max(1.0 - crack_depth_2 * 0.4/gth, 0.0), HEIGHT_POWER) * 0.6;
        crack_depth_2 *= 0.5 + 0.5 * smoothstep(0.2,0.9, noise13(cp*vec3(12.0,1.0,12.0)));
        crack_depth_2 *= 0.5 + 0.5 * noise13(cp*vec3(1.0,20.0,1.0));
        crack_depth_2 *= abs(cr2_normal.x) * 0.6 + 0.4;
        
        traceCracks2(p,e,1.5,cp);
        float crack_depth_3 = abs(cp.y - p.y);
        crack_depth_3 = pow(max(1.0 - crack_depth_3 * 3.0/gth , 0.0), HEIGHT_POWER) * 0.3;
        crack_depth_3 *= 0.5 + 0.5 * smoothstep(0.3,0.9, noise13(cp*vec3(17.0,1.0,17.0)));
        
        vec2 c4n = noise2(p.xz*30.0) * 0.4;
        traceCracks3(p,e+c4n.xxy,cp);
        float crack_depth_4 = abs(cp.y - p.y + 2.0);
        crack_depth_4 = pow(max(1.0-crack_depth_4*0.2/gth, 0.0),3.0) * 0.15;
        crack_depth_4 *= 0.5 + 0.5 * noise13(cp*vec3(0.7,10.0,0.7));
        
        // bubbles    
        dir.xz += norm.xz * 0.3;
        vec3 bp;
        bp = p + dir * 0.3;
        col += pow(noise13(bp * 14.0),20.0) * BUBBLES_BRIGHTNESS * gth;
        bp = p + dir * 0.6;
        col += pow(noise13(bp * 15.0),20.0) * BUBBLES_BRIGHTNESS * gth;
        bp = p + dir * 0.9;
        col += pow(noise13(bp * 16.0),20.0) * BUBBLES_BRIGHTNESS * gth;
        
        // cracks color
        vec3 crc = toLinear(CRACKS_COLOR);
        vec3 crct = toLinear(CRACKS_COLOR_TOP);
        float a = 0.4 + 0.6 * smoothstep(0.2,0.8, noise13(p*0.07));
        a *= CRACKS_ALPHA;
        #ifndef LOW_END
        col = mix(col, mix(crc,crct,crack_depth_4), 
                crack_depth_4 * a);
        #endif
        col = mix(col, mix(crc,crct,crack_depth_3), 
                crack_depth_3 * a);
        col = mix(col, mix(crc,crct,crack_depth_2), 
                crack_depth_2 * a);
        col = mix(col, mix(crc,crct,crack_depth), 
                crack_depth * a);
            
        // reflection
        bool refEnable = false;
        if(refEnable){
            float fresnel = pow(max(1.0 - dot(-e,n),0.0),5.0) * 0.9 + 0.1;
            vec3 rdir = reflect(e,norm);
            vec3 reflection = getSkyColor(rdir,true);
            col = mix(col,reflection,fresnel);
        }
        
        // snow surface
        if(enableSnow){
            depth_f = max(depth*0.01, 1.0);
            float snow = getSnowMask(p.xz*0.1) / depth_f;
            col = mix(col,SNOW_COLOR,snow);
        }

        //merge everything
        // base color

        float noiseFactor = cnoise3(p * noiseScale);

        vec3 base_col = mix(baseColorL, baseColorH, noiseFactor);
        col = col*0.4 + base_col;

        // second layer

        return col;
    }

    void main(){
        vec2 iuv = 2.0 * vUv - 1.0;
        vec2 uv = iuv;    

        float disCam = 30.0;
 
        //this area is defining a camera capture model
        float vx = sin(viewAngle.y)*sin(viewAngle.z);
        float vy = -sin(viewAngle.y)*cos(viewAngle.z);
        float vz = cos(viewAngle.y);

        vec3 vcamP = vec3(vx,vy,vz);
        //vec3 vcamP = vec3(0.0,0.0,1.0);

        vec3 dir = normalize(vec3(uv.xy, 0.0) - vcamP);

        //rotate to calculate from xz plane
        vec3 ang = vec3(0.0, PI * 0.5, 0.0);
	    mat3 rot = fromEuler(ang);

        //rotate to fit rotation

        dir = normalize(dir * rot);
        //vec3 ori = dir *rot* disCam;
        vec3 ori = vcamP*disCam;

        vec3 surfaceNormal = vec3(0.0,1.0,0.0);
       
        // color
        vec3 p = disCam * (vec3(uv.xy,0));
        p = p*rot;
        vec3 color = vec3(0,0,0);
        color = getObjectColor(p,ori,dir,surfaceNormal,uv);
        
        // post
        //color *= 1.3;
        color = pow(color,vec3(0.4545));
        
        // vignette
        float vgn = smoothstep(1.2,0.5,abs(iuv.y)) * smoothstep(1.2,0.5,abs(iuv.x));
        color *= vgn * 0.3 + 0.7;
        // 最终颜色输出
        gl_FragColor = vec4(color, transparency);
    }
`;
export default fragmentShader;