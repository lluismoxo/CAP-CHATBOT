import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
let allowed=true, unavailable=false, inserts=[], rules=[];
const db=createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c);
 const body=chunks.length?JSON.parse(Buffer.concat(chunks)):null;
 res.setHeader('Content-Type','application/json');
 if(req.url.includes('/rpc/cap_check_rate_limits')){
  rules.push(body.p_rules);res.statusCode=unavailable?503:200;res.end(JSON.stringify(unavailable?{message:'unavailable'}:{allowed,retry_after:45}));
 }else if(req.url.includes('/clientes_web')){inserts.push(body);res.statusCode=201;res.end('');}
 else{res.statusCode=404;res.end('{}');}
});
await new Promise(resolve=>db.listen(0,'127.0.0.1',resolve));
const port=3102, origin='https://capconsultor.eu';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'--hostname','127.0.0.1'],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${db.address().port}`,SUPABASE_SERVICE_ROLE_KEY:'local-test-only-not-a-real-secret'},stdio:'pipe'});
let output='';server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);
const url=`http://127.0.0.1:${port}`;
const post=body=>fetch(url+'/api/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 for(let i=0;i<80;i++){try{await fetch(url);break;}catch{if(i===79)throw new Error(output);await new Promise(r=>setTimeout(r,100));}}
 const data={name:'Prueba local',company:'Empresa ficticia',email:'test@example.invalid',message:'Solo prueba local',consent:true,website_url:'',admin:true};
 let response=await post(data);assert.equal(response.status,200,await response.text());assert.equal(inserts.length,1);
 const row=Array.isArray(inserts[0])?inserts[0][0]:inserts[0];assert.equal(row.nombre_contacto,data.name);assert.equal(row.email,data.email);assert.equal(row.privacy_version,'2026-10-25');assert.ok(Date.parse(row.consent_at));assert.equal(row.admin,undefined);
 assert.equal(rules[0].length,4);assert.ok(rules[0].every(r=>!r.key.includes(data.email)));
 response=await post({...data,consent:false});assert.equal(response.status,400);assert.equal(inserts.length,1);
 response=await post({...data,website_url:'bot'});assert.equal(response.status,200);assert.equal(inserts.length,1);
 allowed=false;response=await post(data);assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'45');assert.equal(inserts.length,1);
 unavailable=true;response=await post(data);assert.equal(response.status,503);assert.equal(inserts.length,1);assert.ok(!(await response.text()).includes('local-test-only'));
 response=await fetch(url+'/api/contact',{method:'OPTIONS',headers:{Origin:origin}});assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),origin);
 response=await fetch(url+'/api/contact',{method:'OPTIONS',headers:{Origin:'https://attacker.invalid'}});assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);
 console.log('Contact integration passed: insert mapping, consent, honeypot, persistent quota, fail-closed and CORS. No external requests or emails.');
}finally{server.kill('SIGTERM');await new Promise(resolve=>db.close(resolve));}
