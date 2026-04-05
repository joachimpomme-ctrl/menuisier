import { useState, useMemo, useRef, useEffect } from "react";

const MATERIALS = {
  cp_bouleau: {
    name: "Contreplaqué bouleau", short: "CP bouleau", density: 680, flexMPa: 40,
    thicknesses: [6, 10, 12, 15, 18, 22, 25], defaultThickness: 18,
    panels: [{ w: 250, h: 125 }, { w: 305, h: 152 }],
    maxSpan18: 80, screwHolding: "excellent", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage 120→180, vernis ou huile",
    assembly: ["Tourillons Ø8 + colle vinylique D3", "Vis 4×40 en renfort", "Fond agrafé CP peuplier 6 mm"],
    routing: "Excellent — fraise droite Ø12, passes de 4 mm max",
    finish: ["Vernis PU mat", "Huile dure", "Peinture (après sous-couche)", "Teinte + vernis"],
    warnings: [],
    notes: "Référence meuble sur mesure. Chant esthétique sans placage.",
  },
  cp_peuplier: {
    name: "Contreplaqué peuplier", short: "CP peuplier", density: 450, flexMPa: 25,
    thicknesses: [3, 5, 6, 8, 10, 12, 15, 18], defaultThickness: 18,
    panels: [{ w: 250, h: 122 }],
    maxSpan18: 65, screwHolding: "bon", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage 120→180, vernis ou peinture",
    assembly: ["Tourillons Ø8 + colle", "Vis 4×40", "Fond agrafé"],
    routing: "Bon — contre-plaque en sortie pour éviter éclats",
    finish: ["Peinture", "Vernis", "Huile"],
    warnings: ["Résistance flexion inférieure au bouleau — réduire la portée libre"],
    notes: "Plus léger, moins résistant. Bon pour fonds et étagères peu chargées.",
  },
  cp_okoume: {
    name: "Contreplaqué okoumé", short: "CP okoumé", density: 500, flexMPa: 30,
    thicknesses: [4, 5, 6, 8, 10, 12, 15, 18, 22, 25], defaultThickness: 18,
    panels: [{ w: 250, h: 122 }, { w: 310, h: 153 }],
    maxSpan18: 70, screwHolding: "bon", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage 120→180, vernis marin ou huile",
    assembly: ["Tourillons Ø8 + colle D3", "Vis 4×40", "Fond agrafé"],
    routing: "Bon — bois tendre, avance régulière",
    finish: ["Vernis marin", "Huile dure", "Lasure", "Peinture"],
    warnings: [],
    notes: "Bel aspect chaud. Résistance humidité (avec traitement).",
  },
  mdf: {
    name: "MDF (Medium)", short: "MDF", density: 750, flexMPa: 30,
    thicknesses: [3, 6, 10, 12, 16, 18, 19, 22, 25], defaultThickness: 18,
    panels: [{ w: 280, h: 207 }, { w: 244, h: 122 }],
    maxSpan18: 60, screwHolding: "moyen", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage fin + apprêt obligatoire avant peinture",
    assembly: ["Vis + colle obligatoire (vis seules = arrachement)", "Pré-perçage systématique", "Tourillons Ø8 + colle", "Excentriques recommandés", "Fond cloué ou agrafé"],
    routing: "Très bon — finition nette, masque FFP2 obligatoire (poussière fine)",
    finish: ["Peinture (idéal)", "Laque", "Placage + vernis"],
    warnings: ["Vis dans les chants : tenue médiocre, pré-perçage + colle obligatoire", "Ne supporte pas l'humidité", "Poids élevé (~750 kg/m³)"],
    notes: "Homogène, facile à usiner. Surface idéale pour peinture laquée.",
  },
  melamine: {
    name: "Mélaminé (particules)", short: "Mélaminé", density: 650, flexMPa: 14,
    thicknesses: [8, 16, 18, 22, 25], defaultThickness: 18,
    panels: [{ w: 280, h: 207 }, { w: 244, h: 122 }],
    maxSpan18: 55, screwHolding: "faible", dowels: false, edgeBanding: true,
    edgeFinish: "Chant mélaminé thermocollant obligatoire (fer à repasser)",
    assembly: ["Excentriques + tourillons (JAMAIS de vis dans le chant)", "Pré-perçage 3 mm face", "Colle contact en renfort", "Fond HDF 3 mm en rainure"],
    routing: "Médiocre — éclats fréquents, fraise spéciale stratifié",
    finish: ["Aucune (fini d'usine)", "Chant thermocollant assorti"],
    warnings: ["INTERDIT : vis dans les chants (arrachement garanti)", "Flexion importante au-delà de 60 cm sans renfort", "Chant thermocollant obligatoire sur tranches visibles"],
    notes: "Économique, fini d'usine. Assemblage par excentriques uniquement.",
  },
  osb: {
    name: "OSB3", short: "OSB", density: 600, flexMPa: 20,
    thicknesses: [9, 12, 15, 18, 22], defaultThickness: 18,
    panels: [{ w: 250, h: 125 }],
    maxSpan18: 60, screwHolding: "moyen", dowels: false, edgeBanding: false,
    edgeFinish: "Chant brut — ponçage grossier, pas de finition fine",
    assembly: ["Vis à bois 4×50", "Colle PU pour joints", "Pas de tourillons (structure hétérogène)"],
    routing: "Médiocre — copeaux arrachés, finition grossière",
    finish: ["Vernis mat (industriel)", "Peinture (ponçage + apprêt)", "Brut"],
    warnings: ["Esthétique industrielle uniquement", "Chants grossiers non plaquables"],
    notes: "Style industriel assumé. Économique.",
  },
};

