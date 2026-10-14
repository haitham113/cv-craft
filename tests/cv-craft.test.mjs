import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const script=path.resolve('scripts/cv-craft.mjs');
function call(action,options=[]){return spawnSync(process.execPath,[script,action,...options],{encoding:'utf8',timeout:60000});}
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-test-'));}
test('valid canonical document',()=>{const r=call('validate',['--file','fixtures/example.json']);assert.equal(r.status,0,r.stderr);});
test('unverified fact blocked',()=>{const w=temp(),d=JSON.parse(fs.readFileSync('fixtures/example.json'));d.evidence[0].status='unverified';const f=path.join(w,'cv.json');fs.writeFileSync(f,JSON.stringify(d));assert.notEqual(call('validate',['--file',f]).status,0);fs.rmSync(w,{force:true,recursive:true});});
test('approval hash invalidated by changes',()=>{const w=temp(),f=path.join(w,'cv.json');fs.copyFileSync('fixtures/example.json',f);assert.equal(call('approve',['--file',f,'--workspace',w,'--confirmation','APPROVED']).status,0);const d=JSON.parse(fs.readFileSync(f));d.summary+=' Changed';fs.writeFileSync(f,JSON.stringify(d));const r=call('render',['--file',f,'--workspace',w]);assert.notEqual(r.status,0);fs.rmSync(w,{force:true,recursive:true});});
test('verified-only fit score',()=>{const w=temp();assert.notEqual(call('score',['--file','fixtures/fit.json','--workspace',w]).status,0);assert.equal(call('approve',['--scope','weights','--file','fixtures/fit.json','--workspace',w,'--confirmation','APPROVED']).status,0);const r=call('score',['--file','fixtures/fit.json','--workspace',w]);assert.equal(r.status,0,r.stderr);const x=JSON.parse(r.stdout);assert.equal(x.fitAmongVerifiedPercent,85.71);assert.equal(x.unverifiedWeight,3);fs.rmSync(w,{force:true,recursive:true});});
test('safe managed cleanup only',()=>{const w=temp();assert.notEqual(call('close',['--workspace',w,'--confirmation','CLOSE']).status,0);assert.equal(call('approve',['--file','fixtures/example.json','--workspace',w,'--confirmation','APPROVED']).status,0);assert.equal(call('close',['--workspace',w,'--confirmation','CLOSE']).status,0);});
test('PDF and DOCX parse and parity', {skip:spawnSync('which',['weasyprint']).status!==0||spawnSync('which',['pdftotext']).status!==0||spawnSync('which',['unzip']).status!==0},()=>{
const w=temp(),out=path.join(w,'outputs');
assert.equal(call('approve',['--file','fixtures/example.json','--workspace',w,'--confirmation','APPROVED']).status,0);
const r=call('render',['--file','fixtures/example.json','--workspace',w,'--output',out]);
assert.equal(r.status,0,r.stderr+r.stdout);
const result=JSON.parse(r.stdout);assert.equal(result.qa.critical,false,JSON.stringify(result.qa));
assert.ok(fs.existsSync(result.files.docx));assert.ok(fs.existsSync(result.files.pdf));
fs.rmSync(w,{force:true,recursive:true});
});
