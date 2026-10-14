import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const have=(exe)=>spawnSync('which',[exe]).status===0;
const canRun=['weasyprint','pdftoppm','pdftotext','pdfinfo','unzip','tesseract'].every(have);
const script=path.resolve('scripts/cv-craft.mjs');
const node=(action,args)=>spawnSync(process.execPath,[script,action,...args],{encoding:'utf8',timeout:60000});
test('synthetic image-based CV can be OCRed but requires factual verification', {skip:!canRun},()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-ocr-')),workspace=path.join(root,'state'),out=path.join(root,'out');
 try{
  assert.equal(node('approve',['--file','fixtures/example.json','--workspace',workspace,'--confirmation','APPROVED']).status,0);
  const render=node('render',['--file','fixtures/example.json','--workspace',workspace,'--output',out]);
  assert.equal(render.status,0,render.stderr+render.stdout);
  const {files}=JSON.parse(render.stdout),target=path.join(root,'scanned');
  const bitmap=spawnSync('pdftoppm',['-f','1','-l','1','-r','180','-png','-singlefile',files.pdf,target],{encoding:'utf8',timeout:45000});
  assert.equal(bitmap.status,0,bitmap.stderr);
  const parsed=node('ocr',['--file',target+'.png','--lang','eng']);
  assert.equal(parsed.status,0,parsed.stderr);
  assert.match(parsed.stdout,/Sample Candidate/i);
  assert.match(parsed.stdout,/Backend Engineer/i);
  assert.match(parsed.stdout,/Professional Summary/i);
  // OCR is evidence extraction, not approval of the extracted candidate facts.
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