const PIECE_COLORS = { joue: "#3b82f6", "tablette-fixe": "#10b981", "tablette-reglable": "#f59e0b", bandeau: "#8b5cf6", autre: "#ec4899" };
const BODY_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"];
const uid = () => Math.random().toString(36).slice(2, 8);

const mkState = (mk) => {
  const m = MATERIALS[mk], p = m.panels[0];
  return {
    materialKey: mk,
    project: { name: "Bibliothèque Bureau", wallWidth: 250, ceilingHeight: 254, plinthHeight: 13, plinthDepth: 2 },
    panel: { width: p.w, height: p.h, thickness: m.defaultThickness / 10 },
    kerf: 0.3,
    bodies: [
      { id: "left", name: "Corps gauche", width: 100, depth: 26, pieces: [
        { id: uid(), name: "Joue G — gauche bas", length: 180, width: 26, qty: 1, type: "joue" },
        { id: uid(), name: "Joue G — gauche haut", length: 72, width: 26, qty: 1, type: "joue" },
        { id: uid(), name: "Joue G — droite bas", length: 180, width: 26, qty: 1, type: "joue" },
        { id: uid(), name: "Joue G — droite haut", length: 72, width: 26, qty: 1, type: "joue" },
        { id: uid(), name: "Tablette fixe G", length: 96.4, width: 26, qty: 2, type: "tablette-fixe" },
        { id: uid(), name: "Tablette réglable G", length: 96.4, width: 26, qty: 4, type: "tablette-reglable" },
      ]},
      { id: "right", name: "Corps droit", width: 150, depth: 36, pieces: [
        { id: uid(), name: "Joue D — gauche bas", length: 180, width: 36, qty: 1, type: "joue" },
        { id: uid(), name: "Joue D — gauche haut", length: 72, width: 36, qty: 1, type: "joue" },
        { id: uid(), name: "Joue D — droite bas", length: 180, width: 36, qty: 1, type: "joue" },
        { id: uid(), name: "Joue D — droite haut", length: 72, width: 36, qty: 1, type: "joue" },
        { id: uid(), name: "Tablette fixe D", length: 148.4, width: 36, qty: 2, type: "tablette-fixe" },
        { id: uid(), name: "Tablette réglable D", length: 148.4, width: 36, qty: 5, type: "tablette-reglable" },
      ]},
    ],
  };
};

function packPieces(pieces, pW, pH, kerf) {
  const exp = [];
  pieces.forEach((p) => { for (let i = 0; i < p.qty; i++) exp.push({ ...p, uid: `${p.id}_${i}`, cW: p.length + kerf, cH: p.width + kerf }); });
  exp.sort((a, b) => Math.max(b.cW, b.cH) - Math.max(a.cW, a.cH));
  const bins = [];
  const tryPlace = (bin, pc) => {
    const oris = [{ w: pc.cW, h: pc.cH, r: false }, { w: pc.cH, h: pc.cW, r: true }];
    for (const sh of bin.shelves) for (const o of oris) { if (sh.rem >= o.w && sh.h >= o.h) { bin.pl.push({ ...pc, x: pW - sh.rem, y: sh.y, pw: o.w, ph: o.h, rotated: o.r }); sh.rem -= o.w; return true; } }
    const sy = bin.shelves.reduce((s, sh) => s + sh.h, 0);
    for (const o of oris) { if (o.w <= pW && sy + o.h <= pH) { bin.shelves.push({ y: sy, h: o.h, rem: pW - o.w }); bin.pl.push({ ...pc, x: 0, y: sy, pw: o.w, ph: o.h, rotated: o.r }); return true; } }
    return false;
  };
  for (const pc of exp) {
    let ok = false;
    for (const bn of bins) { if (tryPlace(bn, pc)) { ok = true; break; } }
    if (!ok) { const nb = { shelves: [], pl: [] }; tryPlace(nb, pc); bins.push(nb); }
  }
  return bins;
}

