/* SHA-256 / HMAC / PBKDF2. No third-party runtime or plaintext PIN persistence. */
const K256_ = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function bytes_(s) { return Array.from(unescape(encodeURIComponent(s))).map(c=>c.charCodeAt(0)); }
function sha_(input) {
  const b=input.slice(), len=b.length*8; b.push(128); while(b.length%64!==56)b.push(0); for(let i=7;i>=0;i--)b.push(i<4?(len>>>8*i)&255:0);
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]; const r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let o=0;o<b.length;o+=64){const w=new Array(64); for(let i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3]; for(let i=16;i<64;i++){const a=w[i-15],c=w[i-2]; w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(c,17)^r(c,19)^(c>>>10)))|0;} let [a,c,d,e,f,g,j,k]=h; for(let i=0;i<64;i++){const t=(k+(r(f,6)^r(f,11)^r(f,25))+((f&g)^(~f&j))+K256_[i]+w[i])|0;const u=((r(a,2)^r(a,13)^r(a,22))+((a&c)^(a&d)^(c&d)))|0;k=j;j=g;g=f;f=(e+t)|0;e=d;d=c;c=a;a=(t+u)|0;} [a,c,d,e,f,g,j,k].forEach((v,i)=>h[i]=(h[i]+v)|0); }
  return h.flatMap(x=>[(x>>>24)&255,(x>>>16)&255,(x>>>8)&255,x&255]);
}
function hmac_(key,msg) { if(key.length>64)key=sha_(key);const p=Array.from({length:64},(_,i)=>key[i]||0);return sha_(p.map(x=>x^92).concat(sha_(p.map(x=>x^54).concat(msg)))); }
function hex_(b) { return b.map(x=>x.toString(16).padStart(2,'0')).join(''); }
function pbkdf_(pin,salt,iterations) { const key=bytes_(pin); let u=hmac_(key,bytes_(salt).concat([0,0,0,1])), result=u.slice(); for(let i=1;i<iterations;i++){u=hmac_(key,u);for(let j=0;j<32;j++)result[j]^=u[j];}return hex_(result); }
function equal_(a,b) { a=String(a);b=String(b);let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0; }
function random_() { return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''); }
function indexPin_(pin) { return hex_(hmac_(bytes_(props_().getProperty('PIN_PEPPER')),bytes_(pin))); }
function protectPin_(pin) { assert_(/^\d{8,12}$/.test(pin),'O PIN deve ter entre 8 e 12 algarismos.'); const salt=random_();return {salt,iterations:210000,hash:pbkdf_(pin,salt,210000),index:indexPin_(pin)}; }
function checkPin_(pin,u) { return equal_(indexPin_(pin),u.pin.index) && equal_(pbkdf_(pin,u.pin.salt,u.pin.iterations),u.pin.hash); }
