import { makeTestBottle, removeTestBottle, rows } from './lib.mjs';
/* Full acceptance pass against production. */
const B='https://aquawater-backend.vercel.app/api';
const PW=process.env.STAFF_PW;
const R=[]; const rec=(n,ok,d)=>{R.push({n,ok});console.log(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`)};
const c=async(m,p,o={})=>{const r=await fetch(B+p,{method:m,headers:{'Content-Type':'application/json',...(o.token?{Authorization:'Bearer '+o.token}:{})},...(o.body?{body:JSON.stringify(o.body)}:{})});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t};return{s:r.status,j}};


const admin=(await c('POST','/auth/login',{body:{phone:'+998900000004',password:PW}})).j.token;
const courier=(await c('POST','/auth/login',{body:{phone:'+998900000002',password:PW}})).j.token;
const cust0=await c('POST','/auth/register',{body:{phone:'+9989'+Math.floor(10000000+Math.random()*89999999),name:'E2E Final',password:'E2E-test-abc123'}});
const cust=cust0.j.token, custId=cust0.j.user._id;

const addr=r=>({region:r,city:'Toshkent',district:'E2E-TEST',street:'E2E-TEST',house:'1'});
const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);

// ── a product of our own, so the real catalogue is untouched ──────────────
const prod=await c('POST','/products',{token:admin,body:{name:'E2E-TEST 19L',category:'water',
  productType:'product',description:'test',price:25000,imageUrl:'https://example.com/x.jpg',
  inStock:true,returnable:true,stockQty:10}});
rec('API accepts returnable and stockQty on create',
  prod.s===201 && prod.j.returnable===true && prod.j.stockQty===10,
  `returnable=${prod.j?.returnable} stock=${prod.j?.stockQty}`);
const pid=prod.j._id;

rec('a seeded count is marked unverified', !prod.j.stockCountedAt, String(prod.j.stockCountedAt));

// ── stocktake ─────────────────────────────────────────────────────────────
const take=await c('PATCH',`/products/${pid}/stocktake`,{token:admin,body:{stockQty:6}});
rec('stocktake sets an absolute figure', take.s===200 && take.j.stockQty===6, 'stock '+take.j?.stockQty);
rec('stocktake stamps when it was counted', !!take.j.stockCountedAt, String(take.j?.stockCountedAt).slice(0,10));
const zero=await c('PATCH',`/products/${pid}/stocktake`,{token:admin,body:{stockQty:0}});
rec('counting zero takes it off sale', zero.j.inStock===false, 'inStock '+zero.j?.inStock);
await c('PATCH',`/products/${pid}/stocktake`,{token:admin,body:{stockQty:6}});
const back=await c('GET','/products/'+pid);
rec('counting stock back puts it on sale', back.j.inStock===true);
const badTake=await c('PATCH',`/products/${pid}/stocktake`,{token:admin,body:{stockQty:-1}});
rec('a negative count is refused', badTake.s===400, 'got '+badTake.s);
const custTake=await c('PATCH',`/products/${pid}/stocktake`,{token:cust,body:{stockQty:99}});
rec('a customer cannot count stock', custTake.s===403, 'got '+custTake.s);

// ── dashboard surfaces uncounted stock ────────────────────────────────────
const stats=await c('GET','/admin/stats',{token:admin});
rec('dashboard reports uncounted products', Array.isArray(stats.j.uncountedStock),
  (stats.j.uncountedStock||[]).length+' uncounted');
rec('a counted product is not listed as uncounted',
  !(stats.j.uncountedStock||[]).some(p=>p._id===pid));

// ── delivery zones ────────────────────────────────────────────────────────
await c('POST','/delivery-zones',{token:admin,body:{region:'E2E-TEST zona',fee:9000,minOrder:60000,eta:'1 kun'}});
const refused=await c('POST','/orders',{token:cust,body:{items:[{productId:pid,qty:1}],
  addressSnapshot:addr('E2E-TEST zona'),deliveryDate:day(1),deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
rec('order below the zone minimum refused', refused.s===400, refused.j?.message);

// ── the subscription minimum bug ──────────────────────────────────────────
const subLow=await c('POST','/subscriptions',{token:cust,body:{items:[{productId:pid,qty:1}],
  addressSnapshot:addr('E2E-TEST zona'),weekday:3,deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
rec('standing order below the minimum refused up front', subLow.s===400, subLow.j?.message);
const subOk=await c('POST','/subscriptions',{token:cust,body:{items:[{productId:pid,qty:3}],
  addressSnapshot:addr('E2E-TEST zona'),weekday:3,deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
rec('a viable standing order is accepted', subOk.s===201, 'next '+String(subOk.j?.nextRunAt).slice(0,10));

// ── the stock-on-delete bug ───────────────────────────────────────────────
const o1=await c('POST','/orders',{token:cust,body:{items:[{productId:pid,qty:2}],
  addressSnapshot:addr('Toshkent shahri'),deliveryDate:day(1),deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
rec('order created', o1.s===201);
const afterOrder=(await c('GET','/products/'+pid)).j.stockQty;
rec('stock claimed by the order', afterOrder===4, `6 -> ${afterOrder}`);
await c('DELETE','/orders/'+o1.j._id,{token:admin});
const afterDelete=(await c('GET','/products/'+pid)).j.stockQty;
rec('deleting a pending order returns its stock', afterDelete===6, `${afterOrder} -> ${afterDelete}`);

// a delivered order's stock must NOT come back
const o2=await c('POST','/orders',{token:cust,body:{items:[{productId:pid,qty:2}],
  addressSnapshot:addr('Toshkent shahri'),deliveryDate:day(1),deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
const users=rows((await c('GET','/admin/users',{token:admin})).j);
const cid=(Array.isArray(users)?users:users.users||[]).find(u=>u.phone==='+998900000002')?._id;
await c('PATCH',`/orders/${o2.j._id}/assign`,{token:admin,body:{courierId:cid}});
await c('PATCH',`/orders/${o2.j._id}/status`,{token:admin,body:{status:'assigned'}});
await c('PATCH',`/orders/${o2.j._id}/status`,{token:courier,body:{status:'delivered',emptiesCollected:1}});
const beforeDel=(await c('GET','/products/'+pid)).j.stockQty;
await c('DELETE','/orders/'+o2.j._id,{token:admin});
const afterDel2=(await c('GET','/products/'+pid)).j.stockQty;
rec('deleting a DELIVERED order does not resurrect stock', afterDel2===beforeDel, `${beforeDel} -> ${afterDel2}`);

// ── ledger survived the delete ────────────────────────────────────────────
const stmt=await c('GET','/bottles/me',{token:cust});
rec('bottle ledger kept its rows after the order was deleted', stmt.j.balance===1, 'balance '+stmt.j?.balance);

// ── reports & export ──────────────────────────────────────────────────────
const rep=await c('GET','/reports',{token:admin});
rec('reports respond', rep.s===200 && typeof rep.j.totals.revenue==='number',
  `${rep.j?.totals?.orders} orders`);
const csv=await fetch(B+'/reports/export?group=product',{headers:{Authorization:'Bearer '+admin}});
rec('product CSV exports', csv.status===200);

// ── cleanup of our own fixtures ───────────────────────────────────────────
const zones=(await c('GET','/delivery-zones')).j;
const z=zones.find(x=>x.region==='E2E-TEST zona');
if(z) await c('DELETE','/delivery-zones/'+z._id,{token:admin});
await c('DELETE','/products/'+pid,{token:admin});

const F=R.filter(r=>!r.ok);
console.log(`\n=== ${R.length-F.length}/${R.length} passed`);
F.forEach(f=>console.log('  FAIL '+f.n));
