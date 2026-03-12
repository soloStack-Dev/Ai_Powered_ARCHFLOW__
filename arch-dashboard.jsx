import { useState, useRef, useCallback, useEffect } from "react";

// ─── Built-in Node Types ──────────────────────────────────────────────────────
const DEFAULT_NODE_TYPES = [
  { type: "frontend",      label: "Frontend",      icon: "⬡", color: "#00d4ff" },
  { type: "backend",       label: "Backend",       icon: "⬢", color: "#7c3aed" },
  { type: "database",      label: "Database",      icon: "◈", color: "#059669" },
  { type: "api_gateway",   label: "API Gateway",   icon: "◆", color: "#d97706" },
  { type: "microservice",  label: "Microservice",  icon: "◉", color: "#e11d48" },
  { type: "load_balancer", label: "Load Balancer", icon: "⬟", color: "#0891b2" },
  { type: "cache",         label: "Cache",         icon: "◈", color: "#c2410c" },
  { type: "queue",         label: "Queue",         icon: "⬛", color: "#4338ca" },
  { type: "cdn",           label: "CDN",           icon: "◎", color: "#065f46" },
  { type: "auth",          label: "Auth Service",  icon: "◑", color: "#9d174d" },
];

const INITIAL_NODES = [
  { id: "n1", type: "frontend",    x: 160, y: 180, label: "Frontend",    notes: "", annotation: null },
  { id: "n2", type: "api_gateway", x: 420, y: 180, label: "API Gateway", notes: "", annotation: null },
  { id: "n3", type: "backend",     x: 680, y: 100, label: "Backend",     notes: "", annotation: null },
  { id: "n4", type: "database",    x: 680, y: 280, label: "Database",    notes: "", annotation: null },
];
const INITIAL_EDGES = [
  { id: "e1", from: "n1", to: "n2" },
  { id: "e2", from: "n2", to: "n3" },
  { id: "e3", from: "n3", to: "n4" },
];

let nodeCounter = 10;
let edgeCounter = 10;
let customTypeCounter = 0;
const NODE_W = 152, NODE_H = 94;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTypeColor = (type, custom) => [...DEFAULT_NODE_TYPES, ...custom].find((t) => t.type === type)?.color ?? "#64748b";
const getTypeIcon  = (type, custom) => [...DEFAULT_NODE_TYPES, ...custom].find((t) => t.type === type)?.icon  ?? "◌";

function getCenter(node) { return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 }; }

function arrowPath(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx*dx+dy*dy)||1, r = 44;
  const sx = a.x+(dx/len)*r, sy = a.y+(dy/len)*r;
  const ex = b.x-(dx/len)*r, ey = b.y-(dy/len)*r;
  const mx = (sx+ex)/2, my = (sy+ey)/2 - Math.min(55, len*0.22);
  return `M ${sx},${sy} Q ${mx},${my} ${ex},${ey}`;
}

