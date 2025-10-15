// ========== utils ==========
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fmtHuman = iso => { const d=new Date(iso); return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`; };

// ========== state ==========
const STORAGE_KEY = 'dmd-entries-v3';
const state = {
  today:new Date(), cursor:new Date(),
  selectedDateISO:null, selectedMood:null, praise:'',
  summary:'', entries:[], detailId:null
};

// ========== storage ==========
function loadEntries(){ try{ state.entries = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }catch{ state.entries=[]; } }
function saveEntries(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries)); }

// ========== header ==========
function setHeader(){ $('#headerDate').textContent = fmtHuman(fmtDate(state.today)); }

// ========== calendar ==========
function renderCalendar(){
  const y=state.cursor.getFullYear(), m=state.cursor.getMonth();
  $('#calTitle').textContent = `${y}년 ${m+1}월`;
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  const grid=$('#calGrid'); grid.innerHTML='';

  // 앞쪽 공백
  for(let i=0;i<first.getDay();i++){
    const blank=document.createElement('div'); blank.className='cell'; blank.style.visibility='hidden';
    grid.appendChild(blank);
  }
  for(let d=1; d<=last.getDate(); d++){
    const iso=fmtDate(new Date(y,m,d));
    const cell=document.createElement('button');
    cell.className='cell'; cell.textContent=d;
    if(iso===fmtDate(state.today)) cell.classList.add('today');
    if(iso===state.selectedDateISO) cell.classList.add('selected');
    cell.addEventListener('click', ()=>{ state.selectedDateISO=iso; goMood(); });
    grid.appendChild(cell);
  }
}

// ========== navigation ==========
function show(tab){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#view-'+tab)?.classList.add('active');
  $$('.tab').forEach(t=> t.classList.toggle('active', t.dataset.tab===tab));
  if(tab==='stats') renderStats();
}
function goMood(){
  show('mood');
  $('#selectedDateText').textContent = fmtHuman(state.selectedDateISO);
  const found = state.entries.find(e=>e.dateISO===state.selectedDateISO);
  state.selectedMood = found?.mood ?? null;
  state.praise       = found?.praise ?? '';

  $$('#view-mood input[name="mood"]').forEach(r=> r.checked = (state.selectedMood && r.value===state.selectedMood));
  $('#praise').value = state.praise;
  $('#praiseCount').textContent = String(state.praise.length);
}
function goWrite(){
  show('write');
  $('#writeDate').textContent = fmtHuman(state.selectedDateISO);
  $('#writeMood').textContent = `감정: ${state.selectedMood||'—'}`;

  const found = state.entries.find(e=>e.dateISO===state.selectedDateISO);
  $('#diary').value = found?.content || '';
  $('#count').textContent = String($('#diary').value.length);
}
function goRecords(){ show('records'); renderRecords(); }

// ========== records ==========
function renderRecords(){
  const box = $('#recordList');
  if(!state.entries.length){ box.innerHTML='<div class="soft">아직 저장된 기록이 없습니다.</div>'; return; }
  const list=[...state.entries].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  box.innerHTML='';
  list.forEach(e=>{
    const it=document.createElement('div'); it.className='item card';
    it.innerHTML = `
      <div class="badge">${e.mood||'—'}</div>
      <div style="flex:1">
        <div style="font-weight:700">${fmtHuman(e.dateISO)}</div>
        <div class="subtitle">${(e.praise||'').replace(/</g,'&lt;')}</div>
      </div>
      <div><button class="smallbtn" title="삭제">🗑️</button></div>
    `;
    it.querySelector('.smallbtn').addEventListener('click', ev=>{
      ev.stopPropagation();
      if(confirm('이 기록을 삭제할까요?')){
        state.entries = state.entries.filter(x=>x.id!==e.id);
        saveEntries(); renderRecords(); renderStats();
      }
    });
    it.addEventListener('click', ()=> openDetail(e.id));
    box.appendChild(it);
  });
}
function openDetail(id){
  const e = state.entries.find(x=>x.id===id); if(!e) return;
  state.detailId = id;
  $('#detailTitle').textContent = `${fmtHuman(e.dateISO)} 기록`;
  $('#detailDiary').textContent = `${e.content}\n\n— 요약 —\n${e.summary||'(요약 없음)'}`;
  $('#detailModal').style.display='flex';
}
function closeDetail(){ $('#detailModal').style.display='none'; }
function deleteDetail(){
  if(state.detailId==null) return closeDetail();
  if(!confirm('이 기록을 삭제할까요?')) return;
  state.entries = state.entries.filter(e=>e.id!==state.detailId);
  saveEntries(); state.detailId=null; closeDetail(); renderRecords(); renderStats();
}

// ========== stats ==========
const MOOD_COLORS = {'행복':'#ffd6a5','차분':'#bde0fe','설렘':'#e5b9ff','살짝 우울':'#c9d6ff','피곤':'#ffc8dd','—':'#e9ecef'};
function computeStats(range){
  const now=new Date(); let from=new Date(0);
  if(range!=='all'){ const days=Number(range)||30; from=new Date(now.getFullYear(), now.getMonth(), now.getDate()-days); }
  const counts={};
  state.entries.forEach(e=>{
    const d=new Date(e.dateISO);
    if(d>=from && d<=now){ const k=e.mood||'—'; counts[k]=(counts[k]||0)+1; }
  });
  return counts;
}
function renderStats(){
  const range = $('#statsRange')?.value || '30';
  const counts = computeStats(range);
  const chips = $('#statsChips'); chips.innerHTML='';
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    const el=document.createElement('div'); el.className='chip';
    el.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${MOOD_COLORS[k]||'#ddd'}"></span>&nbsp;${k} • ${v}`;
    chips.appendChild(el);
  });

  const cvs=$('#statsCanvas'), ctx=cvs.getContext('2d');
  ctx.clearRect(0,0,cvs.width,cvs.height);
  const labels=Object.keys(counts), values=Object.values(counts);
  if(!labels.length){ ctx.fillStyle='#999'; ctx.font='14px system-ui'; ctx.fillText('표시할 데이터가 없습니다.',16,40); return; }

  const max=Math.max(...values), pad=40,gap=22, W=cvs.width-pad*2, H=cvs.height-pad*2;
  const barW=Math.max(20,(W-gap*(labels.length-1))/labels.length);
  labels.forEach((lb,i)=>{
    const x=pad+i*(barW+gap), h=max?Math.round(H*(values[i]/max)):0, y=pad+(H-h);
    ctx.fillStyle=MOOD_COLORS[lb]||'#ddd'; ctx.fillRect(x,y,barW,h);
    ctx.fillStyle='#6f6a67'; ctx.font='12px system-ui';
    ctx.fillText(lb, x, cvs.height-12);
    ctx.fillText(String(values[i]), x, y-6);
  });
}

