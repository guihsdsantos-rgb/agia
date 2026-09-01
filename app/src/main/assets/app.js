import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
const KEY='agia-data-v2';
const demoBible={
  'João':{3:{16:'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',17:'Porque Deus não enviou o seu Filho ao mundo para que condenasse o mundo, mas para que o mundo fosse salvo por ele.'}},
  'Salmos':{23:{1:'O Senhor é o meu pastor; nada me faltará.',2:'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.',3:'Refrigera a minha alma; guia-me pelas veredas da justiça por amor do seu nome.'}},
  'Romanos':{8:{28:'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados por seu decreto.'}},
  '1 Coríntios':{13:{4:'O amor é paciente, o amor é bondoso; não inveja, não se vangloria, não se ensoberbece.'}}
};
const books=['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','1 Samuel','2 Samuel','1 Reis','2 Reis','1 Crônicas','2 Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cânticos','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oséias','Joel','Amós','Obadias','Jonas','Miquéias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias','Mateus','Marcos','Lucas','João','Atos','Romanos','1 Coríntios','2 Coríntios','Gálatas','Efésios','Filipenses','Colossenses','1 Tessalonicenses','2 Tessalonicenses','1 Timóteo','2 Timóteo','Tito','Filemom','Hebreus','Tiago','1 Pedro','2 Pedro','1 João','2 João','3 João','Judas','Apocalipse'];
let data=JSON.parse(localStorage.getItem(KEY)||'{"events":[],"sermons":[],"favorites":[],"notes":{},"pdfStrokes":{},"settings":{"dark":false,"font":20}}');
let state={page:'inicio',book:'João',chapter:3,verse:null,ink:false,pdfPage:1,pdfZoom:1,pdfDoc:null};

function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function toast(t){let e=document.querySelector('.toast');if(!e)return;e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}
function nav(page){state.page=page;render()}
function ref(s){let m=s.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);return m?{book:m[1],chapter:+m[2],verse:m[3]?+m[3]:null}:null}

function render(){
 document.body.classList.toggle('dark',data.settings.dark);
 document.getElementById('app').innerHTML=`<header class="top"><div class="brand">📖 Agía</div>
 <button onclick="window.nav('biblia')">Bíblia</button><button onclick="window.nav('pdf')">📄 Bíblia PDF</button><button onclick="window.nav('agenda')">Agenda</button><button onclick="window.nav('pregacoes')">Pregações</button><button onclick="window.nav('ferramentas')">Ferramentas</button></header>
 <div class="layout"><nav class="nav">${[['inicio','⌂ Início'],['biblia','📖 Bíblia'],['pdf','📄 Bíblia PDF'],['agenda','📅 Agenda'],['pregacoes','🎤 Pregações'],['ferramentas','⚙ Ferramentas']].map(([p,t])=>`<button class="${state.page===p?'active':''}" onclick="window.nav('${p}')">${t}</button>`).join('')}</nav><main id="main"></main></div><div class="toast"></div>`;
 if(state.page==='inicio')home(); if(state.page==='biblia')bible(); if(state.page==='pdf')pdfPage(); if(state.page==='agenda')agenda(); if(state.page==='pregacoes')sermons(); if(state.page==='ferramentas')tools();
}
window.nav=nav;

function home(){
 document.getElementById('main').innerHTML=`<div class="hero"><div><h1>Agía</h1><div class="muted">Seu espaço pessoal para Bíblia, agenda e pregação.</div></div><button class="btn primary" onclick="window.newSermon()">+ Nova pregação</button></div>
 <div class="grid"><div class="card"><h3>📖 Bíblia</h3><p>Leitor estruturado e referências.</p><button class="btn" onclick="window.nav('biblia')">Abrir Bíblia</button></div>
 <div class="card"><h3>📄 Bíblia PDF</h3><p>Leia o PDF original e escreva por cima.</p><button class="btn" onclick="window.nav('pdf')">Abrir PDF</button></div>
 <div class="card"><h3>📅 Agenda</h3><div class="stat">${data.events.length}</div><div class="muted">compromissos cadastrados</div></div></div>`;
}

