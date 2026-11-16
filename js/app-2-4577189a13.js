
    /* ===== TssDoc — หนังสือราชการ: แม่แบบตามประเภท + การจัดหน้า A4 + การพิมพ์ =====
       Layout values come from the two manuals the school supplied:
         [ส] คู่มือปฏิบัติงานการเขียนหนังสือราชการ สำนักงานศิลปวัฒนธรรมร่วมสมัย (2567) — แบบหนังสือภายนอก/บันทึกข้อความ/ประทับตรา/คำสั่ง/ประกาศ/หนังสือรับรอง
         [ก] คู่มือการเขียนหนังสือราชการ มหาวิทยาลัยราชภัฏกำแพงเพชร — การกั้นหน้า, ขนาดครุฑ/ตัวอักษร, การพิมพ์หลายหน้า, บันทึกข้อความ 3 ย่อหน้า/องค์ 5, รายงานการประชุม, ระเบียบวาระ
       - margins: left 3 cm, right 2 cm [ส][ก]; top/bottom 1.5 cm [ส]
       - garuda 3 cm (external, stamped, order, announce, certificate) / 1.5 cm (memo) [ส][ก] — only an emblem file the school uploaded
       - text 16 pt [ก]; “บันทึกข้อความ” 29 pt bold, line exactly 35 pt; “ส่วนราชการ / ที่ / วันที่ / เรื่อง” 20 pt bold [ส][ก]
       - paragraphs: first line 2.5 cm (2 Tab), 6 pt before; closing / “สั่ง ณ วันที่” 12 pt before; signature after 3 empty lines [ส][ก]
       - continued pages: no garuda, page number centred at the top (-๒-), the next word at the bottom right followed by “...”,
         at least 2 lines carried over before the closing / signature [ก]
       The text face is Sarabun (SIL OFL) scaled to the width of TH SarabunPSK (measured from the manual's embedded font: 0.65),
       so 16 pt here sets about as many characters per line as TH SarabunPSK 16 pt. A computer with TH SarabunPSK / TH Sarabun New
       installed uses that font instead. Everything shown is escaped; nothing is invented. */
    window.TssDoc = (function () {
        var MM = 96 / 25.4, PT = 96 / 72;
        var PAGE = { w: 210, h: 297, top: 15, bottom: 15, left: 30, right: 20 };
        var CW = PAGE.w - PAGE.left - PAGE.right;            // 160 mm
        var LH = 16 * 1.1 * PT;                               // one line of 16 pt text (px)
        var FONT_URL = 'https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7.0.0/fonts/Sarabun/';
        var TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        var WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        var TD = '๐๑๒๓๔๕๖๗๘๙';
        var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
        var num = function (s, o) { s = String(s == null ? '' : s); return o && o.numerals === 'arabic' ? s : s.replace(/[0-9]/g, function (c) { return TD[+c]; }); };
        // text → escaped HTML in the chosen numerals (e-mail addresses keep Arabic digits)
        var T = function (s, o) { return num(esc(s), o); };
        var nl = function (s, o) { return T(s, o).replace(/\n/g, '<br>'); };
        function dParts(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? { d: +m[3], m: TH[+m[2] - 1], y: +m[1] + 543, wd: WD[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()] } : null; }
        function dateLine(iso, o, withPrefix) {   // “๒๘ ตุลาคม ๒๕๖๙” (blank parts stay as space for writing by hand)
            var p = dParts(iso);
            if (!p) return '<span class="tdoc-blank" style="min-width:12mm"></span> <span class="tdoc-blank" style="min-width:28mm"></span> ' + (withPrefix ? 'พ.ศ. ' : '') + '<span class="tdoc-blank" style="min-width:14mm"></span>';
            return T(p.d, o) + ' ' + p.m + ' ' + (withPrefix ? 'พ.ศ. ' : '') + T(p.y, o);
        }

        function fontCss() {
            var face = function (w, f) { return '@font-face{font-family:"TSS Doc Sarabun";src:url("' + FONT_URL + f + '") format("woff2");font-weight:' + w + ';font-style:normal;size-adjust:65%;ascent-override:85%;descent-override:25%;line-gap-override:0%;font-display:block}'; };
            return face(400, 'Sarabun-Regular.woff2') + face(700, 'Sarabun-Bold.woff2');
        }
        function css() {
            return [
                fontCss(),
                '.tdoc-page{position:relative;box-sizing:border-box;width:210mm;height:297mm;background:#fff;color:#000;overflow:hidden;font-family:"TH SarabunPSK","TH Sarabun New","TSS Doc Sarabun",serif;font-size:16pt;line-height:1.1;font-weight:400;font-kerning:normal}',
                '.tdoc-page *{box-sizing:border-box}',
                '.tdoc-body{position:absolute;left:30mm;right:20mm;top:15mm;bottom:15mm}',
                '.tdoc-measure{position:absolute;left:-30000px;top:0;width:160mm;visibility:hidden;font-family:"TH SarabunPSK","TH Sarabun New","TSS Doc Sarabun",serif;font-size:16pt;line-height:1.1}',
                '.tdoc-b{margin:0;padding:0}',
                '.tdoc-p{text-align:justify;text-justify:inter-character;text-indent:25mm;overflow-wrap:anywhere}',
                '.tdoc-p.cont{text-indent:0}',
                '.tdoc-p.last-left{text-align-last:left}',
                '.tdoc-row{display:flex;gap:2.5mm;align-items:flex-start}',
                '.tdoc-row>.k{flex:none;white-space:nowrap}.tdoc-row>.v{flex:1;min-width:0;overflow-wrap:anywhere}',
                '.tdoc-c{text-align:center}',
                '.tdoc-sig{margin-left:20mm;width:140mm;text-align:center}',
                '.tdoc-emb{display:block;margin:0 auto;object-fit:contain}',
                '.tdoc-emb-ph{display:flex;align-items:center;justify-content:center;margin:0 auto;border:1px dashed #b8b8b8;color:#999;font-size:10pt;line-height:1.2;text-align:center}',
                '.tdoc-print .tdoc-emb-ph{border-color:transparent;color:transparent}',
                '.tdoc-blank{display:inline-block;border-bottom:1px dotted #555;height:0.9em;vertical-align:baseline}',
                '.tdoc-dot{border-bottom:1px dotted #333}',
                '.tdoc-h29{font-size:29pt;font-weight:700;line-height:35pt}',
                '.tdoc-h20{font-size:20pt;font-weight:700}',
                '.tdoc-bold{font-weight:700}',
                '.tdoc-red{color:#c00000;font-weight:700}',
                '.tdoc-speed{position:absolute;left:30mm;top:15mm;font-size:24pt;line-height:1.1;border:2px solid #c00000;padding:0 3mm;color:#c00000;font-weight:700}',
                '.tdoc-secret{position:absolute;left:0;right:0;text-align:center;font-size:20pt;line-height:1;color:#c00000;font-weight:700}',
                '.tdoc-pno{position:absolute;left:0;right:0;top:15mm;text-align:center}',
                '.tdoc-cont{position:absolute;right:20mm;bottom:15mm;line-height:1.1}',
                '.tdoc-rule{width:45mm;margin:0 auto;border-top:1px solid #000;height:0}',
                '.tdoc-dash{width:75mm;margin:0 auto;border-top:1px dashed #000;height:0}',
                '.tdoc-list{margin:0;padding:0;list-style:none}'
            ].join('\n');
        }

        /* ---------- blocks: { html, sb (space before, px), kind: 'fixed'|'para', keep (keep with next), sig (closing group), text, cls } ---------- */
        var B = function (html, sb, extra) { return Object.assign({ html: html, sb: sb || 0, kind: 'fixed' }, extra || {}); };
        var P = function (text, o, sb, cls) { return { kind: 'para', text: String(text || ''), o: o, sb: sb == null ? 6 * PT : sb, cls: cls || '' }; };
        var EMPTY = function (n) { return n * LH; };

        function emblem(o, cm, settings) {
            var h = cm * 10;
            if (settings && settings.emblem) return '<img class="tdoc-emb" alt="ตราครุฑ" src="' + esc(settings.emblem) + '" style="height:' + h + 'mm;width:auto;max-width:' + (h * 1.2) + 'mm">';
            return '<div class="tdoc-emb-ph" style="height:' + h + 'mm;width:' + (h * 0.9) + 'mm">ตราครุฑ<br>' + cm + ' ซม.</div>';
        }
        function signature(name, position, o, sbPt) {
            var pos = String(position || '').split('\n').filter(Boolean).map(function (x) { return '<div>' + T(x, o) + '</div>'; }).join('');
            return B('<div class="tdoc-sig"><div style="height:' + EMPTY(3) + 'px"></div><div>(' + (name ? T(name, o) : '<span class="tdoc-blank" style="min-width:45mm"></span>') + ')</div>' + pos + '</div>', (sbPt || 0) * PT, { sig: true });
        }
        function ownerBlock(o) {
            var rows = [o.ownerUnit, o.ownerPhone ? 'โทร. ' + o.ownerPhone : '', o.ownerFax ? 'โทรสาร ' + o.ownerFax : ''].filter(Boolean).map(function (x) { return '<div>' + T(x, o) + '</div>'; });
            if (o.ownerEmail) rows.push('<div>ไปรษณีย์อิเล็กทรอนิกส์ ' + esc(o.ownerEmail) + '</div>');
            return rows.length ? B('<div style="height:' + EMPTY(3) + 'px"></div>' + rows.join(''), 0, { owner: true }) : null;
        }
        function kv(label, valueHtml, sbPt, labelW) {
            return B('<div class="tdoc-row"><span class="k"' + (labelW ? ' style="width:' + labelW + 'mm"' : '') + '>' + label + '</span><span class="v">' + valueHtml + '</span></div>', (sbPt || 0) * PT);
        }
        function listKv(label, items, o, sbPt) {
            if (!items || !items.length) return null;
            var v = items.length === 1 ? T(items[0], o) : items.map(function (x, i) { return '<div>' + T(i + 1, o) + '. ' + T(x, o) + '</div>'; }).join('');
            return kv(label, v, sbPt);
        }
        function docNo(o) { return T(o.docNoPrefix || '', o) + '/' + T(o.docNo || '', o); }
        // letterhead with the garuda in the middle, number at the left and the office at the right, both level with the garuda's feet [ส]
        function letterhead(o, leftHtml, rightLines, settings) {
            var right = String(rightLines || '').split('\n').filter(Boolean).map(function (x) { return '<div>' + T(x, o) + '</div>'; }).join('');
            return B('<div style="position:relative;height:30mm">' + '<div style="position:absolute;left:0;right:0;top:0">' + emblem(o, 3, settings) + '</div></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:-' + (LH / MM).toFixed(2) + 'mm"><div style="padding-top:0">' + leftHtml + '</div><div style="width:65mm">' + right + '</div></div>', 0, { head: true });
        }

        /* ---------- types ---------- */
        function external(o, s) {
            var b = [];
            b.push(letterhead(o, 'ที่ ' + docNo(o), [o.orgName, o.orgAddress].filter(Boolean).join('\n'), s));
            b.push(B('<div style="padding-left:75mm">' + dateLine(o.docDate, o) + '</div>', 6 * PT));
            b.push(kv('เรื่อง', T(o.subject, o), 6, 13));
            b.push(kv(T(o.salutation || 'เรียน', o), T(o.recipient, o), 6, 13));
            var r = listKv('อ้างถึง', o.refs, o, 6); if (r) b.push(r);
            var e = listKv('สิ่งที่ส่งมาด้วย', o.encls, o, 6); if (e) b.push(e);
            (o.paras || []).forEach(function (t) { b.push(P(t, o)); });
            b.push(B('<div style="padding-left:75mm">' + T(o.closing || '', o) + '</div>', 12 * PT, { sig: true, closing: true }));
            b.push(signature(o.signerName, o.signerPosition, o, 0));
            var ow = ownerBlock(o); if (ow) b.push(ow);
            return b;
        }
        function memo(o, s) {
            var b = [];
            b.push(B('<div style="position:relative;height:' + (35 * PT).toFixed(1) + 'px"><div style="position:absolute;left:0;top:-0.5mm">' + emblem(o, 1.5, s).replace('margin:0 auto', 'margin:0') + '</div>' +
                '<div class="tdoc-h29 tdoc-c" style="position:absolute;left:-30mm;width:210mm">บันทึกข้อความ</div></div>', 0, { head: true }));
            var line = function (label, val) { return '<span class="tdoc-h20">' + label + '</span> <span class="tdoc-dot" style="flex:1;padding-left:2mm">' + val + '</span>'; };
            b.push(B('<div style="display:flex;align-items:baseline">' + line('ส่วนราชการ', T([o.unit, o.unitPhone ? 'โทร. ' + o.unitPhone : ''].filter(Boolean).join(' '), o) || '&nbsp;') + '</div>', 2 * PT));
            b.push(B('<div style="display:flex;align-items:baseline"><div style="display:flex;align-items:baseline;width:75mm">' + line('ที่', docNo(o)) + '</div>' +
                '<div style="display:flex;align-items:baseline;flex:1">' + line('วันที่', dateLine(o.docDate, o)) + '</div></div>', 0));
            b.push(B('<div style="display:flex;align-items:baseline">' + line('เรื่อง', T(o.subject, o) || '&nbsp;') + '</div>', 0));
            b.push(kv(T(o.salutation || 'เรียน', o), T(o.recipient, o), 6));
            if (o.variant === 'para') (o.paras || []).forEach(function (t) { b.push(P(t, o)); });
            else {
                var heads = o.variant === 'org5'
                    ? [['old', '๑. เรื่องเดิม'], ['fact', '๒. ข้อเท็จจริง'], ['law', '๓. กฎหมาย ระเบียบที่เกี่ยวข้อง'], ['consider', '๔. ข้อพิจารณา'], ['suggest', '๕. ข้อเสนอแนะ']]
                    : [['old', 'เรื่องเดิม'], ['fact', 'ข้อเท็จจริง'], ['law', 'หลักการและข้อกฎหมาย'], ['propose', 'ข้อเสนอเพื่อพิจารณา']];
                heads.forEach(function (h) {
                    var txt = (o.sections || {})[h[0]];
                    if (!txt) return;
                    b.push(B('<div class="tdoc-bold" style="padding-left:25mm">' + num(h[1], o) + '</div>', 6 * PT, { keep: true, text: h[1] }));
                    String(txt).split(/\n+/).forEach(function (t, i) { b.push(P(t, o, i ? 0 : 0)); });
                });
            }
            if (o.closingPara) b.push(P(o.closingPara, o));
            b.push(signature(o.signerName, o.signerPosition, o, 0));
            return b;
        }
        function stamped(o, s) {
            var b = [];
            b.push(letterhead(o, 'ที่ ' + docNo(o), '', s));
            b.push(kv('ถึง', T(o.to, o), 6, 9));
            (o.paras || []).forEach(function (t) { b.push(P(t, o)); });
            b.push(B('<div style="height:' + EMPTY(3) + 'px"></div><div style="padding-left:75mm">' + T(o.issuer, o) + '</div><div style="padding-left:75mm">' + dateLine(o.docDate, o) + '</div>', 0, { sig: true }));
            var ow = ownerBlock(o); if (ow) b.push(ow);
            return b;
        }
        function orderLike(o, s, kind) {
            var b = [];
            b.push(B(emblem(o, 3, s), 0, { head: true }));
            b.push(B('<div class="tdoc-c">' + T((kind === 'order' ? 'คำสั่ง' : 'ประกาศ') + (o.issuerTitle || ''), o) + '</div>' +
                (kind === 'order' ? '<div class="tdoc-c">ที่ ' + (o.orderNo ? T(o.orderNo, o) : '<span class="tdoc-blank" style="min-width:18mm"></span>') + '/' + T(o.orderYear || '', o) + '</div>' : '') +
                '<div class="tdoc-c">เรื่อง ' + T(o.subject, o) + '</div><div style="height:3mm"></div><div class="tdoc-rule"></div><div style="height:4mm"></div>', 4 * PT, { head2: true }));
            (o.paras || []).forEach(function (t, i) { b.push(P(t, o, i ? 6 * PT : 0)); });
            if (o.tail) b.push(P(o.tail, o));
            var p = dParts(o.docDate);
            b.push(B('<div style="padding-left:50mm">' + (kind === 'order' ? 'สั่ง' : 'ประกาศ') + ' ณ วันที่ ' + (p ? T(p.d, o) + ' ' + p.m + ' พ.ศ. ' + T(p.y, o) : dateLine('', o, true)) + '</div>', 12 * PT, { sig: true, closing: true }));
            b.push(signature(o.signerName, o.signerPosition, o, 0));
            return b;
        }
        function certify(o, s) {
            var b = [];
            b.push(letterhead(o, 'เลขที่ ' + (o.certNo ? T(o.certNo, o) : '<span class="tdoc-blank" style="min-width:14mm"></span>') + '/' + T(o.certYear || '', o), [o.orgName, o.orgAddress].filter(Boolean).join('\n'), s));
            b.push(B('<div style="height:' + EMPTY(1) + 'px"></div>', 0));
            (o.paras || []).forEach(function (t, i) { b.push(P(t, o, i ? 6 * PT : 0)); });
            var p = dParts(o.docDate);
            b.push(B('<div style="padding-left:50mm">ให้ไว้ ณ วันที่ ' + (p ? T(p.d, o) + ' ' + p.m + ' พ.ศ. ' + T(p.y, o) : dateLine('', o, true)) + '</div>', 12 * PT, { sig: true, closing: true }));
            b.push(signature(o.signerName, o.signerPosition, o, 0));
            return b;
        }
        function meetingHead(o, title) {
            var p = dParts(o.meetDate);
            var when = p ? 'วัน' + p.wd + 'ที่ ' + T(p.d, o) + ' ' + p.m + ' พ.ศ. ' + T(p.y, o) : 'วัน<span class="tdoc-blank" style="min-width:16mm"></span>ที่ <span class="tdoc-blank" style="min-width:30mm"></span>';
            if (o.timeText) when += ' เวลา ' + T(o.timeText, o) + (/น\.?$/.test(o.timeText) ? '' : ' น.');
            return B('<div class="tdoc-c tdoc-bold">' + T(title + (o.title || ''), o) + '</div>' + (o.meetingNo ? '<div class="tdoc-c tdoc-bold">ครั้งที่ ' + T(o.meetingNo, o) + '</div>' : '') +
                '<div class="tdoc-c tdoc-bold">' + when + '</div>' + (o.place ? '<div class="tdoc-c tdoc-bold">ณ ' + T(o.place, o) + '</div>' : '') +
                '<div style="height:3mm"></div><div class="tdoc-dash"></div><div style="height:3mm"></div>', 0, { head: true });
        }
        function people(label, list, o, withNote) {
            if (!list || !list.length) return [];
            var out = [B('<div class="tdoc-bold">' + label + '</div>', 6 * PT, { keep: true, text: label })];
            list.forEach(function (x, i) {
                out.push(B('<div class="tdoc-row"><span class="k" style="width:9mm;text-align:right">' + T(i + 1, o) + '.</span><span class="v" style="display:flex;gap:4mm"><span style="width:62mm">' + T(x.name, o) + '</span><span style="flex:1">' + T(x.position, o) +
                    (withNote && x.note ? ' (' + T(x.note, o) + ')' : '') + '</span></span></div>', 0));
            });
            return out;
        }
        function minutes(o) {
            var b = [meetingHead(o, 'รายงานการประชุม')];
            b = b.concat(people('ผู้มาประชุม', o.present, o), people('ผู้ไม่มาประชุม', o.absent, o, true), people('ผู้เข้าร่วมประชุม', o.attend, o));
            b.push(B('<div class="tdoc-bold">เริ่มประชุมเวลา ' + T(o.timeStart || '', o) + (o.timeStart && !/น\.?$/.test(o.timeStart) ? ' น.' : '') + '</div>', 10 * PT, { keep: true, text: 'เริ่มประชุมเวลา' }));
            if (o.opening) String(o.opening).split(/\n+/).forEach(function (t) { b.push(P(t, o, 0)); });
            (o.agendas || []).forEach(function (a, ai) {
                b.push(B('<div class="tdoc-bold">วาระที่ ' + T(ai + 1, o) + ' ' + T(a.title, o) + '</div>', 8 * PT, { keep: true, text: 'วาระที่' }));
                if (a.detail) String(a.detail).split(/\n+/).forEach(function (t) { b.push(P(t, o, 0)); });
                (a.items || []).forEach(function (it, ii) {
                    b.push(P(num((ai + 1) + '.' + (ii + 1), o) + ' ' + it.text, o, 4 * PT, 'item'));
                    if (it.resolution) { b.push(B('<div class="tdoc-bold" style="padding-left:25mm">มติที่ประชุม</div>', 2 * PT, { keep: true, text: 'มติที่ประชุม' })); b.push(P(it.resolution, o, 0)); }
                });
                if (a.resolution) { b.push(B('<div class="tdoc-bold" style="padding-left:25mm">มติที่ประชุม</div>', 2 * PT, { keep: true, text: 'มติที่ประชุม' })); b.push(P(a.resolution, o, 0)); }
            });
            b.push(B('<div class="tdoc-bold">เลิกประชุมเวลา ' + T(o.timeEnd || '', o) + (o.timeEnd && !/น\.?$/.test(o.timeEnd) ? ' น.' : '') + '</div>', 10 * PT, { sig: true }));
            var signer = function (p, role) {
                p = p || {};
                return '<div style="margin-left:65mm"><div style="height:' + EMPTY(2) + 'px"></div><div><span class="tdoc-blank" style="min-width:45mm"></span> ' + role + '</div>' +
                    '<div style="padding-left:2mm">(' + (p.name ? T(p.name, o) : '<span class="tdoc-blank" style="min-width:42mm"></span>') + ')</div>' + (p.position ? '<div style="padding-left:2mm">' + T(p.position, o) + '</div>' : '') + '</div>';
            };
            b.push(B(signer(o.recorder, 'ผู้จดรายงานการประชุม') + signer(o.checker, 'ผู้ตรวจรายงานการประชุม'), 0, { sig: true }));
            return b;
        }
        function agenda(o) {
            var b = [meetingHead(o, 'ระเบียบวาระการประชุม')];
            (o.agendas || []).forEach(function (a, ai) {
                b.push(B('<div class="tdoc-bold">วาระที่ ' + T(ai + 1, o) + ' ' + T(a.title, o) + '</div>', 8 * PT, { keep: true, text: 'วาระที่' }));
                if (a.detail) String(a.detail).split(/\n+/).forEach(function (t) { b.push(P(t, o, 0)); });
                (a.items || []).forEach(function (it, ii) { b.push(P(num((ai + 1) + '.' + (ii + 1), o) + ' ' + it.text, o, 2 * PT, 'item')); });
            });
            return b;
        }
        var BUILD = { external: external, memo: memo, stamped: stamped, order: function (o, s) { return orderLike(o, s, 'order'); }, announce: function (o, s) { return orderLike(o, s, 'announce'); },
            certify: certify, minutes: minutes, agenda: agenda };

        /* ---------- measuring + splitting a paragraph by words (Thai has no spaces: Intl.Segmenter finds word ends) ---------- */
        var segCache = {};
        function words(text) {
            if (segCache[text]) return segCache[text];
            var out = [];
            try {
                var sg = new Intl.Segmenter('th', { granularity: 'word' });
                for (var x of sg.segment(text)) out.push(x.segment);
            } catch (e) { out = text.split(/(\s+)/).filter(function (x) { return x !== ''; }); }
            var cache = Object.keys(segCache); if (cache.length > 400) segCache = {};
            segCache[text] = out; return out;
        }
        function paraHtml(blk, text, cont) {
            var item = blk.cls === 'item';
            return '<p class="tdoc-b tdoc-p' + (cont ? ' cont' : '') + '"' + (item ? ' style="text-indent:' + (cont ? 0 : 12) + 'mm;padding-left:' + (cont ? 0 : 0) + 'mm"' : '') + '>' + nl(text, blk.o) + '</p>';
        }
        function measure(meas, html) { meas.innerHTML = html; return meas.getBoundingClientRect().height; }

        /** blocks → pages. Returns [{ html, cont }] — cont = word carried to the next page (printed at the bottom right). */
        function paginate(blocks, o, meas) {
            var H = (PAGE.h - PAGE.top - PAGE.bottom) * MM;
            var pages = [], cur = [], used = 0, first = true, pno = 1;
            var startPage = function () { cur = []; used = first ? 0 : LH * 1.6; };   // later pages: page number line at the top [ก]
            var flush = function (contWord) { pages.push({ items: cur, cont: contWord || '', first: first, pno: pno }); first = false; pno++; startPage(); };
            startPage();
            var queue = blocks.slice();
            var firstWord = function (b) {
                if (!b) return '';
                var t = b.kind === 'para' ? b.text : (b.text || (b.html || '').replace(/<[^>]+>/g, ' '));
                var w = words(String(t).trim()).filter(function (x) { return /\S/.test(x); });
                return w[0] || '';
            };
            var guard = 0;
            while (queue.length && guard++ < 2000) {
                var b = queue.shift();
                var sb = cur.length ? b.sb : 0;
                var html = b.kind === 'para' ? paraHtml(b, b.text, b.cont) : b.html;
                var h = measure(meas, html);
                var room = H - used - sb;
                var next = queue[0];
                // keep a heading with the first line of what follows it
                var needAfter = b.keep && next ? (next.kind === 'para' ? LH : measure(meas, next.html)) + (next.sb || 0) : 0;
                if (h + needAfter <= room + 0.5) { cur.push({ html: html, sb: sb, blk: b.kind === 'para' ? b : null }); used += sb + h; continue; }
                if (b.kind === 'para' && room > LH * 1.5) {
                    // split: as many words as fit, leaving one line for the continuation word
                    var ws = words(b.text), lo = 0, hi = ws.length, limit = room - LH;
                    while (lo < hi) { var mid = Math.ceil((lo + hi) / 2); if (measure(meas, paraHtml(b, ws.slice(0, mid).join(''), b.cont)) <= limit + 0.5) lo = mid; else hi = mid - 1; }
                    if (lo > 0 && lo < ws.length) {
                        var head = ws.slice(0, lo).join(''), tail = ws.slice(lo).join('').replace(/^\s+/, '');
                        // at least 2 lines must go on with the closing / signature [ก]
                        var tailH = measure(meas, paraHtml(b, tail, true));
                        var nextIsSig = queue[0] && queue[0].sig;
                        if (nextIsSig && tailH < LH * 1.9) {
                            var lo2 = lo; while (lo2 > 0 && measure(meas, paraHtml(b, ws.slice(lo2).join('').replace(/^\s+/, ''), true)) < LH * 1.9) lo2--;
                            if (lo2 > 0) { head = ws.slice(0, lo2).join(''); tail = ws.slice(lo2).join('').replace(/^\s+/, ''); }
                        }
                        cur.push({ html: paraHtml(b, head, b.cont), sb: sb, blk: Object.assign({}, b, { text: head }) });
                        queue.unshift(Object.assign({}, b, { text: tail, cont: true, sb: 0 }));
                        flush(firstWord(queue[0]));
                        continue;
                    }
                }
                if (!cur.length) { cur.push({ html: html, sb: 0 }); used += h; flush(firstWord(queue[0])); continue; }   // larger than a page: placed alone
                // a signature group that does not fit takes the last 2 lines of the paragraph before it along [ก]
                if (b.sig && cur.length) {
                    var lastIdx = cur.length - 1, last = cur[lastIdx];
                    var lastBlk = last.blk;
                    if (lastBlk && lastBlk.kind === 'para') {
                        var lw = words(lastBlk.text), total = measure(meas, last.html);
                        if (total > LH * 2.5) {
                            var k = lw.length; while (k > 0 && measure(meas, paraHtml(lastBlk, lw.slice(k).join('').replace(/^\s+/, ''), true)) < LH * 1.9) k--;
                            if (k > 0) {
                                cur[lastIdx] = { html: paraHtml(lastBlk, lw.slice(0, k).join(''), lastBlk.cont), sb: last.sb };
                                queue.unshift(b); queue.unshift(Object.assign({}, lastBlk, { text: lw.slice(k).join('').replace(/^\s+/, ''), cont: true, sb: 0 }));
                                flush(firstWord(queue[0]));
                                continue;
                            }
                        }
                    }
                }
                queue.unshift(Object.assign({}, b));
                flush(firstWord(b));
            }
            if (cur.length || !pages.length) pages.push({ items: cur, cont: '', first: first, pno: pno });
            return pages;
        }

        /** Build the paginated pages for a document. settings = letterhead defaults + emblem. Returns { pages: [html], count }. */
        function render(o, settings, host) {
            var fn = BUILD[o && o.type];
            if (!fn) return { pages: [], count: 0, error: 'ไม่รู้จักประเภทเอกสาร' };
            var blocks = [];
            // a line break inside a paragraph starts a new line with the same first-line indent (e.g. a list of names)
            fn(o, settings || {}).filter(Boolean).forEach(function (b) {
                if (b.kind !== 'para' || b.text.indexOf('\n') < 0) { blocks.push(b); return; }
                b.text.split('\n').forEach(function (t, i) { if (t.trim() || i === 0) blocks.push(Object.assign({}, b, { text: t, sb: i ? 0 : b.sb })); });
            });
            var meas = document.createElement('div');
            meas.className = 'tdoc-measure';
            (host || document.body).appendChild(meas);
            var pages;
            try {
                pages = paginate(blocks, o, meas);
            } finally { meas.remove(); }
            var html = pages.map(function (pg, i) {
                var body = pg.items.map(function (it) { return '<div style="margin-top:' + it.sb.toFixed(1) + 'px">' + it.html + '</div>'; }).join('');
                var top = pg.first ? '' : '<div class="tdoc-pno">-' + num(pg.pno, o) + '-</div>';
                var speed = pg.first && o.speed ? '<div class="tdoc-speed">' + esc(o.speed) + '</div>' : '';
                var secret = o.secret ? '<div class="tdoc-secret" style="top:5mm">' + esc(o.secret) + '</div><div class="tdoc-secret" style="bottom:5mm">' + esc(o.secret) + '</div>' : '';
                var cont = pg.cont ? '<div class="tdoc-cont">' + T(pg.cont, o) + '...</div>' : '';
                return '<div class="tdoc-page" data-page="' + (i + 1) + '">' + secret + speed + top + '<div class="tdoc-body"' + (pg.first ? '' : ' style="top:' + (PAGE.top + LH * 1.6 / MM).toFixed(2) + 'mm"') + '>' + body + '</div>' + cont + '</div>';
            });
            return { pages: html, count: html.length };
        }

        /** Wait until the document face is ready (so measuring uses the real font). */
        function ready() {
            var st = document.getElementById('tdoc-css');
            if (!st) { st = document.createElement('style'); st.id = 'tdoc-css'; st.textContent = css(); document.head.appendChild(st); }
            if (!document.fonts || !document.fonts.load) return Promise.resolve(true);
            return Promise.race([
                Promise.all([document.fonts.load('16pt "TSS Doc Sarabun"', 'ทดสอบ'), document.fonts.load('bold 16pt "TSS Doc Sarabun"', 'ทดสอบ')]).then(function (f) { return !!(f[0] && f[0].length); }),
                new Promise(function (r) { setTimeout(function () { r(false); }, 6000); })
            ]).catch(function () { return false; });
        }

        /** Print only the pages, from an isolated frame (no app UI), with the A4 page size of the template. */
        function print(pages, title) {
            return new Promise(function (resolve, reject) {
                var frame = document.createElement('iframe');
                frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
                frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
                document.body.appendChild(frame);
                try {
                    var w = frame.contentWindow, d = w.document;
                    var st = d.createElement('style');
                    st.textContent = css() + '\n@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}.tdoc-page{break-after:page;page-break-after:always}.tdoc-page:last-child{break-after:auto;page-break-after:auto}';
                    d.head.appendChild(st);
                    d.body.className = 'tdoc-print';
                    d.body.innerHTML = pages.join('');
                    d.title = title || 'เอกสาร';
                    var go = function () {
                        var prev = document.title; document.title = d.title;
                        try { w.focus(); w.print(); } finally { document.title = prev; }
                        setTimeout(function () { frame.remove(); }, 1500);
                        resolve(true);
                    };
                    var fl = d.fonts && d.fonts.load ? Promise.all([d.fonts.load('16pt "TSS Doc Sarabun"', 'ก'), d.fonts.load('bold 16pt "TSS Doc Sarabun"', 'ก')]) : Promise.resolve();
                    var imgs = Array.prototype.slice.call(d.images).map(function (im) { return im.complete ? Promise.resolve() : new Promise(function (r) { im.onload = im.onerror = r; }); });
                    Promise.race([Promise.all([fl].concat(imgs)), new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { setTimeout(go, 150); }, function () { setTimeout(go, 150); });
                } catch (e) { frame.remove(); reject(e); }
            });
        }

        return { render: render, css: css, ready: ready, print: print, dParts: dParts, PAGE: PAGE };
    })();
    