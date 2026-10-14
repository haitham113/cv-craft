import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const run=(args)=>spawnSync(process.execPath,[path.resolve('scripts/cv-craft.mjs'),...args],{encoding:'utf8',timeout:60000});
const hash=d=>crypto.createHash('sha256').update(JSON.stringify(d)).digest('hex');
const has=x=>spawnSync('which',[x]).status===0;
test('journal CLI passes valid flow and blocks unauthorized external processing',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-gates-')),file=path.join(dir,'journal.json');
 try{
  const h='a'.repeat(64);
  const flow={events:[{type:'intake',mode:'general'},{type:'evidence-approved',actor:'candidate'},
   {type:'draft-updated',hash:h},{type:'draft-approved',actor:'candidate',hash:h},
   {type:'render',hash:h},{type:'qa-passed',criticalIssues:0},{type:'deliver',formats:['pdf','docx']}]};
  fs.writeFileSync(file,JSON.stringify(flow));
  let check=run(['audit-workflow','--file',file,'--expected-content-hash',h]);
  assert.equal(check.status,0,check.stderr);
  check=run(['audit-workflow','--file',file,'--expected-content-hash','b'.repeat(64)]);
  assert.equal(check.status,2,check.stderr);
  flow.events.splice(1,0,{type:'third-party-use',serviceId:'any',purpose:'ats',dataScope:'full-cv',free:false});
  fs.writeFileSync(file,JSON.stringify(flow));
  assert.equal(run(['audit-workflow','--file',file]).status,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('optional journal gate blocks changed CV data even if prior approval exists',{
 skip:!['weasyprint','unzip','pdftotext','pdfinfo'].every(has)
},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-gates-'));
 try{
  const cv=JSON.parse(fs.readFileSync('fixtures/example.json','utf8')),f=path.join(dir,'candidate.json'),j=path.join(dir,'journal.json'),state=path.join(dir,'state'),output=path.join(dir,'output');
  fs.writeFileSync(f,JSON.stringify(cv));const h=hash(cv);
  const events=[{type:'intake',mode:'general'},{type:'evidence-approved',actor:'candidate'},
   {type:'draft-updated',hash:h},{type:'draft-approved',actor:'candidate',hash:h},
   {type:'render',hash:h},{type:'qa-passed',criticalIssues:0}];
  fs.writeFileSync(j,JSON.stringify({events}));
  assert.equal(run(['approve','--file',f,'--workspace',state,'--confirmation','APPROVED']).status,0);
  const passed=run(['render','--file',f,'--journal',j,'--workspace',state,'--output',output]);
  assert.equal(passed.status,0,passed.stderr+passed.stdout);
  events.push({type:'draft-updated',hash:'b'.repeat(64)});
  fs.writeFileSync(j,JSON.stringify({events}));
  assert.notEqual(run(['render','--file',f,'--journal',j,'--workspace',state,'--output',output]).status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
