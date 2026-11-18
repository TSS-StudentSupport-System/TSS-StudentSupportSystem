
    /* ===== TssReport — printable A4 report of ONE saved screening assessment (PHQ-A, SNAP-IV, GAST, KUS-SI, LD screening) or request form (แบบ ปสค.๑/๒) =====
       Layout follows the original paper form of each instrument (supplied by the school): the same item table with the
       chosen answer marked, the same totals, then the manual's interpretation table with this result highlighted.
       Content only from the saved record + the instrument content of the same version; nothing is invented.
       Built as body markup + a scoped stylesheet (no page-level tags), so it can be shown in the app and in a print frame. */
    window.TssReport = (function () {
        var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
        var TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        var dLong = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? Number(m[3]) + ' ' + TH[Number(m[2]) - 1] + ' พ.ศ. ' + (Number(m[1]) + 543) : '—'; };
        var dTime = function (iso) { try { var d = new Date(iso); var p = function (n) { return (n < 10 ? '0' : '') + n; }; var b = new Date(d.getTime() + 7 * 3600000);
            return dLong(b.toISOString().slice(0, 10)) + ' เวลา ' + p(b.getUTCHours()) + ':' + p(b.getUTCMinutes()) + ' น.'; } catch (e) { return '—'; } };
        var CHECK = '✓';
        // drawn tick (the ✓ glyph is missing from some fonts used when the page is turned into a PDF image)
        var MARK = '<svg class="tick" viewBox="0 0 16 16" width="15" height="15" aria-label="เลือก" role="img"><path d="M2.5 8.6l3.6 3.6L13.6 4" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        // y-m-d age, as on the KUS-SI form (ส่วนที่ 3)
        var ageYMD = function (birth, on) {
            var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth || ''), b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(on || '');
            if (!a || !b) return null;
            var y = +b[1] - +a[1], m = +b[2] - +a[2], d = +b[3] - +a[3];
            if (d < 0) { m -= 1; d += new Date(Date.UTC(+b[1], +b[2] - 1, 0)).getUTCDate(); }
            if (m < 0) { y -= 1; m += 12; }
            return y >= 0 ? { y: y, m: m, d: d } : null;
        };
        var FILE = { PHQA: 'PHQ-A', SNAP: 'SNAP-IV', GAST: 'GAST', KUSSI: 'KUS-SI', EQ: 'EQ', NINES: '9S-Plus', LDS: 'LD-Screening', PSK: 'PSK', Q298: '2Q9Q8Q', BES: 'BioEdSocial' };
        var KFORM = { adhd: 'ADHD', reading: 'LD-Reading', writing: 'LD-Writing', math: 'LD-Math', autism: 'Autism', primary: 'Primary', secondary: 'Secondary', psk1: '1', psk2: '2' };

        function fileName(src) {
            var it = src.item, code = it.toolCode.slice(2);
            return (FILE[code] || code) + (code === 'KUSSI' || code === 'LDS' ? '_' + (KFORM[it.instrument.form] || it.instrument.form) : code === 'PSK' ? (KFORM[it.instrument.form] || '') : '') + '_' + src.client.id + '_' + it.assessedDate + '.pdf';
        }

        function css() {
            return [
                '.ilr-doc{font-family:"Sarabun","TH Sarabun New","Leelawadee UI","Noto Sans Thai",Tahoma,sans-serif;color:#111;font-size:12.5pt;line-height:1.45;background:#fff;width:168mm;box-sizing:border-box}',
                '.ilr-doc *{box-sizing:border-box}',
                '.ilr-doc .sysbar{display:flex;justify-content:space-between;gap:8px;font-size:9pt;color:#555;border-bottom:1px solid #999;padding-bottom:2mm;margin-bottom:4mm}',
                '.ilr-doc h1{font-size:15.5pt;font-weight:700;text-align:center;margin:0}',
                '.ilr-doc h1 small{display:block;font-size:12pt;font-weight:700;margin-top:1mm}',
                '.ilr-doc h2{font-size:13pt;font-weight:700;margin:5mm 0 2mm;break-after:avoid;page-break-after:avoid}',
                '.ilr-doc p{margin:1.5mm 0}',
                '.ilr-doc .fields{display:flex;flex-wrap:wrap;gap:1.5mm 6mm;margin:4mm 0 3mm;font-size:12pt}',
                '.ilr-doc .fields span b{font-weight:700}',
                '.ilr-doc .instr{margin:2mm 0 3mm}',
                '.ilr-doc table{width:100%;border-collapse:collapse;margin:2mm 0 3mm;font-size:11pt;line-height:1.35}',
                '.ilr-doc th,.ilr-doc td{border:1px solid #333;padding:0.9mm 1.8mm;vertical-align:top;word-break:normal;overflow-wrap:break-word}',
                '.ilr-doc thead th{background:#f0f0f0;text-align:center;font-weight:700;vertical-align:middle}',
                '.ilr-doc td.c,.ilr-doc th.c{text-align:center;vertical-align:middle;white-space:nowrap}',
                '.ilr-doc td.mark{text-align:center;vertical-align:middle;font-size:13pt;font-weight:700}',
                '.ilr-doc svg.tick{display:inline-block;vertical-align:middle}',
                '.ilr-doc tr.sec td{background:#f6f6f6;font-weight:700;text-align:center}',
                '.ilr-doc tr.tot td{font-weight:700}',
                '.ilr-doc tr.hit td{background:#ececec;font-weight:700}',
                '.ilr-doc .num{display:inline-block;min-width:6mm;text-align:center}',
                '.ilr-doc .circ{display:inline-flex;align-items:center;justify-content:center;width:6.2mm;height:6.2mm;border:1.4px solid #111;border-radius:50%;font-weight:700}',
                '.ilr-doc .box{border:1px solid #333;padding:2.5mm 3mm;margin:3mm 0;break-inside:avoid;page-break-inside:avoid}',
                '.ilr-doc .alert{border:2px solid #111;padding:2.5mm 3mm;margin:3mm 0;break-inside:avoid;page-break-inside:avoid}',
                '.ilr-doc .note{font-size:10.5pt;color:#333}',
                '.ilr-doc .copy{text-align:right;font-size:10pt;margin-top:1mm}',
                '.ilr-doc .foot{margin-top:4mm;padding-top:2mm;border-top:1px solid #999;font-size:9.5pt;color:#444}',
                '.ilr-doc .grid2{display:flex;gap:5mm}.ilr-doc .grid2>div{flex:1;min-width:0}',
                '.ilr-doc .opt{display:inline-block;margin-right:5mm}',
                '.ilr-doc .pb{break-before:page;page-break-before:always}',
                '.ilr-doc tr{break-inside:avoid;page-break-inside:avoid}',
                '.ilr-doc svg.cb{display:inline-block;vertical-align:-1px}',
                '.ilr-doc .fl{display:inline-block;border-bottom:1px dotted #333;padding:0 1.2mm;line-height:1.25;vertical-align:baseline;text-align:center}',
                '.ilr-doc .ln{border-bottom:1px dotted #333;height:6.5mm}',
                '.ilr-doc .sig,.ilr-doc .sig2{margin:5mm 0 3mm 40%}.ilr-doc .sig2{margin-left:0}.ilr-doc .sig p,.ilr-doc .sig2 p{margin:1.2mm 0}',
                '.ilr-doc .psk{font-size:10pt;line-height:1.27}.ilr-doc .psk p{margin:0.35mm 0}',
                '.ilr-doc .psk p.r{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:1.2mm;white-space:nowrap}',
                '.ilr-doc .psk p.r .fl{flex:1 1 auto;min-width:9mm !important;white-space:normal}.ilr-doc .psk p.r .fl:empty{flex-shrink:1}',
                '.ilr-doc .psk p.r .opt,.ilr-doc .psk p.r .opt2{margin-right:1.5mm}',
                '.ilr-doc .psk h1{font-size:12pt;line-height:1.25}.ilr-doc .psk h1 small{font-size:11pt;margin-top:0.3mm}',
                '.ilr-doc .psk h3{font-size:11pt;font-weight:700;margin:1.5mm 0 0.8mm;padding-bottom:0.6mm;border-bottom:1.6px solid #111}',
                '.ilr-doc .opt2{display:inline-block;margin-right:2.5mm;white-space:nowrap}',
                '.ilr-doc .g2{display:grid;grid-template-columns:1fr 1fr;gap:0.6mm 4mm}.ilr-doc .g3{display:grid;grid-template-columns:auto auto auto;justify-content:start;gap:0.6mm 5mm}',
                '.ilr-doc .idb{display:inline-flex;align-items:center;vertical-align:middle}.ilr-doc .idb i{display:inline-block;width:4.8mm;height:5.6mm;border:1px solid #111;margin-left:-1px;font-style:normal;text-align:center;line-height:5.4mm;font-size:10.5pt}.ilr-doc .idb b{font-weight:400;padding:0 0.8mm}',
                '.ilr-doc table.mt{font-size:9.5pt}.ilr-doc table.mt th{font-size:9pt;line-height:1.2;padding:0.6mm}',
                '.ilr-doc .fillp{border-bottom:1px dotted #333;white-space:pre-wrap}',
                '.ilr-doc .bx{border:1px solid #111;margin:3mm 0;break-inside:avoid;page-break-inside:avoid}.ilr-doc .bxh{background:#e9eef6;border-bottom:1px solid #111;padding:1mm 2.5mm}.ilr-doc .bxh.solo{border:1px solid #111;margin:2mm 0 3mm}.ilr-doc .bxb{padding:1.5mm 2.5mm}.ilr-doc .bxb.bt{border-top:1px solid #111}',
                '.ilr-doc .tag{display:inline-block;border:1px solid #1e3a8a;background:#e5e7eb;padding:1.2mm 8mm;font-weight:700}',
                '.ilr-doc .sysnote{margin-top:6mm;font-size:8.5pt;color:#555;border-top:1px solid #bbb;padding-top:1.5mm}',
                '.ilr-doc .bes-t td{width:33.3%;font-size:10.5pt;padding:1.2mm 2mm}', '.ilr-doc .bes-t td.bes-on,.ilr-doc .bes-hl{background:#fff200 !important;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}', '.ilr-doc h2.c{text-align:center}'
            ].join('\n');
        }

        function header(src, title, sub) {
            return '<div class="sysbar"><span>รายงานผลการประเมินที่จัดทำจากระบบ TSS CareSpace — รูปแบบอ้างอิงแบบฟอร์มต้นฉบับ</span><span>เลขอ้างอิง ' + esc(src.item.id) + '</span></div>' +
                '<h1>' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</h1>';
        }
        // the student's name as in the case profile (no Case ID in the document body)
        function studentLabel(src) { return src.client.name ? esc(src.client.name) : '—'; }
        // grade as recorded in the profile; a value the spreadsheet once turned into a date (e.g. “5/4” → 2026-05-04) is not shown as a grade
        function gradeText(src) { var g = String(src.client.grade || '').trim(); return g && !/^\d{4}-\d{2}-\d{2}/.test(g) ? g : ''; }
        function respondentText(src) {
            var r = src.item.respondent || {};
            return [r.name, r.relation ? '(' + r.relation + ')' : ''].filter(Boolean).join(' ');
        }
        function footer(src, o, extra) {
            var it = src.item, n = it.notes || {};
            var h = '';
            if (n.observation || n.followUp) {
                h += '<h2>บันทึกของผู้ประเมิน</h2>';
                if (n.observation) h += '<p>' + esc(n.observation) + '</p>';
                if (n.followUp) h += '<p><b>ข้อควรติดตาม / ข้อเสนอแนะ:</b> ' + esc(n.followUp) + '</p>';
            }
            h += '<div class="note"><p><b>ข้อจำกัดในการตีความ:</b> ' + esc((it.result && it.result.disclaimer) || 'ผลการประเมินเป็นข้อมูลประกอบการพิจารณาเพื่อการคัดกรอง ไม่ใช่การวินิจฉัยโดยลำพัง') + (extra ? ' ' + esc(extra) : '') + '</p></div>';
            h += '<div class="foot">ผู้ประเมิน/ผู้บันทึก: ' + esc(it.assessorName) + ' • บันทึกผล ' + esc(dTime(it.finalizedAt)) + ' • เลขอ้างอิงการประเมิน (Assessment ID) ' + esc(it.id) +
                 ' • ฉบับแบบประเมินในระบบ ' + esc(it.instrument.version) + '<br>สร้างเอกสาร ' + esc(dTime(src.generatedAt)) + ' โดย ' + esc(src.preparedBy) +
                 ' • เอกสารนี้มีข้อมูลอ่อนไหวของนักเรียน ใช้เพื่อการดูแลช่วยเหลือเท่านั้น</div>';
            return h;
        }
        // item table in the layout of the paper form: one column per answer option, the chosen one marked
        function itemTable(f, it, opts) {
            opts = opts || {};
            var head = '<thead><tr><th style="width:auto">' + esc(opts.firstHead || 'ข้อคำถาม') + '</th>' + f.options.map(function (o) {
                return '<th class="c" style="width:' + (opts.colW || 19) + 'mm">' + (opts.pointsAbove ? '(' + o.points + ')<br>' : '') + esc(o.label) + (opts.pointsBelow ? '<br>(' + o.points + ' คะแนน)' : '') + '</th>'; }).join('') + '</tr></thead>';
            var rows = '';
            if (opts.stem) rows += '<tr class="sec"><td colspan="' + (f.options.length + 1) + '" style="text-align:left">' + esc(opts.stem) + '</td></tr>';
            f.items.forEach(function (q) {
                var sec = (f.sections || opts.sections || []).filter(function (s) { return s.from === q.no; })[0];
                if (sec) rows += '<tr class="sec"><td colspan="' + (f.options.length + 1) + '">' + esc(sec.label) + '</td></tr>';
                var a = it.answers[q.no];
                rows += '<tr><td>' + q.no + '. ' + esc(q.text) + '</td>' + f.options.map(function (o, i) { return '<td class="mark"' + (a === i ? ' data-mark="1">' + MARK : '>') + '</td>'; }).join('') + '</tr>';
            });
            return '<table>' + head + '<tbody>' + rows + (opts.tail || '') + '</tbody></table>';
        }

        /* ---------- PHQ-A (2-page form: method page + questionnaire) ---------- */
        function phqa(src, def, o) {
            var it = src.item, r = it.result, f = def.forms[0];
            var cx = it.context || {};
            var h = header(src, 'แบบประเมินภาวะซึมเศร้าในวัยรุ่น', '(Thai version of The Patient Health Questionnaire for Adolescents: PHQ-A)');
            h += '<div class="fields"><span>นักเรียน: <b>' + studentLabel(src) + '</b></span><span>อายุ <b>' + (cx.ageYears != null ? esc(cx.ageYears) : '—') + '</b> ปี</span>' +
                 (src.client.gender === 'ชาย' || src.client.gender === 'หญิง' ? '<span>เพศ: <b>' + esc(src.client.gender) + '</b></span>' : '') + '<span>วันที่ <b>' + esc(dLong(it.assessedDate)) + '</b></span></div>';
            h += '<p class="instr"><b>คำชี้แจง:</b> ในช่วง <u>2 สัปดาห์</u>ที่ผ่านมา คุณมีอาการต่อไปนี้บ่อยแค่ไหน? (เครื่องหมายถูกแสดงคำตอบที่บันทึกไว้)</p>';
            var tail = '<tr class="tot"><td style="text-align:right">รวมคะแนน</td><td colspan="' + f.options.length + '" class="c">' + esc(r.score) + ' / 27</td></tr>';
            h += itemTable(f, it, { pointsAbove: true, colW: 19, firstHead: '', tail: tail });
            h += '<table><tbody>' + f.extras.map(function (x) { var v = it.extras[x.key];
                return '<tr><td>' + esc(x.text) + '<br><span class="opt">' + (v === true ? '☑' : '☐') + ' ใช่</span><span class="opt">' + (v === false ? '☑' : '☐') + ' ไม่ใช่</span></td></tr>'; }).join('') + '</tbody></table>';
            h += '<h2>การแปลผล (ตามคู่มือ)</h2><table><thead><tr><th>คะแนนรวม</th><th>ระดับภาวะซึมเศร้า</th><th>คำแนะนำ</th></tr></thead><tbody>' +
                 def.bands.map(function (b) { var hit = r.score >= b.min && r.score <= b.max;
                    return '<tr' + (hit ? ' class="hit"' : '') + '><td class="c">' + b.min + ' – ' + b.max + (hit ? ' ◀' : '') + '</td><td>' + esc(b.label) + (hit ? ' (ผลครั้งนี้)' : '') + '</td><td>' + esc(b.advice) + '</td></tr>'; }).join('') + '</tbody></table>';
            if (r.ageWarning) h += '<p class="box">' + esc(r.band) + '</p>';
            if (r.safety && r.safety.flag) h += '<div class="alert"><b>ข้อควรดำเนินการด้านความปลอดภัย:</b> ' + esc(r.safety.reasons.join(' • ')) + ' — หากพบความเสี่ยงต่อการคิดฆ่าตัวตาย จากข้อ 9 หรือ 2 ข้อคำถามเพิ่ม วัยรุ่นควรได้รับการประเมินความเสี่ยงการฆ่าตัวตายและเฝ้าระวังการฆ่าตัวตาย แม้คะแนนรวมจะไม่ถึงเกณฑ์ก็ตาม (หมายเหตุจากคู่มือ)</div>';
            h += '<p class="copy">' + esc(def.credit) + '</p>';
            return h + footer(src, o);
        }

        /* ---------- SNAP-IV (form p.68 + interpretation p.67) ---------- */
        function snap(src, def, o) {
            var it = src.item, r = it.result, f = def.forms.filter(function (x) { return x.key === it.instrument.form; })[0], cx = it.context || {};
            var h = header(src, 'แบบประเมินพฤติกรรม SNAP-IV (Short Form)');
            h += '<div class="fields"><span>ชื่อเด็ก: <b>' + studentLabel(src) + '</b></span>' + (src.client.gender === 'ชาย' || src.client.gender === 'หญิง' ? '<span>เพศ <b>' + esc(src.client.gender) + '</b></span>' : '') +
                 (cx.ageYears != null ? '<span>อายุ <b>' + esc(cx.ageYears) + '</b> ปี</span>' : '') + (gradeText(src) ? '<span>ชั้นเรียน <b>' + esc(gradeText(src)) + '</b></span>' : '') +
                 '<span>ผู้ตอบแบบสอบถาม: <b>' + esc(f.respondentLabel) + (respondentText(src) ? ' — ' + esc(respondentText(src)) : '') + '</b></span><span>วันที่ประเมิน <b>' + esc(dLong(it.assessedDate)) + '</b></span></div>';
            h += '<p class="instr">ว่าอาการในแต่ละข้อนั้นตรงกับลักษณะของเด็กที่ท่านประเมินเพียงใด (เครื่องหมายถูกแสดงคำตอบที่บันทึกไว้)</p>';
            h += itemTable(f, it, { colW: 17, sections: def.sections, firstHead: 'อาการ' });
            h += '<p class="copy">© นายแพทย์ณัทธร พิทยรัตน์เสถียร, จุฬาลงกรณ์มหาวิทยาลัย</p>';
            h += '<h2>การแปลผล (รวมคะแนนแต่ละด้านเปรียบเทียบกับคะแนนมาตรฐานของ' + (it.instrument.form === 'teacher' ? 'ครู' : 'ผู้ปกครอง') + ')</h2>';
            h += '<table><thead><tr><th>องค์ประกอบ</th><th class="c">คะแนนที่ได้</th><th class="c">คะแนนมาตรฐาน (' + (it.instrument.form === 'teacher' ? 'ครู' : 'ผู้ปกครอง') + ')</th><th>ผล</th></tr></thead><tbody>' +
                 (r.subscales || []).map(function (s) { return '<tr' + (s.level === 'concern' ? ' class="hit"' : '') + '><td>' + esc(s.label) + '</td><td class="c">' + s.score + ' / ' + s.max + '</td><td class="c">' + s.cutoff + '</td><td>' + esc(s.band) + '</td></tr>'; }).join('') + '</tbody></table>';
            h += '<p class="note">หากคะแนนที่ได้สูงกว่าคะแนนมาตรฐาน ให้สงสัยว่าเด็กมีปัญหาในด้านนั้น ๆ (ระบบถือว่า “สูงกว่า” หมายถึงมากกว่า ไม่รวมกรณีเท่ากับ)</p>';
            if (r.caution) h += '<p class="box"><b>ข้อจำกัด:</b> ' + esc(r.caution) + '</p>';
            return h + footer(src, o);
        }

        /* ---------- GAST (form p.74 / p.75 + criteria p.73) ---------- */
        function gast(src, def, o) {
            var it = src.item, r = it.result, form = it.instrument.form, f = def.forms.filter(function (x) { return x.key === form; })[0], cx = it.context || {};
            var title = 'แบบทดสอบการติดเกม GAST ' + (form === 'parent' ? 'ฉบับผู้ปกครอง' : 'ฉบับเด็กและวัยรุ่น');
            var h = header(src, title, '(Game Addiction Screening Test)');
            h += '<div class="fields"><span>นักเรียน: <b>' + studentLabel(src) + '</b></span>' + (cx.ageYears != null ? '<span>อายุ <b>' + esc(cx.ageYears) + '</b> ปี</span>' : '') +
                 (form === 'parent' && respondentText(src) ? '<span>ผู้ตอบ: <b>' + esc(respondentText(src)) + '</b></span>' : '') + '<span>วันที่ประเมิน <b>' + esc(dLong(it.assessedDate)) + '</b></span></div>';
            h += '<p class="instr"><b>คำแนะนำก่อนตอบแบบทดสอบ</b> พิจารณาเลือกคำตอบที่ใกล้เคียงกับพฤติกรรม' + (form === 'parent' ? 'ของลูกท่าน' : 'ของตัวท่าน') + 'มากที่สุดในช่วง 3 เดือนที่ผ่านมา (เครื่องหมายถูกแสดงคำตอบที่บันทึกไว้)</p>';
            var c = r.columns || { A: 0, B: 0, C: 0 };
            var tail = '<tr class="tot"><td style="text-align:right">รวมคะแนน</td><td class="c" style="background:#ddd"></td><td class="c">A = ' + c.A + '</td><td class="c">B = ' + c.B + '</td><td class="c">C = ' + c.C + '</td></tr>' +
                       '<tr class="tot"><td style="text-align:right" colspan="4">คะแนนรวมทั้งหมด A+B+C =</td><td class="c">' + r.score + '</td></tr>';
            h += itemTable(f, it, { stem: f.stem, pointsBelow: true, colW: 19, tail: tail });
            h += '<p class="copy">© สถาบันสุขภาพจิตเด็กและวัยรุ่นราชนครินทร์ กรมสุขภาพจิต</p>';
            var key = form === 'parent' ? 'parent' : cx.normSex, n = key ? def.norms[key] : null;
            var lab = form === 'parent' ? 'ฉบับผู้ปกครอง' : (key === 'male' ? 'ฉบับเด็กและวัยรุ่น ผู้ชาย' : key === 'female' ? 'ฉบับเด็กและวัยรุ่น ผู้หญิง' : '');
            h += '<h2>เกณฑ์การแปลผลคะแนน' + (lab ? ' — ' + esc(lab) : '') + '</h2>';
            if (n) {
                var rows = [['คะแนนต่ำกว่า ' + n[0], 0], ['คะแนนระหว่าง ' + n[0] + '-' + (n[1] - 1), 1], ['คะแนนมากกว่าหรือเท่ากับ ' + n[1], 2]];
                var gi = r.score < n[0] ? 0 : r.score < n[1] ? 1 : 2;
                h += '<table><thead><tr><th>คะแนนรวมของแบบทดสอบ GAST</th><th>กลุ่ม</th><th>ระดับความรุนแรงของปัญหา</th></tr></thead><tbody>' + rows.map(function (x) { var g = def.groups[x[1]], hit = x[1] === gi && !r.ageWarning;
                    return '<tr' + (hit ? ' class="hit"' : '') + '><td>' + esc(x[0]) + (hit ? ' ◀ ผลครั้งนี้' : '') + '</td><td>' + esc(g.label) + '</td><td>' + esc(g.meaning) + '</td></tr>'; }).join('') + '</tbody></table>';
            } else h += '<p class="box">ไม่ได้ระบุเกณฑ์ (ชาย/หญิง) — ไม่แปลผล</p>';
            if (r.ageWarning) h += '<p class="box">' + esc(r.band) + '</p>';
            h += '<h2>คะแนนรายด้าน (ประกอบการพิจารณา)</h2><table><thead><tr><th>ด้าน</th><th class="c">คะแนน</th></tr></thead><tbody>' +
                 (r.subscales || []).map(function (s) { return '<tr><td>' + esc(s.label) + '</td><td class="c">' + s.score + ' / ' + s.max + '</td></tr>'; }).join('') + '</tbody></table>';
            h += '<p class="note">' + esc(r.subscaleNote || '') + ' • แบบทดสอบการติดเกม GAST เป็นเพียงเครื่องมือที่ใช้ในการ “คัดกรอง” มิใช่ “วินิจฉัย” (ตามคู่มือ)</p>';
            return h + footer(src, o);
        }

        /* ---------- KUS-SI (page 1 ส่วน ก–ข + the rating scale page of this domain) ---------- */
        function kussi(src, def, o) {
            var it = src.item, r = it.result, form = it.instrument.form, f = def.forms.filter(function (x) { return x.key === form; })[0], cx = it.context || {};
            var h = header(src, 'แบบคัดกรองนักเรียนที่มีภาวะสมาธิสั้น บกพร่องทางการเรียนรู้ และออทิซึม', 'KUS-SI Rating Scales : ADHD/LD/Autism (PDDs)');
            var rp = respondentText(src);
            var dx = { yes: 'เคย', no: 'ไม่เคย', unknown: 'ไม่ทราบ' }[cx.priorDx];
            h += '<h2>ส่วน ก. สำหรับผู้ตอบแบบคัดกรอง</h2><div class="grid2"><div class="box"><b>ส่วนที่ 1 : ข้อมูลผู้ตอบแบบคัดกรอง</b><p>ชื่อผู้ตอบแบบคัดกรอง: ' + (rp ? esc(rp) : '—') + '</p><p>วันที่ตอบแบบคัดกรอง: ' + esc(dLong(it.assessedDate)) + '</p></div>' +
                 '<div class="box"><b>ส่วนที่ 2 : ข้อมูลนักเรียน</b><p>ชื่อนักเรียน: ' + studentLabel(src) + '</p>' + (gradeText(src) || cx.grade ? '<p>ชั้น: ' + esc(cx.grade ? 'ป.' + cx.grade : gradeText(src)) + '</p>' : '') +
                 (dx ? '<p>นักเรียนเคยได้รับการวินิจฉัยจากแพทย์ว่ามีภาวะผิดปกติ: ' + esc(dx) + (cx.priorDxText ? ' — ' + esc(cx.priorDxText) : '') + '</p>' : '') + '</div></div>';
            var age = ageYMD(src.client.birthDateISO, it.assessedDate);
            h += '<h2>ส่วน ข. สำหรับผู้ประเมิน</h2><div class="box"><b>ส่วนที่ 3 : อายุนักเรียน</b>' +
                 (age ? '<table><thead><tr><th></th><th class="c">ปี</th><th class="c">เดือน</th><th class="c">วัน</th></tr></thead><tbody>' +
                        '<tr><td>วันที่ตอบแบบคัดกรอง</td><td class="c" colspan="3">' + esc(dLong(it.assessedDate)) + '</td></tr>' +
                        '<tr><td>วันเกิดของนักเรียน</td><td class="c" colspan="3">' + esc(dLong(src.client.birthDateISO)) + '</td></tr>' +
                        '<tr class="tot"><td>อายุ</td><td class="c">' + age.y + '</td><td class="c">' + age.m + '</td><td class="c">' + age.d + '</td></tr></tbody></table>'
                      : '<p>อายุ ' + (cx.ageYears != null ? esc(cx.ageYears) + ' ปี (ผู้บันทึกระบุ — ไม่มีวันเกิดในแฟ้ม)' : '—') + '</p>') + '</div>' +
                 '<div class="box"><b>ส่วนที่ 4 : เกณฑ์การแปลผลคะแนน</b><table><thead><tr><th class="c" style="width:30mm">คะแนนที ADHD/LD</th><th class="c" style="width:30mm">Autism/PDDs</th><th class="c" style="width:14mm">กลุ่ม</th><th>ความหมาย</th></tr></thead><tbody>' +
                 [['≤ 50', '≤ 60'], ['51-60', '61-70'], ['61-70', '71-80'], ['≥ 71', '≥ 81']].map(function (x, i) { return '<tr><td class="c">' + x[0] + '</td><td class="c">' + x[1] + '</td><td class="c">' + (i + 1) + '</td><td>' + esc(def.groups[i].label) + '</td></tr>'; }).join('') + '</tbody></table></div>';
            h += '<h2>ส่วนที่ 5 : การแปลผลคะแนน — ' + esc(f.label) + '</h2>';
            if (r.normLabel) h += '<p class="note">ตารางเกณฑ์ปกติที่ใช้: ' + esc(r.normLabel) + ' (ภาคผนวกของคู่มือ)</p>';
            h += '<table><thead><tr><th>ผลสรุป</th>' + r.subscales.map(function (s) { return '<th class="c">' + esc(s.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
                 '<tr><td>คะแนนดิบ</td>' + r.subscales.map(function (s) { return '<td class="c">' + s.score + '</td>'; }).join('') + '</tr>' +
                 '<tr><td>คะแนนที</td>' + r.subscales.map(function (s) { return '<td class="c">' + (s.tText && s.tText !== '—' ? esc(s.tText) : '—') + '</td>'; }).join('') + '</tr>' +
                 '<tr class="hit"><td>กลุ่ม</td>' + r.subscales.map(function (s) { return '<td class="c">' + (s.groups && s.groups.length ? s.groups.join(' หรือ ') : '—') + '</td>'; }).join('') + '</tr></tbody></table>';
            var notes = r.subscales.filter(function (s) { return s.note; }).map(function (s) { return s.label + ': ' + s.note; });
            if (notes.length) h += '<p class="note">หมายเหตุ: ' + esc(notes.join(' • ')) + '</p>';
            if (r.ageWarning || r.subscales.some(function (s) { return /ไม่แปลผล/.test(s.band); })) h += '<p class="box">' + esc(r.ageWarning ? r.band : r.subscales[0].band) + '</p>';
            h += '<p class="note">ข้อเสนอแนะเพื่อการช่วยเหลือ: ' + (it.notes && it.notes.followUp ? esc(it.notes.followUp) : '—') + '</p>';
            // rating-scale page of this domain, numbers circled as on the paper form
            h += '<div class="pb"></div><h2>' + esc(f.label) + '</h2>';
            var au = form === 'autism', comp = f.itemComponents || [], cname = def.components || {};
            var head = '<thead><tr><th>ข้อความ</th>' + f.options.map(function (o2) { return '<th class="c" style="width:15mm">' + esc(o2.label) + '</th>'; }).join('') +
                       (au ? ['C', 'B', 'S'].map(function (k) { return '<th class="c" style="width:15mm">' + esc(cname[k]) + '</th>'; }).join('') : '') + '</tr></thead>';
            var rows = '';
            f.items.forEach(function (q) {
                var sec = (f.sections || []).filter(function (s) { return s.from === q.no; })[0];
                if (sec) rows += '<tr class="sec"><td colspan="' + (f.options.length + 1 + (au ? 3 : 0)) + '">' + esc(sec.label) + '</td></tr>';
                var a = it.answers[q.no];
                rows += '<tr><td>' + q.no + '. ' + esc(q.text) + '</td>' + f.options.map(function (o2, i) { return '<td class="c">' + (a === i ? '<span class="circ">' + o2.points + '</span>' : '<span class="num">' + o2.points + '</span>') + '</td>'; }).join('') +
                        (au ? ['C', 'B', 'S'].map(function (k) { return '<td class="c">' + (comp[q.no - 1] === k ? (a != null ? f.options[a].points : '') : '–') + '</td>'; }).join('') : '') + '</tr>';
            });
            var sums = '';
            if (form === 'adhd') sums = r.subscales.map(function (s) { return '<tr class="tot"><td colspan="' + (f.options.length + 1) + '" style="text-align:right">รวมคะแนนดิบ ' + esc(s.label.replace(/ \(.*\)$/, '')) + ' = ' + s.score + '</td></tr>'; }).join('');
            else if (au) sums = '<tr class="tot"><td colspan="' + (f.options.length + 1) + '" style="text-align:right">รวมคะแนนดิบแต่ละองค์ประกอบ</td>' + (r.components || []).map(function (c) { return '<td class="c">' + c.score + '</td>'; }).join('') + '</tr>' +
                               '<tr class="tot"><td colspan="' + (f.options.length + 4) + '" style="text-align:right">รวมคะแนนดิบ พฤติกรรมภาวะออทิซึม (3 องค์ประกอบ) = ' + r.score + '</td></tr>';
            else sums = '<tr class="tot"><td colspan="' + (f.options.length + 1) + '" style="text-align:right">รวมคะแนนดิบ = ' + r.score + '</td></tr>';
            h += '<table>' + head + '<tbody>' + rows + sums + '</tbody></table>';
            h += '<p class="copy">' + esc(def.credit) + '</p>';
            return h + footer(src, o, r.caution || '');
        }

        /* ---------- shared bits for the two paper forms below ---------- */
        // drawn boxes (glyphs such as ☐ ☑ ○ are missing from some fonts when the page becomes a PDF image)
        function CB(on) { return '<svg class="cb" viewBox="0 0 14 14" width="13" height="13" role="img" aria-label="' + (on ? 'เลือก' : 'ไม่เลือก') + '"><rect x="1" y="1" width="12" height="12" fill="#fff" stroke="#111" stroke-width="1.2"/>' + (on ? '<path d="M3.2 7.4l2.6 2.6L11 4" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' : '') + '</svg>'; }
        function RB(on) { return '<svg class="cb" viewBox="0 0 14 14" width="13" height="13" role="img" aria-label="' + (on ? 'เลือก' : 'ไม่เลือก') + '"><circle cx="7" cy="7" r="5.8" fill="#fff" stroke="#111" stroke-width="1.2"/>' + (on ? '<circle cx="7" cy="7" r="3" fill="#111"/>' : '') + '</svg>'; }
        // a filled-in blank of the paper form: the value on a dotted line (or just the dotted line)
        function F(v, mm) { return '<span class="fl" style="min-width:' + (mm || 30) + 'mm">' + esc(v == null ? '' : v) + '</span>'; }
        function L() { return '<div class="ln"></div>'; }
        var TD = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
        function thNum(n) { return String(n).replace(/\d/g, function (c) { return TD[+c]; }); }
        function idBoxes(id) {
            var d = String(id || ''), g = [1, 4, 5, 2, 1], k = 0;
            return '<span class="idb">' + g.map(function (n) { var s = ''; for (var i = 0; i < n; i++, k++) s += '<i>' + esc(d.charAt(k)) + '</i>'; return s; }).join('<b>-</b>') + '</span>';
        }
        function money(v) { if (v === '' || v == null) return ''; var n = Number(v); return isFinite(n) ? n.toLocaleString('th-TH') : String(v); }
        function dateTh(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? dLong(v) : (v || ''); }

        /* ---------- แบบคัดกรองบุคคลที่มีความบกพร่องทางการเรียนรู้ (ประถม/มัธยม) ---------- */
        function lds(src, def, o) {
            var it = src.item, r = it.result, form = it.instrument.form, f = def.forms.filter(function (x) { return x.key === form; })[0], cx = it.context || {};
            var a = ageYMD(src.client.birthDateISO, it.assessedDate), found = r.part1 && r.part1.found;
            var h = '<p class="copy" style="margin:0">ประเมินครั้งที่ ' + F(cx.round || '', 14) + '</p>';
            h += header(src, 'แบบคัดกรองบุคคลที่มีความบกพร่องทางการเรียนรู้', 'แบบคัดกรองบุคคลที่มีความบกพร่องทางการเรียนรู้ (' + (form === 'primary' ? 'ประถมศึกษา' : 'มัธยมศึกษา') + ')');
            h += '<p>ชื่อ-นามสกุล ' + F(src.client.name, 80) + '</p>';
            h += '<p>วัน เดือน ปี เกิด ' + F(src.client.birthDateISO ? dLong(src.client.birthDateISO) : '', 50) + ' อายุ ' + F(a ? a.y : (cx.ageYears != null ? cx.ageYears : ''), 12) + ' ปี ' + F(a ? a.m : '', 12) + ' เดือน</p>';
            h += '<p>ระดับชั้น ' + F(gradeText(src), 40) + ' วัน เดือน ปี ที่ประเมิน ' + F(dLong(it.assessedDate), 50) + '</p>';
            h += '<p><b>คำชี้แจง</b></p><div class="instr">' + String(f.instructions || '').split('\n').map(function (t) { return '<p style="margin:0.6mm 0 0.6mm 6mm">' + esc(t) + '</p>'; }).join('') + '</div>';
            var row = function (q, extra) {
                var v = it.answers[q.no], loc = q.no - (def.sections.filter(function (s) { return q.no >= s.from && q.no <= s.to; })[0] || { from: 1 }).from + 1;
                return '<tr><td class="c">' + thNum(loc) + '</td><td>' + esc(q.text) + (extra || '') + '</td><td class="mark"' + (v === 0 ? ' data-mark="1">' + MARK : '>') + '</td><td class="mark"' + (v === 1 ? ' data-mark="1">' + MARK : '>') + '</td></tr>';
            };
            var head = '<thead><tr><th rowspan="2" style="width:10mm">ที่</th><th rowspan="2">ลักษณะ / พฤติกรรม</th><th colspan="2">ผลการวิเคราะห์</th></tr><tr><th style="width:15mm">ใช่</th><th style="width:15mm">ไม่ใช่</th></tr></thead>';
            var ar = cx.p1Areas || {}, areas = '<br>' + [['reading', '๑.๑ ด้านการอ่าน'], ['writing', '๑.๒ ด้านการเขียน'], ['math', '๑.๓ ด้านการคำนวณ']].map(function (x) { return '<span class="opt">' + CB(!!ar[x[0]]) + ' ' + x[1] + '</span>'; }).join('');
            h += '<p><b>ส่วนที่ ๑</b> การวิเคราะห์เบื้องต้น / ข้อมูลพื้นฐานของบุคคลที่มีความบกพร่องทางการเรียนรู้</p>';
            h += '<table>' + head + '<tbody>' + f.items.filter(function (q) { return q.no <= 3; }).map(function (q) {
                return row(q.no === 2 ? { no: 2, text: q.text.replace(/\s*\(๑\.๑.*\)$/, '') } : q, q.no === 2 ? areas : ''); }).join('') + '</tbody></table>';
            h += '<p><b>เกณฑ์การพิจารณา</b> ถ้าตอบว่าใช่ ๓ ข้อ แสดงว่ามีแนวโน้มที่จะเป็นบุคคลที่มีความบกพร่องทางการเรียนรู้ควรสังเกตในส่วนที่ ๒ ต่อ</p>';
            h += '<p><b>ผลการพิจารณาส่วนที่ ๑</b> <span class="opt">' + CB(found) + ' พบ</span><span class="opt">' + CB(!found) + ' ไม่พบ (ถ้าพบสังเกตในส่วนที่ ๒ ต่อ)</span></p>';
            var cut = def.cutoffs[form], subs = {};
            (r.subscales || []).forEach(function (s) { subs[s.key] = s; });
            if (found) {
                h += '<div class="pb"></div><p><b>ส่วนที่ ๒</b> การวิเคราะห์ความบกพร่องทางการเรียนรู้ของเด็กในแต่ละด้าน</p>';
                var rows = '';
                def.domains.forEach(function (dm, di) {
                    rows += '<tr class="sec"><td></td><td style="text-align:left">' + thNum(di + 1) + '. ' + esc(dm.label) + '</td><td></td><td></td></tr>';
                    f.items.filter(function (q) { return q.no >= dm.from && q.no <= dm.to; }).forEach(function (q) { rows += row(q); });
                    rows += '<tr class="tot"><td></td><td style="text-align:right">ตอบว่าใช่ ' + subs[dm.key].score + ' ข้อ</td><td colspan="2"></td></tr>';
                });
                h += '<table>' + head + '<tbody>' + rows + '</tbody></table>';
                h += '<h2>เกณฑ์การพิจารณา</h2><table><thead><tr><th>ด้าน</th><th>เกณฑ์ (ตอบว่าใช่)</th><th>ผลครั้งนี้</th><th>ผล</th></tr></thead><tbody>' + def.domains.map(function (dm, di) {
                    var s = subs[dm.key], hit = s.level === 'concern';
                    return '<tr' + (hit ? ' class="hit"' : '') + '><td>' + thNum(di + 1) + '. ' + esc(dm.label) + '</td><td class="c">' + thNum(cut[dm.key]) + ' ข้อขึ้นไป</td><td class="c">' + s.score + ' ข้อ</td><td>' + (hit ? 'มีแนวโน้ม' + (hit ? ' ◀' : '') : 'ไม่ถึงเกณฑ์') + '</td></tr>'; }).join('') + '</tbody></table>';
                h += '<p class="note">หากพบว่ามีแนวโน้มที่จะเป็นบุคคลที่มีความบกพร่องทางการเรียนรู้ด้านใดด้านหนึ่ง หรือหลายด้าน ควรให้การช่วยเหลือตามความต้องการจำเป็นพิเศษทางการศึกษาของผู้เรียน และส่งต่อให้แพทย์ตรวจวินิจฉัยต่อไป</p>';
            } else {
                h += '<p class="box">ผลการพิจารณาส่วนที่ ๑: ไม่พบ — ไม่ได้สังเกตส่วนที่ ๒</p>';
            }
            var dom = (r.screen && r.screen.domains) || [];
            h += '<h2>ผลการคัดกรอง</h2><p><span class="opt">' + CB(dom.length > 0) + ' พบความบกพร่อง</span>' + [['RD', 'ด้านการอ่าน'], ['WR', 'ด้านการเขียน'], ['MA', 'ด้านการคำนวณ']].map(function (x) { return '<span class="opt">' + RB(dom.indexOf(x[0]) >= 0) + ' ' + x[1] + '</span>'; }).join('') + '</p>' +
                 '<p><span class="opt">' + CB(!dom.length) + ' ไม่พบความบกพร่อง</span></p>';
            if (r.screen && r.screen.behavior) h += '<p class="note">ด้านพฤติกรรมทั่วไป: ตอบว่าใช่ ' + subs.BH.score + ' ข้อ (เกณฑ์ ' + thNum(cut.BH) + ' ข้อขึ้นไป) — ถึงเกณฑ์ (แบบฟอร์มไม่มีช่องนี้ในผลการคัดกรอง)</p>';
            h += '<p><b>ความคิดเห็นเพิ่มเติม</b></p>' + ((it.notes || {}).observation ? '<p>' + esc(it.notes.observation) + '</p>' : L() + L());
            var resp = it.respondent || {};
            h += '<div class="sig2"><p>ลงชื่อ ' + F('', 45) + ' ใบวุฒิบัตร เลขที่ ' + F(cx.cert1 || '', 28) + ' (ผู้คัดกรอง)</p><p style="margin-left:10mm">( ' + F(resp.name || '', 50) + ' )</p>' +
                 '<p>ลงชื่อ ' + F('', 45) + ' ใบวุฒิบัตร เลขที่ ' + F(cx.cert2 || '', 28) + ' (ผู้คัดกรอง)</p><p style="margin-left:10mm">( ' + F(cx.screener2 || '', 50) + ' )</p></div>';
            h += '<div class="box"><p><b><u>คำยินยอมของผู้ปกครอง</u></b></p><p style="text-indent:10mm">ข้าพเจ้า (นาย / นาง / นางสาว) ' + F(cx.guardian || '', 60) + ' เป็นผู้ปกครอง</p>' +
                 '<p>ของ (ด.ช. / ด.ญ. / นาย / นางสาว) ' + F(src.client.name, 60) + '</p>' +
                 '<p><span class="opt">' + CB(cx.consent === 'yes') + ' ยินยอม</span><span class="opt">' + CB(cx.consent === 'no') + ' ไม่ยินยอม</span> ให้ดำเนินการคัดกรองตามแบบคัดกรองนี้</p>' +
                 '<p>เมื่อพบว่ามีแนวโน้มเป็นผู้ที่มีความบกพร่องตามแบบคัดกรองข้างต้น <span class="opt">' + CB(cx.service === 'yes') + ' ยินดี</span><span class="opt">' + CB(cx.service === 'no') + ' ไม่ยินดี</span> ให้จัดบริการช่วยเหลือทางการศึกษาพิเศษต่อไป</p>' +
                 '<p style="text-align:right">ลงชื่อ ' + F('', 50) + ' ผู้ปกครอง</p><p style="text-align:right">( ' + F(cx.guardian || '', 50) + ' )</p>' +
                 (cx.consent ? '<p class="note">ช่องที่ทำเครื่องหมายบันทึกจากคำยินยอมที่ผู้ปกครองแจ้ง/ลงนามไว้ — ลายมือชื่อต้องลงด้วยตนเอง</p>' : '') + '</div>';
            // “ความคิดเห็นเพิ่มเติม” is already printed above in the form's own place
            var src2 = Object.assign({}, src, { item: Object.assign({}, it, { notes: Object.assign({}, it.notes || {}, { observation: '' }) }) });
            return h + '<p class="copy">' + esc(def.credit) + '</p>' + footer(src2, o);
        }

        /* ---------- แบบคำขอรับความช่วยเหลือผู้ประสบปัญหาทางสังคม (แบบ ปสค.๑ / ปสค.๒) ---------- */
        var PSK_LOGO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAC0ALQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD7LooooAKKKKACio7qeC1t5Li5mjhhiUvJJIwVUUdSSeAPevE/F3xuuNU1Q+GvhdpEmu6m+R9rMZMKDoWVeNwH95iq/XpVRg5bHXhcFWxTaprRbvZL1Z7Lq+qadpFi99ql9bWVrH96aeUIg/E15L4l/aE8L2tz9h8M6dqHiS9Y4RYIzHGx9iQWb/gKmvLvFGmaTZX51D4v+NLzX9bA3LoelShzCT/C78JF9F2/U1X0Xxx4s1J5NH+FHg220O3Pys2nW3n3BH/TSdxgHvz+tbxorff8EfRYXI6Kjzy9/wA78sPv3fqlY7668UfHrxDCbqz0TTPCWn5/116VRgp7kykn8Qo+lcjqkV/KwXxb+0LaRZ6x6dNLcD6fuigqvqnwr8TXO3U/ib480vRlbLf8TG/NzN77ULBfwU/hTtI8J/B8MUtdV8Z+LXXg/wBkac4jz6ZVB+rVouVbfgv1PRpLD01enb/tyF//ACaV0ZN5Y/C3di9+Jfi/UR1LRaezKfxfNQNpnwkhcKfE3jqymKh1EmlIDtIyrcL0IwR7GrviDTPB80zWPh7wfqNlLZkm6/tG4zcRMDx5m5zEiH+4+Gbtjvc8XweGb3XLXULbQ5bmwt7OF7iK5ufNwjru8xvLIk+4UY9FjctnIyKrm9fwOuNTZc09b/yfLZW1K1jb+EY8Novxx1vSpOqpe2lzGM+5VwB+VdbosnxfiP8AxSnxM8PeLgcEQG8ieXHurqCPzrLj8PfC3UbFb7/hCviFptpMCYruzVrqBgCRuUozgjIPOKxm+HPw71icxeGPihaQXyni01q3+zyBuw3YQg/8BJqbp7/ijnlOlUvz3/7ehGS++K/U9HT41eNPC8gi+Ifw+uraEHBu7NSqfX5iUP8A32PpXo/gj4n+CvGDJDpOsxLdt0tLkeTN+Ct97/gOa8El0745/DyPdBNe6tpQHPlP/aFuy98o3zqMegrCPiH4beLWMfinw4/hTU92DqeiDMAbPWSA9PwyfcVDpRlqvw/yOGrlGGxEeenHTvB3++L1+SbZ9l0V81aH4i+JHw806PVbbUbfx/4Lxn7VBKZGhT3bl4yB1DblHcjt7P8ADj4i+GPHll5ui3mLpEDTWc2Fni9yM8r/ALS5HvWMqbjr0PnsXldXDx9pH3od109Vun6nXUUUVmeaFFFFABRRRQAUUUUAFYnjTxTovhDQ5dY1y7EFunyqoG55X7Ii9WY+n4nik8c+KdJ8HeHLjXNYm8uCIYRF5eZz91EHdj/9c8Cvmy9uX8WO3xR+KTyQ+Ho3Mei6LG5DXpzxGg4+Tj5n/ix2UAVpTp82r2PVy7LfrP7ypdQTtpu32Xn+W7LniDVvEXxUtJdf8T6l/wAIj8PLaT5QTlrog8Ko/wCW0hxjONoPQMRWFD4p1nW2/wCEH+EOgXOkafJ/rXhP+m3Q6eZPN/yzX8e+M9gthp/if4x6xJrGs3cOh+FdKBBmwEtbCJR/q4VOAz4Ayx6d+y16X4L0y717TP7D+G8EvhTwWDi511k/0/VCOCYdwyAf+eh/ADGK6W1FW/4Zf5n1FWdLCw5Wl7vT7EPXrKX49rbnE6P8PfB3hO/jsvFL3HjHxTJ86+HtHBdYye8rZHrklyo9j1Pqml+FviBrdolvfajY+A9EAwmk6BGrXAXnh5yNqn/cX8jTNF1bwr4Rs7nSvh9oUl+IstqGqqjNbIw+801wf9aw5JCkgdytY6yeM/Ft958lt4lht+TEJmFpbSADO5Y0RuD/AA+ZJnkZxWTk5HmV69fENyk7W6ytf5R2X4vrc7rQPhV4F0e4N2NDh1C+Y5e81JjdTOfUtJnn6V2qIkcYSNVRVGAqjAFeI6Jf3GkQWF5f6l9lsLyVTHe2VxKu3d2kV3kTeh4eIhejEM2Co6L+3PHDag2jWmoaHeXLSlrKSIiRpIMDbNPtG2JODnAJZmCrgAtWcot7s8vE4WvUledTm83f/g7fgYi+HL/SfEPiOfSGt5/Eb3n2uGG7IjDWhPzTxyOrR+Z86ozbThUC4Utlqul6jbeJ7K5SfUdLtdEhs0u7+ezREa1uJgwUpGI93ms2JN27OTsKHOD6hf6Fqd/pdpLd6hZtrVsXZZltSLdw4w8TRliTGwwDls5APUYrB8H+ALXTb0y/2Ro2j26TrcPa6bLJN58q8o0juqkIpOVjAwDg57U+ZW1N442nKDlN+8rWfp/WmmjvfQ1vhNo02heA9OsLhGidULCIqU8tSflXaSSp24JBJwSea19f8PaFr8Hka3o9hqMeMAXMCyY+hIyPwrnvF954u0a8fUUvtNOhoQSxtm8yDPGZeTuiHdl2soOSGANc1q2vau1nB/a+uQfb7u4b7Pp+lXW6NYMtskYxjzJCRgBAyhj0K/MVmzbucio1a1T20Zat30vf+kaL/CmHRy0/gHxJq3hWUHcLdJDc2THr80MhIx/ukda4fx7pkciFfi14LjCgYXxV4cUkJx96ZMb1HA6hl9gKtvo/iR5bp7eS8NxaeW8sel3sqvAzk4iLlpi8oChmGAqh15bOa2vD3jnxPZRva6p4c1zUngH761mtoxfeXx+9TaQsycgfdVs9ckgVom1ruepCVeD51NTa63tL/wAC/wA7o8gn8J+M/h4n/CYfD7XxrmgyDe15YYdSnpPCMggdyM4/2abpbeHvH99DqPhmaLwV48jbzIooZTHZ6g/XMTf8s5D/AHeh7hhzXr1t4csbxp/Fvwe1iLSNTD/6dpcqMlpcP3jngOGhk9wAf51514p8D6X47mvZfD2m/wDCMeOLL95qXh6dgiTnr5sDdOTyGXg98HmtYzT3/r1PVoY6NZt1HaS0crWa8px2a89v8LPQPhR8XZ7vVv8AhDPiDbf2R4khcRLJIvlpct2BHRXPbHyt/Ce1eyV8faZrFn46tl8E/EORtP8AENoxt9L1u4TbLHID/wAe91nkqTwGPOffk+o/Bn4iavpmvt8NviJvg1m3YRWV1K2ftAx8qM38RI5V/wCIcH5hznUpdUeTmmUW5qlKNmtXFbW/mj5d109D3Ciiiuc+aCiiigAqG9ureys5ry7mSC3gjaSWRzhUUDJJPoBU1eFftG6/qGv67pnwo8NNuvNSdH1Bh0SPqqNj+HALt7Ko/iqoR5nY68DhHiqyp3st2+yW7OP1fV4fij4mvvGXiaWaz+H3hw4ihOVa6c/djA7yScZx0UqvGSaxNIstT+MPjG51zXZ10fwtpEf791YJFY2yjKwR9g5AyW7df7opvjFG8TeJ9G+E/gg79J0qUwLJ2uLkf6+6kx1C/N/49jqK9N0Tw5p2u3aeANI/d+BPDEgbWrott/tW9HzGJiOqA8v74HQCuttRWn/DI+zqVYYWknH3XbT+5Dv/AIpP8fJMn0DSLbx1YQX19apofww0hd+m6a37sagE5+0T/wDTLgkKfvdTT9e8W3fjDVF8L+GtMurmxEY8yK2VVijh6KbhyQoDY+WEHoMvn/Viz4s1aPxjq1v4btzaWGgABrWW8wLW/ZWVFYRqQZo1cgLHlVYjJJAUMngCTVLjw+unqmqoIN4uf7Jhjikll3n95NKxwHKgHy0+6CMkZCrj5s8Zu0faTWq2Tekb9X3k+uzvbbY7jRPBGjW1larc2sryR+XJJC148sJkT7p2/KhCnoAigccDAx1eBXml34vfwvoNvrh1GfVNHuA8ccOoxmK5jmQlfL80LtyWBXEm3kHDnpVyTx7qMckcy6E11DLH5kdpas73bp90ShSoQKzhgoYqWA3DuBm4yZ5VXDYio+Z6rX/grU6q68NeHrq9a9udD02W6Z1dpntULsynKknGSQemelXbOxsrIOLO0t7cSNufyowm4+pwOTUei3F7daVbXOo2IsLqWMPJbeaJPKJ/hLAYJHfHGc1cqTjnKfwt7eZkeM9XOgeFNU1pY1laytZJlRmChiq5AJPbP/1ua8I+B3iu9g+ItrZPrp1ZfEEDy6gr2/kmO6XcwkyQMkqFXb12lP7tbnxx8a2euxXHg/SBDe2scpTU5CQFMsbKRAGONgBxvfggEBNzZFeYCy1XRrzT9W/tHw5JLZZnt2s7oXX2eUOZFjlUkny0BkG1QWAwRzlhvCC5XfqfT5bgIrCSjVVpT2v6aee+unkfYPUVl3PhzQLkKJ9F06QI7Ou62ThmGCenUjg1l/DrxppvjLSDPbMsOoW2E1CxLhntZckFSRwRlWww4IFdRWDTTsfMzjUoTcJaNEFhZWen2iWljaQWtun3IoYwiL9ABgVW1rRrDVhAbuJvNt3LwTRyGOSJiMHaykEZHBHQ965/xV4t1XRNTnsz4dnNr5ayQ6mWL2wXHz+YEUurLgnAByMHI5xkXXxGu4tTt9Aaws4dUuV2wTGWSWGUlhh40RSzoUZXByB94Fl2k01F7nRTwuIlaceuu/3/APBMjx3o2o+EL9Ne8N6Rqk1tbxgSPZTi4njQdco/zOg67CXB5x5Zw1Sf8SL4s6Vb3FpfJpnijTkFzp+pWZIdAekig4Yxk8NG3Kng9mbZuF1GK/vBBq/ivUL+yAE8tvFCLYOUDBVhOFb5SOBk89c151O7re6x4x+2aTpk2mXK/ZfJjMTl/IEspjyckON2+2kA5H3lb5jpHX1PWoJ1Ip39+O0tevRp7p3+6+hn+OPDUvxFhvbO+sLfTPiZosI+1WyYWLV7cfdkjJ657H+E/KeMY5Tw/cD4laAng7WZTB4w0lG/sK+mOx7hU5a0lY87hj5SeQRnqDn2/X7Obx5oltrOkRf2H480E+bBFMwEkb4yYnwfmglHQ9CCDwQRXj3xZ0yPXdIg+LHhuCbTL+C5EOv2a/LJYXiEDzfY7sAnuCp9a1hK+n9f8MergMT7RKk/daen92XbzhLp93Znrv7PfxEuPFOlT+H/ABAXj8SaT+7uFlG150B27yP7wI2uPXB/ir1avkrWdauLmDSPjX4cijj1exnW08RWkYwplwFEhHZJVwpPbKnqDX1H4Y1qx8ReH7HW9Nk32t5CssZPUZ6g+4OQfcGsqsLO6PBzjBKlP20FZSdmv5ZLdenVeRpUUUVieKZvijWbPw94ev8AW79tttZQNNJzyQo6D3JwB7kV8raLrF7pHg3xH8UdRfHiHxLcyafpLHrEp5mlX0CgbQe2wetem/taaxcDw7o/g/Tmzea5eqpQHqiMoAPsZHj/AABrzH4j6Z/bvxN8O/C/SJc2OjRQ6WHQf8tGAe4lI7HA+mRXVRiuXXr+SPrskwsY0FKf27t/4I/5y38kafwt0u88JfDhda02If8ACWeL5hpmghxzBDn5pvYYBcn0VPx63x7at4c8PWHw+0SK4TR9ONpLq17GP391JK7EInXe7Mm5gFc7T0wOen8D2Vvr/wAV9U1iGNV0fwnbroWkRr9xZdoM7j3A2p9PpVrUhYHxTPqc99d28VtqfnpdW1qLmGRliWJ4ZV2MY5F2nDcHDZB5IqZTvIyrY1zxHNJXfxP1fwr/ALdj9zbZ55NpNrp0kt5YXs19p0flxz2huJIp2CKWW2fJwgzC4WWLILqRxzXqvwUuNNfwc1lp13YXIs724SRrPPlBmlaQYJ5Iw4579a4vxJcad4rH2HwToc1pHLfx3N1qrQJFZvGgZ3aXPzbMSFsDaWLHoCxr0nwrqXhGy06z0fR9d0ucIFjjWO7jZ5XbJyQDyzHLcDnk1M3dHLmFSU6CjJO97+lu/wCn/AJn8OGG5nm0nVr7TFuJDJNDFskjLHlmCup2k99uPWrWjaRYaFb3MiSSNJMxluru5l3SSkDq7nsAMAcAAcAVqVwPx08Man4p8FNZaXmWSOTzHtvM2eaNrAEerIxDgHglcd81mtXZnlUZOtNU5ysnu/8APv8AM6vwtrum+JdDt9a0iZprK43eVIyFNwVipODzjINaZ6V5n4K+I3h+2tLHQLzTLjRbi2EVrLGtsRb28jEoit/FHvYYG8DkjJ5yfTKJKzFiqEqNRpxaXS/b1PnrwboMcXxI8VXNhZpeXuh38iwW6MrXDJNL5nnBJGCFky4DE5w3IJ2k96/neKkOm3tpAumXtm093LEsHlRkF0ErHf5gclN6OoKgL1OCa8tmn8T/APC9rU2FyuqanJd3NuJZ7VYhDFGzDbK0Y5BTqcblAiwSODr+M9I1/wAM+A9au9N8OXUFszwNfJe3aTmSMSZMcYj6xAnLO+GZSQAOSNpK7Wp9HiKLqVIXkuaSjby6PdrrqtN/I2f2X7GzVPEF/bFS0ckOnt5WfJzEhYspPL7i+7ceoYDAxXtVeQ/s1T6hJp+s291qMtzBbywmOM26oEeWISuGPLFwzlTuJOFTuTXr1Z1fiZ4ubtvGTv5fkiquoWL6o+lrdwm+SETtb7x5gjJID7eu3IIz61kR+GTaF4tI1nUNMtHYk2sXlvGmeoj3qTGM5OFOPQCq3jTwF4f8V31tqGoLe29/bRmKO7sbp7ebyyclCykZXPODXjttFP4Y+NFvp3h+4ub+I31qkUglMjyxyIRcwSMOGVFxNlhlSo5+eiMb7MrCYaNaMvZzs0rtNaaed/001PfdG0q00ixNraK5DMZJJJHLySufvO7HksfX+leEa2IPEPiTWToRtPtFxqko861uHRuEWLy5kzgK5ViZRhgiSAc4z77f39lp8SS395b2sbsEVppAgZj0AJ78HivLPGUFhceKrHxX4WuotZgt50k1ez0qeKSZ1KsqvtyQyE7Qw6/ICvO7JTetystqSjOUnu1v0v2fqcJZwTaFrXh+88K3c9/qsW7f5Yf7HNHsc/Zh5gDswjCFeV35Qqp/h67W5LLTdb0vxv8AZdvhTxvaw2ev2kv3YpZUHkzN6H5jGx+h+mpFqnhPVNLtrHTINS0Oa1vUu5tPtdK33DyrnADbGCk7Su8MDgEZFbWn+HrXxN8Lr7wxqUkTfaBcwTKj7/ssjSM6pkcFoyyjjjK4q3LqzurYqzUqia6PvZ3d+2js1bZnz74dtI/h38XNT8D6/ul0DWB/Z1yX6SQS58ib6qWwT2JbpXon7N2pXfhnxR4h+FmsykzWM73Fkzcb1yN+PZgUkA/2n9K4b4r2l14l+FGjeJr4H+3fD1w+ha2RyxKttVz/AMCCtn/poTRrviGWF/h58Xom/wBIBGnayV6vJDlXJ9S0e8/8BWtmudf1uezXpPGUeWXxSvF/446xf/byv8rH1lRTYnSSNZI2DIwBVh0IPQ0VxHwR89+JbuHXP2p45bpg2n+FdPNzKwbhTHGZCT9GkH5CuN+At4T4j8Y/ErU0DtpWnz3vzHrPMWYAH6Ky/iKlsb55P+F1eLB98o1lGc4yJp2jIH/AY1pPA2nkfs9apbodj+I/EdtpYbvs8yNDj8mP4122tG3oj7/2ap4d0n/07h+UpfepM9c8E3Fz4J+D+iRsofVNRgl1C6mkQssZZWnmmkA5bapxtGNzYGRnIt6dd/8ACKaTqOq3On3obWbuKGGO8bZPd3LKQ80oQHy8/dCqCdsa4XoKs/F+4aCPQtL0hreHVrm6EFu84DQRQNiObzEPDqVYKFPVivpVNdC8Q6VdrCILq7gtrxbuAQGMQyuoIU7nfNuCGAdQGB25TBYiuffV9T5xSjVi6k7LnbbW19fy/wCDtucnoKGO1VX1F4tOuLuOS9gu9Hmhnvo7cbUhhyzJKd6qDhVZ+ScjivWvCHh2zsbO11K80u0XXZYQ13dFFebe3Lr5hGSoJIAzjAGABxWX4S12OO/03whpMSar9hsUfUdSjk228ZxgBOu92YMdo4UZyc8V21TOTObH4mcny2tf8V02t079LBXM+IvH/gzQNy6r4k06CRWCGITCSTceg2Llsn6VF8Sibmx0zQg2xdX1KG2lZnKqYlzLIhIwfmSNkABGd31rzv4dTaRpOr6prUWlx3OtXRS302wtY1j3ZMhKouAsaLjYz4AAjJOSeSMU1dk4XBwnTdSd35LTy3e3Xp0OX8Vaw3jv4g6qui6PO9zqejR6VpsV1DLAWHnCZrx2wCixEZHOclB1JFesan4L1/U/DTWWveO9TkIhUv8AYoY7ZGZR3IG8gkZILc89K81vB4k+F3xIu/GWvQRX9tq+RdXMSkQxKzBjGrnlCpCgF+GCjpn5fYPCXiRfFmmX8b6fdadMg+WK4QozwSKTFLg8gMueDyCrDtWk27K2x6ePnOEKcqFuRJa6PXRPfa2n9WS8a+H9xN4cuYvFQtoEjuJDHLJcXJCNuiRjC08hPlna0Zj3nadjISpIJ3rv4rp4r03UPD8VjDC1/blQsczSTiJ2aNoBFtBe5IU4VTtXflmAU1H4auPtvga48BWUe/V9YEK4IyLeH7PEktw3qqNGyf7UgC+uLieFPDng3xLH4t0HVLrUbOxutmvQrdiZoHKlRcOFG4lTJIzg/wAMjHouKbs3rub1XQnUcqsff+zv02+96LzMvwF4KsZfGraXfLNZmOKaadNPu5IN0qGLcrNGy7gGuG5wC21Oy4PexXGo+BvE1nYahqF1qPhrVpRBa3N3KZJbC6P3Ync8tHJ0UnJVuM4YVleBLi2l8e6xrn2uL7DFFe3BnLDy/JknjVJN3Tb/AKJKc+gzXKfEf4kw+MLZPCmj6H9tuJ75G8i5hdi6RsrKrRfK2Xxk9AqkHOeVTTk7GE4VsVX5JK8be95eeuzW/wCBP8c76J5PFS3YkmktILSC0RpnU26yI7STKinBDHagkOTuyOAvPpHws8KWHh7w3ZTmK2m1a5tka8vEiRWkYgEqu0AKg6BQAOM4ySa5LwXo9rdPbeDPiBp8L+IdLjN1pV4szs8lsxz+6nJ3kxltjKT0Ck5BzXNyWmofD3xfeaNoUl2ZbOGPVrdInG3UbESEXEEsX3DMihyjqFLADPTkeq5UKcPa0vqsJWa18pLRXTvt1fm9dmz3q/s7S/tJLS+tYLq3kGHimjDow9Cp4NeX+KtOk8N67E2kXVno0cU63NoZ7d5LdoWQx3FsiJznIjkES43HG3BBx6bpN/a6ppdrqVjKJrW7hSaFwMbkYAqfyNVPFmpXej6Fc6pZ6a2pNar5slukgR2jHL7MjBcDJCnGemRWUW07Hj4arOlPktvpb/h9PvPMvhprFtoWtto9zHfKbyddPiknspLVoXAeRIyjs+/IkZvMLlzkZBAyNDwlfXPg2a20W7t7mK2CoLxLgDb5jOsbXUDgncjyOjOh5BlBH8QqW8ZNa1D+2vDzfbIp2t75fKVJJLe4SMoFmhZlYAqVI5BVkOeOuJrOm3/h2fRdQ1sw/wBl3t+BqdvI4e6wD5kbvLk7gJAXdEwg6D5Rzpoz1nyVpNS3la663S/B9vO219W+IdDWb4geOvBjIPs/ivQl1O1UnCrdRfu2/EkRsfZRXjHgMnW/g5438Oygmax8jW7VCeQUOybjt8oGfqa+ifiaBY/Ev4da6hAzf3GmuexWeEkfrH+teKfDiwWx/aB8TeFCAIdRj1OwYHgbGBkUflitacvd/H7j08urt4aUuqjGXzg7P71FHvPwH1h9c+E2gXbyK0sVsLaXud0RKc++FB/GivMP2YfFK6V8PLnTrghGh1KXAI5+ZI2P6saKxqQak7HhZlgKkMXUUFpd2POtImY/Azxtdrwb3xDaI/fIJDkfmxrt/AcCn4afC236pd+L2ncHuV85v5qK4fSImX4D+MbUDLWniKzZ8dgNqn/0Gu58BToPhx8KpgTstvFrwuT2JE4/mRXRPb5/ofV43+HK387/APTeh0XxJv7hPiyt/cpC1rpbRRWcckTOpufJZllkA6RxtcL05ZnVeu2p/DEd94h1ufSLnUodWvrKN7iNdcs2cND5i4Qx8Kkm4uHbBZfkCjaOaviK1n1fx94nfS3xdNdQWjRi8S3a4EXkyNEGc5DbVYhYwPvbmblQKNvFd6TDZ3mkSxzagu82873SXEcUhKmSQTxf65DsjikST5wDGQQM1l0PIjFOjGKaUrJdO1/Xv/SseveAvC6eHobiT7NY2klxhVtrIHybeMFmCKxALHc7sWIGS3QACunqhp18hstOF5dQC7uoVZV+4ZW2Bm2qST6nHOBV+sG7s+ZrTnOblPdmD480OXxB4ansLaSGK8WSO4tZJQSqTRuroSRyBlcEjkAnFcr8Ov7J03w1qfxD1aOK0nvfPuLormRbOFJG3QxnGdu4M5wBuZicdMekHpXl8ssVt8H/ABfpzSLGtjNqNq7scBA8jMCfQbZQaqO1jrw0pTpOl0cl9z3/ACRi69ruteOLi3utG8gadb5mjtnh8yFGxlJ7qckQqUxuEY83B5I3ABc2bU7Lw3b3niHTPFU+teJbP7PNrWpNGXtbmGV9iwIgZVYKeUVSCDkk8sK7z4wGK60TRtFit5L1tQv0VbZJERLhERndSXIUnaCyrzllXIxmvMvBej6fcT+IPEEInl8KaDpcsNjBdQeWfPERAVky3mFVL/McZeZsAHNaRtY9fCyhOjzNWiummutrN7u72+/W1jttK+GWpTo+s6jc6VFq2okzXltLYmaG1ZiW8uFlkR1UEkkbirMS2MmrWpfDq3sbA3curac1vbWzed9t0qPy4owCzCMQtEVjxk7GLL1OMkk9N4Z13Q7TwJpt7Nrdn9lgs4o5LiScfeCBSCTzuyMYPOeMZrhtV8QXnxG1d/D3htLldMikWSe5miIRhuOJHz0RSuVhOGdgCwWMHdKcmzjp1cXUqNt2jHd2Wn9djhvB0uoWjaVpGqukWha7q0cShlVfPiiO1rdstlI0bylVFBBy6k4yD7f4j0O4t9aTxZ4etrd9XSIQXcDbU+3wA52bz911PKt0/hPByOV/4QnRten8T+GJY9i2NlaWWnux3PAuzzhN6ljKSWb+Ipz0rH8LWvj3/hDvtg1+a8igjljuhNqRt5YJIiyyIcwyE4ZThgwyMHApyfNqjoxM44iXtISSfVPZqSuvw0fmtOluz8Xx2vi3wSniHSZpLHU9LMl7p880eyS2uIgweORf7pw0br0IJ9Aa8o1DxHceNNQPjCHRbzyrzRl8P2EIcw+Ze3QOdsjAfKu6TLDOAqnq2B3niKSXRP2fbfT7VTJqWrWENjCsn3prq7wGY+5aR2P410Hhj4ZeEdDu7PUk05rzVbUfLf3k7zTFsY3ZYkZwSBgcDpQmoozoV6OFpylK71aj6aX6rR6fjY3vBumz6P4R0fSbkxGeysYbeUxD5CyIFO32yK1JY0lieKRQyOpVge4NOqK6uLe1h865mjhj3Ku52CjLEKoye5JAHuay3Z4cpOcnLqzy7VvBZ0LSNSv2sdAeOyhedr14Ha8vFjiCqjMMNE+1VHmRsSxAOASQeJ17VZtX0GO2udVvNSe7vo59LmubX/j0ZZFVCT0ZTC2JxnKlwcAO2O7+L8+oXOqLpEsludHa2WSVDvV45W8wLKdv+sVNm4RjBL7Oe1cdNoFzLf3zCeRYHlmSdpNVtEdJJ4jG8LW4PlpI7M7heD87fMDW0Xpdn0mDneCqVZa7r+vz8tNtDZ8YXdxd/CzwBqNyWF7a67piTFjkiRZPJkyfXIauCuc2P7YaeUcGXVF3cdpLbn+VdVfyxP8ABjwXaQ7QW8U2kIRSx27bx22/N83A7HkYweQa5a+P239sOMxAt5WqRhvbZbHP8xVw6/M7MFFRVZdOWr+aPOotZfQ9T1iyj4A1S5P5OV/kooqG40ibWda1m8hAKnVLkfnIW/8AZqK3fL1PonHDv49zubGzeLSfjR4XIXzIW+2xqewiuHYn/vlkrQ8KG8074Bvc31lc2z6B4mtNWUTRFS0DSRvvAPVSGbn2Ndd4y0S+8D+P/GPxDCWL2eoWKWllYTsCdQuZgilCvUqCoJHUjIHc1ua94L8c2nh9reXWZfG9rqA8vWNJvfLgVg/3ntpRgxBTghTkcdsVg5pnz1THU5Ri7q0nGW/VRipLtt3aV3voyDxL4bt9N8S2kY0EatLJfSXsTW7BJb+GQv5sUm6VFcxs0bbiWym35fkY1ifElNJktR4Z8OacmxLrZdaodScyRXTxfNGCMmV1jKfLzkYRRnlelv54fE/gpJYzfafc+GZxZ6hpmorFcGQgINrblZGkKlWjkHdsdGIrH8V2bNJJb2F7aXEOlGC2n1K0VI4rVXaRP38cZ2bocNkqFKpLyAMmojvqcWHnLmi5vVeu/R9nvpbv12W74STVrv4j2mreIrSJJ/InttNtkkDG3tgkR80qGOxiwZG68sFycV6rXC6JqGmeHPAOp6xDpNlDe6dFIl3HbWyQfaZohhR8i4+f5NuAfvjHpXZ6ddxX2n297AwaK4iWVCCCCGAI5HXrWctTxsa5TlzWslp93/D/AKk9eJfETQNPm+Id9a+L9VbS/DesRLNbuH/dzXCxCN05BVJdoBBIJYDC4IbPSfGfxFrenXmgaN4Vv5o9avrsf6NHEjB4ejM7MreWAehwc4PGAcef+FfG1zovjee78chdSIlkig1GXG2BUYq5t8fuyqnhgo3fe5ONgqEWldHfluFrQg68Hunovi33V1bdefW2u1b4ma9oN1b2wsdZ1XxdqFtI8c1jPaqkSxJtd1MAiUqCUUFxjCq3zDo1ZdL8aeN/CupaV4X1PSW0m51GSS6tbFViUeYVdA7MwYRbCuNozlCpXjI0ZZNPs4by1j8d6Jp+m3c7zz2mju2pX1+WH+q8xQoOBgbFU8H5ic5rP0G0vNGtdQ8VaD4l0fw8UIigshcLfXs8fRYJY4/laQt91drMhJUHaOdVotD2YNU6aUNGnpzK6v6JL/yW9ur6HmlxqOtWl5/Z949neyxrNbxSO6JOhZfLy023e0aj5gSSu0ZDCussfiZ4u8GaQ/h3RpbFluXWeO+v4RHNEzKC+4McPk5YSSElkIbnIrStdO1vUrbRfBviPQtQ0vUtUvoHlvrlVlLWkZYxxrGRtUIz8qRg/wAXUCrg0Sz+HviJIPFkVrLaajYG1e0iffM48xgjo7HcW3RRMOcRiTaOFFW5LZo7atehP3KkFJ7pb3t1X4/ruVfhboXxLbUX8dafrkWLxWS8vb2ZZUKI2SZlcqyqFG5dozjH3Qc103h3xPr+uaJ4z8O6JpVzqFxqVzM1tqtlCsUAMqKu5o5H3RggMc5PPpVCzn8aeKvCWqeG9AskS2ukku7qaW8X7Xc+Z0X5lXKHG0sEGdpT5Tk1N4N8B/btKfV/A/iXUtF8RWYS31TTtQxHJHtA3QSOiiRUOMq3IxyPaJNPVnBXnCXNOtypppLTa23NbXyXQ6TwTqN7428f6Za6naR2lv4StDM0A4828ctCjbCSU8tFcbSchmONwwx9kr5s1zxt4e0MW954Z0q60XxXGhhc2s63NtegN0kOc3SEk4kwGBOdw5r1P4VeMPEPifVdYs9c0+x05tOjtgYEEizeZIhdiVfBCdADjBIbBOM1lOLtfoePmWDqOPtlHlglt13173u2egVy/wAVYLW68B6la3sKSW8wjjkLkgRhpUHmZHTZnfnttrqKxH163fxkfCxhDsdPN27k5H3wmzGMZIyeTnHbqazW9zyaHNGopxXw6/ceL+JpPEa6z4fuNY0mG8uLGUW0ds9+yi7QSgws0i5Dyj5WK4yuQ+GQtt1vENr4W1bS7TVtP0C5fTrq5FzqUsdyCtuwLiW0ZPNVkZ2dlKqGDM5GDmk8QaYL3xULfw/aQW1nJcNDFb6dbJBIBBtaS5Lpg7d4lhDYzuf5SMsDoaRpUGuaroMllqmnxCa2aaR9NsoV+yxweWv2VJSplV/3oUkkEBXwFzgbXsj6J1EoRkna3a/m9u+9vTqVta0Z7PxP8PtBkgtobi+1yfWri1tU2w24ig5VR3wXXLH7zZOB0HnXw+na+/aI1/xa8TmxsZNSujKUOzEa+WMN0J6H6EV6b4ludY1z4lXV/wCDdFnvdR0eL+x/t93NGllYySFXlcR53yuEZQcEDgDnms/xjouv+E7GPRrnxcb7TPFEUulTSXcEcEdjdPExjeIIAscTY2FPcEEmnGVlbuaYevyw9nJrmnG2+urbeiT6NWvZuxzn7NfhQ654EvNUuV3vNqcnJHXEcYP/AI8Gor1r4GeHbvwr8MNJ0m+tfs98FeW6jznbI7kkfqKKipUbk7HmZjmNSeKqOm/du7ehT+JkMVh8QfAvia4jSS3ivZdMl3qCIzcoPLkGfukOgXI5+fFdPrviey0fUbeyuLW/l8wr5s0VsTDbqx2q0jnAALYGBk85xjmofiX4ebxR4I1PR4X8u6li32kmceXOh3xNnth1XmuP1O/u/Gnww0rxPpthDJrEC/vEnK7bKZTtmby5GEZeN0JBfoBkYpLVIxpxhXp0+fpePpe7T++/3fIr+MrC5sPibdWlsAYvFVjFPbqxwr39jIsgQnou+PAz/s+1UNS8U3Gg2h0q1l1CK3Mt28tuuj754xIr3DiXzHCFkUuRsLbsAngEHf8AEVpq3in4cRT289pP4t0GaO7ia3OU+1xANszgffRtpxx8/HGK5v4j3Efifwpp3jjRdTnsrS+sJInRY0YxzeXIojO7ozb5YP8AeaM/w4NrWyZ6GHaqcsKnTR+qXuvZ6OO3oxLbULLWFTwzFqF1bfbES4WzsLlEvOF8qGJi/CtGsBd8j7zJjI6+qeCtOu9N0eRLuNLdprma4W1Rgy2yu5YRgjg4ySccZJxxXgC6RP4n16aOzVb+dYrr9/LaM5wXjkSQpK6fZzluCJCMxkBVBOe7+HniC/0TxZdaHrc8kkt9cAmCWYu9qAqJHtyxbyj8oOS3LBgzAttU46aBjsNzU7U3tq11/r5X6eRzXjbWtRsPjje6ppt5ppuLURQWseqb4reXbAwljjmA2iRfNLFSRwwOeorMW5M+oyX0vhf4VRzyO0jGfV4riPexyzCMyhVJPJIFeg6hfx6drWqeHNc8F6hqMWray81hO/kpbSsYlKhJHcbZPlbHQkg4NSf8I5B0/wCFdeISv93/AISQbfy+04qlJWN4YqEIR5o/ZSvdapf9vL8U9bnlPjKS7mt1kil8FWkjlI4ofD9wiyRzht0U4VJCcphwWGPkdgeAMRJZadmw1Cws4bWOWxlunFvPNOEMUfnsn2gooV1MZUorbl5J3ZJrtdc8DXyasmp6d4DuBboWleO+mt77yztwcIZGMyMOsZIZTzGwOVaHVtP0bxBptvdeEtE0zRtXgLPfWtrG2bq2HEnkIuxZgeVdSFkUZU7WwDXMjshi4csVF6d01p62b/X/ADyvi7eeCdLu9NvvC2o3N7drHINtlfXFyytlShV95CZJwcHnKjHIr0vwjN8PdasL7w3Z3UE+q31oEv1uhJ9qlLIc5Mo3Nj5iADgckAV4dePLrnjGOa/05L4SzCK6QwOy3EjK2drbf3RKkeWu0EJHH94qQHKk1lHBNDGPtcJLs+n2MgeWRMCYs6IAuJf9WVU7GIXcF3AjhdWuKrglOjGnzy5l1vfz+dvkeiWtz4MvZrB7nVNb0TxvbKYbl9NhkMkl0q7ZSYwrI+4ozHI+YYJ7Guf+IfibU9T1caN9hEN7EotJ9YvbA2QkjdS+2f5j+6CqzlP48Z2qvD7I8S6lqOv2174YgtrrxFc6ZLZ311BEu6VklAjlQEYViiksz4RQ8YO4qqHzy5jsrzxHaP4kg1FtPEK3YhlnVRe7/MDN5nO2NpAitIWJZQWJxgKRWt2LC0Fz88+i2bu16bO3ZN+eha0PR2u/D13pelieWTxVPbQ6bJc83DwxFg984/hDkuEXsobqFr0S115l+NV/4msrbU77SLawewuJLGzM+dhTaX2/7QlIPPAHTdzTFnr8dpNcadbNP4y8Q27LZRoBGNOsgArXG1iBH8u1I1ODgKPveZXRW+rR+APC1j4Yj8FazH9t3WtqsdzazXF3OUJZiqyZJwMluAox0GKUncxxNb2jdkm3dWutrJN69uVJO26bPTdD1Sz1vRrTVtPkMlpeQrNCxUqSrDIyDyK808X2tx4d1ibxDe3VxYsl5LJa3wuUW0mMuwrFcgneABCI8jIAYEc8VpaXq0/gT4PaBFqUCW+oxWEUBinYBYnWPLF8HooBJAPOAB1zXmmq+Hdc1rQZtRuPO1C0jt5o4Lm5iF05RpAd6/vAIwMFd6RuoUsQXGKzhGz8jzsFhlGrKTlaF7ev9f0jctfE6aTeO2htqAFwsIF1BZpdxeXLcPJEjZZSJBJcPG6ruyMYKkZrptP1QWxv/GuoY/s2yhuL+e5SFoY5mMaIkcSvhnAVDlyBliuB1x55o8t/qOsQ6dpHiF7WSeRxDai2MyM3npsbzHHzhV3THCoApQYXJx6J41tbfWNa8PfC3T1LafBHFe6uM5C2cJAihY9zI6qMf3Vb1qpLXU6cRThGai1ve768q3vpv21aNX4MWz6d4QtrbUnUa5fq2r38eCCJLl2fv6fdx22/SpPjjdQ2/wALdbjktYruW7gFnbQSKG8yeVhHGAD3DMCPpWD8TA3iLxrp3hmx1P8As69hjMqmWyZ45ywONk8bBopUUSMAeuD2Jzc8QgeIPij4e8LRPJPZ+HohrGoOzbsy4MdsjH+9nfJg/wB0GptrzfM4VC9eOIk97za7JarXz2VvQ7jw5p/9k+H9O0ozNN9itIrfzGOS+xAuT7nGaKv0VkeRKTk231CvN7VE8JfE270a6iU6B4vLz2wYZSO/C/voiPSVBvHqVb1NekVgeP8Aw1D4r8M3GlPO1rcZWazuk+/bXCHdHKvuGA+oyO9VF9zowtWMZOM/hlo/Ls/k9fw6nIz6pq/hj4hpby2lvaeFY7OKAEXOyGCMcC5mkdAA2QsSpvLEDPNVdRtLfwp4qutNujjwd4ykOyVCNthqDjnB6KsvDKegce/N7TBF8S/Ckmh+I2m03XdIuhFqkFuy5SUAjeoYEGORSWU44zkEFc0mmHSNW0+/8C65YNDoU2bLTku4XgkkKbt6LuYl9m1GEo2jLAAZXm9tz07qN1JarSVu3SSfV9V3XlvxOlWPiCytLrwxrOpWU2k2uoXA1EW+w3jq0hkF20TqfkXfGzZJXaOh4rX8bXGkrZeCW0hfsltYIL2E3iGF2igAji81jjahDswDFd3OOeK1tDeODVofAHxBiF5epk6JrEmUa/iXnAkXDJcKOGAILDkZyat/E3QtO07w0BZwSRme7DzXJunEjOI38tWmYkqGbCDJ2/MRjnl82pu8QnXipLfXTZ3T1/rbYXRrx/iF4b8Q2uqRT6ZbloJbKSYKs1rugjmSQj+EpIdy5wcAZqhpPxXvDZLHeeF727uYf3Ut1Y/Pa3DDrJC2PmjbqD25HOM1h3mX066SCLUL+zsIY/7RSUbppLFJIW8qYKTluJmRSS3l7gfvjPR/ET4iXuhFI/DtjDdwJpw1BZFgacTQYYl4wroojRVBZi/8SgKc5otfSxH1eMpcihdPZXtbRX+8k/4Wq/8A0J2t/wDfH/1q43xlrcOr3H9paZ4S1mx1ISLKxAZEmccByyrujlA4Eq84+Vg65Wup8O/GC1uZYrTWdHubO7lRXjWP70it0YRvtYgjnKbx7mumuviDoMNu8scWqTeWMuPsEsQUepeQKgHuWxS1i9iYxlhqmlBp/wCJnA2+q6X4tgSDxMzWGooohi1K4s/KLKzfLBeQsAAGIyp/1bHmNkf5Rn6rrdvpVnPpHhN5bqS5QC41JI3RroAEIqGJT9ntFwVVlA3ciPJLSDW8TeM/DniAQ/2vpN5YnmO31K1eOdow3BQ8FJUbvGN6t6EgVqaF438K+HYJLCx06+VA5a5uLmWGOaV8D55N7ghiMYDbSBgAAACq26G/vwV/Zv8Aw3Vvv/T8NmcbpN5Fa+HLvwj4W8Otb654gV4pL0SiJ5GKku3KDairuAC525B5JLV5zqtnFaxWUU4ksLm33RzRSoWWAIgGwxFt8jzNuZsgKpYjkENXqWqfEq5sfGJ8X3+m3iaQtp5dja3EXlyNasVLzoGxhmYDuQVUK2w7S27HqfhLUNLvtY8SXFprOqaikbyW9hIJvsMUbB4ofMU7I9h+ZnZlBbJzgAClJx1sdkMRVw753B2lvZ3d/n2XyW2zMnwD4vXw1pWLrSJb7VbhVN7dvfqxcqOEUtkiNMkKD2yTySa6L4WTDxn4o1bx5qO1Z7WR9L06xLBmsYlwZGb/AG5W5z/cC9jSeGvjDper6/FppjsCkzoita3xldN7bVYgxqrLuwC0bOAT6ZNU/HoeX4o3EHhpZDdnQJf+EhFuDueHzI/IX5f+WxTzwv8AFg8dqi2rVrHn1ISlOcJ0+SUlve+nbyvt9y2Zzuu+K7vXIdLbVT9nudHuP7SLAK3mgzyxgKo+/EsYKsQDg7ixXZk9J44W1i8WLdeFpDY67aQwwl5kSKzgtipxP5jKcptLRjbuXftyuQDWVo+y58aaVeB2uy1wtvBHHIBa+SksoURRocMqwyA8jEbRtu+Zq9E1Hw/4M0GxfWNSght7DT1ab/SZne3tx6rGxKL6AAcdFxQ2kwr1adGcYqL62S21e1u1/wA/LXgPBk3/AAi2m+JPiR4oliubm7u5I7K2sTvjldhHGRAerGZ4kx2AH1NdF4egvPB3ha+8R6+ryeJ9dnE140NpJdLA5GIotkfzGKJeDg/3iOtVtKDa7fD4k+LEbTdB0uJpNC064whiXGPtUoJwJGHCKfug+pqPSf7Y8aeM7bWIL82mn2EgaRPs4hvLXgN5G8MRLHKCjE4IK42lWoepNV8/NzaL7XbTaC/V9X3srw+E9S0XRNJvfHOpeExpETW1xeS3ttOZIZRvxnDkHzJDyp2g7SFJHSun+Eej39nodzruuReXrmvzm/vkPWEMMRQfSNNq/Xd61k3xPxD8erp0Xz+F/DdyJLx+qX1+vKQj1SL7zerYHavSqmT0OTGVrR5bWlLV6t2XRa/e/l1uFFFFZnlhRRRQBwvxC8P6pb6pB448Iwq+u2Ufl3Npu2rqdrnJhb/bHJRux46GqmoWmlfETRrLxXoTvc3EC7Us7iUxIZUcMIpwAWTZIAzKuC20A5GK9FrgfFfhzV9E1ubxl4HjV72XB1XSGbZFqaj+JT0ScDo3Ruhq07no4avzWi3aS2f/ALa/Ls+npqqX+ieJfD6eHPHK3Mv2i68vT9Qa0a1klkTG2ZcDEL79+zkFlUHHPLrHxPqng64j0D4iOs+nSN5Vl4iKAQTA8LHcjpFJ23H5W9QaszzaX8SfDsuo6BdyW+r2cU1tHHcs8UmnzuAriRBykgAKh8EqGJXrXP3fiOfwnDa+BPEUX9sS3lgVWSeCW5haeR2EVsWIzKNox/eO0k47UtdDqhD2l6bjrfWOzXnHtpa/R9tj1mygtYLdUsoYYoT8yrEoVee4xxXk1jpfjjVPDV14IstBXw7o0011DLqF5MjyJavK/wC7ghXPJRsBmIAHbgVc0LQvEvhywW88B3tndWSMVufDd5eebDBIDhkt7kZMXP8ACwI56L0re0P4k6DdX6aTrcdz4Z1huljqyiEuf+mcmdkg91Y9elJJrbUyhCpR5nSSn1801fVq/nvrHzNDxL4X025+H83h6LS7e8ittOa3sYZ41k2ssRWPBbowwOa+cdU/4RePUbW11PS4dHlVrgvDfWZtJFO8eWckDng4KnivrTIqK6tre6hMN1BFPGeqSIGB/A0Rnyk4LM5Ya6km7+dv8z5M8X+MNVsxBpum+L55tNvLD99BLcx3cZzIFwPM3EfKT37Z9ayNG+Iur2n2C21S8h1XQ7Jkkk0j93bwzgAthti/MQwVvmyGP3s5r6rm8A+CJm3P4Q0Et1yLCIH9BRH4B8EIcjwjoRPq1hG38xWqqwtax60M7wShyulfz0v9+9/Pc4a58S6D8Y/A+o6XoIiGr2oWcafqCgZKtxyMgoTld6ngkZ9Dx/we0Xw1r/j7VNO1XSXnh0+JdtlqIfZBcbzlfKdtpbbjPBH517NrPgfQr62tlsYm0O5tGLWt3pSpBLCSMMBhdpUjqrAg4HHArO0v4b6da+IrHXdQ1vW9aurHc9v/AGjMjhJCCpfKoDnBwBnaOwqFNJNI46ePoU6M4U24p7Lqn69U7eTWu/Wjqtq/h3xRPf3nhO51rS5LpL6yuNPhEs1jMsAhKtFkEqFB2sucbiMDGasfAqwntfBTXWpadd2us3l3NNqU13EUlupS5xJg87du0KD90DHauv13WdJ0Kwa/1nUbTT7ZOstxKI1+gz1PsOa87174l6rqWnmbwTozfYGdI217VVMFooZgN8SMQ8+Ac8YHHGelSryVjmputiaXJGOmnvXstL2WunXZbvpc7PxTrvhvwfaPq2ptBbSXD7EWKINPdSdkRVG6RjxxXIppeqeJJh4t+INs1npNh/pOneHl/eFCvImuccPL6J91Pc80W+maH4TuZNd1C+m8VeMJYJRDcXTDczooLQwqPlh4YHYvzEZ+9zVbSNL1v4hRaZ4k1K4bS5IAk1lJBGdoRju3IrNuinG0xvuLKVP3TngSSNKUIUo8ydls5P8AKK38r7+S1GjUNZ+IWpW194dv7jS7e2dfNjm3RtEjFilwo5WXeAVaJwCuMHHfR8V6lLJqX/Cu/AMcFlqEw83VLy2iVY9Lgc/NIdoA89+dq9erHgUa14gmn1O58F/DO1s01HzWbU9SSEfZdMZzlmbHEk55IT15bFdX4J8L6d4U0f7BYmWaWRzNd3c7bprqY/ekkbux/IDgcUNpCq1I0kpONv5Y/rL9F19N7XhfQtN8N6DaaLpNv5FpaptRc5YnqWY92JySe5NadFFZ7nkyk5ycpO7YUUUUEhRRRQAUUUUAcf4v8ErqWpjxF4f1B9C8SRIFW9iTclwo6R3EfSVPr8w7Gsqy8bQQ6naaN8SNIt9B1eOTNlePh7G4kwV3wTEfI5BPythgCRzXotVdW03T9W0+XT9Tsre9tJhiSGeMOjD3BqlLozsp4lNKFVXS2fVej7eT+Vjz3Rvh9qfhvxDbz6FrTHSjGFuDLzchVIfaMDbIHYAEnBUbtvLMah07xTDr/h6503xp4W+3PY2sUuoQtafddzIf9XIBgIiqS+cZYgdKvf8ACD+IPDA8z4feIfItVORo2rlri0A9I3z5kIx2BYewqHUPHSwWFxpvxG8G6lo1tPEYri4jU3tjIhGDmWIblBB53KOver321O/mdZ8y996arSS+XV+l15mNc6T4b0KWxh8GeLPEehz3hQ2+n2hN3CA0ZkXNvNnaNozhSDzzXSpH8W9NKotz4T8QQqOXkjmsZnP0XegqLw3ovgTXvGCeM/D+vJfXQLSyRW96skbMyKilk6rtC8DgDJ4qpbfD7xJp1pFZaZ4oeG2+3RvNh5Nxtkt2QKuSTvMm1uoHyjqPlob7/iE6sJPlm9ba88db+q109dTRi8VfEOMH7Z8MQ2D1s9dhlz74ZUpR4x8ZuSI/hbq+f+mmo2qj895rOit/ihbalZRbxc2ps7GC5m+0xHbMrxm4lClQcFRKvcksCB2E/wDxcyaDWLZo44JGtZVsLgTR8Si4lKEjbwGiMS+xX6kFl5EOnS35af8A4FL/AOSJzr3xSvHMdr4D0fTQfuy32uCQfikUef1qC+034gTWjXfif4gaP4cskXEw0qzC49/PuGO3/vmp/COneOo7fTh4guPNlt76YyFdQ2g2527N4WM+Ywy3GV5A5xTPB3w8m0YSTatr0+ozPGweSQZKyK7eTOpbhZFRyCSDljnOABSukDnSp3tyq3Zc1/8AwJu3/BMVtO+HWg6hcahLb3firXLaAzrdX85unfCLLtjkkPlqQjCTC4wvIpbvxBrfj+2ibw5psU9hFcp5kV3A8G+GWLIdZmBMUsTiRSYwxDbTxWhJ4m+GvhfT9M8OtqsWsXWnAi0tbZDe3O7DKQEiBwdrMuOOOOlTDVviJ4iVbfw74etvCWnYCi91gCS4C9P3dqhwMcY3sPoKrzf4m15fHJPylN2VvJb+iWqIZfDvhPwrp1r4j8b3lnFdxpG1yTKwtp7tcjz1i6tMQSMgZwTxT5JvF3xCzFapeeEvC7jDzyLs1K+U9kX/AJd0P94/OewFa/hz4e6Rp2pprerXF34i1xR8uoamwkaL/rkgASIf7oB9zXY1DlY46uLjF3i+aXd7L/Cv1f3IzfDOg6T4b0eHSNEsYrKzh+7HGOpPVierMe5PJrSooqNzz5Sc25Sd2wooooJCiiigAooooAKKKKACiiigAooooA5XxB8PfBOuXIuNS8Nae9zu3faIo/Kl3eu9MNn8awdU8AjR7Qy6L4y8Y6eAciMap56D2xMr8UUVrTbbsz2srq1KlRU5ybj2b0+48l8XfEnx74bZ4rXxPcXQQ7Qbq1t2J+uIxXK6X8eviVd3nkPq9qi7sZWxiz+q0UV1qEbbH2dPAYVxbdKP3I9X8GXfinxcgbUPHOv2oJ5WzFtF39fJJ/Wu2/4VR4WuR5muT634gJwSuqapNNHn12ZC/pRRWFT3dj5/Nl9Wjej7vpp+R1+h6Jo2iW5g0bSrLToj1S2gWMH3O0DJ+taFFFcx8nKTk7yd2FFFFAgooooAKKKKACiiigD/2Q==';
        function psk(src, def) {
            var it = src.item, q = it.request || {}, form = it.instrument.form, D = def.request, one = form === 'psk1';
            var A = q.applicant || {}, N = q.notifier || {};
            var flag = function (list, obj, key) { return CB(!!(obj || {})[key]); };
            var lab = function (list, key) { var x = list.filter(function (a) { return a[0] === key; })[0]; return x ? x[1] : ''; };
            var person = function (P, withAddr) {
                var s = '<p>คำนำหน้าชื่อ (นาย/นาง/นางสาว/อื่นๆ ' + F(P.title, 18) + ' ) ชื่อ ' + F(P.firstName, 40) + ' นามสกุล ' + F(P.lastName, 40) + '</p>';
                s += '<p>เลขที่บัตรประชาชน ' + idBoxes(P.idNo) + ' กรณีไม่มีเนื่องจาก ' + F(P.idNoneReason, 30) + '</p>';
                if (!withAddr) return s + '<p>อายุ ' + F(P.age, 14) + ' ปี โทรศัพท์ ' + F(P.phone, 38) + ' โทรศัพท์มือถือ ' + F(P.mobile, 40) + '</p><p>อีเมล ' + F(P.email, 80) + '</p>';
                s += '<p>วัน/เดือน/ปีเกิด ' + F(dateTh(P.birthDate), 45) + ' อายุ ' + F(P.age, 16) + ' ปี</p>';
                s += '<p>บ้านเลขที่ ' + F(P.houseNo, 25) + ' หมู่ที่ ' + F(P.moo, 14) + ' ชื่อหมู่บ้าน ' + F(P.village, 42) + ' ตรอก ' + F(P.trok, 18) + '</p>';
                s += '<p>ซอย ' + F(P.soi, 42) + ' ถนน ' + F(P.road, 42) + ' ตำบล/แขวง ' + F(P.subdistrict, 28) + '</p>';
                s += '<p>อำเภอ/เขต ' + F(P.district, 40) + ' จังหวัด ' + F(P.province, 40) + ' รหัสไปรษณีย์ ' + F(P.postcode, 22) + '</p>';
                s += '<p>โทรศัพท์ ' + F(P.phone, 40) + ' โทรสาร ' + F(P.fax, 40) + ' โทรศัพท์มือถือ ' + F(P.mobile, 30) + '</p><p>อีเมล ' + F(P.email, 80) + '</p>';
                return s;
            };
            var h = '<div class="psk">';
            h += '<p class="copy" style="margin:0">แบบ ปสค.' + (one ? '๑' : '๒') + '</p>';
            h += '<div style="text-align:center"><img src="' + PSK_LOGO + '" alt="ตรากระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์" style="display:block;margin:0 auto;width:14mm;height:14mm"></div>';
            h += '<h1>แบบคำขอรับความช่วยเหลือผู้ประสบปัญหาทางสังคม<small>กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์</small><small>' + (one ? '(สำหรับกรณียื่นที่ศูนย์ช่วยเหลือสังคม ๑๓๐๐ สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัด<br>หรือสถานที่ที่ประกาศกำหนด และระบบ พม. Smart)' : '(สำหรับระบบ พม. CARE)') + '</small></h1>';
            if (one) {
                h += '<h3>๑. ผู้แจ้งแทน (กรณีผู้ประสบปัญหาทางสังคมไม่สามารถยื่นคำขอได้ด้วยตนเอง)</h3>' + person(N, false) + '<p>ความสัมพันธ์กับผู้ประสบปัญหา ' + F(N.relation, 110) + '</p>';
                h += '<h3>๒. ผู้ประสบปัญหาทางสังคมยื่นคำขอด้วยตนเอง</h3>';
            } else h += '<h3>ผู้ประสบปัญหาทางสังคม</h3>';
            h += person(A, true);
            h += '<p><b>สถานภาพ</b> ' + D.marital.map(function (m) { return '<span class="opt2">' + RB(q.marital === m[0]) + ' ' + esc(m[1]) + '</span>'; }).join('') + '</p>';
            h += '<p><b>สภาพที่อยู่อาศัย</b></p><div class="g2">' + D.housing.map(function (m) { return '<span>' + flag(D.housing, q.housing, m[0]) + ' ' + esc(m[1]) + (m[0] === 'rent' ? ' ' + F(money(q.rentAmount), 18) + ' บาทต่อเดือน' : '') + '</span>'; }).join('') + '</div>';
            h += '<p><b>อาชีพหลักของครอบครัว</b> ' + F(q.occupation, 55) + ' รายได้เฉลี่ยต่อเดือนของครอบครัว ' + F(money(q.income), 22) + ' บาท</p>';
            h += '<div class="g2"><span>ที่มาของรายได้ ' + flag(0, q.incomeSrc, 'work') + ' การประกอบอาชีพ</span><span>' + flag(0, q.incomeSrc, 'children') + ' บุตร/ผู้อุปการะ</span><span style="padding-left:24mm">' + flag(0, q.incomeSrc, 'welfare') + ' สวัสดิการของรัฐ</span><span>' + flag(0, q.incomeSrc, 'other') + ' อื่นๆ ' + F(q.incomeSrcOther, 50) + '</span></div>';
            h += '<p><b>สมาชิกในครอบครัว (ไม่รวมผู้ประสบปัญหาทางสังคมและต้องเป็นสมาชิกในครอบครัวเท่านั้น)</b></p><p>จำนวน ' + F(q.memberCount, 25) + ' คน</p>';
            h += '<p><b>การอุปการะ</b></p><div class="g3">' + D.care.map(function (m) { return '<span>' + flag(0, q.care, m[0]) + ' ' + esc(m[1]) + (m[0] === 'other' ? ' ' + F(q.careOther, 40) : '') + '</span>'; }).join('') + '</div>';
            h += '<p><b>ข้อมูลสมาชิกในครอบครัว (ไม่รวมผู้ประสบปัญหาทางสังคมและต้องเป็นสมาชิกในครอบครัวเท่านั้น) (ถ้ามี)</b></p>';
            var mem = (q.members || []).slice(); while (mem.length < 3) mem.push(null);
            h += '<table class="mt"><thead><tr><th rowspan="2" style="width:9mm">ลำดับ</th><th rowspan="2" style="width:27mm">เลขบัตรประชาชน (ถ้ามี)</th><th rowspan="2">คำนำหน้า ชื่อ สกุล</th><th rowspan="2" style="width:9mm">อายุ</th><th rowspan="2" style="width:17mm">ความสัมพันธ์กับผู้ประสบปัญหา</th><th rowspan="2" style="width:14mm">อาชีพ</th><th rowspan="2" style="width:13mm">รายได้/ เดือน (บาท)</th><th colspan="3">สภาพทางร่างกาย</th><th colspan="2">ช่วยเหลือตนเอง</th></tr>' +
                 '<tr><th style="width:8mm">ปกติ</th><th style="width:8mm">พิการ</th><th style="width:11mm">ป่วยเรื้อรัง</th><th style="width:7mm">ได้</th><th style="width:8mm">ไม่ได้</th></tr></thead><tbody>' +
                 mem.map(function (m, i) { m = m || {}; var on = function (k, v) { return '<td class="mark"' + (m[k] === v ? ' data-mark="1">' + MARK : '>') + '</td>'; };
                    return '<tr style="height:6mm"><td class="c">' + (m.name || m.idNo ? thNum(i + 1) : '') + '</td><td class="c" style="font-size:9.5pt">' + esc(m.idNo || '') + '</td><td>' + esc(m.name || '') + '</td><td class="c">' + esc(m.age || '') + '</td><td>' + esc(m.relation || '') + '</td><td>' + esc(m.occupation || '') + '</td><td class="c">' + esc(money(m.income)) + '</td>' +
                        on('health', 'normal') + on('health', 'disabled') + on('health', 'chronic') + on('selfHelp', 'yes') + on('selfHelp', 'no') + '</tr>'; }).join('') + '</tbody></table>';
            // page 2
            var sa = q.stateAid || {}, ty = sa.types || {}, tx = sa.texts || {};
            h += '<div class="pb"></div><p><b>การได้รับความช่วยเหลือจากรัฐ/ราชการ</b></p>';
            h += '<p>' + CB(sa.status === 'never') + ' ๑. ไม่เคย</p>';
            h += '<p>' + CB(sa.status === 'yes') + ' ๒. เคย อะไรบ้างในปีงบประมาณนี้ จำนวน ' + F(sa.times, 10) + ' ครั้ง รวมเป็นเงิน ' + F(money(sa.amount), 28) + ' บาท ได้แก่ (ตอบได้มากกว่า ๑ ข้อ)</p>';
            h += '<div style="margin-left:38mm">' + D.aid.map(function (x) { return '<p style="margin:0.8mm 0">' + CB(!!ty[x[0]]) + ' ' + x[1] + '&nbsp; ' + esc(x[2]) + (x[3] ? ' ' + F(tx[x[0]] || '', 40) : '') + '</p>'; }).join('') + '</div>';
            h += '<p style="margin-top:4mm"><b>สภาพปัญหาความเดือดร้อนของครอบครัว</b></p>' + (q.problem ? '<p class="fillp">' + esc(q.problem) + '</p>' : L() + L() + L());
            var nd = q.need || {};
            h += '<p><b>ความช่วยเหลือที่ต้องการ (เลือกได้มากกว่า ๑ รายการ)</b></p>';
            h += '<p>' + CB(!!nd.money) + ' ช่วยเหลือเป็นเงิน (มีบัญชีเงินฝากธนาคาร ' + F(nd.bank, 40) + ' เลขที่บัญชี ' + F(nd.account, 38) + ')</p>';
            h += '<p>' + CB(!!nd.goods) + ' ช่วยเหลือเป็นสิ่งของ ระบุ ' + F(nd.goodsText, 120) + '</p>';
            h += '<p>' + CB(!!nd.other) + ' ช่วยเหลือเรื่องอื่นๆ ระบุ ' + F(nd.otherText, 118) + '</p>';
            var signName = q.signName || '';
            if (one) {
                var px = q.proxy || {};
                h += '<div class="bx" style="margin-top:6mm"><div class="bxh"><i>(สำหรับกรณียื่นที่ศูนย์ช่วยเหลือสังคม ๑๓๐๐ สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัด หรือสถานที่ที่ประกาศกำหนด และระบบ พม. Smart)</i></div>' +
                     '<div class="bxb"><p><b>การมอบฉันทะรับสิ่งของ</b></p><p style="text-indent:15mm">ในกรณีข้าพเจ้าไม่สามารถเดินทางไปรับสิ่งของได้ขอมอบฉันทะให้ นาย/นาง/นางสาว ' + F(px.name, 50) + '</p>' +
                     '<p>โทรศัพท์ ' + F(px.phone, 40) + ' อยู่บ้านเลขที่ ' + F(px.houseNo, 85) + '</p><p>มีความเกี่ยวข้องกับข้าพเจ้าในฐานะเป็น ' + F(px.relation, 80) + ' เป็นผู้รับสิ่งของแทน</p>' +
                     '<p style="text-align:right;margin-top:6mm">ลงชื่อ ' + F('', 55) + ' ผู้รับมอบฉันทะ</p></div></div>';
            }
            h += '<div class="sig"><p>ลงชื่อ ' + F('', 55) + (one ? ' ผู้ประสบปัญหาทางสังคม/ผู้แจ้งแทน' : ' ผู้ประสบปัญหาทางสังคม') + '</p><p style="margin-left:10mm">( ' + F(signName, 52) + ' )</p><p>ลงวันที่ ' + F(dateTh(q.signDate), 55) + '</p></div>';
            // page 3 — officials only (printed blank)
            h += '<div class="pb"></div><div style="text-align:right"><span class="tag"><i>สำหรับเจ้าหน้าที่ผู้เยี่ยมบ้านเท่านั้น</i></span></div>';
            h += '<div class="bxh solo"><b>ผลการเยี่ยมบ้าน (ถ้ามี)</b></div>';
            h += '<p><b>สภาพที่อยู่อาศัย</b> ' + F('', 140) + '</p><p><b>สถานที่ตั้งใกล้เคียงมองเห็นง่าย</b> ' + F('', 112) + '</p><p><b>สภาพปัญหาความเดือดร้อน</b> ' + F('', 120) + '</p>' + L();
            h += '<p><b>ความเห็นของเจ้าหน้าที่ผู้เยี่ยมบ้าน</b></p>' + L() + L() + L();
            h += '<div class="sig"><p>ลงชื่อ ' + F('', 55) + ' ผู้เยี่ยมบ้าน</p><p style="margin-left:10mm">( ' + F('', 52) + ' )</p><p>ตำแหน่ง ' + F('', 55) + '</p><p>ลงวันที่ ' + F('', 50) + ' (ว.ด.ป. ที่เยี่ยมบ้าน)</p><p>โทรศัพท์ ' + F('', 55) + '</p></div>';
            h += '<div class="bx"><div class="bxh"><b>การพิจารณาให้ความช่วยเหลือ</b></div><div class="bxh"><b>ความเห็นของผู้วินิจฉัยในการช่วยเหลือ</b></div><div class="bxb">' + L() + L() +
                 '<p>' + CB(false) + ' <b>ช่วยเหลือเป็นเงิน จำนวน</b> ' + F('', 45) + ' <b>บาท หรือ</b></p>' +
                 '<p>' + CB(false) + ' <b>ช่วยเหลือเป็นสิ่งของ</b> ระบุ <span class="opt">' + CB(false) + ' อุปกรณ์การศึกษา</span><span class="opt">' + CB(false) + ' อาหาร</span></p>' +
                 '<p><span class="opt" style="min-width:42mm">' + CB(false) + ' เครื่องนุ่งห่ม</span><span class="opt">' + CB(false) + ' ยารักษาโรค</span></p>' +
                 '<p><span class="opt" style="min-width:42mm">' + CB(false) + ' นมผงสำหรับเด็ก</span><span class="opt">' + CB(false) + ' เครื่องอุปโภคและบริโภค</span></p>' +
                 '<p>' + CB(false) + ' อื่นๆ ระบุ ' + F('', 90) + '</p><p><b>มูลค่าสิ่งของ จำนวน</b> ' + F('', 45) + ' <b>บาท</b></p><p>ตามระเบียบ/ประกาศ/หนังสือ</p>' + L() + L() +
                 '<p>เงินอุดหนุนประเภท ' + F('', 120) + '</p>' + L() +
                 '<div class="sig"><p>ลงชื่อ ' + F('', 50) + ' ผู้วินิจฉัยในการช่วยเหลือ</p><p style="margin-left:10mm">( ' + F('', 50) + ' )</p><p>ตำแหน่ง ' + F('', 50) + '</p><p>เลขที่ ' + F('', 52) + '</p><p>วันที่ ' + F('', 10) + ' เดือน ' + F('', 25) + ' พ.ศ. ' + F('', 15) + '</p></div></div></div>';
            // page 4 — payment / receipt details (officials, printed blank)
            h += '<div class="pb"></div><div class="bx"><div class="bxb"><p><b><u>รายละเอียดสำหรับการจ่ายเงิน เท่านั้น</u></b></p>' +
                 '<p><b>๑. รับด้วยตนเอง/มอบอำนาจรับแทน</b></p><p style="margin-left:5mm"><span class="opt">' + RB(false) + ' เงินสด</span><span class="opt">' + RB(false) + ' เช็ค เลขที่ ' + F('', 45) + '</span> ธนาคาร ' + F('', 40) + '</p>' +
                 '<p style="margin-left:5mm">หากมีการรับแทนโปรดระบุเลขที่บัตรประชาชน ' + idBoxes('') + '</p><p style="margin-left:5mm">ชื่อ - นามสกุล ' + F('', 100) + ' ผู้รับแทน</p><p style="margin-left:5mm">เบอร์โทรติดต่อ ' + F('', 60) + '</p>' +
                 '<p><b>๒. โอนเข้าบัญชีธนาคาร</b> <span class="opt">' + RB(false) + ' โอนเข้าบัญชี</span><span class="opt">' + RB(false) + ' พร้อมเพย์ (Prompt Pay)</span><span class="opt">' + RB(false) + ' KTB Corporate Online</span><span class="opt">' + RB(false) + ' e-Payment</span></p>' +
                 '<p style="margin-left:5mm">ชื่อ - นามสกุล ผู้รับเงิน ' + F('', 110) + '</p><p style="margin-left:5mm">เลขที่บัตรประชาชน ' + idBoxes('') + ' เบอร์โทรศัพท์ ' + F('', 35) + '</p>' +
                 '<p style="margin-left:5mm">เลขที่บัญชี ' + F('', 55) + ' ชื่อบัญชี ' + F('', 60) + '</p><p style="margin-left:5mm">ธนาคาร ' + F('', 60) + ' สาขา ' + F('', 60) + '</p></div>' +
                 '<div class="bxb bt"><p><b><u>รายละเอียดสำหรับการรับสิ่งของ</u></b></p><p>' + RB(false) + ' <b>รับด้วยตนเอง</b></p><p>' + RB(false) + ' <b>ผู้รับแทน</b> เลขที่บัตรประชาชน ' + idBoxes('') + '</p><p style="margin-left:20mm">ชื่อ-นามสกุล ' + F('', 110) + '</p></div>' +
                 '<div class="bxb bt"><p><b>ประสานส่งต่อไปยังหน่วยงาน</b> ชื่อหน่วยงาน ' + F('', 60) + ' จังหวัด ' + F('', 40) + '</p><p><b>ช่วยเหลือด้านอื่นๆ</b> ' + F('', 130) + '</p><p>' + CB(false) + ' <b>ระงับความช่วยเหลือ</b> เนื่องจาก ' + F('', 110) + '</p></div></div>';
            h += '<p class="sysnote">จัดทำแบบคำขอจากระบบ TSS CareSpace • เลขอ้างอิง ' + esc(it.id) + ' • สร้างเอกสาร ' + esc(dTime(src.generatedAt)) + ' โดย ' + esc(src.preparedBy) + ' • เอกสารมีเลขบัตรประชาชนและข้อมูลส่วนบุคคล ใช้เพื่อยื่นคำขอเท่านั้น</p>';
            // each line of the paper form stays one line: empty blanks shrink, filled ones keep their text
            return h.replace(/<p>/g, '<p class="r">').replace(/<p style="/g, '<p class="r" style="') + '</div>';
        }

        /* ---------- 2026-11-06: EQ (12–17 ปี) • 2Q 9Q 8Q • BioEdSocial ---------- */
        function fieldsLine(src, it, extra) {
            var cx = it.context || {};
            return '<div class="fields"><span>ชื่อ - สกุล: <b>' + studentLabel(src) + '</b></span>' + (gradeText(src) ? '<span>ชั้น <b>' + esc(gradeText(src)) + '</b></span>' : '') +
                   (cx.ageYears != null ? '<span>อายุ <b>' + esc(cx.ageYears) + '</b> ปี</span>' : '') + (extra || '') + '<span>วันที่ประเมิน <b>' + esc(dLong(it.assessedDate)) + '</b></span></div>';
        }
        function eq(src, def, o) {
            var it = src.item, r = it.result, f = def.forms[0], ip = r.itemPoints || {};
            var h = header(src, 'แบบประเมินความฉลาดทางอารมณ์ (EQ)', 'สำหรับวัยรุ่น (อายุ 12–17 ปี) — กรมสุขภาพจิต กระทรวงสาธารณสุข');
            h += fieldsLine(src, it);
            h += '<p class="instr">เครื่องหมายถูกแสดงคำตอบที่บันทึกไว้ • คอลัมน์ “คะแนน” คิดตามการให้คะแนนของคู่มือ (กลุ่มที่ 1: 1–4, กลุ่มที่ 2: 4–1)</p>';
            var head = '<thead><tr><th style="width:9mm" class="c">ข้อ</th><th>อารมณ์ ความรู้สึก พฤติกรรม</th>' + f.options.map(function (op) { return '<th class="c" style="width:16mm">' + esc(op.label) + '</th>'; }).join('') + '<th class="c" style="width:13mm">คะแนน</th></tr></thead>';
            var rows = '';
            def.scales.forEach(function (sc) {
                for (var n = sc.from; n <= sc.to; n++) {
                    var q = f.items[n - 1], a = it.answers[n];
                    rows += '<tr><td class="c">' + n + '</td><td>' + esc(q.text) + '</td>' + f.options.map(function (op, i) { return '<td class="mark"' + (a === i ? ' data-mark="1">' + MARK : '>') + '</td>'; }).join('') + '<td class="c">' + (ip[n] != null ? ip[n] : '') + '</td></tr>';
                }
                var s = (r.subscales || []).filter(function (x) { return x.key === sc.key; })[0];
                rows += '<tr class="tot"><td colspan="' + (f.options.length + 2) + '" style="text-align:right">รวม ' + esc(sc.label) + '</td><td class="c">' + (s ? s.score : '') + '</td></tr>';
            });
            h += '<table>' + head + '<tbody>' + rows + '</tbody></table>';
            h += '<h2>การรวมคะแนนและช่วงคะแนนปกติ (ตามคู่มือ)</h2><table><thead><tr><th>ด้าน</th><th>ด้านย่อย</th><th class="c">คะแนน</th><th class="c">ช่วงคะแนนปกติ</th><th>ผล</th></tr></thead><tbody>' +
                 (r.subscales || []).map(function (s) { var dom = def.domains.filter(function (g) { return g.key === s.domain; })[0];
                    return '<tr' + (s.position === 'below' ? ' class="hit"' : '') + '><td>' + esc(dom ? dom.label : '') + '</td><td>' + esc(s.label) + '</td><td class="c">' + s.score + '</td><td class="c">' + esc(s.normal) + '</td><td>' + esc(s.band) + '</td></tr>'; }).join('') +
                 (r.domainTotals || []).map(function (g) { return '<tr class="tot"><td colspan="2">รวม' + esc(g.label) + '</td><td class="c">' + g.score + '</td><td class="c">—</td><td>เอกสารไม่ได้กำหนดเกณฑ์รายด้าน</td></tr>'; }).join('') + '</tbody></table>';
            h += '<p class="note">' + def.domains.map(function (g) { return '<b>' + esc(g.label) + '</b> หมายถึง ' + esc(g.meaning); }).join('<br>') + '</p>';
            h += '<p class="box">ผลที่ได้เป็นเพียงการประเมินโดยสังเขป คะแนนที่ได้ต่ำกว่าช่วงคะแนนปกติ ไม่ได้หมายความว่ามีความผิดปกติในด้านนั้น เพราะคะแนนต่าง ๆ เหล่านี้เป็นสิ่งที่มีการพัฒนาและเปลี่ยนแปลงตลอดเวลา คะแนนที่ได้ต่ำจึงเป็นข้อเตือนใจให้หาแนวทางในการพัฒนาความฉลาดทางอารมณ์ในด้านนั้น ๆ ให้มากยิ่งขึ้น (หมายเหตุจากคู่มือ)</p>';
            if (r.ageWarning) h += '<p class="box">' + esc(r.band) + '</p>';
            h += '<p class="copy">' + esc(def.credit) + '</p>';
            return h + footer(src, o);
        }
        function q298(src, def, o) {
            var it = src.item, r = it.result, f = def.forms[0], ip = r.itemPoints || {}, A = it.answers;
            var h = header(src, 'แบบคัดกรอง/ประเมินโรคซึมเศร้า และแบบประเมินการฆ่าตัวตาย (2Q 9Q 8Q)');
            h += fieldsLine(src, it, '<span>ผู้ประเมิน <b>' + esc(it.assessorName) + '</b></span>');
            var opts = function (q) { return q.options || f.options; };
            var tick = function (on) { return on ? MARK : ''; };
            // 2Q
            h += '<h2>แบบคัดกรองโรคซึมเศร้าด้วย 2 คำถาม (2Q)</h2><table><thead><tr><th style="width:9mm" class="c">ข้อ</th><th>คำถาม</th><th class="c" style="width:16mm">มี</th><th class="c" style="width:16mm">ไม่มี</th></tr></thead><tbody>' +
                 [1, 2].map(function (n) { var q = f.items[n - 1]; return '<tr><td class="c">' + n + '</td><td>' + esc(q.text) + '</td><td class="mark">' + tick(A[n] === 0) + '</td><td class="mark">' + tick(A[n] === 1) + '</td></tr>'; }).join('') + '</tbody></table>';
            var s2 = (r.subscales || [])[0];
            h += '<p class="box"><b>ผล 2Q:</b> ' + esc(s2 ? s2.band : '') + '</p>';
            if (ip[3] != null) {
                h += '<h2>แบบประเมินโรคซึมเศร้าด้วย 9 คำถาม (9Q)</h2><p class="instr">ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ ท่านมีอาการเหล่านี้บ่อยแค่ไหน</p><table><thead><tr><th style="width:9mm" class="c">ลำดับ</th><th>อาการ</th>' +
                     f.options.map(function (op) { return '<th class="c" style="width:17mm">' + esc(op.label) + '<br>(' + op.points + ')</th>'; }).join('') + '</tr></thead><tbody>';
                for (var n = 3; n <= 11; n++) { var q = f.items[n - 1]; h += '<tr><td class="c">' + esc(q.dno) + '</td><td>' + esc(q.text) + '</td>' + f.options.map(function (op, i) { return '<td class="mark">' + tick(A[n] === i) + '</td>'; }).join('') + '</tr>'; }
                var s9 = (r.subscales || []).filter(function (x) { return x.key === '9Q'; })[0];
                h += '<tr class="tot"><td colspan="2" style="text-align:right">รวม</td><td colspan="4" class="c">' + (s9 ? s9.score : '') + ' / 27</td></tr></tbody></table>';
                h += '<table><thead><tr><th>คะแนน 9Q</th><th>การแปลผล</th></tr></thead><tbody>' + def.bands9.map(function (b) { var hit = s9 && s9.score >= b.min && s9.score <= b.max;
                    return '<tr' + (hit ? ' class="hit"' : '') + '><td class="c">' + (b.max >= 27 ? '≥ ' + b.min : b.min + ' – ' + b.max) + (hit ? ' ◀' : '') + '</td><td>' + esc(b.label) + '</td></tr>'; }).join('') + '</tbody></table>';
                h += '<p class="note">หมายเหตุ: กรณีคะแนน 9Q ≥ 7 ให้ประเมินการฆ่าตัวตาย 8 คำถามต่อ • กรณีคะแนน 9Q ≥ 13 ให้พิจารณาส่งพบจิตแพทย์เพื่อรับการตรวจวินิจฉัยเพิ่มเติม</p>';
            }
            if (ip[12] != null) {
                h += '<h2>แบบประเมินการฆ่าตัวตาย (8Q)</h2><table><thead><tr><th style="width:9mm" class="c">ลำดับ</th><th style="width:30mm">ระยะเวลา</th><th>คำถาม</th><th class="c" style="width:22mm">คำตอบ</th><th class="c" style="width:14mm">คะแนน</th></tr></thead><tbody>';
                for (var m = 12; m <= 20; m++) { var q8 = f.items[m - 1]; if (ip[m] == null && m === 15) continue; var a8 = A[m], op8 = a8 != null ? opts(q8)[a8] : null;
                    h += '<tr><td class="c">' + esc(q8.dno) + '</td><td>' + esc(q8.period || '') + '</td><td>' + esc(q8.text) + '</td><td class="c">' + (op8 ? esc(op8.label) : '—') + '</td><td class="c">' + (ip[m] != null ? ip[m] : '') + '</td></tr>'; }
                var s8 = (r.subscales || []).filter(function (x) { return x.key === '8Q'; })[0];
                h += '<tr class="tot"><td colspan="4" style="text-align:right">รวม</td><td class="c">' + (s8 ? s8.score : '') + '</td></tr></tbody></table>';
                h += '<table><thead><tr><th>คะแนน 8Q</th><th>การแปลผล</th></tr></thead><tbody>' + def.bands8.map(function (b) { var hit = s8 && s8.score >= b.min && s8.score <= b.max;
                    return '<tr' + (hit ? ' class="hit"' : '') + '><td class="c">' + (b.min === b.max ? b.min : b.max >= 52 ? '≥ ' + b.min : b.min + ' – ' + b.max) + (hit ? ' ◀' : '') + '</td><td>' + esc(b.label) + '</td></tr>'; }).join('') + '</tbody></table>';
            }
            if (r.advice) h += '<p class="box"><b>หมายเหตุจากเอกสาร:</b> ' + esc(r.advice) + '</p>';
            if (r.safety && r.safety.flag) h += '<div class="alert"><b>ข้อควรดำเนินการด้านความปลอดภัย:</b> ' + esc(r.safety.reasons.join(' • ')) + ' — ' + esc(r.safety.message) + '</div>';
            h += '<p class="copy">อ้างอิง: ' + esc(def.credit) + '</p>';
            return h + footer(src, o);
        }
        function bes(src, def, o) {
            var it = src.item, r = it.result, f = def.forms[0], A = it.answers;
            var h = header(src, 'BioEdSocial Assessment');
            h += '<div class="fields"><span>Student: <b>' + studentLabel(src) + '</b></span>' + (gradeText(src) ? '<span>Grade: <b>' + esc(gradeText(src)) + '</b></span>' : '') + '<span>Date: <b>' + esc(dLong(it.assessedDate)) + '</b></span>' +
                 (respondentText(src) ? '<span>ผู้ประเมิน: <b>' + esc(respondentText(src)) + '</b></span>' : '') + '</div>';
            h += '<p class="instr"><b>Instructions:</b> Circle all potential challenges/ concerns and all protective factors (in italics). — <span class="bes-hl">รายการที่ไฮไลต์สีเหลือง</span> คือรายการที่ผู้ประเมินเลือกไว้</p>';
            def.groups.forEach(function (g) {
                var c = f.items.filter(function (q) { return q.group === g.key && q.kind === 'concern'; }), p = f.items.filter(function (q) { return q.group === g.key && q.kind === 'protective'; });
                var cell = function (q, ital) { if (!q) return '<td></td>'; var on = A[q.no] === 1; return '<td' + (on ? ' class="bes-on"' : '') + '>' + (on ? '● ' : '') + (ital ? '<i>' + esc(q.text) + '</i>' : esc(q.text)) + '</td>'; };
                var half = Math.ceil(c.length / 2), rows = '';
                for (var i = 0; i < Math.max(half, p.length); i++) rows += '<tr>' + cell(c[i]) + cell(c[i + half]) + cell(p[i], true) + '</tr>';
                h += '<h2 class="c">' + esc(g.label) + '</h2><table class="bes-t"><tbody>' + rows + '</tbody></table>';
            });
            h += '<h2>สรุปจำนวนรายการที่เลือก</h2><table><thead><tr><th>ด้าน</th><th class="c">Challenges/ concerns</th><th class="c">Protective factors</th></tr></thead><tbody>' +
                 (r.subscales || []).map(function (s) { return '<tr><td>' + esc(s.label) + '</td><td class="c">' + s.concerns + '</td><td class="c">' + s.protective + '</td></tr>'; }).join('') + '</tbody></table>';
            h += '<p class="note">เอกสารไม่มีการให้คะแนนหรือเกณฑ์แปลผล — แสดงเฉพาะรายการที่เลือก • ต้นฉบับมี “Exposure to domestic violence” 2 ครั้งในหมวด Social ระบบแสดงครั้งเดียว</p>';
            h += '<p class="copy">' + esc(def.credit) + '</p>';
            return h + footer(src, o);
        }

        /* ---------- answer sheet of a tab-5 tool (S.D.M.A. / F.A. / S.S.A. / M.S.C.A.) — tools.report ---------- */
        function toolVal(f, v) {
            if (v === undefined || v === null || v === '') return '—';
            var opt = function (x) { return (f.options || []).filter(function (o) { return String(o.v) === String(x); })[0]; };
            switch (f.type) {
                case 'date': return esc(dLong(v));
                case 'number': return esc(Number(v).toLocaleString('th-TH'));
                case 'single': { var o = opt(v.v); return o ? esc(o.label) + (v.detail ? ' — ' + esc(v.detail) : '') : '—'; }
                case 'multi': return (v.values || []).map(function (x) { var o = opt(x); return o ? esc(o.label) + (v.details && v.details[x] ? ' — ' + esc(v.details[x]) : '') : ''; }).filter(Boolean).join('<br>') || '—';
                case 'grouped': return (v.selected || []).map(function (c) {
                    var g = (f.groups || []).filter(function (x) { return x.code === c; })[0] || { label: '' }, subs = (v.subs && v.subs[c]) || [];
                    return '<b>' + esc(c) + '</b> ' + esc(g.label) + subs.map(function (sc) { var so = (g.subs || []).filter(function (x) { return x.code === sc; })[0]; return '<br>&nbsp;&nbsp;• ' + esc(sc) + ' ' + esc(so ? so.label : ''); }).join('') +
                           (v.notes && v.notes[c] ? '<br>&nbsp;&nbsp;หมายเหตุ: ' + esc(v.notes[c]) : '');
                }).join('<br>') || '—';
                default: return esc(String(v)).replace(/\n/g, '<br>');
            }
        }
        function fieldTable(fields, vals) {
            return '<table><tbody>' + fields.map(function (f) { return '<tr><td style="width:62mm">' + esc(f.label) + '</td><td>' + toolVal(f, (vals || {})[f.id]) + '</td></tr>'; }).join('') + '</tbody></table>';
        }
        function buildTool(src, def) {
            var it = src.item, a = it.answers || {}, r = it.result || {};
            if (!r.complete) return { html: '', error: 'ผลนี้ยังไม่ครบ จึงยังพิมพ์ไม่ได้' };
            var h = header(src, (def.abbr ? def.abbr + ' ' : '') + def.nameTh, def.nameEn || '');
            h += '<div class="fields"><span>ผู้รับบริการ: <b>' + studentLabel(src) + '</b></span>' + (gradeText(src) ? '<span>ชั้น <b>' + esc(gradeText(src)) + '</b></span>' : '') +
                 '<span>วันที่ประเมิน <b>' + esc(dLong(it.assessedDate)) + '</b></span><span>ผู้ประเมิน <b>' + esc(it.assessorName) + '</b></span></div>';
            if (def.code === 'SDMA') {
                (def.sections || []).forEach(function (sec) { h += '<h2>' + esc(sec.title) + '</h2>' + fieldTable(sec.fields || [], a); });
            } else {
                if (def.extraFields && def.extraFields.length) h += '<h2>ข้อมูลผู้ให้ข้อมูล / การประเมิน</h2>' + fieldTable(def.extraFields, a.extra);
                if (def.code === 'FA') {
                    var per = {}; (r.items || []).forEach(function (x) { per[x.no] = x; });
                    h += '<h2>คำตอบรายข้อ</h2><table><thead><tr><th class="c" style="width:9mm">ข้อ</th><th style="width:48mm">ประเด็น</th><th>คำตอบที่เลือก</th><th class="c" style="width:16mm">คะแนน</th></tr></thead><tbody>' +
                         def.items.map(function (q) { var x = (a.items || {})[String(q.no)], ans = '—';
                            if (x && q.mode === 'single') { var o = q.options.filter(function (op) { return op.v === x.v; })[0]; ans = o ? esc(o.label) : '—'; }
                            else if (x) ans = (x.values || []).map(function (v) { var o2 = q.options.filter(function (op) { return op.v === v; })[0]; return o2 ? '• ' + esc(o2.label) : ''; }).join('<br>');
                            return '<tr><td class="c">' + q.no + '</td><td>' + esc(q.label) + '</td><td>' + ans + '</td><td class="c">' + (per[q.no] && per[q.no].score != null ? per[q.no].score + ' / ' + per[q.no].max : '—') + '</td></tr>'; }).join('') +
                         '<tr class="tot"><td colspan="3" style="text-align:right">คะแนนรวม</td><td class="c">' + esc(r.score) + ' / ' + esc(r.maxPossible) + '</td></tr></tbody></table>';
                } else {
                    var dres = {}; (r.domains || []).forEach(function (x) { dres[x.id] = x; });
                    (def.domains || []).forEach(function (d) {
                        var dr = dres[d.id] || {};
                        h += '<h2>' + esc((d.part ? d.part + ' — ' : '') + d.title) + '</h2><table><thead><tr><th class="c" style="width:9mm">ข้อ</th><th style="width:50mm">หัวข้อ</th><th class="c" style="width:14mm">ระดับ</th><th>คำอธิบายระดับที่เลือก</th></tr></thead><tbody>' +
                             d.items.map(function (q) { var v = (a.scores || {})[q.id]; return '<tr><td class="c">' + q.no + '</td><td>' + esc(q.label) + '</td><td class="c">' + (v || '—') + '</td><td>' + esc(v && q.levels ? q.levels[String(v)] || '' : '') + '</td></tr>'; }).join('') +
                             '<tr class="tot"><td colspan="3" style="text-align:right">' + (dr.mean != null ? 'ค่าเฉลี่ยด้านนี้' : 'คะแนนรวมด้านนี้') + '</td><td>' + esc(dr.mean != null ? dr.mean : (dr.sum != null ? dr.sum + (dr.max ? ' / ' + dr.max : '') : '—')) + '</td></tr></tbody></table>';
                    });
                    if (a.comment) h += '<p><b>ความคิดเห็นเพิ่มเติม:</b> ' + esc(a.comment) + '</p>';
                }
                var band = r.band ? (r.band.label + (r.band.range ? ' (' + r.band.range + ')' : '')) : '';
                h += '<h2>สรุปผลที่บันทึกไว้</h2><div class="box">' + (r.score != null ? '<p><b>คะแนน:</b> ' + esc(r.score) + (r.maxPossible ? ' / ' + esc(r.maxPossible) : '') + '</p>' : '') + (band ? '<p><b>ระดับ:</b> ' + esc(band) + '</p>' : '') +
                     (r.readinessText ? '<p>' + esc(r.readinessText) + '</p>' : '') + (r.followUp ? '<p>' + esc(r.followUp) + '</p>' : '') + '</div>';
                if (src.commonNotes && a.notes) h += '<h2>บันทึกของผู้ประเมิน</h2>' + fieldTable(src.commonNotes, a.notes);
            }
            h += '<div class="note"><p><b>ข้อจำกัดในการตีความ:</b> ผลการประเมินเป็นข้อมูลประกอบการพิจารณา ไม่ใช่การวินิจฉัยโดยลำพัง</p></div>';
            h += '<div class="foot">ผู้ประเมิน/ผู้บันทึก: ' + esc(it.assessorName) + ' • บันทึกผล ' + esc(dTime(it.finalizedAt)) + ' • เลขอ้างอิงการประเมิน (Assessment ID) ' + esc(it.id) +
                 '<br>อ้างอิง: เครื่องมือการปฏิบัติงานสังคมสงเคราะห์ทางการแพทย์ (รับรองโดยสภาวิชาชีพสังคมสงเคราะห์) • สร้างเอกสาร ' + esc(dTime(src.generatedAt)) + ' โดย ' + esc(src.preparedBy) + ' • เอกสารนี้มีข้อมูลอ่อนไหว ใช้เพื่อการดูแลช่วยเหลือเท่านั้น</div>';
            return { html: '<div class="ilr-doc">' + h + '</div>', css: css(), fileName: (def.abbr || def.code).replace(/\./g, '') + '_' + src.client.id + '_' + it.assessedDate + '.pdf' };
        }

        function build(src, o) {
            o = o || {};
            var code = src.item.toolCode.slice(2), def = src.def;
            if (!def) return { html: '', error: 'ผลนี้บันทึกด้วยแบบประเมินรุ่นที่ไม่มีในระบบแล้ว จึงสร้างรายงานตามแบบฟอร์มไม่ได้' };
            if (!src.item.result || !src.item.result.complete) return { html: '', error: 'ผลการประเมินยังไม่ครบ จึงยังพิมพ์รายงานไม่ได้' };
            var fn = { PHQA: phqa, SNAP: snap, GAST: gast, KUSSI: kussi, LDS: lds, PSK: psk, EQ: eq, Q298: q298, BES: bes }[code];
            if (!fn) return { html: '', error: 'เครื่องมือนี้ยังรอตรวจสอบกับคู่มือฉบับต้นฉบับ จึงยังไม่มีรูปแบบรายงาน' };
            return { html: '<div class="ilr-doc">' + fn(src, def, o) + '</div>', css: css(), fileName: fileName(src) };
        }
        return { build: build, buildTool: buildTool, css: css, fileName: fileName };
    })();
    