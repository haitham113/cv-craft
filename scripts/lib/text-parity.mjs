/**
 * Strict, Unicode-aware text equivalence for independent PDF and DOCX output.
 * Never accepts a missing word solely because "most" tokens were preserved.
 * PDF extraction may introduce bidi controls; remove only format controls, not letters or marks.
 */
const directionControls=/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
export function tokenize(text){
  return String(text).normalize('NFC').replace(directionControls,'')
    .match(/[\p{L}\p{M}\p{N}]+/gu)?.map(x=>x.toLocaleLowerCase('und'))||[];
}
export function assessTextParity(pdfText,docxText,{direction='ltr'}={}){
  const pdfTokens=tokenize(pdfText),documentTokens=tokenize(docxText);
  const count=new Map();
  for(const token of pdfTokens)count.set(token,(count.get(token)||0)+1);
  const missing=[];
  for(const token of documentTokens){
    const n=count.get(token)||0;
    if(n>0)count.set(token,n-1);
    else missing.push(token);
  }
  const extra=[...count].flatMap(([word,n])=>Array(n).fill(word));
  // For RTL, PDF extractors may return visual order. Token multiset detects
  // missing/changed words but does NOT certify correct reading order.
  const pdfSequence=pdfTokens.join(' '),docSequence=documentTokens.join(' ');
  const orderPreserved=pdfSequence===docSequence;
  const tokenCoveragePercent=documentTokens.length?
    Math.round((documentTokens.length-missing.length)/documentTokens.length*10000)/100:0;
  const critical=!pdfTokens.length||!documentTokens.length||missing.length>0||extra.length>0;
  return {
    pdfTokens:pdfTokens.length,docxTokens:documentTokens.length,tokenCoveragePercent,
    missingUniqueTokens:[...new Set(missing)].slice(0,40),
    extraUniqueTokens:[...new Set(extra)].slice(0,40),
    missingCount:missing.length,extraCount:extra.length,
    orderPreserved,
    readingOrderReviewRequired:direction==='rtl'||!orderPreserved,
    critical,
    note:'Text preservation check only; neither PDF accessibility nor ATS reading order is certified.'
  };
}
