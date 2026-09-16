import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const VARIABLES = [
  "Problemática climática",
  "Dimensión de soberanía alimentaria/hídrica abordada",
  "Solución",
  "Población",
  "Inversión",
  "Resultados",
  "Desafíos",
  "Factores habilitantes",
  "Sostenibilidad",
  "Potencial de réplica",
  "Posibles historias de impacto",
];

const EXPERIENCES = [
  { id:"exp-1", name:"Experiencia 1", country:"Por identificar", team:"Equipo 1" },
  { id:"exp-2", name:"Experiencia 2", country:"Por identificar", team:"Equipo 2" },
  { id:"exp-3", name:"Experiencia 3", country:"Por identificar", team:"Equipo 3" },
  { id:"exp-4", name:"Experiencia 4", country:"Por identificar", team:"Equipo 4" },
  { id:"exp-5", name:"Experiencia 5", country:"Por identificar", team:"Equipo 5" },
  { id:"exp-6", name:"Experiencia 6", country:"Por identificar", team:"Equipo 6" },
];

const ROLES = [
  { id:"nucleo", label:"Núcleo Colectivo" },
  { id:"avina", label:"Avina" },
  ...EXPERIENCES.map(e=>({id:e.id,label:e.team})),
];

const STATUS = {
  draft:"Borrador",
  review:"En revisión",
  changes:"Cambios solicitados",
  validated:"Validado",
};

const STORAGE = "avina-matriz-v02";

function initialState(){
  const cells={};
  EXPERIENCES.forEach(e=>VARIABLES.forEach(v=>{
    cells[`${e.id}::${v}`]={
      content:"", interpretation:"", observations:"",
      status:"draft", evidenceIds:[], updatedAt:null
    };
  }));
  return { cells, evidence:[], comments:[], history:[], activeExperience:"exp-1" };
}
function load(){
  try { const x=JSON.parse(localStorage.getItem(STORAGE)); return x ? {...initialState(),...x} : initialState(); }
  catch { return initialState(); }
}
const canEdit=(role,expId)=>role==="nucleo"||role==="avina"||role===expId;
const fmt=d=>d?new Date(d).toLocaleString("es-CO"):"Sin cambios todavía";

