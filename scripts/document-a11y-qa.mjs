#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2);
function opt(name){const i=args.indexOf('--'+name);return i<0?null:args[i+1];}
function external(exe,params){
 const r=spawnSync(exe,params,{encoding:'utf8',timeout:25000,maxBuffer:16*1024*1024});
 if(r.error||r.status!==0)throw Error(exe+': '+(r.stderr||r.error?.message||'failed'));
 return r.stdout;
}
function main(){
 const docx=opt('docx'),pdf=opt('pdf'),language=opt('lang')||'en';
 if(!docx||!fs.statSync(docx).isFile())throw Error('Usage: document-a11y-qa.mjs --docx FILE [--pdf FILE] [--lang en|ar|...]');
 const problems=[],warnings=[];
 const names=external('unzip',['-Z1',docx]).split('\n').filter(Boolean);
 const documentXml=external('unzip',['-p',docx,'word/document.xml']);
 const stylesXml=external('unzip',['-p',docx,'word/styles.xml']);
 const relXml=external('unzip',['-p',docx,'word/_rels/document.xml.rels']);
 const bulletParagraphs=(documentXml.match(/<w:pStyle w:val="Bullet"\/>/g)||[]).length;
 const numberedParagraphs=(documentXml.match(/<w:numPr>/g)||[]).length;
 if(bulletParagraphs>0){
  if(numberedParagraphs!==bulletParagraphs)problems.push('Bulleted experience paragraphs lack real Word numbering');
  if(!names.includes('word/numbering.xml'))problems.push('Missing OOXML numbering part');
  else{
   const numberingXml=external('unzip',['-p',docx,'word/numbering.xml']);
   if(!numberingXml.includes('<w:numFmt w:val="bullet"/>')||!numberingXml.includes('w:hanging='))problems.push('Invalid Word bullet numbering or hanging indent');
  }
  if(!relXml.includes('/relationships/numbering'))problems.push('Word numbering relationship missing');
 }
 if(!documentXml.includes('<w:pgSz w:w="11906" w:h="16838"/>'))problems.push('Document page size is not A4');
 if(!stylesXml.includes('<w:pBdr><w:bottom'))warnings.push('Section-heading bottom rules not detected; visually review hierarchy');

 if(!documentXml.includes('<w:document')||!documentXml.includes('<w:body'))problems.push('DOCX has no recognized semantic document body');
 if(!documentXml.includes('w:pStyle w:val="Heading2"'))problems.push('No semantic section headings');
 if(!stylesXml.includes('w:outlineLvl w:val="1"'))problems.push('Heading levels are not semantically outlined');
 if(names.some(x=>/comments|people.xml|docProps\/|customXml|vbaProject/i.test(x)))problems.push('Unexpected comments, tracked review, macro or hidden document property parts');
 if(/<w:(ins|del|delText|commentRangeStart|vanish|webHidden)\b/.test(documentXml))problems.push('Document contains tracked revisions, comments or hidden text');
 const hyperlinks=(documentXml.match(/<w:hyperlink\b/g)||[]).length;
 const relationships=[...relXml.matchAll(/<Relationship\b[^>]*Type="[^"]*\/hyperlink"[^>]*>/g)].map(x=>x[0]);
 if(hyperlinks!==relationships.length)problems.push('Hyperlink count mismatches external relationships');
 for(const link of relationships){
  const uri=link.match(/\bTarget="([^"]+)"/)?.[1]||'';
  if(!/^https:\/\/[A-Za-z0-9.-]+(?:[/:?#&=._%+-]|$)/i.test(uri)||!link.includes('TargetMode="External"'))problems.push('Unsafe or malformed external hyperlink relationship');
 }
 const rtl=/^(ar|he|fa|ur)(-|$)/i.test(language);
 if(rtl&&!documentXml.includes('<w:bidi/>'))problems.push('RTL language must use paragraph bidirectional semantics');
 let tagged=null;
 if(pdf){
  if(!fs.statSync(pdf).isFile())throw Error('PDF path does not point to a file');
  const info=external('pdfinfo',[pdf]);
  tagged=info.match(/^Tagged:\s*(yes|no)\s*$/mi)?.[1]?.toLowerCase()==='yes';
  if(!tagged)warnings.push('PDF tagging not confirmed; this is not screen-reader-accessible certification');
  const extracted=external('pdftotext',['-layout',pdf,'-']);
  if(!extracted.trim())problems.push('PDF contains no selectable text');
 }
 warnings.push('Human reading-order, visual appearance and assistive-technology checks still required');
 const result={ok:problems.length===0,document:'docx'+(pdf?'+pdf':''),language,
  headingsDetected:(documentXml.match(/w:pStyle w:val="Heading2"/g)||[]).length,
  bulletParagraphs,numberedParagraphs,
  hyperlinksDetected:hyperlinks,pdfTagged:tagged,rtl,problems,warnings,
  compliantWithWCAGorPDFUA:'not_assessed'};
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exitCode=2;
}
try{main();}catch(err){console.error('CV Craft accessibility QA: '+err.message);process.exitCode=1;}
