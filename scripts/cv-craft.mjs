#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {validateCV,validateFit,migrateFile} from './lib/validate.mjs';
import {spawnSync} from 'node:child_process';

const argv=process.argv.slice(2), command=argv.shift();
function opt(key,def){const i=argv.indexOf('--'+key);return i<0?def:argv[i+1];}
function fail(message){throw Error(message);}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function digest(data){return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');}
function escapeXml(x){return String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function safe(x){return String(x||'general').normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'general';}
function cmd(exe,args,timeout=45000){const r=spawnSync(exe,args,{encoding:'utf8',timeout,maxBuffer:32000000});if(r.error||r.status!==0)fail(exe+': '+(r.error?.message||r.stderr||r.stdout||r.status));return r.stdout||'';}
function available(exe){return spawnSync('which',[exe]).status===0;}
function folder(p){fs.mkdirSync(p,{recursive:true,mode:0o700});}
function workspace(){
 const p=path.resolve(opt('workspace','.cv-craft-work'));
 if([path.parse(p).root,process.cwd(),os.homedir()].includes(p))fail('Unsafe managed workspace path');
 if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())fail('Workspace symlinks are prohibited');
 if(fs.existsSync(p)){
  const existing=fs.readdirSync(p).filter(x=>!['approvals.json','checkpoint.json','.cv-craft-managed','backups'].includes(x));
  if(existing.length||(!fs.existsSync(path.join(p,'.cv-craft-managed'))&&!fs.existsSync(path.join(p,'approvals.json'))&&fs.readdirSync(p).length))fail('Refusing to take ownership of unrecognized directory');
 }
 folder(p);fs.chmodSync(p,0o700);
 const mark=path.join(p,'.cv-craft-managed');
 if(!fs.existsSync(mark))fs.writeFileSync(mark,'CV Craft managed workspace\n',{flag:'wx',mode:0o600});
 return p;
}
function approvals(w){const p=path.join(w,'approvals.json');return fs.existsSync(p)?read(p):{version:1,records:[]};}
function authorized(w,scope,data){return approvals(w).records.some(x=>x.scope===scope&&x.contentHash===digest(data));}
function ids(items,label){const s=new Set();for(const x of items){if(!x.id||s.has(x.id))fail('Duplicate or missing '+label+' ID: '+x.id);s.add(x.id);}return s;}
function validate(data){return validateCV(data);}
function rows(data){
 const r=[['title',data.candidate.name],['subtitle',data.headline]];
 const contact=[data.candidate.email,data.candidate.phone,data.candidate.location].filter(Boolean).join(' | ');
 if(contact)r.push(['contact',contact]);
 for(const url of data.candidate.links||[])r.push(['link',url]);
 r.push(['h2',data.summaryHeading||'Professional Summary'],['normal',data.summary]);
 for(const section of data.sections){r.push(['h2',section.heading]);for(const b of section.blocks){
 if(b.kind==='text')r.push(['normal',b.text||'']);
 if(b.kind==='entry'){r.push(['h3',b.heading||'']);if(b.subtitle||b.meta)r.push(['meta',[b.subtitle,b.meta].filter(Boolean).join(' | ')])}
 if(b.kind==='skills')for(const g of b.groups||[])r.push(['normal',g.label+': '+g.items.join(', ')]);
 for(const item of b.items||[])r.push(['bullet',item.text]);
 }}
 return r;
}
const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(bytes){let c=0xffffffff;for(const x of bytes)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function zip(files){
 const heads=[],centers=[];let offset=0;
 for(const [name,content] of Object.entries(files)){
 const filename=Buffer.from(name),raw=Buffer.from(content),data=zlib.deflateRawSync(raw),checksum=crc(raw);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt32LE(checksum,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(filename.length,26);
 heads.push(local,filename,data);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt32LE(checksum,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);
 centers.push(central,filename);offset+=local.length+filename.length+data.length;
 }
 const c=Buffer.concat(centers),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(c.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...heads,c,end]);
}
function writeDocx(data,file){
 const rtl=data.direction==='rtl';
 const linkRels=[];let linkIndex=0;
 const paragraphs=rows(data).map(([style,text])=>{
   const styleId=({title:'Title',subtitle:'Subtitle',contact:'Contact',link:'Normal',h2:'Heading2',h3:'Heading3',meta:'Meta',bullet:'Bullet'})[style]||'Normal';
   const para='<w:pPr><w:pStyle w:val="'+styleId+'"/>'+(rtl?'<w:bidi/>':'')+'</w:pPr>';
   const run=(value,link=false)=>'<w:r><w:rPr>'+(rtl?'<w:rtl/>':'')+(link?'<w:rStyle w:val="Hyperlink"/>':'')+'</w:rPr><w:t xml:space="preserve">'+escapeXml(value)+'</w:t></w:r>';
   if(style==='link'){
     const id='cvlink'+(++linkIndex);
     linkRels.push('<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="'+escapeXml(text)+'" TargetMode="External"/>');
     return '<w:p>'+para+'<w:hyperlink r:id="'+id+'" w:history="1">'+run(text,true)+'</w:hyperlink></w:p>';
   }
   return '<w:p>'+para+String(text).split('\n').map((part,i)=>(i?'<w:r><w:br/></w:r>':'')+run(part)).join('')+'</w:p>';
 }).join('');
 const doc='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+paragraphs+'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="900" w:bottom="900" w:left="900" w:right="900"/></w:sectPr></w:body></w:document>';
 const styles=['Normal','Title','Subtitle','Contact','Heading2','Heading3','Meta','Bullet'].map((s,i)=>'<w:style w:type="paragraph" w:styleId="'+s+'"><w:name w:val="'+s+'"/>'+(i===4?'<w:pPr><w:outlineLvl w:val="1"/></w:pPr>':i===5?'<w:pPr><w:outlineLvl w:val="2"/></w:pPr>':'')+'<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="'+([22,36,24,19,26,23,19,21][i])+'"/></w:rPr></w:style>').join('')+'<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="2255AA"/><w:u w:val="single"/></w:rPr></w:style>';
 const files={
  '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/_rels/document.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+linkRels.join('')+'</Relationships>',
  'word/document.xml':doc,
  'word/styles.xml':'<?xml version="1.0"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+styles+'</w:styles>'
 };
 fs.writeFileSync(file,zip(files),{flag:'wx',mode:0o600});
}
function html(data){
 const content=rows(data).map(([style,text])=>{
   const tag=style==='title'?'h1':style==='h2'?'h2':style==='h3'?'h3':'p';
   const value=style==='link'?'<a href="'+escapeXml(text)+'">'+escapeXml(text)+'</a>':(style==='bullet'?'•&#160;':'')+escapeXml(text).replace(/\n/g,'<br>');
   return '<'+tag+' class="'+style+'">'+value+'</'+tag+'>';
 }).join('');
 return '<!doctype html><html lang="'+escapeXml(data.language)+'" dir="'+(data.direction==='rtl'?'rtl':'ltr')+'"><head><meta charset="UTF-8"><style>@page{size:A4;margin:16mm}body{font-family:Arial,"DejaVu Sans",sans-serif;color:#152033;font-size:10pt;line-height:1.3}h1{font-size:21pt;margin:0}h2{font-size:12pt;border-bottom:1px solid #999;margin:12pt 0 4pt}h3{font-size:11pt;margin:8pt 0 2pt}p{margin:4pt 0}.subtitle{font-weight:bold}.contact,.meta{font-size:9pt;color:#555}.bullet{margin-inline-start:14pt}'+(/^ar(?:-|$)/i.test(data.language)?'body{font-feature-settings:"liga" 0,"rlig" 0}':'')+'a{color:#2255aa;text-decoration:underline}</style></head><body>'+content+'</body></html>';
}
function writePdf(data,dest){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-pdf-')),source=path.join(tmp,'cv.html');
 fs.writeFileSync(source,html(data));
 try{
 if(available('weasyprint')){const help=spawnSync('weasyprint',['--help'],{encoding:'utf8',timeout:5000});const tagged=help.status===0&&help.stdout.includes('--pdf-tags');cmd('weasyprint',[...(tagged?['--pdf-tags']:[]),source,dest]);}
 else if(available('chromium'))cmd('chromium',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-pdf-header-footer','--print-to-pdf='+dest,'file://'+source]);
 else fail('Approved PDF generator unavailable; need weasyprint or chromium');
 if(!fs.existsSync(dest)||fs.statSync(dest).size<100)fail('PDF output missing');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
function qa(pdf,docx){
 if(!available('pdftotext')||!available('unzip'))fail('QA needs pdftotext and unzip');
 const p=cmd('pdftotext',['-layout',pdf,'-']);
 const xml=cmd('unzip',['-p',docx,'word/document.xml']);
 const d=xml.replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
 const norm=x=>x.normalize('NFKC').replace(/[\s\p{P}]+/gu,' ').toLowerCase();
 const pt=norm(p),dt=norm(d),terms=dt.split(' ').filter(x=>x.length>2),missing=terms.filter(x=>!pt.includes(x));
 return {pdfTextCharacters:p.length,docxTextCharacters:d.length,missingUniqueTokens:[...new Set(missing)].slice(0,15),critical:p.length<30||d.length<30||missing.length>terms.length*.2};
}
function score(data){
 validateFit(data);
 ids(data.requirements,'requirement');
 let total=0,verified=0,earned=0,unknown=0;
 for(const r of data.requirements){
 if(!(r.weight>0)||!Number.isFinite(r.weight)||!['met','partially_met','not_met','unverified'].includes(r.status))fail('Invalid fit requirement: '+r.id);
 total+=r.weight;
 if(r.status==='unverified')unknown+=r.weight;else {verified+=r.weight;earned+=r.weight*({met:1,partially_met:.5,not_met:0})[r.status];}
 }
 return {requirements:data.requirements,totalWeight:total,verifiedWeight:verified,unverifiedWeight:unknown,assessedCoveragePercent:+(verified/total*100).toFixed(2),fitAmongVerifiedPercent:verified?+(earned/verified*100).toFixed(2):null,mandatoryGaps:data.requirements.filter(x=>x.mandatory&&x.status==='not_met').map(x=>x.id),note:'Internal evidence assessment, NOT an ATS score or interview probability'};
}
function dependencyReport(){
 const manifest=read(new URL('../config/dependencies.json',import.meta.url));
 const tools=manifest.packages.map(x=>({package:x.name,executables:x.executables,available:x.executables.every(available),installable:process.platform==='linux'&&available('apt-get')}));
 return {platform:process.platform,arch:process.arch,node:process.versions.node,tools,missing:tools.filter(x=>!x.available).map(x=>x.package),pdfRenderer:available('weasyprint')?'weasyprint':available('chromium')?'chromium (fallback; requires sandbox review)':null};
}
function installApproved(){
 const report=dependencyReport();
 if(!report.missing.length){console.log(JSON.stringify({installed:[],report},null,2));return;}
 if(process.platform!=='linux'||!available('apt-get')||process.getuid?.()!==0)fail('Missing approved tools: '+report.missing.join(', ')+'; automatic setup requires root on Debian/Ubuntu');
 const manifest=read(new URL('../config/dependencies.json',import.meta.url));
 const pkgs=manifest.packages.filter(x=>report.missing.includes(x.name)).map(x=>x.apt);
 if(!pkgs.every(x=>/^[a-z0-9+.-]+$/.test(x)))fail('Untrusted package name in approved manifest');
 cmd('apt-get',['update'],120000);
 cmd('apt-get',['install','--yes','--no-install-recommends',...pkgs],180000);
 console.log(JSON.stringify({installed:pkgs,report:dependencyReport()},null,2));
}
function main(){
 if(command==='doctor'){console.log(JSON.stringify(dependencyReport(),null,2));return;}
 if(command==='setup'){installApproved();return;}
 const file=opt('file'),w=opt('workspace','.cv-craft-work');
 
 if(command==='checkpoint-save'){
  if(opt('confirmation')!=='CONSENT')fail('Explicit candidate consent required to save a resumable checkpoint');
  const data=read(file);
  if(!data||typeof data!=='object'||Array.isArray(data))fail('Checkpoint must be a JSON object');
  const serialized=JSON.stringify({version:1,createdAt:new Date().toISOString(),sha256:digest(data),data},null,2);
  if(Buffer.byteLength(serialized)>2_000_000)fail('Checkpoint too large; refuse oversized personal-data snapshot');
  const f=path.join(workspace(),'checkpoint.json');
  if(fs.existsSync(f))fail('Checkpoint already exists. Delete it with explicit consent before replacing.');
  fs.writeFileSync(f,serialized,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({saved:true,checkpointHash:digest(data),note:'Managed temporary data; closes only upon candidate request'}));return;
 }
 if(command==='checkpoint-show'){
  const f=path.join(workspace(),'checkpoint.json');
  if(!fs.existsSync(f))fail('No saved checkpoint');
  if(fs.lstatSync(f).isSymbolicLink())fail('Checkpoint symlink is forbidden');
  const record=read(f);
  if(digest(record.data)!==record.sha256)fail('Checkpoint failed integrity verification');
  console.log(JSON.stringify(record,null,2));return;
 }
 if(command==='checkpoint-delete'){
  if(opt('confirmation')!=='DELETE')fail('Explicit candidate deletion approval required');
  const f=path.join(workspace(),'checkpoint.json');
  if(!fs.existsSync(f))fail('No saved checkpoint');
  fs.unlinkSync(f);console.log('Managed resumable checkpoint deleted');return;
 }
 if(command==='retain-approvals'){
  if(opt('confirmation')!=='CONSENT')fail('Explicit candidate consent required to retain approval records');
  if(!file)fail('--file is required for consent-based export');
  const w=workspace(),dest=path.resolve(file);
  if(dest===w||dest.startsWith(w+path.sep))fail('Persistent export must be outside temporary workspace');
  const data={exportedAt:new Date().toISOString(),candidateConsentAttested:true,records:approvals(w).records};
  fs.writeFileSync(dest,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({exported:true,records:data.records.length,path:dest}));return;
 }

 if(command==='validate'){console.log(JSON.stringify(validate(read(file)),null,2));return;}
 if(command==='approve'){
 if(opt('confirmation')!=='APPROVED')fail('Explicit candidate confirmation required');
 const scope=opt('scope','cv'),data=read(file);
 if(scope==='cv')validate(data);else if(scope==='weights')score(data);else fail('Unknown approval scope');
 const p=workspace(),s=approvals(p);s.records.push({scope,contentHash:digest(data),at:new Date().toISOString(),note:'Candidate approval attested in current conversation'});
 fs.writeFileSync(path.join(p,'approvals.json'),JSON.stringify(s,null,2),{mode:0o600});
 console.log(JSON.stringify({approved:true,scope,contentHash:digest(data)}));return;
 }
 if(command==='score'){
 const data=read(file);if(!authorized(workspace(),'weights',data))fail('Approved adaptive weights not found for this version');
 console.log(JSON.stringify(score(data),null,2));return;
 }
 if(command==='render'){
 const data=read(file);validate(data);if(!authorized(workspace(),'cv',data))fail('CV content changed since approval or approval missing');
 const out=path.resolve(opt('output','cv-craft-output'));folder(out);
 const base=safe(data.candidate.name)+'-'+safe(data.targetRole||'general-cv');
 let v=1;while(fs.existsSync(path.join(out,base+'-v'+v+'.docx'))||fs.existsSync(path.join(out,base+'-v'+v+'.pdf')))v++;
 const docx=path.join(out,base+'-v'+v+'.docx'),pdf=path.join(out,base+'-v'+v+'.pdf'),result={version:v,files:{},errors:{}};
 try{writeDocx(data,docx);result.files.docx=docx;}catch(e){result.errors.docx=e.message;}
 try{writePdf(data,pdf);result.files.pdf=pdf;}catch(e){result.errors.pdf=e.message;}
 if(result.files.docx&&result.files.pdf)try{result.qa=qa(pdf,docx);if(result.qa.critical){result.errors.qa='Critical PDF/DOCX text extraction mismatch; PDF blocked';fs.unlinkSync(pdf);delete result.files.pdf;result.errors.pdf='Removed PDF that did not pass text validation';}}catch(e){result.errors.qa=e.message;}
 if(result.files.pdf){
  try{
   const layout=spawnSync(process.execPath,[new URL('./pdf-layout-qa.mjs',import.meta.url).pathname,'--pdf',pdf],{encoding:'utf8',timeout:30000});
   if(layout.error||layout.status!==0)fail('PDF layout QA failed: '+(layout.stderr||layout.error?.message||layout.stdout));
   result.layoutQa=JSON.parse(layout.stdout);
   if(!result.layoutQa.ok)fail('PDF layout geometry invalid');
  }catch(e){result.errors.layoutQa=e.message;if(fs.existsSync(pdf))fs.unlinkSync(pdf);delete result.files.pdf;}
 }
 console.log(JSON.stringify(result,null,2));if(Object.keys(result.errors).length)process.exitCode=2;return;
 }
 if(command==='qa'){console.log(JSON.stringify(qa(opt('pdf'),opt('docx')),null,2));return;}
 if(command==='inspect'){const p=workspace();console.log(JSON.stringify({workspace:p,approvals:approvals(p).records},null,2));return;}
 if(command==='migrate'){console.log(JSON.stringify(migrateFile(file,workspace()),null,2));return;}
 if(command==='ocr'){
 if(!available('tesseract'))fail('Approved Tesseract is unavailable');
 let inputs=[file],tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-ocr-'));
 try{if(/\.pdf$/i.test(file)){if(!available('pdftoppm'))fail('pdftoppm unavailable');cmd('pdftoppm',['-f','1','-l','12','-r','200','-png',file,path.join(tmp,'page')],90000);inputs=fs.readdirSync(tmp).filter(x=>x.endsWith('.png')).sort().map(x=>path.join(tmp,x));}
 for(const input of inputs)process.stdout.write(cmd('tesseract',[input,'stdout','-l',opt('lang','eng')],60000));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}return;
 }
 if(command==='close'){
 if(opt('confirmation')!=='CLOSE')fail('Explicit close confirmation required');
 const p=path.resolve(w);
 if([path.parse(p).root,process.cwd(),os.homedir()].includes(p))fail('Unsafe cleanup path');
 if(!fs.existsSync(p)||fs.lstatSync(p).isSymbolicLink()||!fs.existsSync(path.join(p,'.cv-craft-managed')))fail('Workspace not explicitly managed');
 const allowed=new Set(['approvals.json','checkpoint.json','.cv-craft-managed','backups']);
 for(const name of fs.readdirSync(p)){
  if(!allowed.has(name))fail('Unmanaged file prevents cleanup: '+name);
  const f=path.join(p,name);if(fs.lstatSync(f).isSymbolicLink())fail('Symlink blocks cleanup: '+name);
 }
 const backups=path.join(p,'backups');
 if(fs.existsSync(backups)){
  if(!fs.lstatSync(backups).isDirectory())fail('Backup path is not a directory');
  for(const name of fs.readdirSync(backups)){
   if(!/^[^/]+\.bak-v1\.0\.0-\d{4}-/.test(name)||!fs.lstatSync(path.join(backups,name)).isFile())fail('Unexpected backup file blocks cleanup: '+name);
  }
 }
 fs.rmSync(p,{recursive:true,force:true});
 console.log('Managed temporary workspace deleted on explicit closure; delivered and source documents untouched');return;
 }
 fail('Usage: cv-craft doctor|setup|validate|approve|render|qa|score|ocr|inspect|migrate|checkpoint-save|checkpoint-show|checkpoint-delete|retain-approvals|close --file FILE [--workspace DIR]');
}
try{main();}catch(e){console.error('CV Craft: '+e.message);process.exitCode=1;}