function validate(st) {
  const e = [], w = [];
  const { project: pr, panel: pn, bodies: bs, materialKey: mk } = st;
  const mat = MATERIALS[mk], uH = pr.ceilingHeight - pr.plinthHeight;
  const tW = bs.reduce((s, b) => s + b.width, 0);
  if (tW > pr.wallWidth) e.push(`Largeur totale (${tW} cm) > mur (${pr.wallWidth} cm)`);
  else if (tW < pr.wallWidth) w.push(`Espace résiduel ${pr.wallWidth - tW} cm sur le mur`);
  mat.warnings.forEach((x) => w.push(`[${mat.short}] ${x}`));
  bs.forEach((b) => {
    const expT = +(b.width - 2 * pn.thickness).toFixed(1);
    const jps = b.pieces.filter((p) => p.type === "joue"), tps = b.pieces.filter((p) => p.type.startsWith("tablette"));
    for (let i = 0; i < jps.length - 1; i += 2) { const sm = jps[i].length + (jps[i+1]?.length||0); if (Math.abs(sm - uH) > 0.5) e.push(`${b.name} : joues "${jps[i].name}" + "${jps[i+1]?.name}" = ${sm} cm ≠ ${uH} cm`); }
    tps.forEach((p) => { if (Math.abs(p.length - expT) > 0.2) w.push(`${b.name} : "${p.name}" = ${p.length} cm, attendu ${expT} cm`); });
    tps.forEach((p) => { if (p.length > mat.maxSpan18) w.push(`[${mat.short}] "${p.name}" portée ${p.length} cm > max ${mat.maxSpan18} cm — flexion`); });
    jps.forEach((p) => { if (Math.abs(p.width - b.depth) > 0.2) w.push(`${b.name} : "${p.name}" prof. ${p.width} ≠ corps ${b.depth}`); });
    tps.forEach((p) => { if (p.width > b.depth) e.push(`${b.name} : "${p.name}" prof. ${p.width} > corps ${b.depth}`); });
    b.pieces.forEach((p) => { const mx = Math.max(p.length, p.width), mn = Math.min(p.length, p.width); if (mx > Math.max(pn.width, pn.height) || mn > Math.min(pn.width, pn.height)) e.push(`"${p.name}" (${p.length}×${p.width}) > panneau`); });
    if (b.pieces.filter((p) => p.type === "tablette-fixe").reduce((s, p) => s + p.qty, 0) < 2) w.push(`${b.name} : < 2 tablettes fixes`);
    if ((mk === "melamine" || mk === "osb") && b.pieces.some((p) => p.type === "tablette-reglable")) w.push(`[${mat.short}] ${b.name} : crémaillères déconseillées — taquets métalliques`);
  });
  return { errors: e, warnings: w };
}

function genSteps(st) {
  const { project: pr, panel: pn, bodies: bs, materialKey: mk } = st;
  const mat = MATERIALS[mk], uH = pr.ceilingHeight - pr.plinthHeight, steps = [];
  steps.push({ title: "1. Relevé de cotes terrain", items: [`Largeur mur 4 pts — projet : ${pr.wallWidth} cm`, `Hauteur 4 pts — projet : ${pr.ceilingHeight} cm`, `Aplomb pilier au niveau laser`, `Planéité sol — marquer points hauts`, `Hauteur utile : ${pr.ceilingHeight} − ${pr.plinthHeight} = ${uH} cm`] });
  steps.push({ title: `2. Débit — ${mat.name} ${pn.thickness*10} mm`, items: [`Panneau ${pn.width}×${pn.height} cm`, `Découpe grands panneaux en magasin`, `Finitions scie circulaire sur rail`, ...(mk==="melamine"?["⚠ Lame trapézoïdale anti-éclats"]:[]), ...(mk==="mdf"?["⚠ Masque FFP2 obligatoire"]:[]), ...bs.flatMap(b=>b.pieces.map(p=>`  → ${p.name} : ${p.length}×${p.width} cm ×${p.qty}`))] });
  if (mk !== "melamine" && mk !== "osb") {
    steps.push({ title: "3. Rainures crémaillères", items: [`${mat.routing}`, `Fraise Ø12, prof 8 mm, 2-3 passes de 4 mm`, `Guide parallèle obligatoire`, ...bs.map(b=>`${b.name} : 4 rainures à 5 cm et ${b.depth-5} cm du bord`), `Marquer haut/bas + int./ext.`] });
  } else {
    steps.push({ title: "3. Perçages taquets", items: [`Perçages Ø5, entraxe 32 mm, prof 12 mm`, `Gabarit de perçage obligatoire`, ...bs.map(b=>`${b.name} : 2 rangées/joue à 5 cm et ${b.depth-5} cm`)] });
  }
  steps.push({ title: "4. Découpe plinthe", items: [`Entaille ${pr.plinthHeight}×${pr.plinthDepth} cm bas de chaque joue`, `Scie sauteuse lame fine + ponçage`] });
  bs.forEach((b,i) => {
    const fN = b.pieces.filter(p=>p.type==="tablette-fixe").reduce((s,p)=>s+p.qty,0);
    const rN = b.pieces.filter(p=>p.type==="tablette-reglable").reduce((s,p)=>s+p.qty,0);
    steps.push({ title: `5.${i+1}. Assemblage ${b.name}`, items: [`Joues bas à plat sur tréteaux`, ...mat.assembly, `${fN} tablettes fixes : basse ~${uH-45} cm / haute 180 cm`, `Joues hautes — tablette fixe couvre le joint`, `Équerrage diagonales (tol. 2 mm)`, `Fond 6 mm agrafé`, ...(mat.edgeBanding?["⚠ Chants thermocollants AVANT assemblage"]:[]), `${rN} tablettes réglables : ne pas monter`] });
  });
  steps.push({ title: "6. Mise en place", items: [`Corps gauche contre le pilier`, `Verticalité niveau 2 axes — caler`, `2-3 vis/corps (chevilles béton Ø8)`, `Corps droit accolé — verticalité — fixation`, `Décalage prof. ${bs.length>=2?bs[1].depth-bs[0].depth:"?"} cm intentionnel`] });
  steps.push({ title: "7. Finitions", items: [`Bandeaux plafond ajustés au compas`, `Tasseau collé-vissé plafond`, `Jonction 2 corps : montant L ou biseau`, `Tablettes réglables en place`, mat.edgeFinish, `Options : ${mat.finish.join(", ")}`] });
  return steps;
}