// ─── Anthropic API ────────────────────────────────────────────────────────────
async function runAnalysis(description, nodes, edges) {
  const diagram = {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, label: n.label, notes: n.notes })),
    edges: edges.map((e) => ({ from: e.from, to: e.to })),
  };
  const prompt = `You are a senior systems architect. Analyze this architecture diagram and return ONLY a valid JSON array — no markdown, no explanation.

User description: "${description}"
Diagram: ${JSON.stringify(diagram)}

Return format (cover every node):
[{"nodeId":"n1","label":"Short label","description":"One-sentence role","techSuggestion":"tech1, tech2","responsibilities":["r1","r2","r3"]}]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.map((b) => b.text||"").join("") ?? "";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

// ─── Custom Node Creator Modal ────────────────────────────────────────────────
const ICON_OPTIONS  = ["◌","★","✦","⬤","▲","▼","◀","▶","⬡","⬢","◈","◆","◉","⬟","◎","◑","⬛","✿","⊕","⊗","⚡","🔒","🌐","📦","🔧"];
const COLOR_OPTIONS = ["#00d4ff","#7c3aed","#059669","#d97706","#e11d48","#0891b2","#c2410c","#4338ca","#9d174d","#84cc16","#f43f5e","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ec4899","#14b8a6","#a855f7"];

function CustomNodeModal({ onClose, onCreate }) {
  const [label, setLabel]     = useState("");
  const [icon, setIcon]       = useState("◌");
  const [color, setColor]     = useState("#00d4ff");
  const [picker, setPicker]   = useState("#00d4ff");

  const submit = () => {
    if (!label.trim()) return;
    const type = `custom_${++customTypeCounter}`;
    onCreate({ type, label: label.trim(), icon, color });
    onClose();
  };

  return (
    <div style={mo.overlay} onClick={onClose}>
      <div style={mo.box} onClick={(e) => e.stopPropagation()}>
        <div style={mo.header}>
          <span style={{ color:"#00d4ff" }}>◈</span> CREATE CUSTOM NODE TYPE
          <button onClick={onClose} style={mo.xBtn}>✕</button>
        </div>

        {/* Label */}
        <label style={mo.lbl}>NODE LABEL</label>
        <input value={label} onChange={(e)=>setLabel(e.target.value)}
          placeholder="e.g. Message Broker" style={mo.inp}
          onKeyDown={(e)=>{ if(e.key==="Enter") submit(); }} autoFocus />

        {/* Icon */}
        <label style={mo.lbl}>ICON</label>
        <div style={mo.grid}>
          {ICON_OPTIONS.map((ic) => (
            <button key={ic} onClick={()=>setIcon(ic)} style={{
              ...mo.iconBtn, color: icon===ic ? color : "#475569",
              borderColor: icon===ic ? color : "#1e293b",
              background: icon===ic ? `${color}18` : "#050d1a",
            }}>{ic}</button>
          ))}
        </div>

        {/* Color swatches */}
        <label style={mo.lbl}>COLOR</label>
        <div style={mo.grid}>
          {COLOR_OPTIONS.map((c) => (
            <div key={c} onClick={()=>{ setColor(c); setPicker(c); }}
              style={{ ...mo.swatch, background:c,
                outline: color===c ? `2px solid ${c}` : "none", outlineOffset:2 }} />
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
          <input type="color" value={picker}
            onChange={(e)=>{ setPicker(e.target.value); setColor(e.target.value); }}
            style={mo.colorPicker} />
          <span style={{ fontSize:10, color:"#64748b", fontFamily:"JetBrains Mono" }}>{color}</span>
        </div>

        {/* Preview */}
        <label style={{ ...mo.lbl, marginTop:14 }}>PREVIEW</label>
        <div style={{ ...mo.preview, borderColor:color, borderLeftColor:color }}>
          <span style={{ color, fontSize:20, marginRight:10, lineHeight:1 }}>{icon}</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", fontFamily:"JetBrains Mono" }}>
              {label||"Node Label"}
            </div>
            <div style={{ fontSize:9, color, fontFamily:"JetBrains Mono", opacity:0.7, marginTop:2 }}>CUSTOM TYPE</div>
          </div>
        </div>

        <button onClick={submit} disabled={!label.trim()}
          style={{ ...mo.submitBtn, opacity: label.trim() ? 1 : 0.4 }}>
          ◈ CREATE NODE TYPE
        </button>
      </div>
    </div>
  );
}

const mo = {
  overlay:  { position:"fixed", inset:0, background:"#00000099", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" },
  box:      { background:"#0a1628", border:"1px solid #1e3a5f", borderRadius:12, padding:24, width:390, maxHeight:"90vh", overflowY:"auto" },
  header:   { fontSize:11, fontWeight:700, color:"#64748b", fontFamily:"JetBrains Mono", letterSpacing:2, marginBottom:18, display:"flex", alignItems:"center", gap:8 },
  xBtn:     { marginLeft:"auto", background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:16 },
  lbl:      { display:"block", fontSize:9, color:"#475569", fontFamily:"JetBrains Mono", letterSpacing:1.5, marginBottom:6, marginTop:14 },
  inp:      { width:"100%", background:"#050d1a", border:"1px solid #1e293b", borderRadius:6, color:"#f1f5f9", fontSize:12, padding:"8px 10px", fontFamily:"JetBrains Mono" },
  grid:     { display:"flex", flexWrap:"wrap", gap:5 },
  iconBtn:  { width:34, height:34, background:"#050d1a", border:"1px solid", borderRadius:6, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" },
  swatch:   { width:22, height:22, borderRadius:4, cursor:"pointer" },
  colorPicker:{ width:36, height:26, border:"1px solid #334155", borderRadius:4, cursor:"pointer", background:"none" },
  preview:  { display:"flex", alignItems:"center", background:"#0f172a", border:"1px solid", borderLeft:"3px solid", borderRadius:8, padding:"10px 14px", marginTop:4 },
  submitBtn:{ width:"100%", marginTop:18, padding:11, background:"linear-gradient(135deg,#0891b2,#7c3aed)", border:"none", borderRadius:6, color:"#fff", fontSize:11, fontWeight:700, letterSpacing:1.5, cursor:"pointer", fontFamily:"JetBrains Mono" },
};

// ─── Palette Row ──────────────────────────────────────────────────────────────
function PaletteRow({ t, isCustom, onDeleteType }) {
  const [hov, setHov] = useState(false);
  return (
    <div draggable onDragStart={(e) => e.dataTransfer.setData("nodeType", t.type)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center", padding:"7px 8px", borderRadius:6,
        background: hov ? "#0d1f36" : "#0a1628", border:"1px solid #1e293b",
        marginBottom:4, cursor:"grab", borderLeft:`2px solid ${t.color}`,
        transition:"background 0.12s", position:"relative" }}>
      <span style={{ color:t.color, fontSize:15, marginRight:7, flexShrink:0 }}>{t.icon}</span>
      <span style={{ fontSize:11, color:"#cbd5e1", fontFamily:"JetBrains Mono", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.label}</span>
      {isCustom && hov && (
        <button onClick={(e)=>{ e.stopPropagation(); onDeleteType(t.type); }}
          style={{ background:"#7f1d1d", border:"none", color:"#fca5a5", borderRadius:4,
            width:18, height:18, fontSize:9, cursor:"pointer", display:"flex",
            alignItems:"center", justifyContent:"center", flexShrink:0, marginLeft:3 }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Canvas Node ──────────────────────────────────────────────────────────────
function ArchNode({ node, selected, connecting, custom, onMouseDown, onConnectStart, onDelete, onUpdateLabel, onUpdateNotes }) {
  const [hov, setHov]           = useState(false);
  const [editLbl, setEditLbl]   = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [lbl, setLbl]           = useState(node.label);
  const [notes, setNotes]       = useState(node.notes || "");

  useEffect(()=>{ setLbl(node.label); },   [node.label]);
  useEffect(()=>{ setNotes(node.notes); }, [node.notes]);

  const color = getTypeColor(node.type, custom);
  const icon  = getTypeIcon(node.type, custom);
  const ann   = node.annotation;

  const saveLbl = () => {
    setEditLbl(false);
    const v = lbl.trim();
    if (v) onUpdateLabel(node.id, v); else setLbl(node.label);
  };
  const saveNotes = () => { setEditNotes(false); onUpdateNotes(node.id, notes); };

  const isEditing = editLbl || editNotes;

  return (
    <g transform={`translate(${node.x},${node.y})`}
      style={{ cursor: connecting ? "crosshair" : "grab" }}
      onMouseDown={(e)=>{ if(!isEditing) onMouseDown(e); }}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}>

      {/* outer glow ring */}
      {(selected||hov) && (
        <rect x="-5" y="-5" width={NODE_W+10} height={NODE_H+10} rx="15"
          fill="none" stroke={color} strokeWidth="1.5" opacity="0.35"
          style={{ filter:`drop-shadow(0 0 10px ${color})` }} />
      )}

      {/* card */}
      <rect x="0" y="0" width={NODE_W} height={NODE_H} rx="10"
        fill="#0f172a" stroke={selected ? color : "#1e293b"} strokeWidth={selected ? 1.8 : 1}
        style={{ filter: selected ? `drop-shadow(0 0 12px ${color}55)` : "none" }} />
      {/* accent stripe */}
      <rect x="0" y="0" width={NODE_W} height="3" rx="10" fill={color} />

      {/* Icon */}
      <text x="11" y="27" fontSize="15" fill={color} style={{ userSelect:"none" }}>{icon}</text>

      {/* ── Label (double-click to edit) ── */}
      {editLbl ? (
        <foreignObject x="30" y="9" width={NODE_W-38} height="22">
          <input xmlns="http://www.w3.org/1999/xhtml"
            value={lbl} autoFocus
            onChange={(e)=>setLbl(e.target.value)}
            onBlur={saveLbl}
            onKeyDown={(e)=>{ if(e.key==="Enter") saveLbl(); if(e.key==="Escape"){setLbl(node.label);setEditLbl(false);} }}
            style={{ width:"100%", background:"#0a1628", border:`1px solid ${color}`, borderRadius:4,
              color:"#f1f5f9", fontSize:11, padding:"2px 5px", fontFamily:"JetBrains Mono", fontWeight:700 }} />
        </foreignObject>
      ) : (
        <text x="30" y="26" fontSize="11" fontWeight="700" fill="#f1f5f9"
          fontFamily="'JetBrains Mono',monospace" style={{ userSelect:"none", cursor:"text" }}
          onDoubleClick={(e)=>{ e.stopPropagation(); setEditLbl(true); }}>
          {(ann ? ann.label : node.label).substring(0,17)}{(ann ? ann.label : node.label).length>17?"…":""}
        </text>
      )}

      {/* type badge */}
      <text x="30" y="38" fontSize="7.5" fill={color} opacity="0.65"
        fontFamily="'JetBrains Mono',monospace" style={{ userSelect:"none" }}>
        {node.type.replace(/_/g," ").toUpperCase().substring(0,24)}
      </text>

      {/* ── Notes field ── */}
      {editNotes ? (
        <foreignObject x="8" y="43" width={NODE_W-16} height={NODE_H-50}>
          <textarea xmlns="http://www.w3.org/1999/xhtml"
            value={notes} autoFocus
            onChange={(e)=>setNotes(e.target.value)}
            onBlur={saveNotes}
            onKeyDown={(e)=>{ if(e.key==="Escape"){setNotes(node.notes);setEditNotes(false);} }}
            placeholder="Notes…"
            style={{ width:"100%", height:"100%", background:"#050d1a", border:`1px solid ${color}55`,
              borderRadius:4, color:"#94a3b8", fontSize:8.5, padding:"3px 5px", resize:"none",
              fontFamily:"JetBrains Mono", lineHeight:1.4 }} />
        </foreignObject>
      ) : (
        <foreignObject x="8" y="43" width={NODE_W-16} height={NODE_H-50}>
          <div xmlns="http://www.w3.org/1999/xhtml"
            onClick={(e)=>{ e.stopPropagation(); setEditNotes(true); }}
            style={{ width:"100%", height:"100%", fontSize:8.5, lineHeight:1.45, padding:"3px 5px",
              color: notes ? "#64748b" : (hov ? "#1e3a5f" : "transparent"),
              fontFamily:"JetBrains Mono", cursor:"text", border:"1px solid transparent",
              borderRadius:4, overflow:"hidden", whiteSpace:"pre-wrap", wordBreak:"break-word",
              background: hov && !notes ? "#0a1628" : "transparent", transition:"all 0.1s" }}>
            {notes || (hov ? "Click to add notes…" : "")}
          </div>
        </foreignObject>
      )}

      {/* AI tech hint at bottom */}
      {ann && !editNotes && (
        <text x="8" y={NODE_H-3} fontSize="7.5" fill="#334155"
          fontFamily="'JetBrains Mono',monospace" style={{ userSelect:"none" }}>
          {ann.techSuggestion?.substring(0,26)}{ann.techSuggestion?.length>26?"…":""}
        </text>
      )}

      {/* ── Connect handle (right edge) ── */}
      <circle cx={NODE_W} cy={NODE_H/2} r="7" fill={color} opacity={hov ? 1 : 0.3}
        style={{ cursor:"crosshair" }}
        onMouseDown={(e)=>{ e.stopPropagation(); onConnectStart(e); }} />
      <text x={NODE_W-3.5} y={NODE_H/2+4} fontSize="10" fill="#050d1a"
        style={{ userSelect:"none", pointerEvents:"none" }}>+</text>

      {/* ── Delete button (top-right on hover) ── */}
      {(hov || selected) && (
        <g style={{ cursor:"pointer" }}
          onMouseDown={(e)=>{ e.stopPropagation(); onDelete(node.id); }}>
          <circle cx={NODE_W-9} cy="9" r="8.5" fill="#450a0a" stroke="#7f1d1d" strokeWidth="1" />
          <text x={NODE_W-12.5} y="13.5" fontSize="9" fill="#fca5a5"
            style={{ userSelect:"none", pointerEvents:"none" }}>✕</text>
        </g>
      )}

      {/* ── Annotation tooltip (hover) ── */}
      {ann && hov && !isEditing && (
        <g transform={`translate(${NODE_W+10},-8)`}>
          <rect x="0" y="0" width="230" height="120" rx="8"
            fill="#1e293b" stroke={color} strokeWidth="1" opacity="0.98"
            style={{ filter:`drop-shadow(0 4px 16px #00000088)` }} />
          <text x="12" y="20" fontSize="11" fontWeight="700" fill={color}
            fontFamily="'JetBrains Mono',monospace">{ann.label}</text>
          <foreignObject x="10" y="26" width="210" height="90">
            <div xmlns="http://www.w3.org/1999/xhtml"
              style={{ fontSize:9.5, fontFamily:"JetBrains Mono,monospace", lineHeight:1.5 }}>
              <div style={{ color:"#94a3b8", marginBottom:5 }}>{ann.description}</div>
              {ann.responsibilities?.slice(0,3).map((r,i)=>(
                <div key={i} style={{ color:"#64748b", marginBottom:2 }}>• {r}</div>
              ))}
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [nodes, setNodes]         = useState(INITIAL_NODES);
  const [edges, setEdges]         = useState(INITIAL_EDGES);
  const [custom, setCustom]       = useState([]);
  const [selected, setSelected]   = useState(null);
  const [connecting, setConn]     = useState(null);
  const [tempLine, setTempLine]   = useState(null);
  const [dragging, setDragging]   = useState(null);
  const [pan, setPan]             = useState({ x:0, y:0 });
  const [panStart, setPanStart]   = useState(null);
  const [desc, setDesc]           = useState("A web app with React frontend, Node.js backend, PostgreSQL database, and Redis cache behind an API Gateway with load balancing.");
  const [chat, setChat]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [aiOpen, setAiOpen]       = useState(true);
  const [showModal, setShowModal] = useState(false);
  const svgRef   = useRef(null);
  const chatEnd  = useRef(null);

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  const toSVG = useCallback((cx,cy)=>{
    const r = svgRef.current?.getBoundingClientRect();
    if(!r) return {x:0,y:0};
    return { x: cx-r.left-pan.x, y: cy-r.top-pan.y };
  },[pan]);

  // drop from palette
  const onDrop = useCallback((e)=>{
    e.preventDefault();
    const type = e.dataTransfer.getData("nodeType");
    if(!type) return;
    const c = toSVG(e.clientX, e.clientY);
    const meta = [...DEFAULT_NODE_TYPES,...custom].find(t=>t.type===type);
    setNodes(p=>[...p,{ id:`n${++nodeCounter}`, type, x:c.x-NODE_W/2, y:c.y-NODE_H/2, label:meta?.label??type, notes:"", annotation:null }]);
  },[toSVG,custom]);

  // node drag
  const onNodeDown = useCallback((e,id)=>{
    if(connecting) return;
    e.stopPropagation();
    setSelected(id);
    const c = toSVG(e.clientX, e.clientY);
    const n = nodes.find(n=>n.id===id);
    setDragging({ id, ox:c.x-n.x, oy:c.y-n.y });
  },[connecting,nodes,toSVG]);

  // connect
  const onConnStart = useCallback((e,fromId)=>{
    e.stopPropagation();
    setConn({ fromId });
    const c = toSVG(e.clientX, e.clientY);
    setTempLine({ x1:c.x, y1:c.y, x2:c.x, y2:c.y });
  },[toSVG]);

  const onSvgMove = useCallback((e)=>{
    const c = toSVG(e.clientX, e.clientY);
    if(dragging) setNodes(p=>p.map(n=>n.id===dragging.id?{...n,x:c.x-dragging.ox,y:c.y-dragging.oy}:n));
    if(connecting&&tempLine) setTempLine(t=>({...t,x2:c.x,y2:c.y}));
    if(panStart) setPan({ x:e.clientX-panStart.ox, y:e.clientY-panStart.oy });
  },[dragging,connecting,tempLine,panStart,toSVG]);

  const onSvgUp = useCallback((e)=>{
    setDragging(null);
    if(connecting){
      const c = toSVG(e.clientX, e.clientY);
      const tgt = nodes.find(n=>c.x>=n.x&&c.x<=n.x+NODE_W&&c.y>=n.y&&c.y<=n.y+NODE_H);
      if(tgt && tgt.id!==connecting.fromId && !edges.some(ed=>ed.from===connecting.fromId&&ed.to===tgt.id))
        setEdges(p=>[...p,{ id:`e${++edgeCounter}`, from:connecting.fromId, to:tgt.id }]);
      setConn(null); setTempLine(null);
    }
    setPanStart(null);
  },[connecting,nodes,edges,toSVG]);

  const onSvgDown = useCallback((e)=>{
    if(e.target===svgRef.current||e.target.tagName==="svg"){
      setSelected(null);
      setPanStart({ ox:e.clientX-pan.x, oy:e.clientY-pan.y });
    }
  },[pan]);

  const deleteNode = useCallback((id)=>{
    setNodes(p=>p.filter(n=>n.id!==id));
    setEdges(p=>p.filter(e=>e.from!==id&&e.to!==id));
    if(selected===id) setSelected(null);
  },[selected]);

  useEffect(()=>{
    const h=(e)=>{
      if((e.key==="Delete"||e.key==="Backspace")&&selected&&!["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))
        deleteNode(selected);
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[selected,deleteNode]);

  const removeCustomType = useCallback((type)=>{
    setCustom(p=>p.filter(t=>t.type!==type));
    const removed = nodes.filter(n=>n.type===type).map(n=>n.id);
    setNodes(p=>p.filter(n=>n.type!==type));
    setEdges(p=>p.filter(e=>!removed.includes(e.from)&&!removed.includes(e.to)));
  },[nodes]);

  const analyze = async()=>{
    if(!desc.trim()||nodes.length===0) return;
    setLoading(true);
    setChat(h=>[...h,{role:"user",text:desc}]);
    try{
      const anns = await runAnalysis(desc, nodes, edges);
      setNodes(p=>p.map(n=>{ const a=anns.find(x=>x.nodeId===n.id); return a?{...n,annotation:a}:n; }));
      const summary = anns.map(a=>`◈ ${a.label}\n  ${a.description}\n  Stack: ${a.techSuggestion}`).join("\n\n");
      setChat(h=>[...h,{ role:"assistant", text:`✦ ${anns.length} nodes annotated:\n\n${summary}` }]);
    }catch(err){
      setChat(h=>[...h,{role:"assistant",text:`⚠ ${err.message}`}]);
    }
    setLoading(false);
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;background:#0a0f1a}
        ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:4px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
        .cmsg{animation:fadeUp 0.2s ease both}
        .aipanel{animation:slideRight 0.22s ease both}
        input:focus,textarea:focus{outline:none!important}
      `}</style>

      {/* ── Header ── */}
      <header style={s.hdr}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22, color:"#00d4ff" }}>⬡</span>
          <span style={{ fontSize:19, fontWeight:800, letterSpacing:2, color:"#f1f5f9" }}>
            ARCH<span style={{color:"#00d4ff"}}>FLOW</span>
          </span>
          <span style={s.badge}>AI-POWERED</span>
        </div>
        <div style={{ fontSize:10, color:"#1e3a5f", letterSpacing:3, fontFamily:"JetBrains Mono" }}>
          SYSTEM ARCHITECTURE DESIGN STUDIO
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:11, color:"#334155", fontFamily:"JetBrains Mono" }}>
            {nodes.length}N · {edges.length}E
          </span>
          <span style={{ width:7,height:7,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e",display:"inline-block" }}/>
          {/* AI panel toggle button */}
          <button onClick={()=>setAiOpen(v=>!v)} style={{
            background: aiOpen ? "#0a1e3d" : "#0a1628",
            border:`1px solid ${aiOpen?"#0891b2":"#1e293b"}`,
            color: aiOpen ? "#00d4ff" : "#475569",
            borderRadius:6, padding:"5px 13px", fontSize:10, cursor:"pointer",
            fontFamily:"JetBrains Mono", letterSpacing:1, display:"flex", alignItems:"center", gap:7, transition:"all 0.2s"
          }}>
            <span style={{fontSize:13}}>⬡</span>
            {aiOpen ? "HIDE AI PANEL" : "SHOW AI PANEL"}
            <span style={{fontSize:11,opacity:0.6}}>{aiOpen?"◀":"▶"}</span>
          </button>
        </div>
      </header>

      <div style={s.body}>
        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
          <div style={s.secLabel}>NODE PALETTE</div>
          <div style={{ fontSize:8.5, color:"#1e3a5f", fontFamily:"JetBrains Mono", marginBottom:9 }}>
            Drag → canvas · Dbl-click = edit
          </div>
          {DEFAULT_NODE_TYPES.map(t=>(
            <PaletteRow key={t.type} t={t} isCustom={false} onDeleteType={()=>{}} />
          ))}

          {custom.length>0 && (
            <>
              <div style={{ ...s.secLabel, marginTop:12, color:"#7c3aed" }}>CUSTOM</div>
              {custom.map(t=>(
                <PaletteRow key={t.type} t={t} isCustom={true} onDeleteType={removeCustomType} />
              ))}
            </>
          )}

          <button onClick={()=>setShowModal(true)} style={s.newNodeBtn}>
            <span style={{fontSize:15}}>+</span> NEW NODE TYPE
          </button>

          <div style={s.divider} />
          <div style={s.secLabel}>SHORTCUTS</div>
          {[["Dbl-click","Edit label"],["Click notes","Edit notes"],["+ handle","Connect"],["✕ badge","Delete node"],["Del key","Delete selected"],["Drag bg","Pan canvas"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
              <code style={s.kbd}>{k}</code>
              <span style={{ fontSize:9, color:"#334155", fontFamily:"JetBrains Mono" }}>{v}</span>
            </div>
          ))}
        </aside>

        {/* ── Canvas ── */}
        <main style={s.canvas} onDrop={onDrop} onDragOver={e=>e.preventDefault()}>
          <svg ref={svgRef} width="100%" height="100%"
            style={{ cursor: panStart?"grabbing":"default" }}
            onMouseMove={onSvgMove} onMouseUp={onSvgUp} onMouseDown={onSvgDown}>
            <defs>
              <marker id="arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0,10 3.5,0 7" fill="#1e293b"/>
              </marker>
              <marker id="arrs" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0,10 3.5,0 7" fill="#00d4ff"/>
              </marker>
            </defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"
              x={pan.x%28} y={pan.y%28}>
              <circle cx="1" cy="1" r="0.65" fill="#1a2744"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#dots)"/>

            <g transform={`translate(${pan.x},${pan.y})`}>
              {edges.map(ed=>{
                const fn=nodes.find(n=>n.id===ed.from), tn=nodes.find(n=>n.id===ed.to);
                if(!fn||!tn) return null;
                const fc=getCenter(fn), tc=getCenter(tn);
                const act=selected===ed.from||selected===ed.to;
                return (
                  <path key={ed.id} d={arrowPath(fc,tc)} fill="none"
                    stroke={act?"#00d4ff":"#1e293b"} strokeWidth={act?2:1.5}
                    strokeDasharray={act?"none":"5,3"}
                    markerEnd={act?"url(#arrs)":"url(#arr)"}
                    style={{ transition:"all 0.18s" }}/>
                );
              })}
              {tempLine&&(
                <line x1={tempLine.x1} y1={tempLine.y1} x2={tempLine.x2} y2={tempLine.y2}
                  stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrs)" opacity="0.6"/>
              )}
              {nodes.map(n=>(
                <ArchNode key={n.id} node={n} selected={selected===n.id}
                  connecting={!!connecting} custom={custom}
                  onMouseDown={e=>onNodeDown(e,n.id)}
                  onConnectStart={e=>onConnStart(e,n.id)}
                  onDelete={deleteNode}
                  onUpdateLabel={(id,v)=>setNodes(p=>p.map(n=>n.id===id?{...n,label:v}:n))}
                  onUpdateNotes={(id,v)=>setNodes(p=>p.map(n=>n.id===id?{...n,notes:v}:n))}
                />
              ))}
            </g>
          </svg>
          {nodes.length===0&&(
            <div style={s.hint}>Drop nodes from the palette<br/>or create a custom node type</div>
          )}
        </main>

        {/* ── AI Panel ── */}
        {aiOpen && (
          <aside style={s.aiPanel} className="aipanel">
            <div style={s.aiTitle}>
              <span style={{color:"#00d4ff",fontSize:15}}>⬡</span>
              <span>AI ARCHITECT</span>
              <button onClick={()=>setAiOpen(false)} style={s.aiClose}>✕</button>
            </div>

            <div style={s.chatArea}>
              {chat.length===0&&(
                <div style={s.chatEmpty}>
                  Describe your architecture and click<br/>
                  <strong style={{color:"#00d4ff"}}>Analyze Architecture</strong><br/>
                  to annotate every node with AI.
                </div>
              )}
              {chat.map((m,i)=>(
                <div key={i} className="cmsg" style={{
                  padding:"10px 12px", borderRadius:8, border:"1px solid",
                  maxWidth:"95%", alignSelf: m.role==="user"?"flex-end":"flex-start",
                  background: m.role==="user"?"#1e3a5f":"#0f172a",
                  borderColor: m.role==="user"?"#0891b2":"#1e293b",
                }}>
                  <div style={{ fontSize:8.5, color:"#334155", marginBottom:3, fontFamily:"JetBrains Mono" }}>
                    {m.role==="user"?"YOU":"⬡ AI ARCHITECT"}
                  </div>
                  <div style={{ fontSize:11.5, color:"#cbd5e1", whiteSpace:"pre-wrap", lineHeight:1.65 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading&&(
                <div style={{ fontSize:11, color:"#334155", fontFamily:"JetBrains Mono", padding:"4px 0" }}>
                  <span style={{color:"#00d4ff",animation:"pulse 1s infinite"}}>⬡</span> Analyzing…
                </div>
              )}
              <div ref={chatEnd}/>
            </div>

            <div style={s.inputZone}>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)}
                placeholder="Describe your system architecture in plain English…"
                style={s.ta} rows={5}/>
              <button onClick={analyze} disabled={loading} style={s.analyzeBtn}>
                {loading
                  ? <span style={{animation:"pulse 1s infinite"}}>ANALYZING…</span>
                  : "⬡ ANALYZE ARCHITECTURE"}
              </button>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setNodes([]);setEdges([]);setChat([]);}} style={s.clearBtn}>CLEAR CANVAS</button>
                <button onClick={()=>setChat([])} style={s.clearBtn}>CLEAR CHAT</button>
              </div>
            </div>
          </aside>
        )}

        {/* collapsed tab */}
        {!aiOpen&&(
          <button onClick={()=>setAiOpen(true)} style={s.collapsedTab}>
            ⬡ AI ARCHITECT
          </button>
        )}
      </div>

      {showModal&&(
        <CustomNodeModal
          onClose={()=>setShowModal(false)}
          onCreate={(t)=>setCustom(p=>[...p,t])}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root:   { display:"flex", flexDirection:"column", height:"100vh", width:"100vw", background:"#030712", color:"#f1f5f9", overflow:"hidden", fontFamily:"'Syne',sans-serif" },
  hdr:    { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", height:50, borderBottom:"1px solid #0c1829", background:"#050d1a", flexShrink:0, gap:8 },
  badge:  { fontSize:8.5, color:"#00d4ff", border:"1px solid #00d4ff33", padding:"2px 6px", borderRadius:3, letterSpacing:1.5, fontFamily:"JetBrains Mono" },
  body:   { display:"flex", flex:1, overflow:"hidden", position:"relative" },
  sidebar:{ width:168, background:"#050d1a", borderRight:"1px solid #0c1829", padding:"14px 9px", overflowY:"auto", flexShrink:0, display:"flex", flexDirection:"column" },
  secLabel:{ fontSize:8.5, color:"#334155", letterSpacing:2, fontFamily:"JetBrains Mono", marginBottom:7 },
  newNodeBtn:{ marginTop:10, padding:"8px 0", background:"linear-gradient(135deg,#0a1e3d22,#1e104022)", border:"1px dashed #2d1d5e", borderRadius:6, color:"#7c3aed", fontSize:10, cursor:"pointer", fontFamily:"JetBrains Mono", letterSpacing:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.15s" },
  divider:{ height:1, background:"#0c1829", margin:"13px 0" },
  kbd:    { fontSize:8.5, color:"#0891b2", background:"#0a1e3d", padding:"2px 5px", borderRadius:3, fontFamily:"JetBrains Mono", border:"1px solid #1e3a5f" },
  canvas: { flex:1, position:"relative", overflow:"hidden", background:"#030712" },
  hint:   { position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", color:"#0f2039", fontSize:13, fontFamily:"JetBrains Mono", pointerEvents:"none", textAlign:"center", lineHeight:2.2 },
  aiPanel:{ width:295, background:"#050d1a", borderLeft:"1px solid #0c1829", display:"flex", flexDirection:"column", flexShrink:0 },
  aiTitle:{ padding:"12px 14px", fontSize:11, fontWeight:700, letterSpacing:2, borderBottom:"1px solid #0c1829", color:"#475569", fontFamily:"JetBrains Mono", display:"flex", alignItems:"center", gap:8 },
  aiClose:{ marginLeft:"auto", background:"none", border:"none", color:"#334155", cursor:"pointer", fontSize:15 },
  chatArea:{ flex:1, overflowY:"auto", padding:10, display:"flex", flexDirection:"column", gap:9 },
  chatEmpty:{ fontSize:11, color:"#1e3a5f", textAlign:"center", marginTop:28, lineHeight:2.1, fontFamily:"JetBrains Mono" },
  inputZone:{ padding:10, borderTop:"1px solid #0c1829", display:"flex", flexDirection:"column", gap:7 },
  ta:     { width:"100%", background:"#0a0f1a", border:"1px solid #1e293b", borderRadius:6, color:"#cbd5e1", fontSize:11.5, padding:"9px 10px", resize:"none", fontFamily:"JetBrains Mono", lineHeight:1.6 },
  analyzeBtn:{ width:"100%", padding:11, background:"linear-gradient(135deg,#0891b2,#7c3aed)", border:"none", borderRadius:6, color:"#fff", fontSize:10, fontWeight:700, letterSpacing:1.5, cursor:"pointer", fontFamily:"JetBrains Mono" },
  clearBtn:{ flex:1, padding:6, background:"#0a1628", border:"1px solid #1e293b", borderRadius:5, color:"#334155", fontSize:8.5, cursor:"pointer", fontFamily:"JetBrains Mono", letterSpacing:1 },
  collapsedTab:{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", background:"#0a1628", border:"1px solid #1e3a5f", borderRight:"none", color:"#00d4ff", borderRadius:"8px 0 0 8px", padding:"18px 7px", cursor:"pointer", fontFamily:"JetBrains Mono", fontSize:8.5, letterSpacing:1.5, writingMode:"vertical-rl", textOrientation:"mixed", zIndex:10 },
};