function App(){
  const [state,setState]=useState(load);
  const [role,setRole]=useState("nucleo");
  const [view,setView]=useState("experiences");
  const [cellKey,setCellKey]=useState(null);
  const [toast,setToast]=useState("");
  useEffect(()=>localStorage.setItem(STORAGE,JSON.stringify(state)),[state]);
  const actor=ROLES.find(r=>r.id===role)?.label||role;
  const active=EXPERIENCES.find(e=>e.id===state.activeExperience)||EXPERIENCES[0];

  const notify=m=>{setToast(m);clearTimeout(window.__t);window.__t=setTimeout(()=>setToast(""),2300)};
  const history=(action,key="")=>setState(s=>({...s,history:[{
    id:crypto.randomUUID(),action,key,actor,timestamp:new Date().toISOString()
  },...s.history]}));

  const updateCell=(key,patch,action="Celda editada")=>{
    setState(s=>({...s,cells:{...s.cells,[key]:{...s.cells[key],...patch,updatedAt:new Date().toISOString()}}}));
    history(action,key);
  };
  const status=(key,value)=>{
    if(!canEdit(role,key.split("::")[0])) return notify("Este rol no puede cambiar el estado.");
    updateCell(key,{status:value},`Estado cambiado a ${STATUS[value]}`);
    notify(STATUS[value]);
  };
  const addEvidence=(key,data)=>{
    const ev={id:crypto.randomUUID(),key,...data,addedBy:actor,createdAt:new Date().toISOString(),status:"pending"};
    setState(s=>({...s,evidence:[ev,...s.evidence],cells:{...s.cells,[key]:{...s.cells[key],evidenceIds:[...(s.cells[key].evidenceIds||[]),ev.id],updatedAt:new Date().toISOString()}}}));
    history("Evidencia vinculada",key); notify("Evidencia vinculada.");
  };
  const evidenceStatus=(id,value)=>{
    const ev=state.evidence.find(e=>e.id===id);
    setState(s=>({...s,evidence:s.evidence.map(e=>e.id===id?{...e,status:value}:e)}));
    if(ev) history(`Evidencia: ${value}`,ev.key);
  };
  const comment=(key,text,type="comment")=>{
    if(!text.trim()) return;
    setState(s=>({...s,comments:[{
      id:crypto.randomUUID(),key,text:text.trim(),type,author:actor,
      createdAt:new Date().toISOString(),resolved:false
    },...s.comments]}));
    history(type==="request"?"Solicitud de cambio":"Comentario agregado",key);
    notify(type==="request"?"Solicitud registrada.":"Comentario agregado.");
  };
  const resolveComment=id=>{
    setState(s=>({...s,comments:s.comments.map(c=>c.id===id?{...c,resolved:true}:c)}));
    history("Comentario resuelto"); notify("Comentario resuelto.");
  };

  const stats={
    evidence:state.evidence.length,
    validated:Object.values(state.cells).filter(c=>c.status==="validated").length,
    requests:state.comments.filter(c=>c.type==="request"&&!c.resolved).length
  };

  const reset=()=>{
    if(confirm("¿Restablecer los datos locales de V0.2?")){setState(initialState());setCellKey(null);notify("Datos restablecidos.");}
  };

  return <div className="app">
    <header className="top">
      <div className="brand"><div className="mark">NC</div><div><small>NÚCLEO COLECTIVO</small><b>Matriz Transversal · V0.2</b></div></div>
      <div className="partners">Fundación Avina <i>×</i> Comic Relief</div>
      <div className="role"><small>Rol demo</small><select value={role} onChange={e=>setRole(e.target.value)}>{ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
    </header>
    <nav>
      {[
        ["experiences","Experiencias"],["matrix","Matriz"],["evidence","Evidencia"],["management","Gestión"]
      ].map(([id,l])=><button key={id} className={view===id?"on":""} onClick={()=>setView(id)}>{l}</button>)}
      <span/>
      <button onClick={()=>window.print()}>Imprimir</button>
      <button onClick={()=>{
        const rows=[["Experiencia","Variable","Contenido","Interpretación","Estado","Evidencias"]];
        Object.entries(state.cells).forEach(([k,c])=>{const [e,v]=k.split("::");rows.push([e,v,c.content,c.interpretation,STATUS[c.status],c.evidenceIds.length])});
        const csv=rows.map(r=>r.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(",")).join("\\n");
        const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\\ufeff"+csv],{type:"text/csv"}));a.download="avina-matriz-v02.csv";a.click();
      }}>CSV</button>
    </nav>

    <main>
      <section className="hero">
        <div><small>V0.2 · FLUJO OPERATIVO</small><h1>De la experiencia a la evidencia validada.</h1>
        <p>Prototipo colaborativo sin backend para probar el flujo metodológico antes de Supabase.</p></div>
        <div className="flow">{["Experiencia","Matriz","Celda","Evidencia","Comentario","Validación","Historial"].map((x,i)=><React.Fragment key={x}><em>{x}</em>{i<6&&<strong>→</strong>}</React.Fragment>)}</div>
      </section>
      <section className="stats"><div><b>6</b><span>experiencias</span></div><div><b>11</b><span>variables TDR</span></div><div><b>{stats.evidence}</b><span>evidencias</span></div><div><b>{stats.validated}</b><span>celdas validadas</span></div><div><b>{stats.requests}</b><span>cambios pendientes</span></div></section>

      {view==="experiences"&&<Experiences state={state} setState={setState} setView={setView}/>}
      {view==="matrix"&&<Matrix state={state} setState={setState} active={active} setCellKey={setCellKey}/>}
      {view==="evidence"&&<Evidence state={state}/>}
      {view==="management"&&<Management state={state} reset={reset}/>}

    </main>

    {cellKey&&<Drawer {...{cellKey,state,role,actor,updateCell,status,addEvidence,evidenceStatus,comment,resolveComment,close:()=>setCellKey(null)}}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>
}

function Experiences({state,setState,setView}){
  return <section><div className="head"><div><small>01 · EXPERIENCIAS</small><h2>Fichas independientes</h2></div><p>Cada iniciativa tendrá su propia hoja. Los equipos editan su experiencia y consultan el conjunto.</p></div>
  <div className="cards">{EXPERIENCES.map(e=>{
    const cs=VARIABLES.map(v=>state.cells[`${e.id}::${v}`]);const filled=cs.filter(c=>c.content.trim()).length;const valid=cs.filter(c=>c.status==="validated").length;
    return <article key={e.id}><div className="between"><label>{e.country}</label><label>{valid}/11 validadas</label></div><h3>{e.name}</h3><p>{e.team} · información por verificar</p><div className="bar"><i style={{width:`${valid/11*100}%`}}/></div><div className="meta"><span>{filled}/11 completas</span><span>{state.comments.filter(c=>c.key?.startsWith(e.id+"::")&&!c.resolved).length} pendientes</span></div><button className="primary" onClick={()=>{setState(s=>({...s,activeExperience:e.id}));setView("matrix")}}>Abrir experiencia →</button></article>
  })}</div></section>
}

function Matrix({state,setState,active,setCellKey}){
  const [q,setQ]=useState("");const [filter,setFilter]=useState("all");
  return <section><div className="head"><div><small>02 · MATRIZ</small><h2>{active.name}</h2></div><div className="tools"><input placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div></div>
  <div className="tabs">{EXPERIENCES.map(e=><button key={e.id} className={active.id===e.id?"sel":""} onClick={()=>setState(s=>({...s,activeExperience:e.id}))}>{e.name}<small>{e.country}</small></button>)}</div>
  <div className="matrix">{VARIABLES.map((v,i)=>{const k=`${active.id}::${v}`,c=state.cells[k];if(filter!=="all"&&c.status!==filter)return null;if(q&&!`${v} ${c.content}`.toLowerCase().includes(q.toLowerCase()))return null;return <button className="row" key={v} onClick={()=>setCellKey(k)}><span className="num">{String(i+1).padStart(2,"0")}</span><b>{v}</b><span className="preview">{c.content||<i>Por completar</i>}</span><span>{c.evidenceIds.length} ev.</span><label className={c.status}>{STATUS[c.status]}</label><strong>→</strong></button>})}</div>
  </section>
}

function Evidence({state}){
  return <section><div className="head"><div><small>03 · EVIDENCIA</small><h2>Repositorio vinculado</h2></div><p>V0.2 registra documentos, entrevistas y enlaces como metadatos. La carga persistente de archivos queda para Supabase Storage.</p></div>
  {state.evidence.length===0?<div className="empty big">No hay evidencias todavía. Abre una celda de la matriz para vincular la primera.</div>:<div className="evidence-grid">{state.evidence.map(e=><article key={e.id}><label>{e.kind}</label><h3>{e.title}</h3><p>{e.source||"Fuente por completar"}</p>{e.url&&<a href={e.url} target="_blank">Abrir enlace ↗</a>}<small>{e.addedBy} · {new Date(e.createdAt).toLocaleString("es-CO")}</small></article>)}</div>}
  </section>
}

function Management({state,reset}){
  return <section><div className="head"><div><small>04 · GESTIÓN</small><h2>Historial y control</h2></div><p>La trazabilidad es local en V0.2: sirve para probar la lógica antes de implementar Auth, DB, Storage y RLS.</p></div>
  <div className="manage"><article><h3>Estados por experiencia</h3>{EXPERIENCES.map(e=>{const v=VARIABLES.filter(x=>state.cells[`${e.id}::${x}`].status==="validated").length;return <div className="mrow" key={e.id}><span>{e.name}</span><div className="bar"><i style={{width:`${v/11*100}%`}}/></div><b>{v}/11</b></div>})}</article>
  <article><h3>Permisos simulados</h3><p><b>Núcleo:</b> editar, comentar, validar.</p><p><b>Avina:</b> editar, comentar, solicitar cambios, validar.</p><p><b>Equipos:</b> editar su propia experiencia; lectura del conjunto.</p><small>Estos permisos son simulados en el navegador, no son seguridad real.</small></article>
  <article className="history"><h3>Actividad reciente</h3>{state.history.length?state.history.slice(0,18).map(h=><div key={h.id}><b>{h.actor}</b><span>{h.action}</span><small>{new Date(h.timestamp).toLocaleString("es-CO")}</small></div>):<div className="empty">Sin actividad.</div>}</article></div>
  <div className="reset"><span><b>Datos locales de demostración</b><small>Se guardan en localStorage de este navegador.</small></span><button onClick={reset}>Restablecer V0.2</button></div>
  </section>
}

function Drawer({cellKey,state,role,actor,updateCell,status,addEvidence,evidenceStatus,comment,resolveComment,close}){
  const [expId,variable]=cellKey.split("::"), exp=EXPERIENCES.find(e=>e.id===expId), cell=state.cells[cellKey];
  const edit=canEdit(role,expId), evs=state.evidence.filter(e=>cell.evidenceIds.includes(e.id)), cs=state.comments.filter(c=>c.key===cellKey);
  const [txt,setTxt]=useState("");const [ev,setEv]=useState({title:"",source:"",kind:"Documento",url:"",notes:""});
  return <div className="backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><aside className="drawer">
    <header><div><small>CELDA · {variable}</small><h2>{exp.name}</h2></div><button onClick={close}>×</button></header>
    <div className="drawer-body">
      <section><label>Contenido / evidencia sintetizada</label><textarea disabled={!edit} value={cell.content} onChange={e=>updateCell(cellKey,{content:e.target.value},"Contenido editado")} placeholder="Información respaldada por fuentes…"/><small>Usar “Por completar”, “Por verificar” o “Sin evidencia disponible” cuando corresponda.</small></section>
      <section className="two"><div><label>Interpretación</label><textarea disabled={!edit} value={cell.interpretation} onChange={e=>updateCell(cellKey,{interpretation:e.target.value},"Interpretación editada")} placeholder="Lectura analítica separada del dato."/></div><div><label>Observaciones / preguntas</label><textarea disabled={!edit} value={cell.observations} onChange={e=>updateCell(cellKey,{observations:e.target.value},"Observación editada")} placeholder="Vacíos o preguntas de verificación."/></div></section>
      <section><div className="between"><label>Validación</label><span className={`state ${cell.status}`}>{STATUS[cell.status]}</span></div><div className="status-actions">{Object.entries(STATUS).map(([k,v])=><button disabled={!edit} className={cell.status===k?"chosen":""} onClick={()=>status(cellKey,k)} key={k}>{v}</button>)}</div></section>
      <section><div className="between"><label>Evidencia vinculada ({evs.length})</label><small>Documento · entrevista · enlace · otro</small></div>
        {evs.map(e=><div className="ev" key={e.id}><div><b>{e.title}</b><small>{e.kind} · {e.source}</small>{e.url&&<a href={e.url} target="_blank">Abrir ↗</a>}</div><select disabled={!edit} value={e.status} onChange={x=>evidenceStatus(e.id,x.target.value)}><option value="pending">Pendiente</option><option value="verified">Verificada</option><option value="insufficient">Insuficiente</option></select></div>)}
        {edit&&<div className="ev-form"><input placeholder="Título" value={ev.title} onChange={e=>setEv({...ev,title:e.target.value})}/><input placeholder="Fuente / persona / documento" value={ev.source} onChange={e=>setEv({...ev,source:e.target.value})}/><div className="inline"><select value={ev.kind} onChange={e=>setEv({...ev,kind:e.target.value})}><option>Documento</option><option>Entrevista</option><option>Enlace</option><option>Otro</option></select><input placeholder="URL opcional" value={ev.url} onChange={e=>setEv({...ev,url:e.target.value})}/></div><input placeholder="Nota de uso / contexto" value={ev.notes} onChange={e=>setEv({...ev,notes:e.target.value})}/><button onClick={()=>{if(!ev.title.trim())return;addEvidence(cellKey,ev);setEv({title:"",source:"",kind:"Documento",url:"",notes:""})}}>＋ Vincular evidencia</button></div>}
      </section>
      <section><label>Comentarios y solicitudes</label>{cs.length===0&&<div className="empty">Aún no hay comentarios.</div>}{cs.map(c=><div className={`comment ${c.resolved?"done":""}`} key={c.id}><b>{c.author}</b><small>{new Date(c.createdAt).toLocaleString("es-CO")}</small><p>{c.text}</p>{!c.resolved&&(role==="nucleo"||role==="avina")&&<button className="link" onClick={()=>resolveComment(c.id)}>Marcar resuelto</button>}</div>)}<textarea value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Comentario o solicitud de cambio…"/><div className="comment-actions"><button onClick={()=>{comment(cellKey,txt);setTxt("")}}>Comentar</button><button className="request" onClick={()=>{comment(cellKey,txt,"request");status(cellKey,"changes");setTxt("")}}>Solicitar cambios</button></div></section>
      <section className="last"><label>Última actualización</label><span>{fmt(cell.updatedAt)}</span></section>
    </div>
  </aside></div>
}

createRoot(document.getElementById("root")).render(<App/>);
