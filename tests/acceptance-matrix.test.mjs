import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('all 85 approved decisions have unique status entries',()=>{
 const content=fs.readFileSync('references/acceptance-matrix.md','utf8');
 const rows=[...content.matchAll(/^\|\s*(\d{1,2})\s*\|\s*([^|]+)\|\s*(TESTED|PARTIAL|INSTRUCTION_ONLY|BLOCKED)\s*\|/gm)];
 assert.equal(rows.length,85,'Acceptance matrix must list every approved decision');
 assert.deepEqual(rows.map(r=>Number(r[1])),Array.from({length:85},(_,i)=>i+1));
 assert.match(content,/RELEASE_NOT_READY/);
 assert.ok(rows.some(r=>r[3]==='BLOCKED'),'Known release blockers must be identified');
});
