import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const has=exe=>spawnSync('which',[exe]).status===0;
const cli=path.resolve('scripts/cv-craft.mjs'),audit=path.resolve('scripts/document-a11y-qa.mjs');
const run=(script,args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:60000});
test('semantic headings and HTTPS hyperlinks are present in generated DOCX',{
 skip:!['weasyprint','pdftotext','pdfinfo','unzip'].every(has)
},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-a11y-'));
 try{
  const cv=JSON.parse(fs.readFileSync('fixtures/example.json','utf8'));
  cv.candidate.links=['https://example.org/portfolio'];
  const file=path.join(dir,'cv.json'),state=path.join(dir,'state'),output=path.join(dir,'output');
  fs.writeFileSync(file,JSON.stringify(cv));
  assert.equal(run(cli,['approve','--file',file,'--workspace',state,'--confirmation','APPROVED']).status,0);
  const render=run(cli,['render','--file',file,'--workspace',state,'--output',output]);
  assert.equal(render.status,0,render.stderr+render.stdout);
  const files=JSON.parse(render.stdout).files;
  const qa=run(audit,['--docx',files.docx,'--pdf',files.pdf,'--lang','en']);
  assert.equal(qa.status,0,qa.stderr+qa.stdout);
  const result=JSON.parse(qa.stdout);
  assert.equal(result.ok,true);
  assert.ok(result.headingsDetected>=1);
  assert.equal(result.hyperlinksDetected,1);
  assert.equal(result.compliantWithWCAGorPDFUA,'not_assessed');
  assert.ok(result.warnings.some(x=>x.includes('Human reading-order')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('invalid DOCX is rejected without concealing errors',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-a11y-')),f=path.join(d,'bad.docx');
 try{fs.writeFileSync(f,'not a DOCX');
  const result=run(audit,['--docx',f]);
  assert.notEqual(result.status,0);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