// ========== AI Summary (프록시) ==========
const PROXY_URL = ""; // ← Cloudflare Workers 또는 Netlify Functions 주소를 넣어주세요.

async function requestSummaryViaProxy(text, dateISO, mood, praise){
  if(!PROXY_URL) throw new Error("PROXY_URL 미설정");
  const res = await fetch(PROXY_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text, dateISO, mood, praise })
  });
  if(!res.ok) throw new Error(await res.text());
  const { summary } = await res.json();
  return (summary||"").trim();
}

// ========== bindings ==========
function bind(){
  // 탭
  $$('.tab').forEach(t=> t.addEventListener('click', ()=>{
    const tab=t.dataset.tab; if(tab==='records') goRecords(); else show(tab);
  }));

  // 달 이동
  $('#prevMonth').addEventListener('click', ()=>{ state.cursor.setMonth(state.cursor.getMonth()-1); renderCalendar(); });
  $('#nextMonth').addEventListener('click', ()=>{ state.cursor.setMonth(state.cursor.getMonth()+1); renderCalendar(); });

  // 감정/칭찬
  $$('#view-mood input[name="mood"]').forEach(r=> r.addEventListener('change', ()=>{ state.selectedMood=r.value; }));
  $('#praise').addEventListener('input', e=>{ state.praise=e.target.value; $('#praiseCount').textContent=String(state.praise.length); });
  $('#goWrite').addEventListener('click', ()=>{ if(!state.selectedDateISO) return alert('날짜를 선택해 주세요.'); goWrite(); });

  // 작성
  $('#diary').addEventListener('input', e=> $('#count').textContent = String(e.target.value.length));

  // AI 요약 (저장과 분리)
  $('#btnSummary').addEventListener('click', async ()=>{
    const text=$('#diary').value.trim();
    if(!state.selectedDateISO) return alert('날짜를 먼저 선택해 주세요.');
    if(!text) return alert('일기를 먼저 작성해 주세요.');

    $('#btnSummary').disabled=true; $('#btnSummary').textContent='요약 중…';
    try{
      const sum = await requestSummaryViaProxy(text, state.selectedDateISO, state.selectedMood, state.praise);
      state.summary = sum;
      $('#summaryBox').textContent = sum || '(요약이 비어 있습니다)';
      $('#modal').style.display='flex';
    }catch(e){
      console.error(e);
      alert('요약 프록시가 설정되지 않았거나 오류가 발생했습니다.\n(app.js 의 PROXY_URL 설정 필요)');
    }finally{
      $('#btnSummary').disabled=false; $('#btnSummary').textContent='AI 요약';
    }
  });
  $('#closeModal').addEventListener('click', ()=> $('#modal').style.display='none');

  // 저장 (요약 없이도 가능)
  $('#btnSave').addEventListener('click', ()=>{
    if(!state.selectedDateISO) return alert('날짜를 먼저 선택해 주세요.');
    const content = $('#diary').value.trim();
    const id = `${state.selectedDateISO}-${Date.now()}`;

    // 같은 날짜 1개만 유지
    state.entries = state.entries.filter(e=> e.dateISO!==state.selectedDateISO);
    state.entries.push({
      id, dateISO: state.selectedDateISO,
      mood: state.selectedMood, praise: state.praise,
      content, summary: state.summary, createdAt: new Date().toISOString()
    });
    saveEntries();
    alert('저장되었습니다.');
    goRecords(); renderStats();
  });

  // 상세 모달
  $('#closeDetail').addEventListener('click', closeDetail);
  $('#deleteEntry').addEventListener('click', deleteDetail);

  // 통계
  $('#statsRange').addEventListener('change', renderStats);
}

// ========== init ==========
function init(){
  loadEntries(); setHeader();
  state.cursor = new Date(state.today.getFullYear(), state.today.getMonth(), 1);
  state.selectedDateISO = fmtDate(state.today);
  renderCalendar(); bind();
}
document.addEventListener('DOMContentLoaded', init);
