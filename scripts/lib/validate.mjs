import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const schemaDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../schemas');
const keywords=new Set(['$schema','$id','$defs','title','description','type','properties','required','additionalProperties','items','minItems','minLength','enum','const','uniqueItems','exclusiveMinimum','pattern','$ref']);
const typ=x=>x===null?'null':Array.isArray(x)?'array':typeof x;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function check(data,rule,root,at,errors){
 if(!rule||typeof rule!=='object')throw Error('Bad schema at '+at);
 for(const k of Object.keys(rule))if(!keywords.has(k))throw Error('Unsupported JSON Schema keyword '+k+'; refusing incomplete validation');
 if(rule.$ref){
  if(!rule.$ref.startsWith('#/'))throw Error('External schema references unsupported');
  let ref=root;
  for(const k of rule.$ref.slice(2).split('/'))ref=ref?.[k.replace(/~1/g,'/').replace(/~0/g,'~')];
  if(!ref)throw Error('Missing schema reference '+rule.$ref);
  return check(data,ref,root,at,errors);
 }
 if(rule.type&&typ(data)!==rule.type){errors.push(at+': expected '+rule.type+', got '+typ(data));return;}
 if(Object.hasOwn(rule,'const')&&!equal(data,rule.const))errors.push(at+': wrong schema version/constant');
 if(rule.enum&&!rule.enum.some(v=>equal(v,data)))errors.push(at+': not allowed');
 if(typeof data==='string'){
  if(rule.minLength!==undefined&&Array.from(data).length<rule.minLength)errors.push(at+': too short');
  if(rule.pattern&&!new RegExp(rule.pattern,'u').test(data))errors.push(at+': bad pattern/unsafe link');
 }
 if(Array.isArray(data)){
  if(rule.minItems!==undefined&&data.length<rule.minItems)errors.push(at+': array too short');
  if(rule.uniqueItems&&new Set(data.map(JSON.stringify)).size!==data.length)errors.push(at+': duplicate items');
  if(rule.items)data.forEach((v,i)=>check(v,rule.items,root,at+'['+i+']',errors));
 }
 if(typeof data==='number'){
  if(!Number.isFinite(data))errors.push(at+': non-finite');
  if(rule.exclusiveMinimum!==undefined&&data<=rule.exclusiveMinimum)errors.push(at+': below lower bound');
 }
 if(data&&typ(data)==='object'){
  for(const k of rule.required||[])if(!(k in data))errors.push(at+'.'+k+': missing');
  for(const [k,v] of Object.entries(data)){
   if(Object.hasOwn(rule.properties||{},k))check(v,rule.properties[k],root,at+'.'+k,errors);
   else if(rule.additionalProperties===false)errors.push(at+'.'+k+': unsupported property');
  }
 }
}
function apply(data,file){
 const s=JSON.parse(fs.readFileSync(path.join(schemaDir,file),'utf8')),errors=[];
 check(data,s,s,'$',errors);
 if(errors.length)throw Error('JSON Schema validation failed: '+errors.slice(0,12).join('; '));
}
function ids(items,label){const set=new Set();for(const x of items){if(set.has(x.id))throw Error('Duplicate '+label+' ID '+x.id);set.add(x.id)}return set;}
export function validateCV(data){
 const file=data?.schemaVersion==='1.0.0'?'cv-v1.schema.json':data?.schemaVersion==='1.1.0'?'cv-v1.1.schema.json':null;
 if(!file)throw Error('Unsupported CV schema version '+data?.schemaVersion);
 apply(data,file);
 const cs=ids(data.claims,'claim'),es=ids(data.evidence,'evidence');ids(data.sections,'section');
 const em=new Map(data.evidence.map(x=>[x.id,x])),used=new Set();
 for(const e of data.evidence)if(e.status==='candidate_approved_estimate'&&!e.qualifier)throw Error('Estimate missing qualifier: '+e.id);
 for(const c of data.claims)for(const id of c.evidenceIds){
  if(!es.has(id))throw Error('Unknown evidence '+id+' in '+c.id);
  if(em.get(id).status==='unverified')throw Error('Unverified evidence '+id+' supports '+c.id);
 }
 const refs=item=>{for(const id of item.claimIds||[]){if(!cs.has(id))throw Error('Unknown claim reference: '+id);used.add(id);}};
 for(const s of data.sections)for(const b of s.blocks){
  refs(b);
  if(b.kind==='text'&&typeof b.text!=='string')throw Error('Text block missing content in '+s.id);
  if(b.kind==='entry'&&!b.heading?.trim())throw Error('Entry missing heading in '+s.id);
  if((b.kind==='entry'||b.kind==='bullets')&&!Array.isArray(b.items))throw Error('Missing items in '+s.id);
  if(b.kind==='skills'&&!b.groups?.length)throw Error('Missing skills groups in '+s.id);
  for(const item of b.items||[])refs(item);
 }
 const missing=[...cs].filter(id=>!used.has(id));
 if(missing.length)throw Error('Claim has no rendered reference: '+missing.join(', '));
 return {valid:true,schemaVersion:data.schemaVersion,schemaValidated:true,claims:cs.size,evidence:es.size,sections:data.sections.length};
}
export function validateFit(data){
 apply(data,'fit-v1.schema.json');ids(data.requirements,'requirement');
 for(const r of data.requirements)if(['met','partially_met'].includes(r.status)&&!r.evidenceIds?.length)throw Error('Verified requirement needs evidence IDs: '+r.id);
 return {valid:true,schemaValidated:true,requirements:data.requirements.length};
}
export function migrateFile(file,managedWorkspace){
 if(!managedWorkspace)throw Error('Managed workspace required for privacy-preserving migration backups');
 const full=path.resolve(file),raw=fs.readFileSync(full),original=JSON.parse(raw);
 if(original.schemaVersion==='1.1.0'){validateCV(original);return {migrated:false,version:'1.1.0'};}
 if(original.schemaVersion!=='1.0.0')throw Error('No migration path from '+original.schemaVersion);
 validateCV(original);
 const updated={...original,schemaVersion:'1.1.0'};
 validateCV(updated);
 const backupDir=path.join(managedWorkspace,'backups');
 fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
 const backup=path.join(backupDir,path.basename(full)+'.bak-v1.0.0-'+new Date().toISOString().replace(/[:.]/g,'-'));
 const temporary=full+'.migrating-'+process.pid+'.tmp';
 try{
  fs.writeFileSync(backup,raw,{flag:'wx',mode:0o600});
  fs.writeFileSync(temporary,JSON.stringify(updated,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.renameSync(temporary,full);
 }catch(e){if(fs.existsSync(temporary))fs.unlinkSync(temporary);throw e;}
 return {migrated:true,from:'1.0.0',to:'1.1.0',backup,priorApprovalsInvalidated:true};
}
