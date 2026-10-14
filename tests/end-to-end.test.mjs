import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const cli=path.resolve('scripts/cv-craft.mjs');
const has=(exe)=>spawnSync('which',[exe]).status===0;
const pdfReady=has('weasyprint')&&has('pdftotext')&&has('pdfinfo')&&has('unzip');
const run=(command,args=[])=>spawnSync(process.execPath,[cli,command,...args],{encoding:'utf8',timeout:60000});
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-e2e-'));}
function example(){return JSON.parse(fs.readFileSync('fixtures/example.json','utf8'));}
test('general-purpose from-scratch CV requires consent, then preserves versioned outputs', {skip:!pdfReady},()=>{
 const t=temp(),state=path.join(t,'state'),out=path.join(t,'out'),f=path.join(t,'new.json');
 const d=example();delete d.targetRole;
 d.candidate.name='Synthetic General Candidate';
 fs.writeFileSync(f,JSON.stringify(d));
 const unapproved=run('render',['--file',f,'--workspace',state,'--output',out]);
 assert.notEqual(unapproved.status,0,'Approval must be mandatory');
 assert.equal(run('approve',['--file',f,'--workspace',state,'--confirmation','APPROVED']).status,0);
 for(let version=1;version<=2;version++){
  const result=run('render',['--file',f,'--workspace',state,'--output',out]);
  assert.equal(result.status,0,result.stderr+result.stdout);
  const v=JSON.parse(result.stdout);assert.equal(v.version,version);
  assert.ok(v.files.pdf.includes('general-cv-v'+version+'.pdf'));
  assert.ok(fs.existsSync(v.files.docx));assert.ok(fs.existsSync(v.files.pdf));
  assert.equal(v.layoutQa?.ok,true);
 }
 assert.equal(fs.readdirSync(out).length,4);
 assert.equal(run('close',['--workspace',state,'--confirmation','CLOSE']).status,0);
 assert.ok(fs.existsSync(f));assert.equal(fs.readdirSync(out).length,4);
 fs.rmSync(t,{force:true,recursive:true});
});
test('employer-specific weighted scoring requires approval and flags critical gaps',()=>{
 const t=temp(),state=path.join(t,'state'),f=path.join(t,'fit.json');
 const data=JSON.parse(fs.readFileSync('fixtures/fit.json','utf8'));
 const missing=data.requirements.find(x=>x.id==='r1');missing.status='not_met';delete missing.evidenceIds;
 fs.writeFileSync(f,JSON.stringify(data));
 assert.notEqual(run('score',['--file',f,'--workspace',state]).status,0);
 assert.equal(run('approve',['--scope','weights','--file',f,'--workspace',state,'--confirmation','APPROVED']).status,0);
 const score=run('score',['--file',f,'--workspace',state]);
 assert.equal(score.status,0,score.stderr);
 const result=JSON.parse(score.stdout);
 assert.ok(result.mandatoryGaps.includes('r1'));
 assert.equal(result.unverifiedWeight,3);
 assert.equal(result.fitAmongVerifiedPercent,14.29);
 data.requirements[0].weight=20;fs.writeFileSync(f,JSON.stringify(data));
 assert.notEqual(run('score',['--file',f,'--workspace',state]).status,0,'Weight changes invalidate approvals');
 fs.rmSync(t,{force:true,recursive:true});
});
test('generated DOCX contains no comments, tracked changes, or personal editing metadata', {skip:!pdfReady},()=>{
 const t=temp(),state=path.join(t,'state'),out=path.join(t,'out'),f=path.join(t,'new.json');
 const d=example();d.candidate.name='Privacy Test';d.candidate.links=['https://example.org/portfolio'];
 fs.writeFileSync(f,JSON.stringify(d));
 assert.equal(run('approve',['--file',f,'--workspace',state,'--confirmation','APPROVED']).status,0);
 const rendered=run('render',['--file',f,'--workspace',state,'--output',out]);
 assert.equal(rendered.status,0,rendered.stderr+rendered.stdout);
 const result=JSON.parse(rendered.stdout);
 const entries=spawnSync('unzip',['-Z1',result.files.docx],{encoding:'utf8'}).stdout;
 assert.doesNotMatch(entries,/docProps\/|comments.xml/i);
 const xml=spawnSync('unzip',['-p',result.files.docx,'word/document.xml'],{encoding:'utf8'}).stdout;
 assert.doesNotMatch(xml,/<w:(ins|del|commentRangeStart)\b/);
 assert.match(xml,/w:hyperlink r:id="cvlink1"/);
 const metadata=spawnSync('pdfinfo',[result.files.pdf],{encoding:'utf8'}).stdout;
 assert.match(metadata,/Custom Metadata:\s+no/);
 fs.rmSync(t,{force:true,recursive:true});
});
test('Codex skill metadata has valid activation name and modular source paths',()=>{
 const skill=fs.readFileSync('SKILL.md','utf8'),intro=skill.match(/^---\n([\s\S]*?)\n---/);
 assert.ok(intro,'SKILL.md YAML metadata is mandatory');
 assert.match(intro[1],/^name:\s*cv-craft\s*$/m);
 assert.match(intro[1],/^description:\s*\S/m);
 for(const name of ['references/workflow.md','references/policies.md','references/cli.md','references/acceptance-matrix.md'])assert.ok(fs.existsSync(name));
});
