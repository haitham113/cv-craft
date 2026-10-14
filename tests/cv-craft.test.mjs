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


test('reject unsupported CV properties and unsafe candidate links',()=>{
 const w=temp(),cv=JSON.parse(fs.readFileSync('fixtures/example.json','utf8')),f=path.join(w,'cv.json');
 cv.unexpected='not silently ignored';fs.writeFileSync(f,JSON.stringify(cv));assert.notEqual(call('validate',['--file',f]).status,0);
 delete cv.unexpected;cv.candidate.links=['javascript:alert(1)'];fs.writeFileSync(f,JSON.stringify(cv));assert.notEqual(call('validate',['--file',f]).status,0);
 fs.rmSync(w,{recursive:true,force:true});
});
test('require evidence-backed statements and reference integrity',()=>{
 const w=temp(),cv=JSON.parse(fs.readFileSync('fixtures/example.json','utf8')),f=path.join(w,'cv.json');
 cv.claims[0].evidenceIds=['missing'];fs.writeFileSync(f,JSON.stringify(cv));assert.notEqual(call('validate',['--file',f]).status,0);
 cv.claims[0].evidenceIds=['e1'];cv.sections[0].blocks[0].items[0].claimIds=['missing'];fs.writeFileSync(f,JSON.stringify(cv));assert.notEqual(call('validate',['--file',f]).status,0);
 fs.rmSync(w,{recursive:true,force:true});
});
test('versioned schema migration creates backup and invalidates prior approval',()=>{
 const w=temp(),f=path.join(w,'cv.json');fs.copyFileSync('fixtures/example.json',f);
 assert.equal(call('approve',['--file',f,'--workspace',w,'--confirmation','APPROVED']).status,0);
 const r=call('migrate',['--file',f]);assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);assert.equal(report.to,'1.1.0');assert.ok(fs.existsSync(report.backup));
 assert.equal(JSON.parse(fs.readFileSync(f,'utf8')).schemaVersion,'1.1.0');
 assert.notEqual(call('render',['--file',f,'--workspace',w,'--output',path.join(w,'out')]).status,0);
 fs.rmSync(w,{recursive:true,force:true});
});
test('fit evaluation rejects verified requirements without evidence',()=>{
 const w=temp(),f=path.join(w,'fit.json'),d=JSON.parse(fs.readFileSync('fixtures/fit.json','utf8'));
 delete d.requirements[0].evidenceIds;fs.writeFileSync(f,JSON.stringify(d));
 assert.notEqual(call('approve',['--scope','weights','--file',f,'--workspace',w,'--confirmation','APPROVED']).status,0);
 fs.rmSync(w,{recursive:true,force:true});
});
test('external hyperlinks are real DOCX relationships and safe PDF anchors',{
 skip:spawnSync('which',['weasyprint']).status!==0||spawnSync('which',['pdftotext']).status!==0||spawnSync('which',['unzip']).status!==0
},()=>{
 const w=temp(),f=path.join(w,'cv.json'),cv=JSON.parse(fs.readFileSync('fixtures/example.json','utf8'));
 cv.candidate.links=['https://example.org/portfolio'];fs.writeFileSync(f,JSON.stringify(cv));
 assert.equal(call('approve',['--file',f,'--workspace',w,'--confirmation','APPROVED']).status,0);
 const r=call('render',['--file',f,'--workspace',w,'--output',path.join(w,'out')]);
 assert.equal(r.status,0,r.stderr+r.stdout);
 const doc=JSON.parse(r.stdout).files.docx;
 const xml=spawnSync('unzip',['-p',doc,'word/document.xml'],{encoding:'utf8'}).stdout;
 const rel=spawnSync('unzip',['-p',doc,'word/_rels/document.xml.rels'],{encoding:'utf8'}).stdout;
 assert.match(xml,/w:hyperlink r:id="cvlink1"/);
 assert.match(rel,/TargetMode="External"/);
 assert.match(rel,/https:\/\/example.org\/portfolio/);
 fs.rmSync(w,{recursive:true,force:true});
});
