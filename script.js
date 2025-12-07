/* script.js — logic and proportional distribution with priority and presets */

// New reference build provided by user:
const BUILD_REF = {
  STR: 779,
  AGI: 18554,
  VIT: 8542,
  ENE: 27681
  ,COM: 0
};
BUILD_REF.TOTAL = BUILD_REF.STR + BUILD_REF.AGI + BUILD_REF.VIT + BUILD_REF.ENE + BUILD_REF.COM;

// computed proportions
const PROPS = {
  STR: BUILD_REF.STR / BUILD_REF.TOTAL,
  AGI: BUILD_REF.AGI / BUILD_REF.TOTAL,
  VIT: BUILD_REF.VIT / BUILD_REF.TOTAL,
  ENE: BUILD_REF.ENE / BUILD_REF.TOTAL
  ,COM: 0
};

// presets: absolute attribute numbers — will be normalized to proportions when applied
const PRESETS = {
  status_atual: { status: 'current' },
  bk_build: { STR: 17028, AGI: 14110, VIT: 8025,  ENE: 2062,  COM: 0 },
  sm_build: { STR: 779,   AGI: 18554, VIT: 8542,  ENE: 29236, COM: 0 },
  elf_build:{ STR: 2022,  AGI: 34767, VIT: 14863, ENE: 1986,  COM: 0 },
  mg_forca:{ STR: 8583,  AGI: 13425, VIT: 30201, ENE: 2026,  COM: 0 },
  mg_energia:{STR: 979,  AGI: 10092, VIT: 10171, ENE: 29297, COM: 0 },
  dl_build: { STR: 29316, AGI: 24020, VIT: 3820,  ENE: 5007,  COM: 2025 },
  sum_build:{ STR: 231,   AGI: 11479, VIT: 8003,  ENE: 26984, COM: 0 }
};

function getInput(id){ return document.getElementById(id) }
function toInt(v){ v = Number(v); return isNaN(v)?0:Math.floor(v); }

function setInfo(msg, isError){
  const el = document.getElementById('infoMessage');
  const el2 = document.getElementById('globalInfo');
  if(el){ el.innerText = msg || ''; el.style.color = isError? '#f1b0b0' : '#9fe3a7'; }
  if(el2){ el2.innerText = msg || ''; el2.style.color = isError? '#f1b0b0' : '#9fe3a7'; }
}

function applyPreset(name){
  const p = PRESETS[name];
  if(!p) return;
  // if status_atual, mark selection used and clear PROPS_VIEW
  if(p.status === 'current'){
    window.PROPS_VIEW = { current: true };
    window.SELECTED_PRESET = name;
    document.getElementById('presetSelect').value = name;
    return;
  }
  // set internal proportions used for calculation by normalizing absolute values to proportions
  const total = (p.STR||0) + (p.AGI||0) + (p.VIT||0) + (p.ENE||0) + (p.COM||0);
  window.PROPS_VIEW = {
    STR: (p.STR||0) / total,
    AGI: (p.AGI||0) / total,
    VIT: (p.VIT||0) / total,
    ENE: (p.ENE||0) / total,
    COM: (p.COM||0) / total
  };
    window.SELECTED_PRESET = name;
  // show pick in UI (nothing else needed)
  document.getElementById('presetSelect').value = name;
}

