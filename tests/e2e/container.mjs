/* The container choice, end to end on production. */
const A='https://aquawater-backend.vercel.app/api';
const R=[]; const rec=(n,ok,d)=>{R.push({n,ok});console.log(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`)};
const c=async(m,p,o={})=>{const r=await fetch(A+p,{method:m,headers:{'Content-Type':'application/json',...(o.token?{Authorization:'Bearer '+o.token}:{})},...(o.body?{body:JSON.stringify(o.body)}:{})});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t};return{s:r.status,j}};

const mk=async n=>{const phone='+9989'+Math.floor(10000000+Math.random()*89999999);
  const r=await c('POST','/auth/register',{body:{phone,name:n,password:'E2E-test-abc123'}});return {t:r.j.token,id:r.j.user._id,phone};};
const cust=await mk('E2E Container');

const p19=(await c('GET','/products')).j.find(x=>x.name==='19L Suv idishi');
rec('product exposes its container price', p19.depositPrice===35000, 'idish narxi '+p19.depositPrice);

const addr={region:'Toshkent shahri',city:'Toshkent',district:'E2E-TEST',street:'E2E-TEST',house:'9'};
const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const mkOrder=(items)=>({items,addressSnapshot:addr,deliveryDate:day(1),deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'});

// 5 waters, container returned — the cheaper choice
const ret=await c('POST','/orders',{token:cust.t,body:mkOrder([{productId:p19._id,qty:5,returnBottle:true}])});
const retLine=ret.j.items[0];
rec('returning charges no container fee', retLine.depositSnapshot===0, 'deposit '+retLine.depositSnapshot);
rec('the line is flagged as returnable', retLine.returnBottle===true);

// 2 waters, container kept — dearer
const keep=await c('POST','/orders',{token:cust.t,body:mkOrder([{productId:p19._id,qty:2,returnBottle:false}])});
const keepLine=keep.j.items[0];
rec('keeping charges the container price', keepLine.depositSnapshot===35000, 'deposit '+keepLine.depositSnapshot);
rec('keeping is dearer per unit',
  (keepLine.priceSnapshot+keepLine.depositSnapshot) > (retLine.priceSnapshot+retLine.depositSnapshot),
  `${retLine.priceSnapshot} vs ${keepLine.priceSnapshot+keepLine.depositSnapshot}`);

// The default when the field is omitted must be the cheaper one
const dflt=await c('POST','/orders',{token:cust.t,body:mkOrder([{productId:p19._id,qty:1}])});
rec('omitting the choice defaults to returning', dflt.j.items[0].returnBottle===true && dflt.j.items[0].depositSnapshot===0);

// A client cannot set its own deposit
const cheat=await c('POST','/orders',{token:cust.t,body:{...mkOrder([{productId:p19._id,qty:1,returnBottle:false}]),
  items:[{productId:p19._id,qty:1,returnBottle:false,depositSnapshot:1,priceSnapshot:1}]}});
rec('client-supplied prices are ignored',
  cheat.s===201 && cheat.j.items[0].depositSnapshot===35000 && cheat.j.items[0].priceSnapshot===25000,
  `deposit ${cheat.j.items?.[0]?.depositSnapshot}, price ${cheat.j.items?.[0]?.priceSnapshot}`);

// Deliver both, then check the ledger counts only the returned line
const PW=process.env.STAFF_PW;
const admin=(await c('POST','/auth/login',{body:{phone:'+998900000004',password:PW}})).j.token;
if(!admin){ console.log('\n(no admin — run mkstaff first)'); } else {
  for (const o of [ret.j, keep.j]) {
    await c('PATCH',`/orders/${o._id}/status`,{token:admin,body:{status:'assigned'}});
    await c('PATCH',`/orders/${o._id}/status`,{token:admin,body:{status:'delivered',emptiesCollected:0}});
  }
  const st=await c('GET','/bottles/me',{token:cust.t});
  rec('only the returned line lands on the ledger', st.j.balance===5,
    `balance ${st.j.balance} (5 returned + 2 kept should be 5)`);
}

console.log('\naccount: '+cust.phone);
const F=R.filter(r=>!r.ok);
console.log(`\n=== ${R.length-F.length}/${R.length} passed`);
F.forEach(f=>console.log('  FAIL '+f.n));
