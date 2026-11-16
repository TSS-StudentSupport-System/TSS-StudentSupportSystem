
    /* ===== TssDiagram — interactive SVG editor for the family map (genogram) and the ecomap =====
       Data in / out: { nodes:[...], edges:[...], notes }  (the same shape the server validates in Tools.gs).
       Nothing is inferred: the editor only draws what the assessor entered. Labels are set with textContent (no HTML). */
    window.TssDiagram = (function () {
        const NS = 'http://www.w3.org/2000/svg';
        const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
        const txt = (parent, x, y, s, attrs) => { const t = el('text', Object.assign({ x, y, 'text-anchor': 'middle' }, attrs || {}), parent); t.textContent = s; return t; };
        const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
        const INK = '#1e293b', MUTED = '#64748b', TEAL = '#0f766e', NAVY = '#1e3a5f';
        const ECO_COLORS = { client: '#1e3a5f', family: '#0f766e', friends: '#0369a1', school: '#4338ca', health: '#be185d', social_service: '#b45309', community: '#4d7c0f', other: '#475569' };
        const uid = p => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

        function mount(host, opts) {
            const kind = opts.kind;               // 'GENOGRAM' | 'ECOMAP'
            const defs = opts.defs || {};
            const st = { nodes: [], edges: [], notes: '', view: { x: 0, y: 0, k: 1 }, sel: null, connect: null, readOnly: !!opts.readOnly };
            host.innerHTML = '';
            host.classList.add('dg-host');
            const svg = el('svg', { class: 'dg-svg', role: 'img', 'aria-label': opts.ariaLabel || (kind === 'GENOGRAM' ? 'แผนผังครอบครัว' : 'แผนผังระบบนิเวศทางสังคม'), tabindex: '0' }, host);
            const markers = el('defs', null, svg);
            [['dgArrow', 10, INK], ['dgArrowThick', 15, INK]].forEach(([id, size, c]) => {
                const m = el('marker', { id: id + (opts.idSuffix || ''), viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: size, markerHeight: size, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, markers);
                el('path', { d: 'M0,0 L10,5 L0,10 z', fill: c }, m);
            });
            const root = el('g', { class: 'dg-root' }, svg);
            const gEdges = el('g', null, root), gNodes = el('g', null, root);
            const sfx = opts.idSuffix || '';

            function setData(d) {
                d = d || {};
                st.nodes = (d.nodes || []).map(n => Object.assign({}, n));
                st.edges = (d.edges || []).map(e => Object.assign({}, e));
                st.notes = d.notes || '';
                if (kind === 'ECOMAP' && !st.nodes.some(n => n.id === 'client')) st.nodes.unshift({ id: 'client', label: opts.clientLabel || 'ผู้รับบริการ', category: 'client', isClient: true, x: 0, y: 0 });
                const missing = st.nodes.some(n => typeof n.x !== 'number' || typeof n.y !== 'number');
                if (missing) autoLayout(true);
                render(); fit();
            }
            function getData() {
                return { nodes: st.nodes.map(n => Object.assign({}, n, { x: Math.round(n.x), y: Math.round(n.y) })), edges: st.edges.map(e => Object.assign({}, e)), notes: st.notes };
            }
            const changed = () => { render(); opts.onChange && opts.onChange(getData()); };
            const node = id => st.nodes.find(n => n.id === id);

            /* ---------------- layout ---------------- */
            function autoLayout(onlyMissing) {
                if (kind === 'GENOGRAM') {
                    const gens = [...new Set(st.nodes.map(n => n.generation || 0))].sort((a, b) => a - b);
                    const partnerOf = {};
                    st.edges.filter(e => e.type === 'partner').forEach(e => { (partnerOf[e.from] = partnerOf[e.from] || []).push(e.to); (partnerOf[e.to] = partnerOf[e.to] || []).push(e.from); });
                    const parentsOf = {};
                    st.edges.filter(e => e.type === 'parent').forEach(e => { (parentsOf[e.to] = parentsOf[e.to] || []).push(e.from); });
                    const xs = {};
                    gens.forEach((g, gi) => {
                        let row = st.nodes.filter(n => (n.generation || 0) === g);
                        // order: by mean x of parents (already placed), then keep partners next to each other
                        const key = n => { const ps = (parentsOf[n.id] || []).filter(p => xs[p] !== undefined); return ps.length ? ps.reduce((s, p) => s + xs[p], 0) / ps.length : (row.indexOf(n) * 1000 - 1e6 * (gi === 0 ? 0 : -1)); };
                        row.sort((a, b) => key(a) - key(b));
                        const ordered = [], used = {};
                        row.forEach(n => { if (used[n.id]) return; used[n.id] = 1; ordered.push(n); (partnerOf[n.id] || []).forEach(pid => { const p = row.find(r => r.id === pid); if (p && !used[p.id]) { used[p.id] = 1; ordered.push(p); } }); });
                        const gap = 130, w = (ordered.length - 1) * gap;
                        ordered.forEach((n, i) => {
                            let x = i * gap - w / 2;
                            xs[n.id] = x;
                            if (!onlyMissing || typeof n.x !== 'number') { n.x = x; n.y = g * 150; }
                        });
                    });
                } else {
                    const c = node('client'); if (c && (!onlyMissing || typeof c.x !== 'number')) { c.x = 0; c.y = 0; }
                    const others = st.nodes.filter(n => n.id !== 'client');
                    const order = (defs.categories || []).map(x => x.v);
                    others.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
                    const R = Math.max(220, others.length * 34);
                    others.forEach((n, i) => {
                        const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, others.length);
                        if (!onlyMissing || typeof n.x !== 'number') { n.x = Math.round(R * Math.cos(a)); n.y = Math.round(R * Math.sin(a) * 0.78); }
                    });
                }
            }

            /* ---------------- drawing ---------------- */
            function shapeGenogram(g, n) {
                const s = 22;
                const common = { fill: '#fff', stroke: INK, 'stroke-width': 2 };
                if (n.sex === 'female') {
                    el('circle', Object.assign({ cx: 0, cy: 0, r: s }, common), g);
                    if (n.isIndex) el('circle', { cx: 0, cy: 0, r: s - 7, fill: 'none', stroke: INK, 'stroke-width': 2 }, g);
                } else if (n.sex === 'male') {
                    el('rect', Object.assign({ x: -s, y: -s, width: 2 * s, height: 2 * s }, common), g);
                    if (n.isIndex) el('rect', { x: -s + 7, y: -s + 7, width: 2 * s - 14, height: 2 * s - 14, fill: 'none', stroke: INK, 'stroke-width': 2 }, g);
                } else {
                    el('rect', Object.assign({ x: -s, y: -s, width: 2 * s, height: 2 * s, rx: 10, 'stroke-dasharray': '4 3' }, common, { stroke: MUTED }), g);
                    if (n.isIndex) el('rect', { x: -s + 7, y: -s + 7, width: 2 * s - 14, height: 2 * s - 14, rx: 6, fill: 'none', stroke: MUTED, 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g);
                    txt(g, 0, 6, '?', { 'font-size': 16, fill: MUTED, 'font-weight': 700 });
                }
                if (n.deceased) { el('line', { x1: -s - 4, y1: -s - 4, x2: s + 4, y2: s + 4, stroke: INK, 'stroke-width': 2.2 }, g); el('line', { x1: s + 4, y1: -s - 4, x2: -s - 4, y2: s + 4, stroke: INK, 'stroke-width': 2.2 }, g); }
                const lb = el('text', { x: 0, y: s + 26, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: INK, 'paint-order': 'stroke', stroke: '#fbfcfe', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g); lb.textContent = clip(n.label, 18);
                const sub = [n.relation, n.ageInfo].filter(Boolean).join(' • ');
                if (sub) txt(g, 0, s + 41, clip(sub, 24), { 'font-size': 11, fill: MUTED, 'paint-order': 'stroke', stroke: '#fbfcfe', 'stroke-width': 3 });
                if (n.household === true || n.household === false) txt(g, 0, s + (sub ? 55 : 41), n.household ? 'อยู่ร่วมบ้าน' : 'ไม่ได้อยู่ร่วมบ้าน', { 'font-size': 10.5, fill: n.household ? TEAL : MUTED, 'paint-order': 'stroke', stroke: '#fbfcfe', 'stroke-width': 3 });
                if (n.isIndex) txt(g, s + 6, -s + 4, n.sex === 'male' ? 'CASE' : (n.sex === 'female' ? 'SE' : 'ผู้รับบริการ'), { 'text-anchor': 'start', 'font-size': 10.5, 'font-weight': 800, fill: NAVY });
            }
            function shapeEcomap(g, n) {
                const col = ECO_COLORS[n.category] || ECO_COLORS.other;
                if (n.id === 'client') {
                    el('circle', { cx: 0, cy: 0, r: 50, fill: '#fff', stroke: col, 'stroke-width': 3 }, g);
                    el('circle', { cx: 0, cy: 0, r: 44, fill: '#eef2f7', stroke: 'none' }, g);
                    txt(g, 0, -4, clip(n.label, 11), { 'font-size': 12.5, 'font-weight': 800, fill: NAVY });
                    txt(g, 0, 13, 'ผู้รับบริการ', { 'font-size': 10.5, fill: MUTED });
                    return;
                }
                const cat = (defs.categories || []).find(c => c.v === n.category);
                el('rect', { x: -66, y: -26, width: 132, height: 52, rx: 16, fill: '#fff', stroke: col, 'stroke-width': 2 }, g);
                el('rect', { x: -66, y: -26, width: 7, height: 52, rx: 3, fill: col }, g);
                txt(g, 4, -3, clip(n.label, 16), { 'font-size': 13, 'font-weight': 700, fill: INK });
                txt(g, 4, 14, clip(cat ? cat.label : '', 22), { 'font-size': 10, fill: MUTED });
            }
            function boundary(n, tx, ty) {           // where a line from the centre leaves the shape
                const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy) || 1;
                let r = 26;
                if (kind === 'ECOMAP') r = n.id === 'client' ? 52 : Math.min(Math.abs(66 / (dx / d || 1e-6)), Math.abs(28 / (dy / d || 1e-6)));
                return [n.x + dx / d * r, n.y + dy / d * r];
            }
            function zigzag(x1, y1, x2, y2) {
                const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, px = -uy, py = ux;
                const pts = [[x1, y1]]; const seg = 9, a = 6; const start = 12, end = L - 12;
                let i = 0;
                for (let t = start; t < end; t += seg, i++) pts.push([x1 + ux * t + px * (i % 2 ? a : -a), y1 + uy * t + py * (i % 2 ? a : -a)]);
                pts.push([x2, y2]);
                return pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
            }
            function drawEdge(e) {
                const a = node(e.from), b = node(e.to); if (!a || !b) return;
                const g = el('g', { class: 'dg-edge' + (st.sel && st.sel.id === e.id ? ' is-sel' : ''), 'data-id': e.id }, gEdges);
                const hit = (d, isPoly) => el(isPoly ? 'polyline' : 'path', isPoly ? { points: d, fill: 'none', stroke: 'transparent', 'stroke-width': 14 } : { d, fill: 'none', stroke: 'transparent', 'stroke-width': 14 }, g);
                if (kind === 'GENOGRAM' && e.type === 'partner') {
                    const y = Math.max(a.y, b.y) + 30, d = `M${a.x},${a.y + 22} V${y} H${b.x} V${b.y + 22}`;
                    el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 2 }, g); hit(d);
                } else if (kind === 'GENOGRAM' && e.type === 'parent') {
                    const parents = st.edges.filter(x => x.type === 'parent' && x.to === b.id).map(x => node(x.from)).filter(Boolean);
                    const partners = parents.length === 2 && st.edges.some(x => x.type === 'partner' && ((x.from === parents[0].id && x.to === parents[1].id) || (x.to === parents[0].id && x.from === parents[1].id)));
                    let sx = a.x, sy = a.y + 22;
                    if (partners) { sx = (parents[0].x + parents[1].x) / 2; sy = Math.max(parents[0].y, parents[1].y) + 30; if (parents[1].id === a.id) return; }  // one line per couple
                    const my = Math.max(sy + 52, (sy + b.y - 22) / 2), d = `M${sx},${sy} V${my} H${b.x} V${b.y - 22}`;
                    el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 1.8 }, g); hit(d);
                } else {
                    let [x1, y1] = boundary(a, b.x, b.y), [x2, y2] = boundary(b, a.x, a.y);
                    if (kind === 'GENOGRAM') {    // emotional lines sit slightly apart from structural lines
                        const L = Math.hypot(x2 - x1, y2 - y1) || 1, ox = -(y2 - y1) / L * 7, oy = (x2 - x1) / L * 7;
                        x1 += ox; y1 += oy; x2 += ox; y2 += oy;
                    }
                    const d = `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
                    const mid = [(x1 + x2) / 2, (y1 + y2) / 2], L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
                    const t = e.type;
                    if (kind === 'GENOGRAM') {
                        if (t === 'good') el('path', { d, stroke: INK, 'stroke-width': 1.6, fill: 'none', 'marker-start': `url(#dgArrow${sfx})`, 'marker-end': `url(#dgArrow${sfx})` }, g);
                        else if (t === 'distant') el('path', { d, stroke: INK, 'stroke-width': 1.8, fill: 'none', 'stroke-dasharray': '7 6' }, g);
                        else if (t === 'conflict') el('polyline', { points: zigzag(x1, y1, x2, y2), stroke: INK, 'stroke-width': 1.6, fill: 'none' }, g);
                        else if (t === 'cutoff') { el('path', { d, stroke: INK, 'stroke-width': 1.6, fill: 'none', 'marker-start': `url(#dgArrow${sfx})`, 'marker-end': `url(#dgArrow${sfx})` }, g); el('line', { x1: mid[0] - nx * 10 - (x2 - x1) / L * 5, y1: mid[1] - ny * 10 - (y2 - y1) / L * 5, x2: mid[0] + nx * 10 + (x2 - x1) / L * 5, y2: mid[1] + ny * 10 + (y2 - y1) / L * 5, stroke: INK, 'stroke-width': 2 }, g); }
                        else if (t === 'close') el('path', { d, stroke: INK, 'stroke-width': 4.5, fill: 'none', 'marker-start': `url(#dgArrowThick${sfx})`, 'marker-end': `url(#dgArrowThick${sfx})` }, g);
                    } else {
                        if (t === 'existing') el('path', { d, stroke: INK, 'stroke-width': 2, fill: 'none' }, g);
                        else if (t === 'limited') el('path', { d, stroke: INK, 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '8 6' }, g);
                        else if (t === 'strong') [-4, 0, 4].forEach(o => el('path', { d: `M${(x1 + nx * o).toFixed(1)},${(y1 + ny * o).toFixed(1)} L${(x2 + nx * o).toFixed(1)},${(y2 + ny * o).toFixed(1)}`, stroke: INK, 'stroke-width': 2, fill: 'none' }, g));
                        else if (t === 'tension') { el('path', { d, stroke: INK, 'stroke-width': 2, fill: 'none' }, g); [-14, 0, 14].forEach(o => { const cx = mid[0] + (x2 - x1) / L * o, cy = mid[1] + (y2 - y1) / L * o; el('line', { x1: cx - nx * 9, y1: cy - ny * 9, x2: cx + nx * 9, y2: cy + ny * 9, stroke: INK, 'stroke-width': 2 }, g); }); }
                    }
                    hit(d);
                    if (e.note && st.sel && st.sel.id === e.id) txt(g, mid[0] + nx * 16, mid[1] + ny * 16, clip(e.note, 30), { 'font-size': 11, fill: TEAL, 'font-weight': 600 });
                }
                g.addEventListener('pointerdown', ev => { ev.stopPropagation(); if (!st.connect) select({ kind: 'edge', id: e.id }); });
            }
            function render() {
                gEdges.textContent = ''; gNodes.textContent = '';
                if (kind === 'GENOGRAM') {   // structural lines first, emotional lines on top
                    st.edges.filter(e => e.type === 'partner' || e.type === 'parent').forEach(drawEdge);
                    st.edges.filter(e => e.type !== 'partner' && e.type !== 'parent').forEach(drawEdge);
                } else st.edges.forEach(drawEdge);
                st.nodes.forEach(n => {
                    const g = el('g', { class: 'dg-node' + (st.sel && st.sel.id === n.id ? ' is-sel' : '') + (st.connect && st.connect.from === n.id ? ' is-src' : ''), transform: `translate(${n.x},${n.y})`, 'data-id': n.id }, gNodes);
                    el('rect', { class: 'dg-halo', x: kind === 'ECOMAP' && n.id !== 'client' ? -74 : -34, y: kind === 'ECOMAP' && n.id !== 'client' ? -34 : -34, width: kind === 'ECOMAP' && n.id !== 'client' ? 148 : 68, height: 68, rx: 18 }, g);
                    (kind === 'GENOGRAM' ? shapeGenogram : shapeEcomap)(g, n);
                    bindNode(g, n);
                });
                applyView();
            }
            function applyView() { root.setAttribute('transform', `translate(${st.view.x},${st.view.y}) scale(${st.view.k})`); }
            function bbox() {
                if (!st.nodes.length) return { x: -200, y: -150, w: 400, h: 300 };
                const xs = st.nodes.map(n => n.x), ys = st.nodes.map(n => n.y), pad = kind === 'ECOMAP' ? 90 : 70;
                const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad, w = Math.max(...xs) - Math.min(...xs) + 2 * pad, h = Math.max(...ys) - Math.min(...ys) + 2 * pad + 30;
                return { x, y, w, h };
            }
            function fit(userAction) {
                if (userAction !== false) st.userMoved = false;
                const r = svg.getBoundingClientRect(), W = r.width || 800, H = r.height || 480, b = bbox();
                const k = Math.max(0.3, Math.min(1.25, Math.min(W / b.w, H / b.h)));
                st.view = { k, x: W / 2 - (b.x + b.w / 2) * k, y: H / 2 - (b.y + b.h / 2) * k };
                applyView(); opts.onView && opts.onView(st.view.k);
            }
            function zoom(f, cx, cy) {
                const r = svg.getBoundingClientRect(); cx = cx === undefined ? r.width / 2 : cx; cy = cy === undefined ? r.height / 2 : cy;
                const k2 = Math.max(0.25, Math.min(3, st.view.k * f));
                st.userMoved = true; st.view.x = cx - (cx - st.view.x) * (k2 / st.view.k); st.view.y = cy - (cy - st.view.y) * (k2 / st.view.k); st.view.k = k2;
                applyView(); opts.onView && opts.onView(k2);
            }
            const toWorld = (cx, cy) => { const r = svg.getBoundingClientRect(); return [(cx - r.left - st.view.x) / st.view.k, (cy - r.top - st.view.y) / st.view.k]; };

            /* ---------------- interaction ---------------- */
            function select(s) { st.sel = s; render(); opts.onSelect && opts.onSelect(s); }
            function bindNode(g, n) {
                g.addEventListener('pointerdown', ev => {
                    ev.stopPropagation();
                    if (st.connect) { connectTo(n.id); return; }
                    const [wx, wy] = toWorld(ev.clientX, ev.clientY), ox = n.x - wx, oy = n.y - wy;
                    let moved = false; const pid = ev.pointerId;
                    const mv = e2 => { if (e2.pointerId !== pid || st.readOnly) return; const [x, y] = toWorld(e2.clientX, e2.clientY); if (!moved && Math.hypot(x + ox - n.x, y + oy - n.y) < 3) return; moved = true; n.x = x + ox; n.y = y + oy; g.setAttribute('transform', `translate(${n.x},${n.y})`); renderEdgesOnly(); };
                    const up = e2 => { if (e2.pointerId !== pid) return; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (moved) changed(); else select({ kind: 'node', id: n.id }); };
                    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
                });
            }
            function renderEdgesOnly() { gEdges.textContent = ''; if (kind === 'GENOGRAM') { st.edges.filter(e => e.type === 'partner' || e.type === 'parent').forEach(drawEdge); st.edges.filter(e => e.type !== 'partner' && e.type !== 'parent').forEach(drawEdge); } else st.edges.forEach(drawEdge); }
            const pointers = new Map(); let pinch = null;
            svg.addEventListener('pointerdown', ev => {
                pointers.set(ev.pointerId, [ev.clientX, ev.clientY]);
                if (pointers.size === 2) { const [p1, p2] = [...pointers.values()]; pinch = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), k: st.view.k }; return; }
                if (st.connect) { st.connect = null; render(); opts.onConnect && opts.onConnect(null); }
                if (st.sel) select(null);
                const sx = ev.clientX, sy = ev.clientY, vx = st.view.x, vy = st.view.y, pid = ev.pointerId;
                const mv = e2 => {
                    if (!pointers.has(e2.pointerId)) return; pointers.set(e2.pointerId, [e2.clientX, e2.clientY]);
                    if (pinch && pointers.size === 2) { const [p1, p2] = [...pointers.values()]; const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); const r = svg.getBoundingClientRect(); zoom((pinch.k * d / pinch.d) / st.view.k, (p1[0] + p2[0]) / 2 - r.left, (p1[1] + p2[1]) / 2 - r.top); return; }
                    if (e2.pointerId !== pid) return; st.userMoved = true; st.view.x = vx + e2.clientX - sx; st.view.y = vy + e2.clientY - sy; applyView();
                };
                const up = e2 => { pointers.delete(e2.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); } };
                window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
            });
            svg.addEventListener('wheel', ev => { ev.preventDefault(); const r = svg.getBoundingClientRect(); zoom(ev.deltaY < 0 ? 1.12 : 1 / 1.12, ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
            svg.addEventListener('keydown', ev => {
                const step = 40;
                if (ev.key === '+' || ev.key === '=') zoom(1.15); else if (ev.key === '-') zoom(1 / 1.15);
                else if (ev.key === 'ArrowLeft') { st.view.x += step; applyView(); } else if (ev.key === 'ArrowRight') { st.view.x -= step; applyView(); }
                else if (ev.key === 'ArrowUp') { st.view.y += step; applyView(); } else if (ev.key === 'ArrowDown') { st.view.y -= step; applyView(); }
                else if (ev.key === '0') fit(); else if (ev.key === 'Escape') { st.connect = null; select(null); opts.onConnect && opts.onConnect(null); }
                else return;
                ev.preventDefault();
            });
            let ro = null;
            if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (!st.userMoved) fit(false); }); ro.observe(host); }

            /* ---------------- editing API ---------------- */
            function addNode(data) {
                const n = Object.assign({ id: uid('n'), label: 'ใหม่' }, data);
                const b = bbox();
                if (kind === 'GENOGRAM') { const g = n.generation || 0; const row = st.nodes.filter(x => (x.generation || 0) === g); n.x = row.length ? Math.max(...row.map(x => x.x)) + 130 : 0; n.y = g * 150; }
                else { const a = Math.random() * Math.PI * 2; n.x = Math.round(Math.cos(a) * Math.max(240, b.w / 2)); n.y = Math.round(Math.sin(a) * Math.max(190, b.h / 2.4)); }
                st.nodes.push(n); select({ kind: 'node', id: n.id }); changed(); fit(); return n.id;
            }
            function updateNode(id, patch) { const n = node(id); if (!n) return; Object.assign(n, patch); if (kind === 'GENOGRAM' && patch.generation !== undefined) n.y = (n.generation || 0) * 150; changed(); }
            function removeNode(id) { if (id === 'client') return; st.nodes = st.nodes.filter(n => n.id !== id); st.edges = st.edges.filter(e => e.from !== id && e.to !== id); select(null); changed(); }
            function startConnect(type) { st.connect = { type, from: null }; if (st.sel && st.sel.kind === 'node') st.connect.from = st.sel.id; render(); opts.onConnect && opts.onConnect(st.connect); }
            function connectTo(id) {
                const c = st.connect; if (!c) return;
                if (!c.from) { c.from = id; render(); opts.onConnect && opts.onConnect(c); return; }
                if (c.from === id) return;
                let from = c.from, to = id;
                if (kind === 'GENOGRAM' && c.type === 'parent') { const A = node(from), B = node(to); if ((A.generation || 0) > (B.generation || 0)) { from = id; to = c.from; } }
                const e = { id: uid('e'), from, to, type: c.type, note: '' };
                st.edges.push(e); st.connect = null; opts.onConnect && opts.onConnect(null); select({ kind: 'edge', id: e.id }); changed();
                opts.onEdgeAdded && opts.onEdgeAdded(e);
            }
            function updateEdge(id, patch) { const e = st.edges.find(x => x.id === id); if (!e) return; Object.assign(e, patch); changed(); }
            function removeEdge(id) { st.edges = st.edges.filter(e => e.id !== id); select(null); changed(); }
            function resetLayout() { autoLayout(false); changed(); fit(); }

            /* ---------------- export ---------------- */
            function legendItems() {
                if (kind === 'GENOGRAM') return [].concat((defs.sexes || []).map(s => ({ shape: s.v, label: s.label })), [{ shape: 'index', label: 'ผู้รับบริการ (SE / CASE)' }, { shape: 'deceased', label: 'เสียชีวิต' }], (defs.emotional || []).map(x => ({ line: x.v, label: x.label })), [{ line: 'partner', label: 'คู่สมรส / คู่ชีวิต (เส้นโครงสร้าง)' }, { line: 'parent', label: 'บิดา/มารดา – บุตร (เส้นโครงสร้าง)' }]);
                return [].concat((defs.lines || []).map(x => ({ line: x.v, label: x.label })), (defs.categories || []).map(c => ({ cat: c.v, label: c.label })));
            }
            function drawLegend(parent, x0, y0, width) {
                const items = legendItems(), colW = 280, cols = Math.max(1, Math.floor(width / colW)); let i = 0;
                txt(parent, x0, y0, 'คำอธิบายสัญลักษณ์ (Legend)', { 'text-anchor': 'start', 'font-size': 13, 'font-weight': 800, fill: INK });
                items.forEach(it => {
                    const cx = x0 + (i % cols) * colW, cy = y0 + 24 + Math.floor(i / cols) * 26; i++;
                    const g = el('g', { transform: `translate(${cx},${cy})` }, parent);
                    if (it.shape === 'female') el('circle', { cx: 10, cy: 0, r: 8, fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g);
                    else if (it.shape === 'male') el('rect', { x: 2, y: -8, width: 16, height: 16, fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g);
                    else if (it.shape === 'unknown') el('rect', { x: 2, y: -8, width: 16, height: 16, rx: 4, fill: '#fff', stroke: MUTED, 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, g);
                    else if (it.shape === 'index') { el('circle', { cx: 10, cy: 0, r: 8, fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g); el('circle', { cx: 10, cy: 0, r: 4, fill: 'none', stroke: INK, 'stroke-width': 1.4 }, g); }
                    else if (it.shape === 'deceased') { el('line', { x1: 3, y1: -7, x2: 17, y2: 7, stroke: INK, 'stroke-width': 2 }, g); el('line', { x1: 17, y1: -7, x2: 3, y2: 7, stroke: INK, 'stroke-width': 2 }, g); }
                    else if (it.cat) el('rect', { x: 2, y: -8, width: 16, height: 16, rx: 4, fill: ECO_COLORS[it.cat] }, g);
                    else if (it.line) {
                        const t = it.line, d = 'M0,0 L34,0';
                        if (t === 'good' || t === 'cutoff') { el('path', { d: 'M3,0 L31,0', stroke: INK, 'stroke-width': 1.5, 'marker-start': `url(#dgArrow${sfx})`, 'marker-end': `url(#dgArrow${sfx})` }, g); if (t === 'cutoff') el('line', { x1: 13, y1: 7, x2: 21, y2: -7, stroke: INK, 'stroke-width': 1.8 }, g); }
                        else if (t === 'close') el('path', { d: 'M4,0 L30,0', stroke: INK, 'stroke-width': 4, 'marker-start': `url(#dgArrowThick${sfx})`, 'marker-end': `url(#dgArrowThick${sfx})` }, g);
                        else if (t === 'distant' || t === 'limited') el('path', { d, stroke: INK, 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }, g);
                        else if (t === 'conflict') el('polyline', { points: zigzag(0, 0, 34, 0), stroke: INK, 'stroke-width': 1.5, fill: 'none' }, g);
                        else if (t === 'strong') [-3, 0, 3].forEach(o => el('path', { d: `M0,${o} L34,${o}`, stroke: INK, 'stroke-width': 1.6 }, g));
                        else if (t === 'tension') { el('path', { d, stroke: INK, 'stroke-width': 1.8 }, g); [10, 17, 24].forEach(x => el('line', { x1: x, y1: -6, x2: x, y2: 6, stroke: INK, 'stroke-width': 1.6 }, g)); }
                        else if (t === 'partner') el('path', { d: 'M2,-7 V5 H32 V-7', stroke: INK, 'stroke-width': 1.6, fill: 'none' }, g);
                        else if (t === 'parent') el('path', { d: 'M17,-8 V0 H6 V8 M17,0 H28 V8', stroke: INK, 'stroke-width': 1.6, fill: 'none' }, g);
                        else el('path', { d, stroke: INK, 'stroke-width': 2 }, g);
                    }
                    txt(g, 44, 4.5, it.label, { 'text-anchor': 'start', 'font-size': 12, fill: INK });
                });
                return 24 + Math.ceil(items.length / cols) * 26;
            }
            function exportSvg(meta) {
                const b = bbox(), W = Math.max(b.w, 760), padTop = 70;
                const out = el('svg', { xmlns: NS, width: W, viewBox: '0 0 ' + W + ' 10', 'font-family': "Sarabun, 'Noto Sans Thai', Tahoma, sans-serif" });
                const md = el('defs', null, out); md.innerHTML = markers.innerHTML;
                const bg = el('rect', { x: 0, y: 0, width: W, height: 10, fill: '#ffffff' }, out);
                txt(out, 24, 30, meta.title || '', { 'text-anchor': 'start', 'font-size': 18, 'font-weight': 800, fill: NAVY });
                txt(out, 24, 52, meta.subtitle || '', { 'text-anchor': 'start', 'font-size': 12.5, fill: MUTED });
                const body = root.cloneNode(true); body.setAttribute('transform', `translate(${(W - b.w) / 2 - b.x},${padTop - b.y})`);
                body.querySelectorAll('.dg-halo').forEach(h => h.remove());
                out.appendChild(body);
                const lg = el('g', null, out); const lh = drawLegend(lg, 24, padTop + b.h + 26, W - 48);
                const H = padTop + b.h + 26 + lh + 40;
                txt(out, 24, H - 16, meta.footer || '', { 'text-anchor': 'start', 'font-size': 10.5, fill: MUTED });
                out.setAttribute('height', H); out.setAttribute('viewBox', `0 0 ${W} ${H}`); bg.setAttribute('height', H);
                return { markup: new XMLSerializer().serializeToString(out), width: W, height: H };
            }
            function exportPng(meta, filename) {
                return new Promise((resolve, reject) => {
                    const s = exportSvg(meta), img = new Image(), scale = 2;
                    img.onload = () => {
                        try {
                            const c = document.createElement('canvas'); c.width = s.width * scale; c.height = s.height * scale;
                            const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(img, 0, 0, c.width, c.height);
                            c.toBlob(blob => { if (!blob) return reject(new Error('png')); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); resolve({ width: c.width, height: c.height, bytes: blob.size }); }, 'image/png');
                        } catch (e) { reject(e); }
                    };
                    img.onerror = () => reject(new Error('svg'));
                    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.markup);
                });
            }
            function printPdf(meta) {
                const s = exportSvg(meta);
                const f = document.createElement('iframe'); f.setAttribute('title', 'print'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
                document.body.appendChild(f);
                const doc = f.contentDocument; doc.open();
                doc.write('<!doctype html><html><head><meta charset="utf-8"><title></title><style>@page{size:A4 landscape;margin:12mm}html,body{margin:0}svg{width:100%;height:auto}</style></head><body></body></html>'); doc.close();
                doc.title = meta.title || '';
                doc.body.innerHTML = s.markup;
                setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); }, 150);
                return s;
            }

            const api = { setData, getData, zoom, fit, resetLayout, addNode, updateNode, removeNode, startConnect, cancelConnect() { st.connect = null; render(); opts.onConnect && opts.onConnect(null); },
                updateEdge, removeEdge, select, exportSvg, exportPng, printPdf, setReadOnly(v) { st.readOnly = !!v; }, state: st,
                destroy() { if (ro) ro.disconnect(); host.innerHTML = ''; } };
            setData(opts.data);
            return api;
        }
        return { mount, colors: ECO_COLORS };
    })();
    