function calcAndShow(){
  const free = toInt(getInput('free').value);
  const baseSTR = toInt(getInput('str').value);
  const baseAGI = toInt(getInput('agi').value);
  const baseVIT = toInt(getInput('vit').value);
  const baseENE = toInt(getInput('ene').value);
  const baseCOM = toInt(getInput('com')?.value);

  if(free <= 0){
    setInfo('Informe pontos livres maiores que 0.', true);
    return;
  }

  // Use view props: if preset applied use it, otherwise derived from BUILD_REF
  let props = window.PROPS_VIEW || PROPS;
  if(window.PROPS_VIEW && window.PROPS_VIEW.current){ props = PROPS; }
  const selectedPreset = window.SELECTED_PRESET || '';

  // Improved proportional allocation using Largest Remainder Method (Hamilton)
  const stats = ['STR','AGI','VIT','ENE','COM'];
  // priority & lock removed — distribution is controlled by the selected preset proportions
  const priorityOrder = ['ENE','AGI','VIT','STR','COM']; // kept only for future use if needed

  // expected (float) allocations
  const expected = {
    STR: free * props.STR,
    AGI: free * props.AGI,
    VIT: free * props.VIT,
    ENE: free * props.ENE
    ,COM: free * (props.COM || 0)
  };

  // base floor
  let allocation = {
    STR: Math.floor(expected.STR),
    AGI: Math.floor(expected.AGI),
    VIT: Math.floor(expected.VIT),
    ENE: Math.floor(expected.ENE)
    ,COM: Math.floor(expected.COM)
  };

  // remainder to distribute
  let remainder = free - (allocation.STR + allocation.AGI + allocation.VIT + allocation.ENE + allocation.COM);

  // Behavior selection: if 'status_atual' preset or no preset but base attributes exist -> intelligent distribution
  // If no preset and no base attributes -> random distribution
  const isStatusAtual = (selectedPreset === 'status_atual') || (!selectedPreset && (baseSTR || baseAGI || baseVIT || baseENE || baseCOM));
  // if intelligent or random distribution, reset allocation base to zero so we compute from scratch
  if(isStatusAtual || (!selectedPreset && !baseSTR && !baseAGI && !baseVIT && !baseENE && !baseCOM)){
    allocation = { STR:0, AGI:0, VIT:0, ENE:0, COM:0 };
  }
  {
    // Otherwise, use largest fractional remainders (Hamilton method) or intelligent/random distribution
    // If no preset selected and no base attributes given -> random distribution among STR,AGI,VIT,ENE
    const noPresetNoBases = (!selectedPreset && !baseSTR && !baseAGI && !baseVIT && !baseENE && !baseCOM);
    if(noPresetNoBases){
      const keys = ['STR','AGI','VIT','ENE'];
      for(let i=0;i<free;i++){
        const randomKey = keys[Math.floor(Math.random()*keys.length)];
        allocation[randomKey]++;
      }
    } else if(isStatusAtual){
      // Intelligent distribution: prioritize attributes by their current size (weights)
      const baseVals = {STR: baseSTR, AGI: baseAGI, VIT: baseVIT, ENE: baseENE, COM: baseCOM};
      // include COM only if baseCOM>0 or preset specifically includes COM
      const includeCOM = (baseCOM > 0) || (selectedPreset === 'dl_build') || (props && props.COM && props.COM > 0);
      const keys = ['STR','AGI','VIT','ENE'].slice();
      if(includeCOM) keys.push('COM');
      const weights = keys.map(k => Math.max(0, baseVals[k] || 0));
      const totalWeight = weights.reduce((s, v) => s + v, 0);
      // If no weights (all zero) -> random distribution among non-COM attributes
      if(totalWeight === 0){
        const randomKeys = ['STR','AGI','VIT','ENE'];
        for(let i=0;i<free;i++){
          const idx = Math.floor(Math.random()*randomKeys.length);
          allocation[randomKeys[idx]]++;
        }
      } else {
        // Expected allocations proportional to weights (favor larger attributes)
        const expectedByWeight = {};
        keys.forEach((k, idx) => (expectedByWeight[k] = free * weights[idx] / totalWeight));
        // floor and largest remainder
        let localAlloc = keys.reduce((acc, k) => (acc[k] = Math.floor(expectedByWeight[k]), acc), {});
        let localRemainder = free - keys.reduce((s, k) => s + (localAlloc[k] || 0), 0);
        // compute fractions
        const fracs = keys.map(k => ({ key: k, frac: expectedByWeight[k] - Math.floor(expectedByWeight[k]) }));
        fracs.sort((a,b) => b.frac - a.frac || (keys.indexOf(a.key) - keys.indexOf(b.key)));
        let idx = 0;
        while(localRemainder > 0){
          localAlloc[fracs[idx % fracs.length].key]++;
          localRemainder--;
          idx++;
        }
        // write into allocation
        keys.forEach(k => allocation[k] = (allocation[k] || 0) + (localAlloc[k] || 0));
      }
    } else {
      const fractions = stats.map(k => ({ key: k, frac: expected[k] - Math.floor(expected[k]) }));
      // sort descending by frac, but keep stable order to break ties by stats order
      fractions.sort((a,b)=> (b.frac - a.frac) || (stats.indexOf(a.key) - stats.indexOf(b.key)));
      let i=0;
      while(remainder > 0){
        // assign 1 to the next in the ordered list
        const k = fractions[i % fractions.length].key;
        allocation[k]++;
        remainder--;
        i++;
      }
    }
  }

  // map to variables
  let addSTR = allocation.STR;
  let addAGI = allocation.AGI;
  let addVIT = allocation.VIT;
  let addENE = allocation.ENE;
  let addCOM = allocation.COM;

  // lock missing: caps/lock behavior has been removed — always allocate according to proportions.

  // Final totals
  const finalSTR = baseSTR + addSTR;
  const finalAGI = baseAGI + addAGI;
  const finalVIT = baseVIT + addVIT;
  const finalENE = baseENE + addENE;
  const finalCOM = baseCOM + addCOM;

  // Show results
  document.getElementById('addSTR').innerText = addSTR;
  document.getElementById('addAGI').innerText = addAGI;
  document.getElementById('addVIT').innerText = addVIT;
  document.getElementById('addENE').innerText = addENE;
  document.getElementById('addCOM').innerText = addCOM;

  document.getElementById('finalSTR').innerText = finalSTR;
  document.getElementById('finalAGI').innerText = finalAGI;
  document.getElementById('finalVIT').innerText = finalVIT;
  document.getElementById('finalENE').innerText = finalENE;
  document.getElementById('finalCOM').innerText = finalCOM;

  document.getElementById('resultado').classList.remove('hidden');

  // Update algorithm message (dynamic)
  const msgEl = document.getElementById('algorithmMessage');
  if(selectedPreset === 'status_atual' || (!selectedPreset && (baseSTR || baseAGI || baseVIT || baseENE || baseCOM))){
    msgEl.innerHTML = '<em>Algoritmo:</em> distribuição inteligente — prioriza atributos maiores (status atual).';
  } else if (selectedPreset){
    msgEl.innerHTML = '<em>Algoritmo:</em> distribuição proporcional baseada na build de referência.';
  } else {
    msgEl.innerHTML = '';
  }
}

