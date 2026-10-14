import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

const cli=path.resolve('scripts/cv-craft.mjs');
const have=x=>spawnSync('which',[x]).status===0;
const renderTools=['weasyprint','pdftotext','unzip','pdfinfo'].every(have);
function run(exe,args){return spawnSync(exe,args,{encoding:'utf8',timeout:90000,maxBuffer:16*1024*1024});}
function generate(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-layout-'));
 const cv=JSON.parse(fs.readFileSync('fixtures/example.json','utf8'));
 const items=cv.sections[0].blocks[0].items;
 items.push({text:'Delivered complex services that support multiple internal business requirements while reducing the time needed for developers to understand the implementation across multiple teams.',claimIds:['c1']});
 items.push({text:'Mentored engineers and maintained test coverage during frequent product changes.',claimIds:['c1']});
 const file=path.join(root,'candidate.json'),workspace=path.join(root,'managed'),out=path.join(root,'out');
 fs.writeFileSync(file,JSON.stringify(cv));
 const approved=run(process.execPath,[cli,'approve','--file',file,'--workspace',workspace,'--confirmation','APPROVED']);
 assert.equal(approved.status,0,approved.stderr);
 const built=run(process.execPath,[cli,'render','--file',file,'--workspace',workspace,'--output',out]);
 assert.equal(built.status,0,built.stderr+built.stdout);
 const result=JSON.parse(built.stdout);
 assert.ok(result.files.docx&&result.files.pdf,'Both files must pass text checks');
 return {root,cv,result};
}
const unpack=(file,part)=>{const r=run('unzip',['-p',file,part]);assert.equal(r.status,0,r.stderr);return r.stdout;};
test('DOCX contains actual numbered bullet definitions, hanging indents and separate relationships',{skip:!renderTools},()=>{
 const {root,result}=generate();
 try{
  const file=result.files.docx,body=unpack(file,'word/document.xml'),
   styles=unpack(file,'word/styles.xml'),
   numbering=unpack(file,'word/numbering.xml'),
   relationships=unpack(file,'word/_rels/document.xml.rels'),
   types=unpack(file,'[Content_Types].xml');
  assert.match(numbering,/<w:numFmt w:val="bullet"\/>/);
  assert.match(numbering,/<w:lvlText w:val="•"\/>/);
  assert.match(numbering,/<w:ind w:left="420" w:hanging="230"\/>/);
  assert.equal((body.match(/<w:numPr>/g)||[]).length,3);
  assert.match(body,/<w:pgSz w:w="11906" w:h="16838"\/>/,'Use A4 in Word, matching PDF');
  assert.match(styles,/w:styleId="Heading2"/);
  assert.match(styles,/<w:pBdr><w:bottom/,'Visible section rules need matching Word paragraph borders');
  assert.match(styles,/w:styleId="Heading3"/);
  assert.match(styles,/w:keepNext\/>/,'Prevent orphan headings');
  assert.match(relationships,/relationships\/numbering" Target="numbering.xml"/);
  assert.match(types,/\/word\/numbering.xml/);
  assert.equal(run('unzip',['-t',file]).status,0);
  assert.equal(result.qa.critical,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
function geometry(pdf){
 const info=run('pdfinfo',[pdf]);assert.equal(info.status,0,info.stderr);
 const pages=Number(info.stdout.match(/^Pages:\s*(\d+)/m)?.[1]);
 const bbox=run('pdftotext',['-bbox',pdf,'-']);assert.equal(bbox.status,0,bbox.stderr);
 const ys=[...bbox.stdout.matchAll(/<word\s+([^>]+)>/g)].map(m=>{const lo=Number(m[1].match(/\byMin="([\d.]+)"/)?.[1]);const hi=Number(m[1].match(/\byMax="([\d.]+)"/)?.[1]);return [lo,hi];}).filter(v=>Number.isFinite(v[0])&&Number.isFinite(v[1]));
 assert.ok(ys.length>20,'Selectable text required');
 return {pages,span:Math.max(...ys.map(v=>v[1]))-Math.min(...ys.map(v=>v[0])),pageSize:info.stdout.match(/^Page size:\s*(.*)$/m)?.[1]};
}
test('headless Word export retains a comparable A4 layout and readable bullets',{
 skip:!renderTools||!have('libreoffice')
},()=>{
 const {root,result}=generate();
 try{
  const output=path.join(root,'converted');fs.mkdirSync(output);
  const profile='file://'+path.join(root,'lo-profile');
  const conversion=run('libreoffice',['-env:UserInstallation='+profile,'--headless','--convert-to','pdf','--outdir',output,result.files.docx]);
  assert.equal(conversion.status,0,conversion.stderr+conversion.stdout);
  const converted=path.join(output,path.basename(result.files.docx,'.docx')+'.pdf');
  assert.ok(fs.existsSync(converted),'LibreOffice should export the DOCX to PDF');
  const first=geometry(result.files.pdf),second=geometry(converted);
  assert.equal(first.pages,second.pages,'Word and PDF must not have divergent page counts');
  assert.equal(second.pages,1,'The short synthetic CV should stay on one page');
  assert.match(second.pageSize||'',/A4|595[.\d]* x 841[.\d]*/);
  const scale=second.span/first.span;
  assert.ok(scale>.70&&scale<1.45,'Word CV vertical layout is too compressed or stretched: '+scale);
  const extracted=run('pdftotext',['-layout',converted,'-']);
  assert.equal(extracted.status,0,extracted.stderr);
  assert.match(extracted.stdout,/Mentored engineers/);
  assert.match(extracted.stdout,/Delivered complex services/);
  assert.match(extracted.stdout,/[•●▪]/,'Real list marker must survive Word PDF export');
  assert.doesNotMatch(extracted.stdout,/\uFFFD/,'No replacement glyphs');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
