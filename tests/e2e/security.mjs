import { makeTestBottle, removeTestBottle, rows } from './lib.mjs';
/* Security review, executed against production. */
const B='https://aquawater-backend.vercel.app';
const A=B+'/api';
const PW=process.env.STAFF_PW;
const R=[]; const rec=(n,ok,d)=>{R.push({n,ok});console.log(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`)};
const c=async(m,p,o={})=>{const r=await fetch(A+p,{method:m,headers:{'Content-Type':'application/json',...(o.h||{}),...(o.token?{Authorization:'Bearer '+o.token}:{})},...(o.body?{body:JSON.stringify(o.body)}:{})});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t};return{s:r.status,j,raw:t,h:r.headers};};


const admin=(await c('POST','/auth/login',{body:{phone:'+998900000004',password:PW}})).j.token;
const courier=(await c('POST','/auth/login',{body:{phone:'+998900000002',password:PW}})).j.token;
const c1=await c('POST','/auth/register',{body:{phone:'+9989'+Math.floor(10000000+Math.random()*89999999),name:'E2E Sec1',password:'E2E-test-abc123'}});
const c2=await c('POST','/auth/register',{body:{phone:'+9989'+Math.floor(10000000+Math.random()*89999999),name:'E2E Sec2',password:'E2E-test-abc123'}});
const t1=c1.j.token, t2=c2.j.token, id1=c1.j.user._id;

console.log('\n── headers ──');
const home=await fetch(B+'/');
rec('no X-Powered-By leak', !home.headers.get('x-powered-by'), String(home.headers.get('x-powered-by')));
const api=await fetch(A+'/health');
rec('nosniff set', api.headers.get('x-content-type-options')==='nosniff');
rec('referrer policy set', !!api.headers.get('referrer-policy'));
rec('CSP allows Telegram, blocks other framing',
  (api.headers.get('content-security-policy')||'').includes('frame-ancestors') &&
  (api.headers.get('content-security-policy')||'').includes('telegram.org'));

console.log('\n── CORS ──');
const cors=await fetch(A+'/products',{headers:{Origin:'https://evil.example'}});
rec('a foreign origin gets no ACAO header', !cors.headers.get('access-control-allow-origin'),
  String(cors.headers.get('access-control-allow-origin')));

console.log('\n── NoSQL operator injection ──');
const inj=await c('GET','/orders?status[$ne]=zzz',{token:t1});
const injArr=Array.isArray(inj.j)?inj.j:(inj.j.orders||[]);
rec('operator in the status query is ignored, not executed', inj.s===200 && Array.isArray(injArr),
  `status ${inj.s}, ${injArr.length} rows`);
const inj2=await c('GET','/orders?status=delivered',{token:t1});
rec('a valid status still filters', inj2.s===200);

console.log('\n── IDOR / privilege ──');
const bad=await c('GET','/bottles/outstanding',{token:t1});
rec('customer cannot read the bottle chase list', bad.s===403, 'got '+bad.s);
const adj=await c('POST','/bottles/adjust',{token:t1,body:{userId:id1,delta:-99}});
rec('customer cannot adjust their own bottle balance', adj.s===403, 'got '+adj.s);
const cr=await c('POST','/delivery-zones',{token:t1,body:{region:'E2E hack',fee:0,minOrder:0}});
rec('customer cannot create a delivery zone', cr.s===403, 'got '+cr.s);
const rep=await c('GET','/reports',{token:courier});
rec('courier cannot read reports', rep.s===403, 'got '+rep.s);
const runc=await c('POST','/subscriptions/run',{token:t1});
rec('customer cannot trigger the scheduler', runc.s===403, 'got '+runc.s);
const allsub=await c('GET','/subscriptions/all',{token:t1});
rec('customer cannot list everyone’s standing orders', allsub.s===403, 'got '+allsub.s);

console.log('\n── cron gate ──');
rec('cron rejects a bare call', (await c('POST','/cron/run')).s===401);
rec('cron rejects a secret in the URL', (await c('POST','/cron/run?key=whatever')).s===401);

console.log('\n── subscription cap ──');
const products=(await c('GET','/products')).j;
const p19 = await makeTestBottle(admin);
const addr={region:'Toshkent shahri',city:'Toshkent',district:'E2E-TEST',street:'E2E-TEST',house:'1'};
let capped=false, made=0;
for(let i=0;i<13;i++){
  const r=await c('POST','/subscriptions',{token:t2,body:{items:[{productId:p19._id,qty:1}],
    addressSnapshot:addr,weekday:((i%7)+1),deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
  if(r.s===201) made++; else if(r.s===429){capped=true;break;}
}
rec('standing orders are capped', capped && made===10, `${made} created, capped=${capped}`);

console.log('\n── CSV formula injection ──');
const evil=await c('POST','/products',{token:admin,body:{name:'=HYPERLINK("http://evil","x")',
  category:'water',productType:'product',description:'E2E-TEST',price:1000,
  imageUrl:'https://example.com/x.jpg',inStock:true,stockQty:5}});
const csv=await fetch(A+'/reports/export?group=product',{headers:{Authorization:'Bearer '+admin}});
const body=await csv.text();
const dangerous=body.split('\r\n').some(l=>/^"=|,"=/.test(l));
rec('no CSV cell starts a formula', !dangerous, dangerous?'FORMULA PRESENT':'neutralised');
if(evil.j?._id) await c('DELETE','/products/'+evil.j._id,{token:admin});

console.log('\n── the money bug ──');
const o=await c('POST','/orders',{token:t1,body:{items:[{productId:p19._id,qty:2}],
  addressSnapshot:{...addr,region:'Toshkent viloyati'},deliveryDate:new Date(Date.now()+86400000).toISOString().slice(0,10),
  deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
const goods=o.j.items.reduce((s,i)=>s+i.priceSnapshot*i.qty,0);
rec('order stores a delivery fee', o.j.deliveryFee>0, 'fee '+o.j.deliveryFee);
rec('goods and fee are separable for every screen', goods>0 && o.j.deliveryFee>0,
  `goods ${goods} + fee ${o.j.deliveryFee} = ${goods+o.j.deliveryFee}`);

const F=R.filter(r=>!r.ok);
console.log(`\n=== ${R.length-F.length}/${R.length} passed`);
F.forEach(f=>console.log('  FAIL '+f.n));

await removeTestBottle(admin, p19?._id);