// UI wiring
document.getElementById('calcBtn').addEventListener('click', calcAndShow);
document.getElementById('applyPreset').addEventListener('click', ()=>{
  const sel = document.getElementById('presetSelect').value;
  if(!sel) return setInfo('Escolha um preset', true);
  applyPreset(sel);
  setInfo('Preset aplicado: ' + sel, false);
});

// allow clearing preset by selecting empty option
document.getElementById('presetSelect').addEventListener('change', (e)=>{
  if(!e.target.value) { window.PROPS_VIEW = undefined; window.SELECTED_PRESET = ''; setInfo('Preset removido.'); }
});

// plus buttons: increment target input by 1
document.querySelectorAll('.plus').forEach(b=>{
  b.addEventListener('click', ()=> {
    const t = b.getAttribute('data-target');
    const el = document.getElementById(t);
    el.value = (parseInt(el.value)||0) + 1;
    el.focus();
  });
});

// cursor behavior (use local assets as first option, fallback to icons)
const normalCursorUrl = 'assets/normal_cursor.cur';
const clickCursorUrl = 'assets/click_cursor.cur';
function setDefaultCursor(){
  document.body.style.cursor = `url("${normalCursorUrl}"), auto`;
}
function setClickCursor(){
  document.body.style.cursor = `url("${clickCursorUrl}"), auto`;
}
window.addEventListener('load', ()=> setDefaultCursor());
window.addEventListener('mousedown', ()=> setClickCursor());
window.addEventListener('mouseup', ()=> setDefaultCursor());
// On initial load: if free points set and no preset nor base attributes -> show random distribution
window.addEventListener('load', ()=>{
  const freeVal = toInt(getInput('free').value);
  const presetSel = (document.getElementById('presetSelect').value || '').trim();
  const bSTR = toInt(getInput('str').value);
  const bAGI = toInt(getInput('agi').value);
  const bVIT = toInt(getInput('vit').value);
  const bENE = toInt(getInput('ene').value);
  const bCOM = toInt(getInput('com')?.value);
  if(freeVal>0 && !presetSel && !bSTR && !bAGI && !bVIT && !bENE && !bCOM){
    calcAndShow();
  }
});

// theme toggle removed — default dark only

// export removed

// create icons folder and svg files are created server-side in the zip

// Build Code export/import: numeric string with 5-digit padded attributes in order STR AGI VIT ENE COM
function pad5(n){
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return String(v).padStart(5, '0');
}

function toBase36Pad(n){
  const v = Math.max(0, Math.floor(Number(n) || 0));
  // 4 characters base36 gives enough room for typical values
  return v.toString(36).toLowerCase().padStart(4,'0');
}
function fromBase36Chunk(s){ return parseInt(s, 36) || 0; }
function exportBuild(){
  // compact base36 4-chars per attribute: 20 characters total
  const s = toBase36Pad(getInput('str').value) + toBase36Pad(getInput('agi').value) + toBase36Pad(getInput('vit').value) + toBase36Pad(getInput('ene').value) + toBase36Pad(getInput('com').value);
  const el = document.getElementById('buildCode');
  el.value = s;
  try{ navigator.clipboard.writeText(s); }catch(e){ /* ignore */ }
  setInfo('Código copiado para a área de transferência.');
}
function importBuild(){
  const code = (document.getElementById('buildCode').value || '').trim();
  let str, agi, vit, ene, com;
  if(/^[0-9]{25}$/.test(code)){
    // Legacy numeric format
    str = parseInt(code.slice(0,5),10);
    agi = parseInt(code.slice(5,10),10);
    vit = parseInt(code.slice(10,15),10);
    ene = parseInt(code.slice(15,20),10);
    com = parseInt(code.slice(20,25),10);
  } else if(/^[0-9a-z]{20}$/i.test(code)){
    const s = code.toLowerCase();
    str = fromBase36Chunk(s.slice(0,4));
    agi = fromBase36Chunk(s.slice(4,8));
    vit = fromBase36Chunk(s.slice(8,12));
    ene = fromBase36Chunk(s.slice(12,16));
    com = fromBase36Chunk(s.slice(16,20));
  } else {
    return setInfo('Código inválido. Deve ser 20 caracteres base36 ou 25 dígitos numéricos.', true);
  }
  getInput('str').value = str;
  getInput('agi').value = agi;
  getInput('vit').value = vit;
  getInput('ene').value = ene;
  getInput('com').value = com;
  setInfo('Build importada!');
}

// wire export/import buttons
document.getElementById('exportCode').addEventListener('click', exportBuild);
document.getElementById('importCode').addEventListener('click', importBuild);
