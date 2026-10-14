import test from 'node:test';
import assert from 'node:assert/strict';
import {auditWorkflow} from '../scripts/lib/workflow-gates.mjs';
const hash='a'.repeat(64);
const validGeneral=[
 {type:'intake',mode:'general'},
 {type:'evidence-approved',actor:'candidate'},
 {type:'draft-updated',hash},
 {type:'draft-approved',actor:'candidate',hash},
 {type:'render',hash},
 {type:'qa-passed',criticalIssues:0},
 {type:'deliver',formats:['pdf','docx']}
];
test('general CV passes candidate approval sequence',()=>{
 const result=auditWorkflow({events:validGeneral},{expectedContentHash:hash});
 assert.equal(result.ok,true,result.problems.join('; '));
 assert.equal(result.delivered,true);
});
test('required employer research and weights approval cannot be skipped',()=>{
 const result=auditWorkflow({events:[
  {type:'intake',mode:'targeted'},{type:'score'},
  {type:'evidence-approved',actor:'candidate'},...validGeneral.slice(2)
 ]});
 assert.equal(result.ok,false);
 assert.match(result.problems.join(' '),/weights must be approved|fit analysis/);
});
test('targeted flow with actual research approval and fit scoring can pass',()=>{
 const events=[
 {type:'intake',mode:'targeted'},
 {type:'research-approved',actor:'candidate'},
 {type:'weights-approved',actor:'candidate'},
 {type:'score'},
 {type:'evidence-approved',actor:'candidate'},
 ...validGeneral.slice(2)
 ];
 assert.equal(auditWorkflow({events}).ok,true);
});
test('external candidate sources require explicit authorization',()=>{
 const unapproved=auditWorkflow({events:[{type:'intake',mode:'general'},{type:'source-read',sourceId:'linkedin'}]});
 assert.equal(unapproved.ok,false);
 assert.match(unapproved.problems.join(' '),/authorization/);
 const approved=auditWorkflow({events:[
  {type:'intake',mode:'general'},
  {type:'source-authorized',actor:'candidate',sourceId:'linkedin'},
  {type:'source-read',sourceId:'linkedin'}
 ]});
 assert.equal(approved.ok,true);
});
test('specific free ATS transmission requires exact candidate consent',()=>{
 const noConsent=auditWorkflow({events:[{type:'intake',mode:'general'},
  {type:'third-party-use',serviceId:'ats-1',purpose:'ats',dataScope:'full-cv',free:true}]});
 assert.equal(noConsent.ok,false);
 const wrongScope=auditWorkflow({events:[{type:'intake',mode:'general'},
  {type:'third-party-consent',actor:'candidate',serviceId:'ats-1',purpose:'ats',dataScope:'summary'},
  {type:'third-party-use',serviceId:'ats-1',purpose:'ats',dataScope:'full-cv',free:true}]});
 assert.equal(wrongScope.ok,false);
 const paid=auditWorkflow({events:[{type:'intake',mode:'general'},
  {type:'third-party-consent',actor:'candidate',serviceId:'ats-1',purpose:'ats',dataScope:'full-cv'},
  {type:'third-party-use',serviceId:'ats-1',purpose:'ats',dataScope:'full-cv',free:false}]});
 assert.equal(paid.ok,false);
 const proper=auditWorkflow({events:[{type:'intake',mode:'general'},
  {type:'third-party-consent',actor:'candidate',serviceId:'ats-1',purpose:'ats',dataScope:'full-cv'},
  {type:'third-party-use',serviceId:'ats-1',purpose:'ats',dataScope:'full-cv',free:true}]});
 assert.equal(proper.ok,true);
});
test('any draft edit invalidates prior approval',()=>{
 const r=auditWorkflow({events:[...validGeneral.slice(0,4),{type:'draft-updated',hash:'b'.repeat(64)},
  {type:'render',hash:'b'.repeat(64)}]});
 assert.equal(r.ok,false);
 assert.match(r.problems.join(' '),/current draft approval/);
});
test('single-format delivery requires additional permission',()=>{
 const a=auditWorkflow({events:[...validGeneral.slice(0,6),{type:'deliver',formats:['docx']}]});
 assert.equal(a.ok,false);
 const b=auditWorkflow({events:[...validGeneral.slice(0,6),{type:'partial-delivery-approved',actor:'candidate'},{type:'deliver',formats:['docx']}]});
 assert.equal(b.ok,true);
});
test('application submission and unapproved commands are prohibited',()=>{
 for(const type of ['submit-application','install-package','delete-production-files']){
  assert.equal(auditWorkflow({events:[{type:'intake',mode:'general'},{type}]}).ok,false);
 }
});
