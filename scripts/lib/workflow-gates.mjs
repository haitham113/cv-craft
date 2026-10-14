/**
 * Optional machine-checkable approval journal. This does not authenticate a
 * person or replace Codex's duty to obtain candidate approval in conversation.
 */
export function auditWorkflow(input,{expectedContentHash}={}){
 const events=input?.events;
 if(!Array.isArray(events)||!events.length)throw Error('Workflow events array required');
 const state={
   mode:null,authorizedSources:new Set(),thirdPartyConsent:new Set(),
   researchApproved:false,weightsApproved:false,scored:false,evidenceApproved:false,
   draftHash:null,approvedDraftHash:null,renderedHash:null,qaPassed:false,
   partialApproved:false,delivered:false
 };
 const problems=[];
 const allowed=new Set(['intake','source-authorized','source-read','research-approved',
  'weights-approved','score','evidence-approved','draft-updated','draft-approved',
  'render','qa-passed','partial-delivery-approved','deliver','third-party-consent','third-party-use']);
 const candidateEvents=new Set(['source-authorized','research-approved','weights-approved',
  'evidence-approved','draft-approved','partial-delivery-approved','third-party-consent']);
 const requireCandidate=(e,i)=>{if(candidateEvents.has(e.type)&&e.actor!=='candidate')problems.push('#'+i+': '+e.type+' needs explicit candidate authorization');};
 function fail(i,e,message){problems.push('#'+i+' '+e.type+': '+message);}
 for(const [i,e] of events.entries()){
   if(!e||typeof e!=='object'||!allowed.has(e.type)){problems.push('#'+i+': unsupported or prohibited operation');continue;}
   requireCandidate(e,i);
   if(i===0&&e.type!=='intake')fail(i,e,'intake must be first');
   switch(e.type){
    case 'intake':
      if(state.mode)fail(i,e,'intake cannot be repeated');
      if(!['general','targeted'].includes(e.mode))fail(i,e,'mode must be general or targeted');
      state.mode=e.mode;break;
    case 'source-authorized':
      if(!e.sourceId||typeof e.sourceId!=='string')fail(i,e,'sourceId required');
      else if(e.actor==='candidate')state.authorizedSources.add(e.sourceId);break;
    case 'source-read':
      if(!state.authorizedSources.has(e.sourceId))fail(i,e,'candidate source requires authorization');break;
    case 'research-approved':
      if(state.mode!=='targeted')fail(i,e,'employer research approval only for targeted CV');
      if(e.actor==='candidate')state.researchApproved=true;break;
    case 'weights-approved':
      if(state.mode!=='targeted'||!state.researchApproved)fail(i,e,'research review must precede weights approval');
      if(e.actor==='candidate')state.weightsApproved=true;break;
    case 'score':
      if(state.mode!=='targeted'||!state.weightsApproved)fail(i,e,'verified fit weights must be approved before scoring');
      state.scored=true;break;
    case 'evidence-approved':
      if(state.mode==='targeted'&&!state.scored)fail(i,e,'fit analysis must precede evidence sufficiency approval');
      if(e.actor==='candidate')state.evidenceApproved=true;break;
    case 'draft-updated':
      if(!state.evidenceApproved)fail(i,e,'evidence sufficiency approval required before drafting');
      if(typeof e.hash!=='string'||!/^[a-f0-9]{64}$/i.test(e.hash))fail(i,e,'SHA-256 draft hash required');
      state.draftHash=e.hash;state.approvedDraftHash=null;state.renderedHash=null;state.qaPassed=false;break;
    case 'draft-approved':
      if(e.actor!=='candidate'||!state.draftHash||e.hash!==state.draftHash)fail(i,e,'candidate must approve exact current draft hash');
      else state.approvedDraftHash=e.hash;break;
    case 'render':
      if(!state.approvedDraftHash||e.hash!==state.approvedDraftHash)fail(i,e,'current draft approval required');
      else state.renderedHash=e.hash;
      state.qaPassed=false;break;
    case 'qa-passed':
      if(!state.renderedHash)fail(i,e,'render must precede document QA');
      if(e.criticalIssues!==0)fail(i,e,'QA cannot contain critical issues');
      else state.qaPassed=true;break;
    case 'partial-delivery-approved':
      if(e.actor==='candidate')state.partialApproved=true;break;
    case 'deliver':
      if(!state.qaPassed)fail(i,e,'QA must pass before delivery');
      if(!Array.isArray(e.formats)||!e.formats.length||e.formats.some(x=>!['pdf','docx'].includes(x)))fail(i,e,'invalid formats');
      else if(e.formats.length!==2&&!state.partialApproved)fail(i,e,'single-format delivery requires candidate approval');
      if(e.formats?.length===2&&new Set(e.formats).size!==2)fail(i,e,'two output formats must be distinct');
      state.delivered=true;break;
    case 'third-party-consent':
      if(e.actor!=='candidate'||!e.serviceId||!e.purpose||!e.dataScope)fail(i,e,'consent must identify provider, purpose and exact data scope');
      else state.thirdPartyConsent.add(JSON.stringify([e.serviceId,e.purpose,e.dataScope]));break;
    case 'third-party-use':
      if(e.purpose==='ats'&&e.free!==true)fail(i,e,'external ATS services must be free');
      if(!state.thirdPartyConsent.has(JSON.stringify([e.serviceId,e.purpose,e.dataScope])))fail(i,e,'external processing requires matched candidate consent');
      break;
   }
 }
 if(expectedContentHash&&state.approvedDraftHash!==expectedContentHash)problems.push('Last approved draft does not match expected content hash');
 return {ok:problems.length===0,mode:state.mode,eventsChecked:events.length,
   draftApproved:!!state.approvedDraftHash,qaPassed:state.qaPassed,delivered:state.delivered,
   problems,note:'Journal records candidate attestations; it does not authenticate their identity or prove actual external actions.'};
}