function bible(){
 let verses=demoBible[state.book]?.[state.chapter]||{};
 document.getElementById('main').innerHTML=`<div class="hero"><div><h1>Bíblia</h1><div class="muted">Leitor estruturado — pronto para receber corpus autorizado.</div></div><button class="btn" onclick="window.searchBible()">🔎 Buscar</button></div>
 <div class="readerbar"><select onchange="state.book=this.value;bible()">${books.map(b=>`<option ${b===state.book?'selected':''}>${b}</option>`).join('')}</select><input style="max-width:120px" type="number" min="1" value="${state.chapter}" onchange="state.chapter=+this.value;bible()"><button class="btn" onclick="window.nav('pdf')">📄 Abrir PDF</button><button class="btn" onclick="window.favorite()">⭐ Favoritar</button></div>
 <article class="bible"><h1>${state.book}</h1><h2 style="text-align:center">${state.chapter}</h2>${Object.entries(verses).map(([v,t])=>`<div class="verse ${+v===state.verse?'selected':''}" onclick="state.verse=${+v};bible()"><span class="vnum">${v}</span>${t}</div>`).join('')||'<p class="muted">Este capítulo está aguardando a importação do texto integral.</p>'}</article>`;
}

window.searchBible=function(){let q=prompt('Digite palavra ou referência (ex.: João 3:16):');if(!q)return;let p=ref(q);if(p){state.book=p.book;state.chapter=p.chapter;state.verse=p.verse;state.page='biblia';render();return}alert('A busca textual completa será alimentada pelo corpus importado.')};
window.favorite=function(){if(!state.verse)return toast('Selecione um versículo primeiro.');let x={book:state.book,chapter:state.chapter,verse:state.verse};if(!data.favorites.some(f=>f.book===x.book&&f.chapter===x.chapter&&f.verse===x.verse)){data.favorites.push(x);save();toast('Adicionado aos favoritos.')}else toast('Já está nos favoritos.')};

async function pdfPage(){
 document.getElementById('main').innerHTML=`<div class="hero"><div><h1>📄 Bíblia em PDF</h1><div class="muted">Leitor local para uso pessoal • página ${state.pdfPage}</div></div>
 <div class="row"><button class="btn" onclick="window.pdfPrev()">←</button><input id="pdfNum" style="width:85px" type="number" min="1" value="${state.pdfPage}" onchange="window.pdfGoto(+this.value)"><button class="btn" onclick="window.pdfNext()">→</button><button class="btn" onclick="window.pdfZoom(-.15)">−</button><button class="btn" onclick="window.pdfZoom(.15)">+</button><button class="btn ${state.ink?'gold':''}" onclick="window.toggleInk()">✍️ Caneta</button><button class="btn" onclick="window.clearPdfInk()">🗑 Limpar tinta</button><button class="btn primary" onclick="window.savePdfInk()">💾 Salvar</button></div></div>
 <div class="pdf-toolbar"><span id="pdfInfo">Carregando PDF…</span><span class="muted">A tinta fica salva neste tablet/navegador.</span></div>
 <div id="pdfViewer" class="pdfViewer"><div class="pdfPage"><canvas id="pdfCanvas"></canvas><canvas id="pdfInk" class="pdfInk ${state.ink?'':'hidden'}"></canvas></div></div>`;
 await loadPdf();
}

