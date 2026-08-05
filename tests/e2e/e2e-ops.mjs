import { makeTestBottle, removeTestBottle, rows } from './lib.mjs';
/* Full order lifecycle against production: order -> deliver -> bottle ledger. */
const B='https://aquawater-backend.vercel.app/api';
const R=[];const rec=(n,ok,d)=>{R.push({n,ok});console.log(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`)};
const c=async(m,p,o={})=>{const r=await fetch(B+p,{method:m,headers:{'Content-Type':'application/json',...(o.token?{Authorization:'Bearer '+o.token}:{})},...(o.body?{body:JSON.stringify(o.body)}:{})});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t};return{s:r.status,j}};


const PW=process.env.STAFF_PW;
const admin=(await c('POST','/auth/login',{body:{phone:'+998900000004',password:PW}})).j.token;
const courier=(await c('POST','/auth/login',{body:{phone:'+998900000002',password:PW}})).j.token;
rec('admin and courier can log in', !!admin && !!courier);

const phone='+9989'+String(Math.floor(10000000+Math.random()*89999999));
const reg=await c('POST','/auth/register',{body:{phone,name:'E2E Lifecycle',password:'E2E-test-abc123'}});
const cust=reg.j.token;
const custId=reg.j.user?._id || reg.j.user?.id;

const products=(await c('GET','/products')).j;
const bottle = await makeTestBottle(admin);
rec('19L bottle is marked returnable', bottle?.returnable===true);
rec('19L bottle has a stock count', Number.isInteger(bottle?.stockQty), 'stock '+bottle?.stockQty);
rec('product image is same-origin', String(bottle?.imageUrl).startsWith('/products/'), bottle?.imageUrl);

const addr=r=>({region:r,city:'Toshkent',district:'E2E-TEST',street:'E2E-TEST',house:'1'});
const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);

// unserved region
const bad=await c('POST','/orders',{token:cust,body:{items:[{productId:bottle._id,qty:2}],
  addressSnapshot:addr('Qoraqalpogʻiston'),deliveryDate:tomorrow,deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
rec('order to an unserved region refused', bad.s===400, bad.j?.message);

// good order, region with a fee
const withFee=await c('POST','/orders',{token:cust,body:{items:[{productId:bottle._id,qty:3}],
  addressSnapshot:addr('Toshkent viloyati'),deliveryDate:tomorrow,deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
rec('order created with the zone fee', withFee.s===201 && withFee.j.deliveryFee===15000, 'fee '+withFee.j?.deliveryFee);
const orderId=withFee.j._id;

const stockAfter=(await c('GET','/products/'+bottle._id)).j.stockQty;
rec('stock decremented by the ordered quantity', stockAfter===bottle.stockQty-3, `${bottle.stockQty} -> ${stockAfter}`);

// assign then deliver with empties
const uresp = rows((await c('GET','/admin/users',{token:admin})).j);
const ulist = Array.isArray(uresp) ? uresp : (uresp.users || []);
const courierId = ulist.find(u=>u.phone==='+998900000002')?._id;
rec('courier account found for assignment', !!courierId);
await c('PATCH',`/orders/${orderId}/assign`,{token:admin,body:{courierId}});
const assigned=await c('PATCH',`/orders/${orderId}/status`,{token:admin,body:{status:'assigned'}});
rec('admin can assign and set status', assigned.s===200);

const delivered=await c('PATCH',`/orders/${orderId}/status`,{token:courier,body:{status:'delivered',emptiesCollected:1}});
rec('courier delivers and reports empties', delivered.s===200, 'empties '+delivered.j?.emptiesCollected);

const stmt=await c('GET','/bottles/me',{token:cust});
rec('ledger shows 3 issued minus 1 returned', stmt.j?.balance===2, 'balance '+stmt.j?.balance);
rec('ledger rows explain the balance', (stmt.j?.movements||[]).length===2, (stmt.j?.movements||[]).length+' rows');

const out=await c('GET','/bottles/outstanding',{token:admin});
rec('customer appears on the chase list', (out.j?.holders||[]).some(h=>h.balance===2));
rec('depot summary counts the movement', out.j?.summary?.outstanding>=2, JSON.stringify(out.j?.summary));

// manual return clears it
const adj=await c('POST','/bottles/adjust',{token:admin,body:{userId:custId,delta:-2,note:'E2E depot drop'}});
rec('manual adjustment clears the balance', adj.j?.balance===0, 'balance '+adj.j?.balance);

// standing order
const sub=await c('POST','/subscriptions',{token:cust,body:{items:[{productId:bottle._id,qty:1}],
  addressSnapshot:addr('Toshkent shahri'),weekday:3,deliveryTimeSlot:'11:00–13:00',paymentMethod:'cash'}});
rec('standing order created', sub.s===201, 'next '+String(sub.j?.nextRunAt).slice(0,10));
const paused=await c('PATCH','/subscriptions/'+sub.j._id,{token:cust,body:{isActive:false}});
rec('standing order can be paused', paused.s===200 && paused.j.isActive===false);
const other=await c('PATCH','/subscriptions/'+sub.j._id,{token:admin,body:{isActive:true}});
rec('another account cannot touch it', other.s===404, 'got '+other.s);

// reports
const rep=await c('GET','/reports?from='+tomorrow.slice(0,8)+'01',{token:admin});
rec('admin reads reports', rep.s===200 && typeof rep.j?.totals?.revenue==='number',
  `${rep.j?.totals?.orders} orders, ${rep.j?.totals?.revenue} so'm`);
rec('report includes delivery income', typeof rep.j?.totals?.delivery==='number', 'delivery '+rep.j?.totals?.delivery);
const csvRes=await fetch(B+'/reports/export?group=day',{headers:{Authorization:'Bearer '+admin}});
const csv=await csvRes.text();
rec('csv export downloads', csvRes.status===200 && csv.includes('"date"'), csv.split('\r\n')[0]?.slice(0,40));
const custCsv=await fetch(B+'/reports/export?group=day',{headers:{Authorization:'Bearer '+cust}});
rec('a customer cannot export reports', custCsv.status===403, 'got '+custCsv.status);

// zones admin
const zone=await c('POST','/delivery-zones',{token:admin,body:{region:'E2E-TEST hudud',fee:9000,minOrder:10000,eta:'1 kun'}});
rec('admin creates a zone', zone.s===201);
const dup=await c('POST','/delivery-zones',{token:admin,body:{region:'E2E-TEST hudud',fee:1,minOrder:1}});
rec('duplicate zone rejected', dup.s===409, 'got '+dup.s);
await c('DELETE','/delivery-zones/'+zone.j._id,{token:admin});
rec('zone removed', !(await c('GET','/delivery-zones')).j.some(z=>z.region==='E2E-TEST hudud'));

console.log('\naccount: '+phone);
const F=R.filter(r=>!r.ok);
console.log(`\n=== ${R.length-F.length}/${R.length} passed`);
F.forEach(f=>console.log('  FAIL '+f.n));

await removeTestBottle(admin, bottle?._id);
