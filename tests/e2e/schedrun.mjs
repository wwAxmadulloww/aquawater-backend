import { makeTestBottle, removeTestBottle, rows } from './lib.mjs';
/*
 * The hop the fix was actually about: a standing order that says "I am keeping
 * the container" must create a weekly order that charges for it and leaves the
 * customer's bottle ledger alone.
 */
import { MongoClient, ObjectId } from 'mongodb';
// Never hardcoded. Committing this once is what put the database password
// into a public repository — the secret scan in CI caught it on its first run.
const URI = process.env.MONGODB_URI;
if (!URI) { console.error('MONGODB_URI kerak'); process.exit(1); }
const B = (process.env.BASE_URL || 'https://aquawater-backend.vercel.app') + '/api';
const R=[];const rec=(n,ok,d)=>{R.push({n,ok});console.log(`${ok?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`)};
const c=async(m,p,o={})=>{const r=await fetch(B+p,{method:m,headers:{'Content-Type':'application/json',...(o.token?{Authorization:'Bearer '+o.token}:{})},...(o.body?{body:JSON.stringify(o.body)}:{})});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t};return{s:r.status,j}};


const admin=(await c('POST','/auth/login',{body:{phone:'+998900000004',password:process.env.STAFF_PW}})).j.token;
const phone='+9989'+String(Math.floor(10000000+Math.random()*89999999));
const reg=await c('POST','/auth/register',{body:{phone,name:'E2E Sched',password:'E2E-test-abc123'}});
const cust=reg.j.token, custId=reg.j.user?._id||reg.j.user?.id;

const bottle = await makeTestBottle(admin);
const addr={region:'Toshkent shahri',city:'Toshkent',district:'E2E-TEST',street:'E2E-TEST',house:'1'};

const made=await c('POST','/subscriptions',{token:cust,body:{
  items:[{productId:bottle._id,qty:1,returnBottle:false}],
  addressSnapshot:addr,weekday:3,deliveryTimeSlot:'09:00–11:00',paymentMethod:'cash'}});
rec('standing order created, container kept', made.s===201);

const cl=await new MongoClient(URI).connect();
const db=cl.db('aquawater');

const stored=await db.collection('subscriptions').findOne({_id:new ObjectId(made.j._id)});
rec('the choice reached the database', stored?.items?.[0]?.returnBottle===false,
    'returnBottle='+stored?.items?.[0]?.returnBottle);

// Make it due right now.
await db.collection('subscriptions').updateOne({_id:new ObjectId(made.j._id)},
  {$set:{nextRunAt:new Date(Date.now()-60000)}});

const run=await c('POST','/subscriptions/run',{token:admin});
rec('the scheduler created the weekly order', (run.j?.ordersCreated||0)>=1,
    JSON.stringify(run.j?.failures?.length?run.j.failures:run.j?.ordersCreated));

const order=await db.collection('orders').findOne({userId:new ObjectId(custId)},{sort:{createdAt:-1}});
rec('the weekly order kept the container choice', order?.items?.[0]?.returnBottle===false,
    'returnBottle='+order?.items?.[0]?.returnBottle);
rec('and charged for the container', (order?.items?.[0]?.depositSnapshot||0)>0,
    'deposit '+order?.items?.[0]?.depositSnapshot);

// Deliver it and confirm nothing lands on the ledger.
const uresp=rows((await c('GET','/admin/users',{token:admin})).j);
const users=Array.isArray(uresp)?uresp:(uresp.users||[]);
const courierId=users.find(u=>u.phone==='+998900000002')?._id;
const courier=(await c('POST','/auth/login',{body:{phone:'+998900000002',password:process.env.STAFF_PW}})).j.token;
await c('PATCH',`/orders/${order._id}/assign`,{token:admin,body:{courierId}});
await c('PATCH',`/orders/${order._id}/status`,{token:admin,body:{status:'confirmed'}});
await c('PATCH',`/orders/${order._id}/status`,{token:courier,body:{status:'delivering'}});
await c('PATCH',`/orders/${order._id}/status`,{token:courier,body:{status:'delivered',emptiesCollected:0}});

const bal=(await c('GET','/bottles/me',{token:cust})).j;
rec('the customer is not chased for a bottle they bought', (bal?.balance??0)===0, 'balance '+bal?.balance);

await cl.close();
const failed=R.filter(x=>!x.ok);
console.log(`\naccount: ${phone}`);
console.log(`\n=== ${R.length-failed.length}/${R.length} passed`);
failed.forEach(f=>console.log('  FAIL '+f.n));

await removeTestBottle(admin, bottle?._id);