export default function App() {
  const [st, setSt] = useState(mkState("cp_bouleau"));
  const [tab, setTab] = useState("structure");
  const [ep, setEp] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [ci, setCi] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const endRef = useRef(null);
  const fRef = useRef(null);

  const mat = MATERIALS[st.materialKey];
  const allP = useMemo(() => st.bodies.flatMap(b => b.pieces.map(p => ({...p, bodyName: b.name, bodyId: b.id}))), [st.bodies]);
  const totP = useMemo(() => allP.reduce((s,p) => s+p.qty, 0), [allP]);
  const cp = useMemo(() => packPieces(allP, st.panel.width, st.panel.height, st.kerf), [allP, st.panel, st.kerf]);
  const val = useMemo(() => validate(st), [st]);
  const steps = useMemo(() => genSteps(st), [st]);
  const uH = st.project.ceilingHeight - st.project.plinthHeight;

  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  const up = (k,v) => setSt(s => ({...s, project:{...s.project,[k]:v}}));
  const upP = (k,v) => setSt(s => ({...s, panel:{...s.panel,[k]:v}}));
  const upB = (id,k,v) => setSt(s => ({...s, bodies:s.bodies.map(b=>b.id===id?{...b,[k]:v}:b)}));
  const upPc = (bid,pid,k,v) => setSt(s => ({...s, bodies:s.bodies.map(b=>b.id===bid?{...b,pieces:b.pieces.map(p=>p.id===pid?{...p,[k]:v}:p)}:b)}));
  const addPc = bid => setSt(s => ({...s, bodies:s.bodies.map(b=>b.id===bid?{...b,pieces:[...b.pieces,{id:uid(),name:"Nouvelle pièce",length:50,width:b.depth,qty:1,type:"autre"}]}:b)}));
  const rmPc = (bid,pid) => setSt(s => ({...s, bodies:s.bodies.map(b=>b.id===bid?{...b,pieces:b.pieces.filter(p=>p.id!==pid)}:b)}));
  const addB = () => setSt(s => ({...s, bodies:[...s.bodies,{id:uid(),name:`Corps ${s.bodies.length+1}`,width:80,depth:30,pieces:[]}]}));
  const rmB = id => setSt(s => ({...s, bodies:s.bodies.filter(b=>b.id!==id)}));
  const chgMat = k => { const m=MATERIALS[k], p=m.panels[0]; setSt(s => ({...s, materialKey:k, panel:{...s.panel, width:p.w, height:p.h, thickness:m.defaultThickness/10}})); };

  const handlePdf = async e => {
    const f = e.target.files?.[0]; if(!f) return;
    const b64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(f); });
    setPdfs(d => [...d, {name:f.name, data:b64}]);
  };

  const send = async () => {
    if(!ci.trim()||busy) return;
    const um = ci.trim(); setCi(""); const nm = [...msgs, {role:"user",content:um}]; setMsgs(nm); setBusy(true);
    try {
      const sys = `Tu es un assistant menuiserie expert intégré à un outil de conception de bibliothèque. Réponds en français, concis et technique.

PROJET : mur ${st.project.wallWidth}×${st.project.ceilingHeight} cm, plinthe ${st.project.plinthHeight} cm, hauteur utile ${uH} cm
${st.bodies.length} corps : ${st.bodies.map(b=>`${b.name} ${b.width}×${b.depth}cm (${b.pieces.length} pièces)`).join(" / ")}
Total : ${totP} pièces → ${cp.length} panneaux

MATÉRIAU : ${mat.name} — densité ${mat.density}, flexion ${mat.flexMPa} MPa, portée max ${mat.maxSpan18} cm, vis: ${mat.screwHolding}, tourillons: ${mat.dowels?"oui":"non"}
Assemblage : ${mat.assembly.join(" / ")}
${mat.warnings.length ? "⚠ "+mat.warnings.join(" | ") : ""}

PIÈCES :
${st.bodies.map(b=>b.pieces.map(p=>`${b.name} > ${p.name}: ${p.length}×${p.width} ×${p.qty} [${p.type}]`).join("\n")).join("\n")}

VALIDATION : ${val.errors.length} err, ${val.warnings.length} warn
${val.errors.map(e=>"❌ "+e).join("\n")}
${val.warnings.map(w=>"⚠ "+w).join("\n")}

${pdfs.length ? `${pdfs.length} PDF de référence fournis — utilise-les.` : ""}
Calcul flexion : f = (5·q·L⁴)/(384·E·I), I = b·h³/12. Si modification recommandée, donne la valeur exacte.`;

      const apiMsgs = nm.map((m,i) => {
        if (m.role==="user" && pdfs.length>0 && i===nm.length-1) {
          return {role:"user", content:[...pdfs.map(d=>({type:"document",source:{type:"base64",media_type:"application/pdf",data:d.data}})),{type:"text",text:m.content}]};
        }
        return {role:m.role, content:m.content};
      });

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({model:"claude-sonnet-4-20250514", max_tokens:1000, system:sys, messages:apiMsgs}),
      });
      const d = await r.json();
      const reply = d.content?.map(c=>c.text||"").filter(Boolean).join("\n") || "Erreur de réponse.";
      setMsgs(m => [...m, {role:"assistant", content:reply}]);
    } catch(err) { setMsgs(m => [...m, {role:"assistant", content:`Erreur : ${err.message}`}]); }
    setBusy(false);
  };

  const I = "bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-100 text-sm w-full focus:border-amber-500 focus:outline-none";
  const L = "text-xs text-gray-400 mb-0.5 block";
  const C = "bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3";

  const tabList = [
    {k:"structure",l:"Structure",i:"⚙"},{k:"debit",l:"Débit",i:"✂"},{k:"montage",l:"Montage",i:"📐"},
    {k:"notice",l:"Notice",i:"📋"},{k:"validation",l:`Contrôle${val.errors.length?` (${val.errors.length})`:""}`,i:val.errors.length?"🔴":"🟢"},
    {k:"ia",l:"Assistant IA",i:"🤖"},
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100" style={{fontFamily:"'SF Mono','Fira Code',monospace"}}>
      <div className="max-w-2xl mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-amber-400 tracking-wider">{st.project.name}</h1>
          <div className="text-xs text-gray-500">{mat.short} {st.panel.thickness*10}mm · {totP} pcs · {cp.length} pnx · {uH}cm{val.errors.length>0&&<span className="text-red-400 ml-1">· {val.errors.length} err</span>}</div>
        </div>
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {tabList.map(t=><button key={t.k} onClick={()=>setTab(t.k)} className={`px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap ${tab===t.k?"bg-amber-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{t.i} {t.l}</button>)}
        </div>

        {tab==="structure"&&<div>
          <div className={C}>
            <h3 className="text-amber-400 font-bold text-sm mb-2 uppercase tracking-wider">Matériau</h3>
            <select className={I+" mb-2"} value={st.materialKey} onChange={e=>chgMat(e.target.value)}>
              {Object.entries(MATERIALS).map(([k,m])=><option key={k} value={k}>{m.name}</option>)}
            </select>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>{mat.density} kg/m³ · {mat.flexMPa} MPa · portée max {mat.maxSpan18}cm · vis: {mat.screwHolding}{mat.dowels?" · tourillons ✓":" · tourillons ✗"}{mat.edgeBanding?" · chant thermo. obligatoire":""}</div>
              <div className="text-gray-400">{mat.notes}</div>
              {mat.warnings.map((w,i)=><div key={i} className="text-yellow-400">⚠ {w}</div>)}
            </div>
          </div>
          <div className={C}>
            <h3 className="text-amber-400 font-bold text-sm mb-2 uppercase tracking-wider">Projet</h3>
            <div className="grid grid-cols-2 gap-3">
              {[["wallWidth","Larg. mur",st.project.wallWidth],["ceilingHeight","H plafond",st.project.ceilingHeight],["plinthHeight","H plinthe",st.project.plinthHeight],["plinthDepth","P plinthe",st.project.plinthDepth]].map(([k,l,v])=>
                <div key={k}><label className={L}>{l} (cm)</label><input type="number" step="0.1" className={I} value={v} onChange={e=>up(k,+e.target.value)}/></div>
              )}
            </div>
          </div>
          <div className={C}>
            <h3 className="text-amber-400 font-bold text-sm mb-2 uppercase tracking-wider">Panneau</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={L}>L (cm)</label><input type="number" className={I} value={st.panel.width} onChange={e=>upP("width",+e.target.value)}/></div>
              <div><label className={L}>H (cm)</label><input type="number" className={I} value={st.panel.height} onChange={e=>upP("height",+e.target.value)}/></div>
              <div><label className={L}>Ép. (cm)</label><input type="number" step="0.1" className={I} value={st.panel.thickness} onChange={e=>upP("thickness",+e.target.value)}/></div>
            </div>
            <div className="mt-2 flex gap-2">{mat.panels.map((p,i)=><button key={i} className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600" onClick={()=>{upP("width",p.w);upP("height",p.h);}}>{p.w}×{p.h}</button>)}</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wider">Corps ({st.bodies.length})</h3>
            <button onClick={addB} className="text-xs px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-500">+ Corps</button>
          </div>
          {st.bodies.map((b,bi)=><div key={b.id} className={C} style={{borderLeft:`3px solid ${BODY_COLORS[bi%BODY_COLORS.length]}`}}>
            <div className="flex items-center justify-between mb-2">
              <input className="bg-transparent border-b border-gray-600 text-gray-100 font-bold focus:border-amber-500 focus:outline-none" value={b.name} onChange={e=>upB(b.id,"name",e.target.value)}/>
              <button onClick={()=>rmB(b.id)} className="text-xs text-red-400">Suppr.</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div><label className={L}>Larg. (cm)</label><input type="number" step="0.1" className={I} value={b.width} onChange={e=>upB(b.id,"width",+e.target.value)}/></div>
              <div><label className={L}>Prof. (cm)</label><input type="number" step="0.1" className={I} value={b.depth} onChange={e=>upB(b.id,"depth",+e.target.value)}/></div>
            </div>
            <div className="text-xs text-gray-500 mb-2">Int. tab. : {(b.width-2*st.panel.thickness).toFixed(1)}cm · ~{((b.pieces.reduce((s,p)=>s+p.length*p.width*p.qty,0)/10000)*st.panel.thickness/100*mat.density).toFixed(1)}kg</div>
            <div className="space-y-1">
              {b.pieces.map(p=><div key={p.id} className="flex items-center gap-2 bg-gray-900 rounded px-2 py-1.5 text-sm">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:PIECE_COLORS[p.type]||PIECE_COLORS.autre}}/>
                {ep===p.id?<div className="flex-1 grid grid-cols-5 gap-1 items-center">
                  <input className={I+" col-span-2"} value={p.name} onChange={e=>upPc(b.id,p.id,"name",e.target.value)}/>
                  <input type="number" step="0.1" className={I} value={p.length} onChange={e=>upPc(b.id,p.id,"length",+e.target.value)}/>
                  <input type="number" step="0.1" className={I} value={p.width} onChange={e=>upPc(b.id,p.id,"width",+e.target.value)}/>
                  <div className="flex gap-1">
                    <input type="number" className={I+" w-10"} value={p.qty} onChange={e=>upPc(b.id,p.id,"qty",Math.max(1,+e.target.value))}/>
                    <select className={I+" w-14 text-xs"} value={p.type} onChange={e=>upPc(b.id,p.id,"type",e.target.value)}>
                      {["joue","tablette-fixe","tablette-reglable","bandeau","autre"].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>:<div className="flex-1 flex justify-between cursor-pointer hover:text-amber-300" onClick={()=>setEp(p.id)}>
                  <span className="truncate">{p.name}</span>
                  <span className="text-gray-500 text-xs font-mono ml-2 flex-shrink-0">{p.length}×{p.width} ×{p.qty}</span>
                </div>}
                <button onClick={()=>ep===p.id?setEp(null):rmPc(b.id,p.id)} className="text-xs text-gray-500 hover:text-red-400 flex-shrink-0">{ep===p.id?"✓":"×"}</button>
              </div>)}
            </div>
            <button onClick={()=>addPc(b.id)} className="mt-2 text-xs text-amber-500">+ Pièce</button>
          </div>)}
        </div>}

        {tab==="debit"&&(()=>{
          const W=580,mg=35,sc=(W-2*mg)/st.panel.width,H=mg*2+st.panel.height*sc;
          const uA=allP.reduce((s,p)=>s+p.length*p.width*p.qty,0),tA=st.panel.width*st.panel.height*cp.length;
          return <div>
            <div className="text-sm text-gray-300 mb-3"><span className="text-amber-400 font-bold">{cp.length}</span> pnx {mat.short} · <span className={tA>0&&uA/tA>.7?"text-emerald-400":"text-red-400"}>{tA>0?(uA/tA*100).toFixed(1):0}%</span> · {(uA/10000).toFixed(2)} m²</div>
            {cp.map((pn,pi)=>{const pU=pn.pl.reduce((s,p)=>s+(p.pw-st.kerf)*(p.ph-st.kerf),0); return <div key={pi} className={C}>
              <div className="text-xs text-gray-400 mb-1">Panneau {pi+1} — {(pU/(st.panel.width*st.panel.height)*100).toFixed(0)}%</div>
              <div className="overflow-x-auto"><svg width={W} height={H} className="bg-gray-900 rounded">
                {Array.from({length:Math.floor(st.panel.width/10)+1},(_,i)=><line key={i} x1={mg+i*10*sc} y1={mg} x2={mg+i*10*sc} y2={H-mg} stroke="#2d3748" strokeWidth=".5"/>)}
                {Array.from({length:Math.floor(st.panel.height/10)+1},(_,i)=><line key={i} x1={mg} y1={mg+i*10*sc} x2={W-mg} y2={mg+i*10*sc} stroke="#2d3748" strokeWidth=".5"/>)}
                <rect x={mg} y={mg} width={st.panel.width*sc} height={st.panel.height*sc} fill="none" stroke="#4a5568" strokeWidth="2"/>
                {pn.pl.map((p,j)=>{const px=mg+p.x*sc,py=mg+p.y*sc,pw=p.pw*sc,ph=p.ph*sc,c=PIECE_COLORS[p.type]||PIECE_COLORS.autre;
                  return <g key={j}><rect x={px+1} y={py+1} width={Math.max(pw-2,1)} height={Math.max(ph-2,1)} fill={c} opacity=".25" stroke={c} strokeWidth="1.5" rx="2"/>
                    {pw>40&&ph>14&&<text x={px+pw/2} y={py+ph/2-3} textAnchor="middle" fill={c} fontSize="7.5" fontWeight="bold">{p.name?.split(" ").slice(0,3).join(" ")}</text>}
                    {pw>28&&ph>10&&<text x={px+pw/2} y={py+ph/2+7} textAnchor="middle" fill="#94a3b8" fontSize="7">{p.rotated?p.width:p.length}×{p.rotated?p.length:p.width}{p.rotated?" ↻":""}</text>}
                  </g>;})}
              </svg></div>
            </div>;})}
            <div className={C}><h4 className="text-sm font-bold text-amber-400 mb-2">Liste de coupe</h4>
              <div className="text-xs text-gray-400 space-y-0.5 font-mono">{[...allP].sort((a,b)=>b.length*b.width*b.qty-a.length*a.width*a.qty).map((p,i)=>
                <div key={i} className="flex justify-between"><span><span className="inline-block w-2 h-2 rounded mr-1" style={{backgroundColor:PIECE_COLORS[p.type]}}/>{p.name}</span><span>{p.length}×{p.width} ×{p.qty}</span></div>
              )}</div>
            </div>
          </div>;
        })()}

        {tab==="montage"&&(()=>{
          const W=580,mg=50,tBW=st.bodies.reduce((s,b)=>s+b.width,0);
          const sc=(W-2*mg-20*(st.bodies.length-1))/Math.max(tBW,1),H=mg*2+uH*sc,t=st.panel.thickness;
          let ox=mg; const offs=st.bodies.map(b=>{const x=ox;ox+=b.width*sc+20;return x;});
          return <div>
            <div className="text-sm text-gray-400 mb-3">Élévation frontale — {mat.short} {st.panel.thickness*10}mm</div>
            <div className="overflow-x-auto"><svg width={W} height={Math.min(H,700)} viewBox={`0 0 ${W} ${H}`} className="bg-gray-900 rounded">
              <line x1={mg-10} y1={mg+uH*sc} x2={W-mg+10} y2={mg+uH*sc} stroke="#4a5568" strokeWidth="1" strokeDasharray="6,3"/>
              {st.bodies.map((b,bi)=>{
                const bx=offs[bi],bw=b.width*sc,bh=uH*sc,tw=t*sc;
                const rN=b.pieces.filter(p=>p.type==="tablette-reglable").reduce((s,p)=>s+p.qty,0);
                const fN=b.pieces.filter(p=>p.type==="tablette-fixe").reduce((s,p)=>s+p.qty,0);
                const fP=[180,uH-45].slice(0,fN);
                return <g key={b.id}>
                  <rect x={bx} y={mg} width={bw} height={bh} fill="none" stroke={BODY_COLORS[bi]} strokeWidth="1.5" opacity=".4"/>
                  <rect x={bx} y={mg} width={tw} height={bh} fill={BODY_COLORS[bi]} opacity=".3"/>
                  <rect x={bx+bw-tw} y={mg} width={tw} height={bh} fill={BODY_COLORS[bi]} opacity=".3"/>
                  <rect x={bx} y={mg+bh-st.project.plinthHeight*sc} width={tw} height={st.project.plinthHeight*sc} fill="#1a1d23" stroke="#4a5568" strokeWidth=".5"/>
                  <rect x={bx+bw-tw} y={mg+bh-st.project.plinthHeight*sc} width={tw} height={st.project.plinthHeight*sc} fill="#1a1d23" stroke="#4a5568" strokeWidth=".5"/>
                  {fP.map((h,fi)=><rect key={fi} x={bx+tw} y={mg+bh-h*sc-tw/2} width={bw-2*tw} height={tw} fill="#10b981" opacity=".5"/>)}
                  <line x1={bx} y1={mg+bh-180*sc} x2={bx+bw} y2={mg+bh-180*sc} stroke="#f59e0b" strokeWidth=".5" strokeDasharray="2,4" opacity=".5"/>
                  {Array.from({length:rN},(_,ri)=>{const fb=30+(ri+1)*(140/(rN+1)); return <line key={ri} x1={bx+tw+2} y1={mg+bh-fb*sc} x2={bx+bw-tw-2} y2={mg+bh-fb*sc} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" opacity=".6"/>;})}
                  <text x={bx+bw/2} y={mg-10} textAnchor="middle" fill={BODY_COLORS[bi]} fontSize="10" fontWeight="bold">{b.name}</text>
                  <text x={bx+bw/2} y={mg-1} textAnchor="middle" fill="#718096" fontSize="8">prof. {b.depth}cm</text>
                  <text x={bx+bw/2} y={H-10} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">{b.width}cm</text>
                </g>;
              })}
              <text x={15} y={mg+uH*sc/2} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" transform={`rotate(-90,15,${mg+uH*sc/2})`}>{uH}cm</text>
            </svg></div>
          </div>;
        })()}

        {tab==="notice"&&<div>
          <div className="text-sm text-gray-400 mb-3">Notice — {mat.name} {st.panel.thickness*10}mm</div>
          {steps.map((s,i)=><div key={i} className={C}>
            <h4 className="text-amber-400 font-bold text-sm mb-2">{s.title}</h4>
            {s.items.map((it,j)=><div key={j} className={`text-sm py-0.5 ${it.startsWith("  →")?"text-gray-500 pl-3 font-mono text-xs":it.startsWith("⚠")?"text-yellow-400":"text-gray-300"}`}>{it}</div>)}
          </div>)}
        </div>}

        {tab==="validation"&&<div>
          {!val.errors.length&&!val.warnings.length&&<div className={C+" border-emerald-800"}><div className="text-emerald-400 text-sm font-bold">✓ Aucune anomalie</div></div>}
          {val.errors.length>0&&<div className={C+" border-red-800"}>
            <h4 className="text-red-400 font-bold text-sm mb-2">Erreurs ({val.errors.length})</h4>
            {val.errors.map((e,i)=><div key={i} className="text-sm text-red-300 py-1 border-b border-red-900 last:border-0">{e}</div>)}
          </div>}
          {val.warnings.length>0&&<div className={C+" border-yellow-800"}>
            <h4 className="text-yellow-400 font-bold text-sm mb-2">Avertissements ({val.warnings.length})</h4>
            {val.warnings.map((w,i)=><div key={i} className="text-sm text-yellow-300 py-1 border-b border-yellow-900 last:border-0">{w}</div>)}
          </div>}
        </div>}

        {tab==="ia"&&<div>
          <div className={C}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-amber-400 font-bold text-sm">Assistant — {mat.short}</h4>
              <div className="flex items-center gap-2">
                {pdfs.length>0&&<span className="text-xs text-gray-500">{pdfs.length} PDF</span>}
                <button onClick={()=>fRef.current?.click()} className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">+ PDF réf.</button>
                <input ref={fRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf}/>
              </div>
            </div>
            {pdfs.length>0&&<div className="flex flex-wrap gap-1 mb-2">{pdfs.map((d,i)=>
              <span key={i} className="text-xs bg-gray-700 rounded px-2 py-0.5 text-gray-300 flex items-center gap-1">{d.name}<button onClick={()=>setPdfs(ds=>ds.filter((_,j)=>j!==i))} className="text-gray-500 hover:text-red-400">×</button></span>
            )}</div>}
            <div className="text-xs text-gray-500 mb-3">Contexte : structure + {mat.name} + validation ({val.errors.length}e/{val.warnings.length}w){pdfs.length>0?` + ${pdfs.length} PDF`:""}</div>

            <div className="bg-gray-900 rounded-lg p-3 mb-3 min-h-[180px] max-h-[400px] overflow-y-auto">
              {msgs.length===0&&<div className="text-gray-600 text-sm text-center py-6">
                <div className="mb-2">Exemples de questions :</div>
                <div className="space-y-1 text-xs text-gray-500">
                  {[`Portée max tablettes en ${mat.short} ?`,`8 kg/mètre de livres sur ${allP.find(p=>p.type==="tablette-reglable")?.length||96} cm ?`,`Revue critique — quels risques ?`,`Comment traiter la jonction des 2 corps ?`].map((q,i)=>
                    <button key={i} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-800 hover:text-amber-400" onClick={()=>setCi(q)}>{q}</button>
                  )}
                </div>
              </div>}
              {msgs.map((m,i)=><div key={i} className={`mb-3 ${m.role==="user"?"text-right":""}`}>
                <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role==="user"?"bg-amber-600 text-white":"bg-gray-800 text-gray-200"}`}>
                  <div style={{whiteSpace:"pre-wrap"}}>{m.content}</div>
                </div>
              </div>)}
              {busy&&<div className="text-gray-500 text-sm flex items-center gap-2"><span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse"/>Réflexion...</div>}
              <div ref={endRef}/>
            </div>
            <div className="flex gap-2">
              <input className={I+" flex-1"} placeholder="Ta question..." value={ci} onChange={e=>setCi(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
              <button onClick={send} disabled={busy||!ci.trim()} className="px-4 py-1.5 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-40">→</button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
