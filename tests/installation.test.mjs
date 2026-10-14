import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

const skill=path.resolve('.');
for(const scope of ['user-wide','project-local']){
 test('Codex '+scope+' installation exposes SKILL.md and working CLI',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cv-craft-install-'));
  try{
   const link=scope==='user-wide'
    ?path.join(temp,'home','.agents','skills','cv-craft')
    :path.join(temp,'project','.agents','skills','cv-craft');
   fs.mkdirSync(path.dirname(link),{recursive:true});
   fs.symlinkSync(skill,link,'dir');
   const manifest=fs.readFileSync(path.join(link,'SKILL.md'),'utf8');
   assert.match(manifest,/^name:\s*cv-craft\s*$/m);
   const cli=spawnSync(process.execPath,[path.join(link,'scripts','cv-craft.mjs'),'validate',
    '--file',path.join(skill,'fixtures/example.json')],{cwd:temp,encoding:'utf8',timeout:20000});
   assert.equal(cli.status,0,cli.stderr);
   assert.equal(JSON.parse(cli.stdout).valid,true);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
 });
}
test('automatic model-triggered activation requires an actual Codex runtime',()=>{
 const manifest=fs.readFileSync('SKILL.md','utf8');
 assert.match(manifest,/^description:\s*.+CVs and resumes/im);
 // This test intentionally verifies metadata only, NOT LLM auto-selection.
});
