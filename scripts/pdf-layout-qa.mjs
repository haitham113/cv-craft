import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function call(command,args){
 const r=spawnSync(command,args,{encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});
 if(r.error||r.status!==0)throw Error(command+': '+(r.error?.message||r.stderr||r.status));
 return r.stdout;
}
const args=process.argv.slice(2);
const opt=(name,def)=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:def;};
function main(){
const file=opt('pdf');
if(!file||!fs.statSync(file).isFile())throw Error('Expected --pdf path to a PDF file');
if(fs.statSync(file).size>20_000_000)throw Error('PDF exceeds 20 MB inspection limit');
const info=call('pdfinfo',[file]),pages=Number(info.match(/^Pages:\s*(\d+)/m)?.[1]);
if(!Number.isInteger(pages)||pages<1||pages>20)throw Error('Invalid page count');
const problems=[],warnings=[],details=[];
let allWords=0;
for(let page=1;page<=pages;page++){
 const xml=call('pdftotext',['-f',String(page),'-l',String(page),'-bbox',file,'-']);
 const root=xml.match(/<page\s+width="([\d.]+)"\s+height="([\d.]+)"/);
 if(!root){problems.push('Page '+page+': missing readable bounding boxes');continue;}
 const width=Number(root[1]),height=Number(root[2]);
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<200||height<200)problems.push('Page '+page+': invalid page geometry');
 let count=0,clipped=0,tiny=0;
 const re=/<word\s+([^>]+)>[\s\S]*?<\/word>/g;
 for(const match of xml.matchAll(re)){
  const attr=match[1],p={};
  for(const x of attr.matchAll(/(xMin|xMax|yMin|yMax)="([\d.-]+)"/g))p[x[1]]=Number(x[2]);
  if(Object.keys(p).length!==4){problems.push('Page '+page+': unreadable word bounds');continue;}
  count++;
  if(p.xMin<-.5||p.yMin<-.5||p.xMax>width+.5||p.yMax>height+.5||p.xMin>=p.xMax||p.yMin>=p.yMax)clipped++;
  if(p.yMax-p.yMin<3||p.xMax-p.xMin<.7)tiny++;
 }
 allWords+=count;
 if(count===0)problems.push('Page '+page+': no selectable words');
 if(clipped)problems.push('Page '+page+': '+clipped+' off-page or invalid word boxes');
 if(tiny)warnings.push('Page '+page+': '+tiny+' tiny glyph boxes');
 details.push({page,width,height,wordCount:count,offPageWords:clipped,tinyWords:tiny});
}
const preview=opt('preview-dir');let previewPaths=[];
if(preview){
 const target=path.resolve(preview);
 if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error('Preview directory cannot be a symlink');
 fs.mkdirSync(target,{recursive:true,mode:0o700});fs.chmodSync(target,0o700);
 for(let p=1;p<=pages;p++){
  const prefix=path.join(target,'cv-page-'+p);
  call('pdftoppm',['-f',String(p),'-l',String(p),'-scale-to','1400','-png','-singlefile',file,prefix]);
  const image=prefix+'.png';
  if(!fs.existsSync(image)||fs.statSync(image).size<1000)problems.push('Page '+p+': preview render failed');
  else{fs.chmodSync(image,0o600);previewPaths.push(image);}
 }
 warnings.push('Rendered previews require human visual review; no automatic visual approval is claimed');
}
const tagged=(info.match(/^Tagged:\s*(\S+)/m)?.[1]||'unknown').toLowerCase();
if(tagged!=='yes')warnings.push('PDF not confirmed tagged; screen-reader order/accessibility not certified');
const result={ok:!problems.length,pages,totalSelectableWords:allWords,tagged,details,problems,warnings,previewPaths,visualInspection:'manual-required'};
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=2;
}
try{main();}catch(e){console.error('CV Craft layout QA: '+e.message);process.exitCode=1;}
