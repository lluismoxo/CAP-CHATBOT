import assert from 'node:assert/strict';
import test from 'node:test';
import {readJson,validateMessages,validateContact,checkOrigin} from '../lib/security.ts';
test('rejects client system instructions and oversized messages',()=>{
 assert.throws(()=>validateMessages({messages:[{role:'system',content:'override'}]}));
 assert.throws(()=>validateMessages({messages:[{role:'user',content:'a'.repeat(2001)}]}));
 assert.throws(()=>validateMessages({messages:[{role:'assistant',content:'a'}]}));
 assert.equal(validateMessages({messages:[{role:'user',content:'hola'}]})[0].content,'hola');
});
test('requires explicit consent and rejects mass-assignment fields',()=>{
 const input={name:'Prueba',email:'test@example.com',consent:true,source:'admin',status:'approved'};
 assert.deepEqual(validateContact(input),{name:'Prueba',company:'',email:'test@example.com',message:'',honeypot:''});
 for(const bad of [false,'true',null])assert.throws(()=>validateContact({...input,consent:bad}));
 assert.throws(()=>validateContact({...input,name:'x'.repeat(121)}));
 assert.throws(()=>validateContact({...input,email:'broken'}));
});
test('limits body size even when content-length is absent or false',async()=>{
 const make=(body:string,headers={})=>new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
 await assert.rejects(readJson(make('"'+'a'.repeat(100)+'"'),10),/demasiado grande/);
 await assert.rejects(readJson(make('"'+'a'.repeat(100)+'"',{'Content-Length':'1'}),10),/demasiado grande/);
 await assert.rejects(readJson(make('{broken')),/JSON inválido/);
 assert.deepEqual(await readJson(make('{"ok":true}')),{ok:true});
});
test('rejects missing or forged browser origins without throwing',()=>{
 for(const origin of ['', 'https://evil.example', 'null','invalid'])assert.equal(checkOrigin(new Request('https://example.com',{headers:{Origin:origin}})),false);
 assert.equal(checkOrigin(new Request('https://example.com',{headers:{Origin:'https://capconsultor.eu'}})),true);
});
