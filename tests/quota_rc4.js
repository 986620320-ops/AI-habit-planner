#!/usr/bin/env node
'use strict';
const assert=require('assert');
const path=require('path');
process.env.MAKERS_MODELS_KEY='quota-test-key';
process.env.DEMO_PLAN_DAILY_LIMIT='5';
process.env.DEMO_REVIEW_DAILY_LIMIT='2';
process.env.DEMO_VISION_DAILY_LIMIT='3';
process.env.DEMO_GLOBAL_DAILY_LIMIT='100';
process.env.DEMO_CHAT_RATE_PER_MINUTE='100';
process.env.QUOTA_HASH_SALT='quota-test-salt';
delete process.env.DEEPSEEK_API_KEY;
const api=require(path.join(__dirname,'..','netlify','functions','api.js'));
function makeStore(){
 const data=new Map();
 return {
  data,
  async list(prefix){return Array.from(data.keys()).filter(k=>k.indexOf(prefix)===0)},
  async set(k,v){data.set(k,JSON.stringify(v))},
  async delete(k){data.delete(k)}
 };
}
function event(body,ip,method){
 return {httpMethod:method||'POST',headers:{'x-nf-client-connection-ip':ip||'127.0.0.1','content-type':'application/json','x-ai-client':'habit-coach-web/1','user-agent':'quota-test'},body:body==null?'':JSON.stringify(body)};
}
async function chat(ip){return api.handler(event({action:'chat',planningContext:false,messages:[{role:'user',content:'你好'}],habits:[]},ip));}
(async()=>{
 globalThis.__HABIT_QUOTA_STORE__=makeStore();
 global.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'普通回复'}}]}),{status:200});
 let health=JSON.parse((await api.handler(event(null,'127.0.0.1','GET'))).body);
 assert.strictEqual(health.storageMode,'persistent');
 const shanghaiDate=new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
 assert.strictEqual(health.date,shanghaiDate);
 assert.strictEqual(health.quota.evidence.limit,10);
 assert.strictEqual(health.quota.chat.limit,10);
 for(let i=0;i<10;i++){const r=await chat('198.51.100.1');assert.strictEqual(r.statusCode,200,'request '+i+' should pass')}
 let blocked=await chat('198.51.100.1');
 let blockedBody=JSON.parse(blocked.body);
 assert.strictEqual(blocked.statusCode,429);
 assert.strictEqual(blockedBody.quota.chat.reason,'client');
 assert.strictEqual(blockedBody.quota.chat.remaining,0);

 globalThis.__HABIT_QUOTA_STORE__=makeStore();
 process.env.DEMO_CHAT_RATE_PER_MINUTE='2';
 assert.strictEqual((await chat('198.51.100.2')).statusCode,200);
 assert.strictEqual((await chat('198.51.100.2')).statusCode,200);
 let rate=JSON.parse((await chat('198.51.100.2')).body);
 assert.strictEqual(rate.quota.chat.reason,'rate');

 globalThis.__HABIT_QUOTA_STORE__=makeStore();
 process.env.DEMO_CHAT_RATE_PER_MINUTE='100';
 process.env.DEMO_GLOBAL_DAILY_LIMIT='2';
 assert.strictEqual((await chat('198.51.100.3')).statusCode,200);
 assert.strictEqual((await chat('198.51.100.4')).statusCode,200);
 let globalBlocked=JSON.parse((await chat('198.51.100.5')).body);
 assert.strictEqual(globalBlocked.quota.chat.reason,'global');

 delete globalThis.__HABIT_QUOTA_STORE__;
 process.env.DEMO_GLOBAL_DAILY_LIMIT='100';
 health=JSON.parse((await api.handler(event(null,'198.51.100.6','GET'))).body);
 assert.strictEqual(health.storageMode,'memory');
 assert.strictEqual((await chat('198.51.100.6')).statusCode,200);
 console.log(JSON.stringify({ok:true,clientQuota:true,rateLimit:true,globalBudget:true,memoryFallback:true},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