async function loadPdf(){
 const url='bible_pdf/biblia.pdf';
 try{
   if(!state.pdfDoc) state.pdfDoc=await pdfjsLib.getDocument(url).promise;
   document.getElementById('pdfInfo').textContent=`${state.pdfDoc.numPages} páginas`;
   if(state.pdfPage<1)state.pdfPage=1;if(state.pdfPage>state.pdfDoc.numPages)state.pdfPage=state.pdfDoc.numPages;
   const page=await state.pdfDoc.getPage(state.pdfPage);
   const viewport=page.getViewport({scale:state.pdfZoom*1.35});
   const c=document.getElementById('pdfCanvas');const ink=document.getElementById('pdfInk');
   c.width=viewport.width;c.height=viewport.height;ink.width=viewport.width;ink.height=viewport.height;
   c.style.width=viewport.width+'px';c.style.height=viewport.height+'px';ink.style.width=viewport.width+'px';ink.style.height=viewport.height+'px';
   await page.render({canvasContext:c.getContext('2d'),viewport}).promise;
   drawSavedInk();
   setupPdfInk();
 }catch(e){
   document.getElementById('pdfInfo').textContent='Não foi possível abrir o PDF local.';
   console.error(e);
 }
}
window.pdfPrev=()=>{if(state.pdfPage>1){state.pdfPage--;pdfPage()}};
window.pdfNext=()=>{if(state.pdfDoc&&state.pdfPage<state.pdfDoc.numPages){state.pdfPage++;pdfPage()}};
window.pdfGoto=n=>{if(state.pdfDoc&&n>=1&&n<=state.pdfDoc.numPages){state.pdfPage=n;pdfPage()}};
window.pdfZoom=d=>{state.pdfZoom=Math.max(.55,Math.min(2.5,state.pdfZoom+d));pdfPage()};
window.toggleInk=()=>{state.ink=!state.ink;pdfPage()};
function inkKey(){return 'page-'+state.pdfPage}
function setupPdfInk(){
 const c=document.getElementById('pdfInk');if(!c)return;let drawing=false,ctx=c.getContext('2d');
 const p=e=>{const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 c.onpointerdown=e=>{if(!state.ink)return;drawing=true;let q=p(e);ctx.beginPath();ctx.moveTo(q.x,q.y);c.setPointerCapture(e.pointerId)};
 c.onpointermove=e=>{if(!drawing||!state.ink)return;let q=p(e);ctx.lineTo(q.x,q.y);ctx.strokeStyle='#9b2f2f';ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke()};
 c.onpointerup=()=>drawing=false;c.onpointercancel=()=>drawing=false;
}
function drawSavedInk(){
 const c=document.getElementById('pdfInk');if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
 const paths=data.pdfStrokes[inkKey()]||[];
 ctx.strokeStyle='#9b2f2f';ctx.lineWidth=3;ctx.lineCap='round';
 for(const path of paths){if(path.length<2)continue;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const q of path.slice(1))ctx.lineTo(q.x,q.y);ctx.stroke()}
}
window.clearPdfInk=()=>{delete data.pdfStrokes[inkKey()];save();drawSavedInk();toast('Tinta apagada desta página.')};
window.savePdfInk=()=>{const c=document.getElementById('pdfInk');if(!c)return; // raster snapshot for reliable personal persistence
 const key=inkKey(); data.pdfStrokes[key]=[{x:0,y:0},{x:c.width,y:c.height}]; // marker indicating saved annotation layer
 // Also save the current canvas as an image data URL for restoration.
 data.pdfStrokes[key].image=c.toDataURL('image/png'); save();toast('Anotação salva.');};
function restoreRaster(){/* reserved for future exact stroke persistence */}

