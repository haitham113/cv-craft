import test from 'node:test';
import assert from 'node:assert/strict';
import {assessTextParity,tokenize} from '../scripts/lib/text-parity.mjs';

test('identical English document is verified',()=>{
 const text='Backend Engineer\nImproved query performance by 25%.';
 const r=assessTextParity(text,text);
 assert.equal(r.critical,false);
 assert.equal(r.tokenCoveragePercent,100);
 assert.equal(r.orderPreserved,true);
});
test('single missing fact is critical even in a long CV',()=>{
 const text='Experienced software engineer with Node.js SQL AWS Laravel TypeScript Redis Docker PostgreSQL';
 const actual=text.replace('Laravel','');
 const r=assessTextParity(actual,text);
 assert.equal(r.critical,true);
 assert.deepEqual(r.missingUniqueTokens,['laravel']);
});
test('wrong numbers and extra words block delivery',()=>{
 const r=assessTextParity('Increased revenue 50 percent in Europe','Increased revenue 25 percent');
 assert.equal(r.critical,true);assert.ok(r.missingUniqueTokens.includes('25'));
 assert.ok(r.extraUniqueTokens.includes('50'));assert.ok(r.extraUniqueTokens.includes('europe'));
});
test('Arabic bidi controls can be ignored without silently changing letters',()=>{
 const expected='مرشح تجريبي الملخص المهني';
 const pdf='\u202Bمرشح تجريبي\u202C\n\u202Bالملخص المهني\u202C';
 assert.equal(assessTextParity(pdf,expected,{direction:'rtl'}).critical,false);
 assert.equal(assessTextParity(pdf,expected,{direction:'rtl'}).readingOrderReviewRequired,true);
 const broken=pdf.replace('المهني','المهنى');
 assert.equal(assessTextParity(broken,expected,{direction:'rtl'}).critical,true);
});
test('Arabic letter order, diacritics and words are not discarded',()=>{
 assert.ok(tokenize('حسّن').includes('حسّن'));
 const r=assessTextParity('أداء الخدمة','أداء الخدمة باستخدام',{direction:'rtl'});
 assert.equal(r.critical,true);assert.ok(r.missingUniqueTokens.includes('باستخدام'));
});
test('RTl visual word reordering requires a reading-order review',()=>{
 const r=assessTextParity('المهني الملخص','الملخص المهني',{direction:'rtl'});
 assert.equal(r.critical,false);
 assert.equal(r.orderPreserved,false);
 assert.equal(r.readingOrderReviewRequired,true);
});