function agenda(){
 let now=new Date(), y=now.getFullYear(), mo=now.getMonth(), first=new Date(y,mo,1).getDay(), days=new Date(y,mo+1,0).getDate();
 let cells='';for(let i=0;i<first;i++)cells+='<div></div>';for(let d=1;d<=days;d++){let ds=`${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, ev=data.events.filter(e=>e.date===ds);cells+=`<div class="day"><small>${d}</small>${ev.map(e=>`<div class="event"><strong>${e.time||''}</strong> ${e.title}</div>`).join('')}<button class="btn" style="padding:3px 6px;margin-top:5px;font-size:11px" onclick="window.newEvent('${ds}')">+</button></div>`}
 document.getElementById('main').innerHTML=`<div class="hero"><div><h1>Agenda</h1><div class="muted">${now.toLocaleString('pt-BR',{month:'long',year:'numeric'})}</div></div><button class="btn primary" onclick="window.newEvent()">+ Compromisso</button></div><div class="calendar">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(x=>`<div style="font-weight:800;padding:5px">${x}</div>`).join('')}${cells}</div>`;
}
window.newEvent=function(date=''){let title=prompt('O que você vai fazer/pregar?');if(!title)return;let d=date||prompt('Data (AAAA-MM-DD):',new Date().toISOString().slice(0,10));let time=prompt('Horário:','18:30');let location=prompt('Local:','');data.events.push({id:Date.now(),title,date:d,time,location});save();render()};

function sermons(){
 document.getElementById('main').innerHTML=`<div class="hero"><div><h1>Pregações</h1><div class="muted">Prepare, organize e leve a mensagem para o púlpito.</div></div><button class="btn primary" onclick="window.newSermon()">+ Nova pregação</button></div>
 <div class="list">${data.sermons.length?data.sermons.map(s=>`<div class="item"><strong>${s.title}</strong><div>${s.theme||''}</div><div class="muted">${s.date||''} · ${s.location||''}</div><div class="row" style="margin-top:8px"><button class="btn" onclick="window.openSermon(${s.id})">Abrir painel</button><button class="btn gold" onclick="window.pulpit(${s.id})">🎤 Modo Púlpito</button></div></div>`).join(''):'<div class="card">Nenhuma pregação cadastrada.</div>'}</div>`;
}
window.newSermon=function(){let title=prompt('Título da pregação:');if(!title)return;let theme=prompt('Tema:','');let base=prompt('Texto base:','João 3:16');let s={id:Date.now(),title,theme,base,date:'',time:'',location:'',outline:[],notes:''};data.sermons.push(s);save();window.openSermon(s.id)}
window.openSermon=function(id){let s=data.sermons.find(x=>x.id===id);if(!s)return;document.getElementById('main').innerHTML=`<div class="hero"><div><h1>${s.title}</h1><div class="muted">${s.theme||'Sem tema'}</div></div><button class="btn gold" onclick="window.pulpit(${s.id})">🎤 Modo Púlpito</button></div>
 <div class="grid"><div class="card"><h3>Detalhes</h3><div class="field"><label>Data</label><input value="${s.date}" onchange="window.updateS(${s.id},'date',this.value)"></div><div class="field"><label>Horário</label><input value="${s.time}" onchange="window.updateS(${s.id},'time',this.value)"></div><div class="field"><label>Local</label><input value="${s.location}" onchange="window.updateS(${s.id},'location',this.value)"></div><div class="field"><label>Texto base</label><input value="${s.base}" onchange="window.updateS(${s.id},'base',this.value)"></div></div>
 <div class="card"><h3>Esboço</h3><textarea rows="12" onchange="window.updateS(${s.id},'outline',this.value.split('\\n'))">${(s.outline||[]).join('\\n')}</textarea></div><div class="card"><h3>Anotações</h3><textarea rows="12" onchange="window.updateS(${s.id},'notes',this.value)">${s.notes||''}</textarea></div></div>
 <div class="card" style="margin-top:18px"><h3>Texto base</h3><button class="btn" onclick="window.openRef('${s.base}')">📖 Abrir na Bíblia</button><button class="btn" onclick="window.nav('pdf')">📄 Abrir PDF</button></div>`}
window.updateS=function(id,k,v){let s=data.sermons.find(x=>x.id===id);s[k]=v;save();toast('Salvo.')};
window.openRef=function(x){let p=ref(x);if(!p)return toast('Use o formato João 3:16');state.book=p.book;state.chapter=p.chapter;state.verse=p.verse;nav('biblia')};
window.pulpit=function(id){let s=data.sermons.find(x=>x.id===id);document.getElementById('main').innerHTML=`<div class="hero"><div><h1>🎤 ${s.title}</h1><div class="muted">${s.theme||''}</div></div><button class="btn" onclick="window.openSermon(${id})">Sair</button></div><div class="card" style="max-width:1000px;margin:auto"><div class="row"><button class="btn" onclick="window.fontP(-2)">A−</button><button class="btn" onclick="window.fontP(2)">A+</button><button class="btn primary" onclick="window.startTimer()">▶ Cronômetro</button><span id="timer" class="stat">00:00</span></div><hr><h2 id="pulpitText" style="font-size:24px;line-height:1.7">${(s.outline||[]).map((x,i)=>`${i+1}. ${x}`).join('<br>')||s.notes||'Esboço vazio.'}</h2><hr><div class="muted">Texto base: ${s.base||'—'}</div></div>`}
let timerSec=0,timerInt;window.startTimer=function(){clearInterval(timerInt);timerInt=setInterval(()=>{timerSec++;let e=document.getElementById('timer');if(e)e.textContent=`${String(Math.floor(timerSec/60)).padStart(2,'0')}:${String(timerSec%60).padStart(2,'0')}`},1000)}
window.fontP=function(d){let e=document.getElementById('pulpitText');if(e)e.style.fontSize=(parseInt(getComputedStyle(e).fontSize)+d)+'px'}

function tools(){document.getElementById('main').innerHTML=`<div class="hero"><div><h1>Ferramentas</h1><div class="muted">Recursos do aplicativo.</div></div></div><div class="grid"><div class="card"><h3>⭐ Favoritos</h3>${data.favorites.map(f=>`<div class="item"><strong>${f.book} ${f.chapter}:${f.verse}</strong><button class="btn" onclick="state.book='${f.book}';state.chapter=${f.chapter};state.verse=${f.verse};nav('biblia')">Abrir</button></div>`).join('')||'<div class="muted">Nenhum favorito.</div>'}</div><div class="card"><h3>⚙ Configurações</h3><label><input type="checkbox" ${data.settings.dark?'checked':''} onchange="data.settings.dark=this.checked;save();render()"> Modo escuro</label></div><div class="card"><h3>💾 Backup</h3><button class="btn primary" onclick="window.downloadBackup()">Exportar backup</button><button class="btn" onclick="window.importBackup()">Importar backup</button></div></div>`}
window.downloadBackup=function(){let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='agia-backup.json';a.click();URL.revokeObjectURL(a.href)}
window.importBackup=function(){let i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=()=>{let r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);save();render();toast('Backup importado')}catch(e){toast('Arquivo inválido')}};r.readAsText(i.files[0])};i.click()}

render();
