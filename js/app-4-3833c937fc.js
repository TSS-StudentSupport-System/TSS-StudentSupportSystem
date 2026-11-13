
        document.addEventListener('DOMContentLoaded', () => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-revealed');
                    }
                });
            }, { threshold: 0.1 });

            const watch = (root) => {
                if (root.nodeType !== 1) return;
                if (root.classList.contains('reveal-on-scroll') && !root.__tssReveal) { root.__tssReveal = true; observer.observe(root); }
                root.querySelectorAll('.reveal-on-scroll').forEach(el => { if (!el.__tssReveal) { el.__tssReveal = true; observer.observe(el); } });
            };
            watch(document.body);
            new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(watch))).observe(document.body, { childList: true, subtree: true });
        });

        let radarChartInstance = null;
        function initRadarChart(latest) {
            const ctx = document.getElementById('studentRadarChart');
            if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
            if (!ctx || !latest) return;      // never draw placeholder numbers
            if (!window.Chart) { window.TssLib.load('chart').then(() => initRadarChart(latest), () => {}); return; }   // fetched on first use
            radarChartInstance = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['ชีวภาพ (Biological)', 'จิตวิทยา (Psychological)', 'สังคม (Social)'],
                    datasets: [{
                        label: 'คะแนนความเสี่ยง (1–10)',
                        data: [latest.bioScore, latest.psychoScore, latest.socialScore],
                        backgroundColor: 'rgba(139, 0, 0, 0.2)',
                        borderColor: '#8B0000',
                        pointBackgroundColor: '#8B0000',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#8B0000'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            suggestedMin: 0,
                            suggestedMax: 10,
                            ticks: { stepSize: 2, font: { size: 10 } }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        function schoolApp() {
            return {
                isLoggedIn: false,
                currentLang: 'th',
                mouseX: window.innerWidth / 2,
                mouseY: window.innerHeight / 2,

                // Web Audio API Sound Engine State (Respects Autoplay, Touch, Reduced Motion, and Single Trigger per Hover)
                soundEnabled: true,
                audioCtx: null,
                lastHoveredElement: null,
                isTouchDevice: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),

                toggleSound() {
                    this.soundEnabled = !this.soundEnabled;
                    if (this.soundEnabled) {
                        this.playUiSound('click');
                        this.showToast('🔊 เปิดเสียงเอฟเฟกต์ UI แล้ว');
                    } else {
                        this.showToast('🔇 ปิดเสียงเอฟเฟกต์ UI แล้ว');
                    }
                },

                triggerCardHoverSound(el) {
                    if (!this.soundEnabled || this.isTouchDevice) return;
                    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                    if (this.lastHoveredElement === el) return;
                    this.lastHoveredElement = el;
                    const resetHandler = () => {
                        if (this.lastHoveredElement === el) this.lastHoveredElement = null;
                        el.removeEventListener('mouseleave', resetHandler);
                    };
                    el.addEventListener('mouseleave', resetHandler);
                    this.playUiSound('hover');
                },

                playUiSound(type = 'hover') {
                    if (!this.soundEnabled || this.isTouchDevice) return;
                    try {
                        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                        if (!AudioContextClass) return;
                        if (!this.audioCtx) {
                            this.audioCtx = new AudioContextClass();
                        }
                        if (this.audioCtx.state === 'suspended') {
                            this.audioCtx.resume().catch(() => {});
                            return;
                        }
                        const now = this.audioCtx.currentTime;
                        const osc = this.audioCtx.createOscillator();
                        const gain = this.audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(this.audioCtx.destination);

                        if (type === 'hover') {
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(520, now);
                            osc.frequency.exponentialRampToValueAtTime(680, now + 0.035);
                            gain.gain.setValueAtTime(0.012, now);
                            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
                            osc.start(now);
                            osc.stop(now + 0.036);
                        } else {
                            osc.type = 'triangle';
                            osc.frequency.setValueAtTime(640, now);
                            gain.gain.setValueAtTime(0.025, now);
                            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
                            osc.start(now);
                            osc.stop(now + 0.062);
                        }
                    } catch (e) {
                        // Ignore autoplay restrictions smoothly
                    }
                },

                // Calendar Month State (Asia/Bangkok Timezone Standard)
                currentYear: 2026,
                currentMonth: 9, // 0 = Jan, 9 = October (2026)

                get currentMonthName() {
                    const monthsTh = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
                    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    return this.currentLang === 'th' ? monthsTh[this.currentMonth] : monthsEn[this.currentMonth];
                },

                changeMonth(direction) {
                    if (this.appointmentViewMode === 'week') {
                        this.scheduleWeekStart = this.addDaysISO(this.scheduleWeekStart || this.mondayOf(this.todayISO()), direction * 7);
                        const [y, m] = this.scheduleWeekStart.split('-').map(Number);
                        this.currentYear = y; this.currentMonth = m - 1;
                        this.loadAppointments();
                        return;
                    }
                    this.currentMonth += direction;
                    if (this.currentMonth > 11) {
                        this.currentMonth = 0;
                        this.currentYear++;
                    } else if (this.currentMonth < 0) {
                        this.currentMonth = 11;
                        this.currentYear--;
                    }
                    this.loadAppointments();
                },

                // Date-only & Asia/Bangkok Formatting Helpers (Prevents UTC off-by-one day shift)
                formatThaiDateDisplay(dateISO) {
                    if (!dateISO || typeof dateISO !== 'string') return '-';
                    const parts = dateISO.split('-');
                    if (parts.length !== 3) return dateISO;
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    const d = parseInt(parts[2], 10);
                    const monthsShortTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                    return `${d} ${monthsShortTh[m] || ''} ${y + 543}`;
                },

                calculateAgeAtDate(birthDateISO, serviceDateISO) {
                    if (!birthDateISO) return null;
                    const bParts = birthDateISO.split('-').map(Number);
                    const sParts = (serviceDateISO || '2026-10-26').split('-').map(Number);
                    if (bParts.length !== 3 || sParts.length !== 3) return null;
                    let age = sParts[0] - bParts[0];
                    const mDiff = sParts[1] - bParts[1];
                    if (mDiff < 0 || (mDiff === 0 && sParts[2] < bParts[2])) {
                        age--;
                    }
                    return age >= 0 ? age : null;
                },

                get calendarDays() {
                    const year = this.currentYear;
                    const month = this.currentMonth;
                    
                    const firstDayIndex = new Date(year, month, 1).getDay();
                    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
                    const prevMonthDays = new Date(year, month, 0).getDate();

                    let days = [];

                    for (let i = firstDayIndex - 1; i >= 0; i--) {
                        let dNum = prevMonthDays - i;
                        days.push({
                            dayNum: dNum,
                            isCurrentMonth: false,
                            isToday: false,
                            dateKey: `prev-${dNum}`,
                            dateStr: `${dNum}/${month === 0 ? 12 : month}`
                        });
                    }

                    const monthsShortTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                    for (let d = 1; d <= totalDaysInMonth; d++) {
                        let isToday = (`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` === this.todayISO());
                        days.push({
                            dayNum: d,
                            isCurrentMonth: true,
                            isToday: isToday,
                            dateKey: `curr-${year}-${month+1}-${d}`,
                            dateStr: `${d} ${monthsShortTh[month]}`
                        });
                    }

                    let remainingCells = 35 - days.length;
                    if (remainingCells < 0) remainingCells = 42 - days.length;
                    for (let d = 1; d <= remainingCells; d++) {
                        days.push({
                            dayNum: d,
                            isCurrentMonth: false,
                            isToday: false,
                            dateKey: `next-${d}`,
                            dateStr: `${d}`
                        });
                    }

                    return days;
                },

                // SINGLE SOURCE OF TRUTH: appointments loaded from the server (appointments.list), with the active filters
                get unifiedAppointmentsList() {
                    return this.appointments.filter(item => {
                        const matchProvider = (this.scheduleProviderFilter === 'all' || item.counselor === this.scheduleProviderFilter);
                        const matchStatus = (this.scheduleStatusFilter === 'all' || item.status === this.scheduleStatusFilter);
                        return matchProvider && matchStatus;
                    });
                },

                getAppointmentsForCurrentMonth() {
                    const targetPrefix = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`;
                    return this.unifiedAppointmentsList.filter(a => (a.dateISO || '').startsWith(targetPrefix));
                },

                getAppointmentsForDate(dayNum, isCurrentMonth) {
                    if (!isCurrentMonth) return [];
                    const dateISO = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    return this.unifiedAppointmentsList.filter(a => a.dateISO === dateISO);
                },

                async syncAppointmentStatus(apptItem, status) {
                    const r = await this.saveAppointment(Object.assign({}, apptItem, { status }));
                    if (r.ok) { this.activeAppointment = r.appointment; this.showToast('📌 อัปเดตสถานะเป็น: ' + (this.apptMeta.statuses[status] || status)); }
                },

                handleMouseMove(e) {
                    this.mouseX = e.clientX;
                    this.mouseY = e.clientY;
                },

                get mouseStyle() {
                    return `--mouse-x: ${this.mouseX}px; --mouse-y: ${this.mouseY}px;`;
                },
                
                translations: {
                    en: {
                        "CareSpace School SEL": "CareSpace School SEL",
                        "มหาวิทยาลัยธรรมศาสตร์": "Thammasat University",
                        "โรงเรียนสาธิตแห่งมหาวิทยาลัยธรรมศาสตร์": "Thammasat Secondary School",
                        "เลือกบทบาทผู้ใช้งาน": "Select User Role",
                        "ครูกระบวนการ": "Process Teacher",
                        "นักวิชาการศึกษา": "Educational Scholar",
                        "เจ้าหน้าที่ทั่วไป": "General Staff",
                        "นักสังคมสงเคราะห์": "Social Worker",
                        "นักจิตวิทยา": "Psychologist",
                        "แพทย์": "Physician",
                        "จิตแพทย์": "Psychiatrist",
                        "ชื่อ-นามสกุล ผู้ใช้งาน": "User Full Name",
                        "เข้าสู่ระบบ": "Login",
                        "1. หน้าแรก": "1. Home",
                        "2. ค้นหา": "2. Search",
                        "3. ประวัติการบันทึกเคสก่อนหน้า": "3. Case Log History",
                        "4. บันทึกเคสใหม่": "4. New Case Log",
                        "5. คลังข้อมูลผู้ใช้บริการ": "5. Client Archive",
                        "6. เครื่องมือการให้ความช่วยเหลือ": "6. Support Tools",
                        "7. ตั้งค่าเพิ่มเติม": "7. Settings",
                        "TSS Empathy Center • ระบบพื้นที่ปลอดภัยและดูแลนักเรียน": "TSS Empathy Center • Safe Space & Care System",
                        "ค้นหาข้อมูลนักเรียน": "Search Students",
                        "กรอกข้อมูลเคส": "Log Case",
                        "✉️ คำร้องขอนัดหมาย (Google Form)": "✉️ Appointment Requests (Google Form)",
                        "อนุมัติและลงตาราง": "Approve & Schedule",
                        "ปฏิเสธ": "Reject",
                        "ไม่มีคำร้องนัดหมายใหม่ในขณะนี้": "No new appointment requests at this time.",
                        "🚨 การแจ้งเตือน Red Alert": "🚨 Red Alert Notifications",
                        "วิกฤตต้องดูแลด่วน": "Critical care needed urgently",
                        "ไม่มีเคสวิกฤตในขณะนี้": "No critical cases at this time.",
                        "เมนูทั้งหมด": "All Menus",
                        "✨ TSS EMPATHY CENTER & SAFE SPACE": "✨ TSS EMPATHY CENTER & SAFE SPACE",
                        "สังคมแห่งการเคารพและเรียนรู้ร่วมกัน": "An Inclusive Society Built Through Respect and Mutual Learning",
                        "Toward Inclusive Societies That Learn and Grow Together. An Inclusive Society Built Through Respect and Mutual Learning.": "Toward Inclusive Societies That Learn and Grow Together. An Inclusive Society Built Through Respect and Mutual Learning.",
                        "📌 วันหยุดสำคัญ เดือนตุลาคม 2026": "📌 October 2026 Holidays",
                        "ต.ค. 2569": "Oct 2026",
                        "วันนวมินทรมหาราช": "Nawamin Maharat Day",
                        "วันหยุดราชการ": "Public Holiday",
                        "วันปิยมหาราช": "Piyarat Day",
                        "1. นัดหมายของวันนี้": "1. Today's Appointments",
                        "ยืนยันแล้ว": "Confirmed",
                        "ผู้รับผิดชอบ": "Responsible Officer",
                        "ไม่มีรายการนัดหมายของคุณในวันนี้": "You have no appointments today.",
                        "2. ประกาศคำร้องนัดหมายใหม่ (Google Form)": "2. New Appointment Requests (Google Form)",
                        "ประเด็นที่ขอปรึกษา": "Consultation Topic",
                        "ติดต่อกลับ": "Callback",
                        "ไม่มีคำร้องใหม่จาก Google Form ในขณะนี้": "No new Google Form requests at this time.",
                        "3. ภาพรวมการนัดหมาย (Appointment Overview)": "3. Appointment Overview",
                        "เพิ่มนัดหมายในตาราง": "Add Appointment",
                        "เพิ่มนัดหมายในตาราง (Schedule Appointment)": "Schedule Appointment",
                        "กำหนดวัน เวลา และนักเรียนสำหรับตารางนัดหมาย": "Set date, time and student for schedule",
                        "เลือกวัน": "Select Day",
                        "ช่วงเวลา": "Time Slot",
                        "ผู้รับผิดชอบ / ผู้ให้บริการ": "Responsible Provider",
                        "หัวข้อ / ประเด็นนัดหมาย": "Topic / Subject",
                        "บันทึกนัดหมาย": "Save Appointment",
                        "1 สัปดาห์": "1 Week",
                        "ทั้งเดือน": "Entire Month",
                        "ทั้งหมด": "All",
                        "รับบริการแล้ว": "Completed",
                        "เลื่อนนัด": "Postponed",
                        "ยกเลิก": "Cancelled",
                        "ผู้ให้บริการ": "Provider",
                        "เวลา / วัน": "Time / Day",
                        "วันจันทร์": "Monday",
                        "วันอังคาร": "Tuesday",
                        "วันพุธ": "Wednesday",
                        "วันพฤหัสบดี": "Thursday",
                        "วันศุกร์": "Friday",
                        "📌 เปิดโปรไฟล์": "📌 Open Profile",
                        "✓ รับบริการเรียบร้อย": "✓ Completed",
                        "⏳ เลื่อนนัดหมาย": "⏳ Postponed",
                        "❌ ยกเลิกนัด": "❌ Cancelled",
                        "ว่าง": "Available",
                        "เพิ่มนัด": "Add",
                        "คลิกเพื่อเพิ่มนัดหมายในช่องนี้": "Click to add appointment in this slot",
                        "📅 มุมมองภาพรวมตลอดเดือน ตุลาคม 2026 (แสดงนัดหมายทั้งหมดในรอบเดือน)": "📅 October 2026 Overview (All monthly appointments)",
                        "รวม 12 เคสในเดือนนี้": "Total 12 cases this month",
                        "สัปดาห์ที่": "Week",
                        "วันที่": "Date",
                        "นักเรียน / ผู้รับบริการ": "Student / Client",
                        "ประเด็น / หัวข้อ": "Topic / Subject",
                        "สถานะ": "Status",
                        "4. สถิติและข้อมูลผู้รับบริการทั้งหมด (TSS Care Overview)": "4. TSS Care Overview & Statistics",
                        "นักเรียนทั้งหมด": "Total Students",
                        "กลุ่มปกติ (Green)": "Normal (Green)",
                        "กลุ่มเฝ้าระวัง (Yellow)": "Watchlist (Yellow)",
                        "กลุ่มวิกฤต (Red)": "Critical (Red)",
                        "5. ปฏิทินการศึกษา ประจำปีการศึกษา 2569 (Academic Calendar 2026-2027)": "5. Academic Calendar 2026-2027",
                        "ปรับปรุงล่าสุด: 25 ส.ค. 2569": "Last updated: Aug 25, 2026",
                        "กิจกรรมสำคัญที่กำลังจะมาถึง (Upcoming Key Events)": "Upcoming Key Events",
                        "อัปเดตเรียลไทม์": "Real-time Update",
                        "กิจกรรมที่ 1": "Event 1",
                        "เวลา 08:30 - 16:00 น. ณ หอประชุมโรงเรียน": "08:30 - 16:00 at School Auditorium",
                        "กิจกรรมที่ 2": "Event 2",
                        "เปิดภาคเรียนที่ 2 / 2569": "Semester 2 / 2026 Opening",
                        "เวลา 08:00 น. เป็นต้นไป (เคงโรมูร์ต้อนรับเปิดเทอม)": "From 08:00 onwards",
                        "กิจกรรมที่ 3": "Event 3",
                        "สะท้อนผลการเรียนรู้ ภาค 1/2569": "Learning Reflection Sem 1/2026",
                        "เวลา 09:00 - 15:30 น. (พบครูที่ปรึกษาประจำกลุ่ม)": "09:00 - 15:30 (Advisory meeting)",
                        "📚 ภาคเรียนที่ 1 / 2569": "📚 Semester 1 / 2026",
                        "• เปิดเทอม: 25 พ.ค. 2569 | ตรวจสุขภาพ & พบผู้ปกครอง: 23 พ.ค. 2569 • Learning Exhibition ภาค 1: 21-26 ก.ย. 2569": "• Term Start: May 25, 2026 | Health Check: May 23 • Exhibition: Sep 21-26",
                        "🎓 ภาคเรียนที่ 2 / 2569": "🎓 Semester 2 / 2026",
                        "• TSS OPEN HOUSE: 18 ต.ค. 2569 | เปิดเทอม 2: 26 ต.ค. 2569 • ปัจฉิมนิเทศ ม.3 & ม.6: 2 เม.ย. 2570": "• Open House: Oct 18, 2026 | Term 2: Oct 26 • Graduation: Apr 2, 2027",
                        "เดือน / ช่วงเวลา": "Month / Period",
                        "กิจกรรมสำคัญสำหรับนักเรียน": "Key Student Activities",
                        "วันหยุดนักขัตฤกษ์": "Public Holidays",
                        "เตรียมความพร้อมก่อนเปิดภาคเรียนประจำปีการศึกษา 2569": "Preparation for Academic Year 2026",
                        "23 พ.ค.: กิจกรรมแรกเราพบกัน & ตรวจสุขภาพ | เปิดภาคเรียนที่ 1/2569": "May 23: First meeting & Health check | Term 1 Start",
                        "13 มิ.ย.: ปฐมนิเทศนักเรียนใหม่ (ประดับเข็ม) | 24 มิ.ย.: Activity Day Hi Day": "Jun 13: Orientation | Jun 24: Activity Day",
                        "27-31 ก.ค.: Semester Break (ช่วงพักกลางภาคเรียนที่ 1)": "Jul 27-31: Semester Break",
                        "24-26 ส.ค.: ลงทะเบียนคลับ PA และวิชาเฉพาะทาง (ม.ปลาย)": "Aug 24-26: PA Club & Elective Registration",
                        "4 ก.ย.: Activity Day | 21-26 ก.ย.: Learning Exhibition ภาค 1": "Sep 4: Activity Day | Sep 21-26: Exhibition Sem 1",
                        "18 ต.ค.: TSS OPEN HOUSE 2026 | 26 ต.ค.: เปิดภาคเรียนที่ 2/2569": "Oct 18: Open House | Oct 26: Term 2 Start",
                        "16-20 พ.ย.: สะท้อนผลการเรียนรู้ ภาคเรียนที่ 1/2569": "Nov 16-20: Learning Reflection Sem 1",
                        "18 ธ.ค.: กีฬาสี ประจำปีการศึกษา 2569 | 28 ธ.ค. - 1 ม.ค.: Semester Break": "Dec 18: Sports Day | Dec 28 - Jan 1: Break",
                        "25-27 ม.ค. 70: ลงทะเบียนคลับ PA และวิชาเฉพาะทาง (ม.ปลาย)": "Jan 25-27: PA Club Registration",
                        "22-27 ก.พ. 70: Learning Exhibition ภาค 2 และวันสุดท้ายของเทอม": "Feb 22-27: Exhibition Sem 2 & Term End",
                        "กระบวนการติดตามปรับแก้ผลการประเมินรายวิชา/กิจกรรม": "Course/Activity Grade Revision",
                        "2 เม.ย. 70: วันปัจฉิมนิเทศนักเรียน ม.3 และ ม.6": "Apr 2: Graduation for Grade 9 & 12",
                        "🔍 ค้นหาชื่อ, ชั้น, ความเสี่ยง หรืออาการ...": "🔍 Search name, grade, risk or symptoms...",
                        "เขียว": "Green",
                        "เหลือง": "Yellow",
                        "แดง": "Red",
                        "นักเรียน": "Student",
                        "ระดับชั้น": "Grade",
                        "ความเสี่ยง": "Risk Level",
                        "สถานะบริการ": "Service Status",
                        "การจัดการ": "Management",
                        "ปกติ": "Normal",
                        "เฝ้าระวัง": "Watchlist",
                        "วิกฤต": "Critical",
                        "รับบริการแล้ว": "Served",
                        "ยังไม่ได้รับบริการ": "Pending Service",
                        "ดูโปรไฟล์": "View Profile",
                        "หน่วยงานเครือข่ายส่งต่อ": "Referral Network Agencies",
                        "ช่องทางติดต่อกรณีส่งต่อเคสด่วน": "Contact channels for urgent case referrals",
                        "โรงพยาบาลรัฐ / จิตเวช": "State Hospital / Psychiatry",
                        "แผนกจิตเวชเด็กและวัยรุ่น": "Child & Adolescent Psychiatry Dept",
                        "บริการประเมินเชิงลึกและบำบัดรักษา": "In-depth assessment and therapy",
                        "สายด่วน: 1323": "Hotline: 1323",
                        "หน่วยงานคุ้มครองเด็ก": "Child Protection Agency",
                        "บ้านพักเด็กและครอบครัว": "Children and Family Shelter",
                        "ช่วยเหลือกรณีปัญหาครอบครัวและความรุนแรง": "Family issues & violence assistance",
                        "สายด่วน: 1300": "Hotline: 1300",
                        "🗄️ คลังข้อมูลผู้ใช้บริการ": "🗄️ Client Archive",
                        "รวบรวมฐานข้อมูลนักเรียนที่เข้าสู่ระบบการดูแลช่วยเหลือแล้วทั้งหมด": "Aggregated database of students enrolled in care system",
                        "ผู้รับบริการทั้งหมด": "Total clients",
                        "คน": "people",
                        "ชั้น": "Grade",
                        "ผู้ปกครอง": "Parent",
                        "อัปเดตล่าสุด": "Last Updated",
                        "บันทึก": "Records",
                        "เปิดแฟ้มประวัติผู้ใช้บริการ": "Open Client File",
                        "🕒 ประวัติการบันทึกเคสก่อนหน้า": "🕒 Case Log History",
                        "รายการบันทึกข้อมูลเคสย้อนหลังในระบบ (เข้าถึงได้ทุกบทบาทผู้ใช้งาน)": "Historical case records in system (accessible to all roles)",
                        "ทั้งหมดในระบบ": "All in System",
                        "เฉพาะที่ฉันบันทึก": "Logged by Me",
                        "พฤติกรรมที่พบ": "Detected Behaviors",
                        "หมายเหตุ": "Remarks",
                        "ผู้บันทึก": "Logged By",
                        "วันที่": "Date",
                        "ยังไม่มีประวัติการบันทึกเคสในหมวดหมู่นี้": "No case history records in this category.",
                        "🧰 เครื่องมือการให้ความช่วยเหลือ (Support Tools & Guidelines)": "🧰 Support Tools & Guidelines",
                        "คู่มือ แนวทาง และเครื่องมือประเมินสำหรับครูและบุคลากรในการให้ความช่วยเหลือนักเรียนเบื้องต้น": "Manuals, guidelines and assessment tools for personnel",
                        "ขั้นตอนปฏิบัติเมื่อเกิดภาวะวิกฤต (Crisis)": "Crisis Response Protocol",
                        "แนวปฏิบัติเร่งด่วนในการประเมินความปลอดภัย การประสานผู้ปกครอง และทีมแพทย์เฉพาะทาง": "Urgent guidelines for safety assessment and medical coordination",
                        "ดาวน์โหลดคู่มือ PDF": "Download PDF Guide",
                        "เทคนิคการฟังอย่างลึกซึ้ง (Active Listening)": "Active Listening Techniques",
                        "เทคนิคการพูดคุยและสร้างพื้นที่ปลอดภัย (Safe Space) เพื่อลดความวิตกกังวลให้นักเรียน": "Techniques for Safe Space dialogue to reduce student anxiety",
                        "เปิดอ่านคู่มือ": "Read Manual",
                        "แบบฟอร์มส่งต่อเคสภายนอก (Referral)": "External Referral Form",
                        "เอกสารและแนวทางการส่งต่อโรงพยาบาลเครือข่ายหรือหน่วยงานคุ้มครองเด็ก": "Documents and guidelines for hospital/shelter referral",
                        "ดาวน์โหลดแบบฟอร์ม": "Download Form",
                        "📊 Google Form Response & Data Science Analytics": "📊 Google Form Response & Data Science Analytics",
                        "Empathy Center Service Feedback Analytics": "Empathy Center Service Feedback Analytics",
                        "แดชบอร์ดวิเคราะห์ผลประเมินความพึงพอใจและข้อเสนอแนะจากผู้ใช้บริการ (อ้างอิงข้อมูลจาก Google Form)": "Service satisfaction analytics dashboard (Google Form data)",
                        "คะแนนความพึงพอใจเฉลี่ย (Overall Rating)": "Overall Satisfaction Score",
                        "จากผู้ประเมินทั้งหมด": "From total evaluators",
                        "รายการในระบบ": "items in system",
                        "📈 Data Insight: ระดับความพึงพอใจสูงกว่าเกณฑ์เป้าหมาย 15% บ่งชี้ถึงประสิทธิภาพในการดูแลช่วยเหลือที่ดีเยี่ยม": "📈 Data Insight: Satisfaction is 15% above target, indicating high support efficiency.",
                        "สัดส่วนคะแนนความพึงพอใจ (Rating Distribution Chart)": "Rating Distribution Chart",
                        "ดาว": "Stars",
                        "💬 2. คำชื่นชม / ข้อเสนอแนะเพื่อการพัฒนาทั่วไป": "💬 2. General Feedback & Praises",
                        "ความคิดเห็น": "Comments",
                        "ผู้ให้บริการที่เกี่ยวข้อง": "Related Provider",
                        "🔍 3. คำชื่นชม/ข้อเสนอแนะจำแนกตามรายชื่อผู้ให้บริการ (Provider Breakdown)": "🔍 3. Specific Feedback Categorized by Provider",
                        "แสดงผู้ให้บริการทั้งหมด": "Show All Providers",
                        "จาก": "From",
                        "ยังไม่มีข้อเสนอแนะเฉพาะเจาะจงสำหรับผู้ให้บริการท่านนี้ในระบบ": "No specific feedback for this provider in the system yet.",
                        "โรงเรียนสาธิตแห่งมหาวิทยาลัยธรรมศาสตร์": "Thammasat University Demonstration School",
                        "TSS Empathy Center & Safe Space": "TSS Empathy Center & Safe Space",
                        "© 2026 มหาวิทยาลัยธรรมศาสตร์ • สังคมแห่งการเคารพและเรียนรู้ร่วมกัน": "© 2026 Thammasat University • An Inclusive Society Built Through Respect and Mutual Learning",
                        "เมนูข้อมูลและการตั้งค่า": "Data Menus & Settings",
                        "ผู้ใช้งานปัจจุบัน": "Current User",
                        "บทบาท": "Role",
                        "ตำแหน่ง Toolbar ด้านข้าง": "Sidebar Toolbar Position",
                        "ฝั่งซ้าย": "Left Side",
                        "ฝั่งขวา": "Right Side",
                        "ด้านล่าง": "Bottom",
                        "🏠 1. หน้าแรก": "🏠 1. Home",
                        "🔍 2. ค้นหา": "🔍 2. Search",
                        "🕒 3. ประวัติการบันทึกเคสก่อนหน้า": "🕒 3. Case History",
                        "📝 4. บันทึกเคสใหม่": "📝 4. New Case Log",
                        "🗄️ 5. คลังข้อมูลผู้ใช้บริการ": "🗄️ 5. Client Archive",
                        "🧰 6. เครื่องมือการให้ความช่วยเหลือ": "🧰 6. Support Tools",
                        "📊 Feedback Analytics": "📊 Feedback Analytics",
                        "🚪 ออกจากระบบ": "🚪 Logout",
                        "CareSpace School SEL System": "CareSpace School SEL System",
                        "เวลานัดหมาย": "Appointment Time",
                        "น.": "",
                        "👤 ข้อมูลพื้นฐานของผู้รับบริการ": "👤 Client Basic Information",
                        "ปกติ (Green)": "Normal (Green)",
                        "เฝ้าระวัง (Yellow)": "Watchlist (Yellow)",
                        "วิกฤต (Red)": "Critical (Red)",
                        "🎯 ประเด็นที่ติดตามต่อในครั้งนี้": "🎯 Follow-up Topic",
                        "📋 ประวัติการรับบริการโดยสรุป (SOAP Notes)": "📋 Service History Summary (SOAP Notes)",
                        "บันทึกโดย": "Logged by",
                        "บันทึกย่อ": "Note",
                        "ยังไม่มีประวัติการบันทึกย้อนหลัง": "No historical records yet.",
                        "เปิดแฟ้มประวัติเต็ม": "Open Full File",
                        "ปิด": "Close",
                        "🖨️ พิมพ์ใบ Refer (A4)": "🖨️ Print Refer Form (A4)",
                        "ประวัติบันทึกเคส": "Case History",
                        "+ บันทึกเคสใหม่": "+ New Case Log",
                        "บันทึกพฤติกรรมและประเมินความเสี่ยง": "Log Behavior & Risk Assessment",
                        "ระบบคำนวณความเสี่ยงและทริกเกอร์ Red Alert อัตโนมัติ": "Automated risk calculation and Red Alert trigger",
                        "เลือกนักเรียน": "Select Student",
                        "-- เลือกนักเรียน --": "-- Select Student --",
                        "มีความเครียด / วิตกกังวลทั่วไป": "General stress / anxiety",
                        "แยกตัวจากสังคม / ซึมเศร้า": "Social withdrawal / depression",
                        "ผลการเรียนดิ่งลง": "Sudden drop in grades",
                        "🚨 พฤติกรรมเสี่ยงทำร้ายตนเอง (Red Alert)": "🚨 Self-harm risk behavior (Red Alert)",
                        "บันทึกเพิ่มเติม (SOAP / Note)": "Additional Notes (SOAP)",
                        "รายละเอียด...": "Details...",
                        "ยกเลิก": "Cancel",
                        "บันทึกผล": "Save Result",
                        "ข้อมูลจะถูกนำไปประมวลผลบนแดชบอร์ด Analytics ทันที": "Data will be processed on Analytics dashboard instantly",
                        "ประเภทผู้ส่ง": "Sender Type",
                        "ชื่อ-นามสกุล": "Full Name",
                        "ระบุชื่อ...": "Enter name...",
                        "ระดับความพึงพอใจ (1-5 ดาว)": "Satisfaction Level (1-5 Stars)",
                        "ข้อเสนอแนะ / คำชื่นชม": "Feedback / Praise",
                        "แสดงความคิดเห็น...": "Write comments...",
                        "บันทึก Feedback": "Save Feedback",
                        "เลือกประเภทผู้รับบริการ (Client Category)": "Select Client Category",
                        "กรุณาเลือกประเภทก่อนบันทึกข้อมูลเคสใหม่": "Please select category before logging a new case",
                        "ผู้รับบริการรายใหม่ (New Client)": "New Client",
                        "นักเรียนที่เพิ่งเข้ามาสู่ระบบการดูแลช่วยเหลือเป็นครั้งแรก": "Students newly entering the care support system",
                        "ผู้รับบริการต่อเนื่อง (Ongoing Client)": "Ongoing Client",
                        "นักเรียนที่อยู่ในกระบวนการติดตามและให้คำปรึกษาประจำสัปดาห์": "Students in ongoing weekly tracking and counseling",
                        "ผู้รับบริการรายเก่า (Returning Client)": "Returning Client",
                        "นักเรียนที่เคยปิดเคสไปแล้วและกลับมารับบริการใหม่อีกครั้ง": "Students who previously closed cases and returned",
                        "ชื่อเล่น": "Nickname",
                        "วันเกิด": "Date of Birth",
                        "เบอร์โทรศัพท์": "Phone",
                        "เบอร์ผู้ปกครอง": "Parent Phone",
                        "ติดต่อฉุกเฉิน": "Emergency Contact",
                        "ชื่อผู้ปกครอง": "Parent Name",
                        "1. ประวัติการเข้ารับบริการ": "1. Service History",
                        "2. ข้อมูล Family Tree": "2. Family Tree",
                        "3. ข้อมูล Genogram": "3. Genogram",
                        "4. แผนวิเคราะห์ความช่วยเหลือแบบใยแมงมุม 5 ด้าน": "4. 5-Dimension Radar Analysis",
                        "5. Ecosystem / แผนที่บ้าน": "5. Ecosystem & Home Map",
                        "บันทึกการให้คำปรึกษาและ SOAP Notes ย้อนหลัง": "Historical counseling records & SOAP notes",
                        "รายละเอียด (SOAP Note)": "Details (SOAP Note)",
                        "ยังไม่มีประวัติการบันทึกในระบบ": "No history records in system",
                        "🌳 ผังเครือญาติและโครงสร้างครอบครัว (Family Tree)": "🌳 Family Tree & Structure",
                        "แสดงข้อมูลความสัมพันธ์ภายในครอบครัว การอยู่อาศัยร่วมกัน และผู้มีอำนาจตัดสินใจหลัก": "Showing family relationships and living arrangements",
                        "บิดา": "Father",
                        "มารดา": "Mother",
                        "พี่น้องร่วมสายโลหิต": "Siblings",
                        "🧬 แผนภูมิพันธประวัติและพันธุศาสตร์ครอบครัว (Genogram)": "🧬 Genogram & Family Medical History",
                        "บันทึกประวัติสุขภาพจิต โรคประจำตัว และความสัมพันธ์เชิงจิตวิทยาใน 3 รุ่นครอบครัว": "Psychiatric history and relationship dynamics across 3 generations",
                        "🕷️ แผนวิเคราะห์ความช่วยเหลือแบบใยแมงมุม 5 ด้าน (5-Dimension Radar Analysis)": "🕷️ 5-Dimension Radar Analysis (Spider Web)",
                        "ประเมินสมดุลใน 5 มิติหลัก: ร่างกาย, จิตใจ, สังคม, เศรษฐกิจ, และการเรียน (เกณฑ์คะแนน 1-10)": "Assessment across 5 dimensions: Physical, Mental, Social, Economic, Academic",
                        "คะแนนเฉลี่ยรวม: 7.4 / 10": "Overall Average: 7.4 / 10",
                        "🗺️ Ecosystem และแผนที่บ้าน (Home Map & Local Ecosystem)": "🗺️ Home Map & Local Ecosystem",
                        "เปิดดูเส้นทางบน Google Maps": "Open Route on Google Maps",
                        "ข้อมูลสภาพแวดล้อมที่อยู่อาศัย การเดินทาง และแหล่งสนับสนุนในชุมชนรอบตัวนักเรียน": "Housing environment, commute, and local community support ecosystem",
                        "🏠 ที่อยู่และลักษณะที่อยู่อาศัย": "🏠 Housing & Address",
                        "🚗 การเดินทางมาโรงเรียน": "🚗 School Commute",
                        "🌳 ชุมชนและแหล่งสนับสนุนรอบตัว (Local Support Ecosystem)": "🌳 Local Support Ecosystem"
                    },
                    zh: {
                        "CareSpace School SEL": "CareSpace 学校社会情感学习系统",
                        "มหาวิทยาลัยธรรมศาสตร์": "泰国国立法政大学",
                        "โรงเรียนสาธิตแห่งมหาวิทยาลัยธรรมศาสตร์": "国立法政大学附属实验中学",
                        "เลือกบทบาทผู้ใช้งาน": "选择用户角色",
                        "ครูกระบวนการ": "过程教师",
                        "นักวิชาการศึกษา": "教育学者",
                        "เจ้าหน้าที่ทั่วไป": "一般职员",
                        "นักสังคมสงเคราะห์": "社会工作者",
                        "นักจิตวิทยา": "心理学家",
                        "แพทย์": "医生",
                        "จิตแพทย์": "精神科医生",
                        "ชื่อ-นามสกุล ผู้ใช้งาน": "用户姓名",
                        "เข้าสู่ระบบ": "登录",
                        "1. หน้าแรก": "1. 首页",
                        "2. ค้นหา": "2. 搜索",
                        "3. ประวัติการบันทึกเคสก่อนหน้า": "3. 历史个案记录",
                        "4. บันทึกเคสใหม่": "4. 新增个案记录",
                        "5. คลังข้อมูลผู้ใช้บริการ": "5. 来访者档案库",
                        "6. เครื่องมือการให้ความช่วยเหลือ": "6. 援助工具",
                        "7. ตั้งค่าเพิ่มเติม": "7. 设置",
                        "TSS Empathy Center • ระบบพื้นที่ปลอดภัยและดูแลนักเรียน": "TSS 同理心中心 • 安全空间与学生关怀系统",
                        "ค้นหาข้อมูลนักเรียน": "搜索学生",
                        "กรอกข้อมูลเคส": "登记个案",
                        "✉️ คำร้องขอนัดหมาย (Google Form)": "✉️ 预约申请 (Google Form)",
                        "อนุมัติและลงตาราง": "批准并排程",
                        "ปฏิเสธ": "拒绝",
                        "ไม่มีคำร้องนัดหมายใหม่ในขณะนี้": "目前没有新的预约申请。",
                        "🚨 การแจ้งเตือน Red Alert": "🚨 红色警报通知",
                        "วิกฤตต้องดูแลด่วน": "紧急危机需立即关怀",
                        "ไม่มีเคสวิกฤตในขณะนี้": "目前没有危机个案。",
                        "เมนูทั้งหมด": "所有菜单",
                        "✨ TSS EMPATHY CENTER & SAFE SPACE": "✨ TSS 同理心中心与安全空间",
                        "สังคมแห่งการเคารพและเรียนรู้ร่วมกัน": "建立在尊重与共同学习基础上的包容性社会",
                        "Toward Inclusive Societies That Learn and Grow Together. An Inclusive Society Built Through Respect and Mutual Learning.": "迈向共同学习与成长的包容性社会。",
                        "📌 วันหยุดสำคัญ เดือนตุลาคม 2026": "📌 2026年10月重要节日",
                        "ต.ค. 2569": "2026年10月",
                        "วันนวมินทรมหาราช": "拉玛九世纪念日",
                        "วันหยุดราชการ": "公众假期",
                        "วันปิยมหาราช": "朱拉隆功大帝纪念日",
                        "1. นัดหมายของวันนี้": "1. 今日预约",
                        "ยืนยันแล้ว": "已确认",
                        "ผู้รับผิดชอบ": "负责人",
                        "ไม่มีรายการนัดหมายของคุณในวันนี้": "您今天没有预约。",
                        "2. ประกาศคำร้องนัดหมายใหม่ (Google Form)": "2. 新预约申请公告 (Google Form)",
                        "ประเด็นที่ขอปรึกษา": "咨询主题",
                        "ติดต่อกลับ": "回电联系",
                        "ไม่มีคำร้องใหม่จาก Google Form ในขณะนี้": "目前没有来自 Google Form 的新申请。",
                        "3. ภาพรวมการนัดหมาย (Appointment Overview)": "3. 预约概览",
                        "เพิ่มนัดหมายในตาราง": "添加预约",
                        "เพิ่มนัดหมายในตาราง (Schedule Appointment)": "排程预约",
                        "กำหนดวัน เวลา และนักเรียนสำหรับตารางนัดหมาย": "设定预约的日期、时间和学生",
                        "เลือกวัน": "选择星期",
                        "ช่วงเวลา": "时间段",
                        "ผู้รับผิดชอบ / ผู้ให้บริการ": "负责服务人员",
                        "หัวข้อ / ประเด็นนัดหมาย": "主题",
                        "บันทึกนัดหมาย": "保存预约",
                        "1 สัปดาห์": "1周",
                        "ทั้งเดือน": "整月",
                        "ทั้งหมด": "全部",
                        "รับบริการแล้ว": "已接受服务",
                        "เลื่อนนัด": "延期",
                        "ยกเลิก": "取消",
                        "ผู้ให้บริการ": "服务人员",
                        "เวลา / วัน": "时间 / 日期",
                        "วันจันทร์": "星期一",
                        "วันอังคาร": "星期二",
                        "วันพุธ": "星期三",
                        "วันพฤหัสบดี": "星期四",
                        "วันศุกร์": "星期五",
                        "📌 เปิดโปรไฟล์": "📌 打开档案",
                        "✓ รับบริการเรียบร้อย": "✓ 服务完成",
                        "⏳ เลื่อนนัดหมาย": "⏳ 延期预约",
                        "❌ ยกเลิกนัด": "❌ 取消预约",
                        "ว่าง": "空闲",
                        "เพิ่มนัด": "添加",
                        "คลิกเพื่อเพิ่มนัดหมายในช่องนี้": "点击在此时间段添加预约",
                        "📅 มุมมองภาพรวมตลอดเดือน ตุลาคม 2026 (แสดงนัดหมายทั้งหมดในรอบเดือน)": "📅 2026年10月全月概览",
                        "รวม 12 เคสในเดือนนี้": "本月共12个案",
                        "สัปดาห์ที่": "第几周",
                        "วันที่": "日期",
                        "นักเรียน / ผู้รับบริการ": "学生 / 来访者",
                        "ประเด็น / หัวข้อ": "主题",
                        "สถานะ": "状态",
                        "4. สถิติและข้อมูลผู้รับบริการทั้งหมด (TSS Care Overview)": "4. TSS 关怀概览与统计数据",
                        "นักเรียนทั้งหมด": "学生总数",
                        "กลุ่มปกติ (Green)": "正常组 (绿色)",
                        "กลุ่มเฝ้าระวัง (Yellow)": "关注组 (黄色)",
                        "กลุ่มวิกฤต (Red)": "危机组 (红色)",
                        "5. ปฏิทินการศึกษา ประจำปีการศึกษา 2569 (Academic Calendar 2026-2027)": "5. 2026-2027学年校历",
                        "ปรับปรุงล่าสุด: 25 ส.ค. 2569": "最后更新：2026年8月25日",
                        "กิจกรรมสำคัญที่กำลังจะมาถึง (Upcoming Key Events)": "即将举行的重要活动",
                        "อัปเดตเรียลไทม์": "实时更新",
                        "กิจกรรมที่ 1": "活动 1",
                        "เวลา 08:30 - 16:00 น. ณ หอประชุมโรงเรียน": "08:30 - 16:00 学校大礼堂",
                        "กิจกรรมที่ 2": "活动 2",
                        "เปิดภาคเรียนที่ 2 / 2569": "2026学年第二学期开学",
                        "เวลา 08:00 น. เป็นต้นไป (เคงโรมูร์ต้อนรับเปิดเทอม)": "08:00 开始",
                        "กิจกรรมที่ 3": "活动 3",
                        "สะท้อนผลการเรียนรู้ ภาค 1/2569": "2026学年第一学期学习成果反馈",
                        "เวลา 09:00 - 15:30 น. (พบครูที่ปรึกษาประจำกลุ่ม)": "09:00 - 15:30 (小组辅导)",
                        "📚 ภาคเรียนที่ 1 / 2569": "📚 第一学期 / 2026",
                        "• เปิดเทอม: 25 พ.ค. 2569 | ตรวจสุขภาพ & พบผู้ปกครอง: 23 พ.ค. 2569 • Learning Exhibition ภาค 1: 21-26 ก.ย. 2569": "• 开学：5月25日 | 体检与家长会：5月23日 • 第一学期成果展：9月21-26日",
                        "🎓 ภาคเรียนที่ 2 / 2569": "🎓 第二学期 / 2026",
                        "• TSS OPEN HOUSE: 18 ต.ค. 2569 | เปิดเทอม 2: 26 ต.ค. 2569 • ปัจฉิมนิเทศ ม.3 & ม.6: 2 เม.ย. 2570": "• 校园开放日：10月18日 | 第二学期开学：10月26日 • 毕业典礼：2027年4月2日",
                        "เดือน / ช่วงเวลา": "月份 / 期间",
                        "กิจกรรมสำคัญสำหรับนักเรียน": "学生重要活动",
                        "วันหยุดนักขัตฤกษ์": "法定假日",
                        "เตรียมความพร้อมก่อนเปิดภาคเรียนประจำปีการศึกษา 2569": "2026学年开学前准备",
                        "23 พ.ค.: กิจกรรมแรกเราพบกัน & ตรวจสุขภาพ | เปิดภาคเรียนที่ 1/2569": "5月23日：见面会与体检 | 第一学期开学",
                        "13 มิ.ย.: ปฐมนิเทศนักเรียนใหม่ (ประดับเข็ม) | 24 มิ.ย.: Activity Day Hi Day": "6月13日：新生入学仪式 | 6月24日：活动日",
                        "27-31 ก.ค.: Semester Break (ช่วงพักกลางภาคเรียนที่ 1)": "7月27-31日：第一学期期中假",
                        "24-26 ส.ค.: ลงทะเบียนคลับ PA และวิชาเฉพาะทาง (ม.ปลาย)": "8月24-26日：PA俱乐部及高中专修课程注册",
                        "4 ก.ย.: Activity Day | 21-26 ก.ย.: Learning Exhibition ภาค 1": "9月4日：活动日 | 9月21-26日：第一学期成果展",
                        "18 ต.ค.: TSS OPEN HOUSE 2026 | 26 ต.ค.: เปิดภาคเรียนที่ 2/2569": "10月18日：开放日 | 10月26日：第二学期开学",
                        "16-20 พ.ย.: สะท้อนผลการเรียนรู้ ภาคเรียนที่ 1/2569": "11月16-20日：第一学期学习成果反馈",
                        "18 ธ.ค.: กีฬาสี ประจำปีการศึกษา 2569 | 28 ธ.ค. - 1 ม.ค.: Semester Break": "12月18日：运动会 | 12月28日 - 1月1日：假期",
                        "25-27 ม.ค. 70: ลงทะเบียนคลับ PA และวิชาเฉพาะทาง (ม.ปลาย)": "1月25-27日：PA俱乐部注册",
                        "22-27 ก.พ. 70: Learning Exhibition ภาค 2 และวันสุดท้ายของเทอม": "2月22-27日：第二学期成果展及学期结束",
                        "กระบวนการติดตามปรับแก้ผลการประเมินรายวิชา/กิจกรรม": "课程及活动成绩跟进调整",
                        "2 เม.ย. 70: วันปัจฉิมนิเทศนักเรียน ม.3 และ ม.6": "4月2日：初三及高三毕业典礼",
                        "🔍 ค้นหาชื่อ, ชั้น, ความเสี่ยง หรืออาการ...": "🔍 搜索姓名、年级、风险或症状...",
                        "เขียว": "绿色",
                        "เหลือง": "黄色",
                        "แดง": "红色",
                        "นักเรียน": "学生",
                        "ระดับชั้น": "年级",
                        "ความเสี่ยง": "风险等级",
                        "สถานะบริการ": "服务状态",
                        "การจัดการ": "管理",
                        "ปกติ": "正常",
                        "เฝ้าระวัง": "关注",
                        "วิกฤต": "危机",
                        "รับบริการแล้ว": "已接受服务",
                        "ยังไม่ได้รับบริการ": "未接受服务",
                        "ดูโปรไฟล์": "查看档案",
                        "หน่วยงานเครือข่ายส่งต่อ": "转介网络机构",
                        "ช่องทางติดต่อกรณีส่งต่อเคสด่วน": "紧急个案转介联系渠道",
                        "โรงพยาบาลรัฐ / จิตเวช": "公立医院 / 精神科",
                        "แผนกจิตเวชเด็กและวัยรุ่น": "儿童与青少年精神科",
                        "บริการประเมินเชิงลึกและบำบัดรักษา": "深入评估与治疗服务",
                        "สายด่วน: 1323": "热线：1323",
                        "หน่วยงานคุ้มครองเด็ก": "儿童保护机构",
                        "บ้านพักเด็กและครอบครัว": "儿童与家庭庇护所",
                        "ช่วยเหลือกรณีปัญหาครอบครัวและความรุนแรง": "家庭问题与暴力援助",
                        "สายด่วน: 1300": "热线：1300",
                        "🗄️ คลังข้อมูลผู้ใช้บริการ": "🗄️ 来访者档案库",
                        "รวบรวมฐานข้อมูลนักเรียนที่เข้าสู่ระบบการดูแลช่วยเหลือแล้วทั้งหมด": "已纳入关怀系统学生数据库汇总",
                        "ผู้รับบริการทั้งหมด": "服务总人数",
                        "คน": "人",
                        "ชั้น": "年级",
                        "ผู้ปกครอง": "家长",
                        "อัปเดตล่าสุด": "最后更新",
                        "บันทึก": "条记录",
                        "เปิดแฟ้มประวัติผู้ใช้บริการ": "打开来访者档案",
                        "🕒 ประวัติการบันทึกเคสก่อนหน้า": "🕒 历史个案记录",
                        "รายการบันทึกข้อมูลเคสย้อนหลังในระบบ (เข้าได้ทุกบทบาทผู้ใช้งาน)": "系统中的历史个案记录（所有角色均可访问）",
                        "ทั้งหมดในระบบ": "系统中的全部",
                        "เฉพาะที่ฉันบันทึก": "仅我记录的",
                        "พฤติกรรมที่พบ": "发现的行为",
                        "หมายเหตุ": "备注",
                        "ผู้บันทึก": "记录人",
                        "วันที่": "日期",
                        "ยังไม่มีประวัติการบันทึกเคสในหมวดหมู่นี้": "此分类中尚无个案记录。",
                        "🧰 เครื่องมือการให้ความช่วยเหลือ (Support Tools & Guidelines)": "🧰 援助工具与指南",
                        "คู่มือ แนวทาง และเครื่องมือประเมินสำหรับครูและบุคลากรในการให้ความช่วยเหลือนักเรียนเบื้องต้น": "面向教职工的初步学生援助手册与评估工具",
                        "ขั้นตอนปฏิบัติเมื่อเกิดภาวะวิกฤต (Crisis)": "危机应对流程",
                        "แนวปฏิบัติเร่งด่วนในการประเมินความปลอดภัย การประสานผู้ปกครอง และทีมแพทย์เฉพาะทาง": "安全评估、家长联络及专科医疗团队协调的紧急指南",
                        "ดาวน์โหลดคู่มือ PDF": "下载 PDF 手册",
                        "เทคนิคการฟังอย่างลึกซึ้ง (Active Listening)": "积极倾听技巧",
                        "เทคนิคการพูดคุยและสร้างพื้นที่ปลอดภัย (Safe Space) เพื่อลดความวิตกกังวลให้นักเรียน": "通过安全空间对话减少学生焦虑的技巧",
                        "เปิดอ่านคู่มือ": "阅读手册",
                        "แบบฟอร์มส่งต่อเคสภายนอก (Referral)": "外部转介表",
                        "เอกสารและแนวทางการส่งต่อโรงพยาบาลเครือข่ายหรือหน่วยงานคุ้มครองเด็ก": "医院或儿童庇护机构转介文件及指南",
                        "ดาวน์โหลดแบบฟอร์ม": "下载表格",
                        "📊 Google Form Response & Data Science Analytics": "📊 Google Form 问卷与数据科学分析",
                        "Empathy Center Service Feedback Analytics": "同理心中心服务反馈分析",
                        "แดชบอร์ดวิเคราะห์ผลประเมินความพึงพอใจและข้อเสนอแนะจากผู้ใช้บริการ (อ้างอิงข้อมูลจาก Google Form)": "服务满意度与反馈分析仪表板（基于 Google Form 数据）",
                        "คะแนนความพึงพอใจเฉลี่ย (Overall Rating)": "平均满意度评分",
                        "จากผู้ประเมินทั้งหมด": "来自共计",
                        "รายการในระบบ": "位评估者",
                        "📈 Data Insight: ระดับความพึงพอใจสูงกว่าเกณฑ์เป้าหมาย 15% บ่งชี้ถึงประสิทธิภาพในการดูแลช่วยเหลือที่ดีเยี่ยม": "📈 数据洞察：满意度超出目标 15%，表明关怀支持效能卓越。",
                        "สัดส่วนคะแนนความพึงพอใจ (Rating Distribution Chart)": "满意度评分分布图",
                        "ดาว": "星",
                        "💬 2. คำชื่นชม / ข้อเสนอแนะเพื่อการพัฒนาทั่วไป": "💬 2. 一般反馈与赞赏",
                        "ความคิดเห็น": "条评论",
                        "ผู้ให้บริการที่เกี่ยวข้อง": "相关服务人员",
                        "🔍 3. คำชื่นชม/ข้อเสนอแนะจำแนกตามรายชื่อผู้ให้บริการ (Provider Breakdown)": "🔍 3. 按服务人员分类的专项反馈",
                        "แสดงผู้ให้บริการทั้งหมด": "显示所有服务人员",
                        "จาก": "来自",
                        "ยังไม่มีข้อเสนอแนะเฉพาะเจาะจงสำหรับผู้ให้บริการท่านนี้ในระบบ": "系统中暂无针对该服务人员的专项反馈。",
                        "โรงเรียนสาธิตแห่งมหาวิทยาลัยธรรมศาสตร์": "国立法政大学附属实验中学",
                        "TSS Empathy Center & Safe Space": "TSS 同理心与安全空间中心",
                        "© 2026 มหาวิทยาลัยธรรมศาสตร์ • สังคมแห่งการเคารพและเรียนรู้ร่วมกัน": "© 2026 法政大学 • 建立在尊重与共同学习基础上的社会",
                        "เมนูข้อมูลและการตั้งค่า": "数据菜单与设置",
                        "ผู้ใช้งานปัจจุบัน": "当前用户",
                        "บทบาท": "角色",
                        "ตำแหน่ง Toolbar ด้านข้าง": "侧边工具栏位置",
                        "ฝั่งซ้าย": "左侧",
                        "ฝั่งขวา": "右侧",
                        "ด้านล่าง": "底部",
                        "🏠 1. หน้าแรก": "🏠 1. 首页",
                        "🔍 2. ค้นหา": "🔍 2. 搜索",
                        "🕒 3. ประวัติการบันทึกเคสก่อนหน้า": "🕒 3. 历史记录",
                        "📝 4. บันทึกเคสใหม่": "📝 4. 新增记录",
                        "🗄️ 5. คลังข้อมูลผู้ใช้บริการ": "🗄️ 5. 档案库",
                        "🧰 6. เครื่องมือการให้ความช่วยเหลือ": "🧰 6. 援助工具",
                        "📊 Feedback Analytics": "📊 反馈分析",
                        "🚪 ออกจากระบบ": "🚪 退出登录",
                        "CareSpace School SEL System": "CareSpace 学校社会情感学习系统",
                        "เวลานัดหมาย": "预约时间",
                        "น.": "点",
                        "👤 ข้อมูลพื้นฐานของผู้รับบริการ": "👤 来访者基本信息",
                        "ปกติ (Green)": "正常 (绿色)",
                        "เฝ้าระวัง (Yellow)": "关注 (黄色)",
                        "วิกฤต (Red)": "危机 (红色)",
                        "🎯 ประเด็นที่ติดตามต่อในครั้งนี้": "🎯 本次跟进主题",
                        "📋 ประวัติการรับบริการโดยสรุป (SOAP Notes)": "📋 服务历史摘要 (SOAP 记录)",
                        "บันทึกโดย": "记录者",
                        "บันทึกย่อ": "便笺",
                        "ยังไม่มีประวัติการบันทึกย้อนหลัง": "暂无历史记录。",
                        "เปิดแฟ้มประวัติเต็ม": "打开完整档案",
                        "ปิด": "关闭",
                        "🖨️ พิมพ์ใบ Refer (A4)": "🖨️ 打印转介表 (A4)",
                        "ประวัติบันทึกเคส": "个案历史",
                        "+ บันทึกเคสใหม่": "+ 新增个案记录",
                        "บันทึกพฤติกรรมและประเมินความเสี่ยง": "行为记录与风险评估",
                        "ระบบคำนวณความเสี่ยงและทริกเกอร์ Red Alert อัตโนมัติ": "系统自动计算风险并触发红色警报",
                        "เลือกนักเรียน": "选择学生",
                        "-- เลือกนักเรียน --": "-- 请选择学生 --",
                        "มีความเครียด / วิตกกังวลทั่วไป": "一般压力/焦虑",
                        "แยกตัวจากสังคม / ซึมเศร้า": "社交退缩/抑郁",
                        "ผลการเรียนดิ่งลง": "成绩急剧下降",
                        "🚨 พฤติกรรมเสี่ยงทำร้ายตนเอง (Red Alert)": "🚨 自残风险行为 (红色警报)",
                        "บันทึกเพิ่มเติม (SOAP / Note)": "补充记录 (SOAP)",
                        "รายละเอียด...": "详细信息...",
                        "ยกเลิก": "取消",
                        "บันทึกผล": "保存结果",
                        "ข้อมูลจะถูกนำไปประมวลผลบนแดชบอร์ด Analytics ทันที": "数据将立即处理至分析仪表板",
                        "ประเภทผู้ส่ง": "发送者类型",
                        "ชื่อ-นามสกุล": "姓名",
                        "ระบุชื่อ...": "输入姓名...",
                        "ระดับความพึงพอใจ (1-5 ดาว)": "满意度 (1-5星)",
                        "ข้อเสนอแนะ / คำชื่นชม": "反馈与赞赏",
                        "แสดงความคิดเห็น...": "写下评论...",
                        "บันทึก Feedback": "保存反馈",
                        "เลือกประเภทผู้รับบริการ (Client Category)": "选择来访者类别",
                        "กรุณาเลือกประเภทก่อนบันทึกข้อมูลเคสใหม่": "记录新个案前请先选择类别",
                        "ผู้รับบริการรายใหม่ (New Client)": "新来访者",
                        "นักเรียนที่เพิ่งเข้ามาสู่ระบบการดูแลช่วยเหลือเป็นครั้งแรก": "首次进入关怀支持系统的学生",
                        "ผู้รับบริการต่อเนื่อง (Ongoing Client)": "持续跟进者",
                        "นักเรียนที่อยู่ในกระบวนการติดตามและให้คำปรึกษาประจำสัปดาห์": "处于每周跟进与咨询过程中的学生",
                        "ผู้รับบริการรายเก่า (Returning Client)": "老来访者",
                        "นักเรียนที่เคยปิดเคสไปแล้วและกลับมารับบริการใหม่อีกครั้ง": "曾结案又再次接受服务的学生",
                        "ชื่อเล่น": "昵称",
                        "วันเกิด": "出生日期",
                        "เบอร์โทรศัพท์": "电话",
                        "เบอร์ผู้ปกครอง": "家长电话",
                        "ติดต่อฉุกเฉิน": "紧急联系人",
                        "ชื่อผู้ปกครอง": "家长姓名",
                        "1. ประวัติการเข้ารับบริการ": "1. 服务历史",
                        "2. ข้อมูล Family Tree": "2. 家庭树 (Family Tree)",
                        "3. ข้อมูล Genogram": "3. 家系图 (Genogram)",
                        "4. แผนวิเคราะห์ความช่วยเหลือแบบใยแมงมุม 5 ด้าน": "4. 五维度雷达分析 (Spider Web)",
                        "5. Ecosystem / แผนที่บ้าน": "5. 生态系统与家庭地图",
                        "บันทึกการให้คำปรึกษาและ SOAP Notes ย้อนหลัง": "历史咨询记录与 SOAP 笔记",
                        "รายละเอียด (SOAP Note)": "详细信息 (SOAP)",
                        "ยังไม่มีประวัติการบันทึกในระบบ": "系统中尚无历史记录",
                        "🌳 ผังเครือญาติและโครงสร้างครอบครัว (Family Tree)": "🌳 家庭树与结构",
                        "แสดงข้อมูลความสัมพันธ์ภายในครอบครัว การอยู่อาศัยร่วมกัน และผู้มีอำนาจตัดสินใจหลัก": "展示家庭内部关系、共同居住及主要决策者信息",
                        "บิดา": "父亲",
                        "มารดา": "母亲",
                        "พี่น้องร่วมสายโลหิต": "兄弟姐妹",
                        "🧬 แผนภูมิพันธประวัติและพันธุศาสตร์ครอบครัว (Genogram)": "🧬 家族家系图与病史遗传",
                        "บันทึกประวัติสุขภาพจิต โรคประจำตัว และความสัมพันธ์เชิงจิตวิทยาใน 3 รุ่นครอบครัว": "记录三代家庭的精神健康史、慢性病及心理动力学关系",
                        "🕷️ แผนวิเคราะห์ความช่วยเหลือแบบใยแมงมุม 5 ด้าน (5-Dimension Radar Analysis)": "🕷️ 五维度雷达网分析 (Spider Web)",
                        "ประเมินสมดุลใน 5 มิติหลัก: ร่างกาย, จิตใจ, สังคม, เศรษฐกิจ, และการเรียน (เกณฑ์คะแนน 1-10)": "评估五大核心维度平衡：身体、心理、社会、经济、学业 (评分标准 1-10)",
                        "คะแนนเฉลี่ยรวม: 7.4 / 10": "平均总分：7.4 / 10",
                        "🗺️ Ecosystem และแผนที่บ้าน (Home Map & Local Ecosystem)": "🗺️ 家庭地图与本地生态系统",
                        "เปิดดูเส้นทางบน Google Maps": "在 Google Maps上查看路线",
                        "ข้อมูลสภาพแวดล้อมที่อยู่อาศัย การเดินทาง และแหล่งสนับสนุนในชุมชนรอบตัวนักเรียน": "学生周边的居住环境、通勤及社区支持源",
                        "🏠 ที่อยู่และลักษณะที่อยู่อาศัย": "🏠 住房与地址",
                        "🚗 การเดินทางมาโรงเรียน": "🚗 学校通勤",
                        "🌳 ชุมชนและแหล่งสนับสนุนรอบตัว (Local Support Ecosystem)": "🌳 本地支持生态系统"
                    }
                },
                init() {
                    this.hmInit(); this.menuInit();
                    this.$watch('currentTab', tab => {
                        this.syncHash();
                        if (tab === 'admin_users' && this.tabAllowed(tab)) { this.adminLoadUsers(); if (this.can('assign_cases')) this.adminLoadClients(); }
                        if (tab === 'admin_audit' && this.tabAllowed(tab)) this.adminLoadAudit();
                        if (tab === 'docs' && this.tabAllowed(tab)) this.dwEnter();
                        if (tab === 'doc_history' && this.tabAllowed(tab)) this.dhEnter();
                        if (tab === 'red_alerts' && this.tabAllowed(tab)) this.rlLoad();
                        if (tab === 'bh_settings' && this.tabAllowed(tab)) this.bcLoad();
                        if (tab === 'bh_review' && this.tabAllowed(tab)) this.rvLoad();
                        if (tab === 'bullying' && this.tabAllowed(tab)) this.blEnter();
                        if (tab === 'today' && this.tabAllowed(tab)) this.hmLoad(true);
                        if (tab === 'counsel' && this.tabAllowed(tab)) this.ckEnter();
                        if (tab === 'prevention' && this.tabAllowed(tab)) this.pvEnter();
                        if (tab === 'analytics' && this.tabAllowed(tab)) this.baEnter();
                        if (tab === 'dashboard' && this.tabAllowed(tab)) {             // read again only if over a minute old or something was saved since
                            const fresh = (at) => at && Date.now() - at < 60000 && Math.max(this.__wAt || 0, window.__tssWriteAt || 0) <= at;
                            if (!fresh(this.ba.at)) this.baLoadSummary(); if (!fresh(this.hm.at)) this.hmLoad(true);
                        }
                        if ((tab === 'clients' || tab === 'history') && this.tabAllowed(tab)) this.ensureLogs();     // notes only for the pages that show them
                        if (tab === 'history') this.historyLimit = 200;
                        if (tab === 'reports' && this.tabAllowed(tab)) this.ensureReports();
                        if (tab === 'bh_settings' && this.tabAllowed(tab)) this.pmEnsure();
                        if (tab === 'care_overview' && this.tabAllowed(tab)) this.ovLoad();
                        if (tab === 'care_settings' && this.tabAllowed(tab)) this.csLoad();
                        if (tab === 'sys_settings' && this.tabAllowed(tab)) this.sysEnter();
                        if (tab === 'case_directory' && this.tabAllowed(tab)) this.cdLoad();
                        if (tab === 'my_supervision' && this.tabAllowed(tab)) this.spLoad();
                        if (tab !== 'docs' && this.dw.dirty && this.dw.data) this.showToast('เอกสารที่กำลังเขียนยังไม่ได้บันทึก — ข้อความยังอยู่ในหน้า “เขียนเอกสาร”');
                    });
                    this.authInit();
                    this.uxInit();
                },
                /* ===================== AUTHENTICATION & RBAC (server-verified) ===================== */
                // Page → permission needed. Pages not listed here do not exist (prevents arbitrary routes).
                tabPermissions: {
                    clubs: null,
                    dashboard: 'view_case', appointments: 'view_case', clients: 'view_case', history: 'view_case',
                    archive: 'view_case', referrals: 'view_case', tools: null, reports: 'view_reports',
                    feedback: 'view_reports', admin_users: 'manage_users', admin_audit: 'view_audit_logs',
                    docs: 'write_documents', doc_history: 'write_documents', red_alerts: 'view_assessment', bh_settings: 'manage_settings',
                    bh_review: 'view_assessment', bullying: null, today: null, counsel: 'view_case', prevention: null, analytics: 'view_case', care_overview: ['view_all_reports', 'assign_cases'], care_settings: 'manage_settings', sys_settings: ['manage_settings', 'manage_roles', 'manage_users'], case_directory: ['read_all_cases', 'view_all_cases'], my_supervision: 'view_case'
                },
                authView: 'loading', authBusy: false, authError: '', authNotice: '', authFieldError: '',
                authForm: { identifier: '', password: '', remember: false }, authShowPw: false,
                pwForm: { current: '', password: '', confirm: '' }, resetToken: '', showChangePw: false,
                authUser: null, permissions: [], authHome: 'tools', idleTimeoutMinutes: 30, passwordMinLength: 10,
                lastActivity: 0, lastServerTouch: 0, idleWarning: false, idleSecondsLeft: 0, idleTimerId: null,
                netPending: 0, netBusy: false,
                dataError: '', dataLoading: false, serverReportRows: [], requestedTab: '', profileLoading: false,
                admin: {
                    loading: false, saving: false, error: '', formError: '', users: [], roles: [], statuses: [], canManageRoles: false,
                    link: '', linkFor: '', linkEmailed: false, clients: [], staff: [],
                    audit: [], auditTotal: 0, auditQuery: '', auditAction: '',
                    form: { open: false, id: '', email: '', username: '', fullName: '', staffId: '', department: '', roles: [], status: 'Pending' },
                    assign: { open: false, clientId: '', name: '', userIds: [] }
                },
                auditActionOptions: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_FAILED_UNKNOWN', 'ACCOUNT_LOCKED', 'LOGIN_BLOCKED_STATUS', 'LOGIN_THROTTLED', 'LOGOUT',
                    'PASSWORD_CHANGED', 'PASSWORD_RESET', 'PASSWORD_SET_FROM_INVITE', 'RESET_REQUESTED', 'USER_CREATED', 'USER_UPDATED', 'INVITE_ISSUED',
                    'RESET_ISSUED_BY_ADMIN', 'SESSIONS_REVOKED', 'ACCESS_DENIED', 'VIEW_CLIENT', 'VIEW_ASSESSMENTS', 'CASE_CREATED', 'CASE_LOG_ADDED',
                    'CASE_ASSIGNED', 'CASE_ARCHIVED', 'REPORT_EXPORTED', 'DATA_LOADED', 'AUDIT_LOG_VIEWED'],

                can(perm) { return this.permissions.indexOf(perm) >= 0; },
                tabAllowed(tab) {
                    if (!this.isLoggedIn || !Object.prototype.hasOwnProperty.call(this.tabPermissions, tab)) return false;
                    if (this.authUser && this.authUser.studentAccount) return tab === 'clubs' && this.modOn('clubs');   // the server allows a student account nothing else either
                    if (tab === 'clubs') return this.modOn('clubs') && this.clubAccess;
                    if (this.TAB_MOD[tab] && !this.modOn(this.TAB_MOD[tab])) return false;                   // module switched off by the administrator
                    const p = this.tabPermissions[tab];
                    return !p || (Array.isArray(p) ? p.some(x => this.can(x)) : this.can(p));
                },
                pwClassCount(p) { p = p || ''; return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length; },
                authGo(view, keepNotice) {
                    this.authView = view; this.authError = ''; this.authFieldError = '';
                    if (!keepNotice && view !== 'reset' && view !== 'change') this.authNotice = '';
                    this.$nextTick(() => setTimeout(() => {
                        const el = view === 'login' ? this.$refs.authIdentifier : document.getElementById(view === 'forgot' ? 'auth-forgot-id' : (view === 'change' ? 'auth-current' : 'auth-new'));
                        if (el && view === 'login' && this.authForm.identifier) { this.$refs.authPassword.focus(); } else if (el) el.focus();
                    }, 30));
                },

                async authInit() {
                    window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); }); // never show a cached page after logout
                    window.addEventListener('hashchange', () => this.routeFromHash());
                    this.routeFromHash(true);
                    try { const n = sessionStorage.getItem('tss_auth_notice'); if (n) { this.authNotice = n; sessionStorage.removeItem('tss_auth_notice'); } } catch (e) {}
                    try { const remembered = localStorage.getItem('tss_remember_identifier'); if (remembered) { this.authForm.identifier = remembered; this.authForm.remember = true; } } catch (e) {}
                    if (!TssApi.configured()) { this.authView = 'config'; return; }
                    const params = await TssApi.urlParams();
                    if (params.form === 'bullying') this.blPubInit();
                    if (params.form === 'precheck') this.pcPubInit(params.t);          // student pre-session check-in: token only, no sign-in                 // student report form: no sign-in needed
                    if (params.reset && /^[0-9a-f]{64}$/.test(params.reset)) {
                        this.resetToken = params.reset;
                        TssApi.scrubUrl();
                        TssApi.setToken(null);
                        this.authGo('reset');
                        return;
                    }
                    if (TssApi.getToken()) {
                        const t0 = Date.now(), r = await TssApi.call('auth.me', { then: TssApi.startup() });
                        if (r.ok) { TssApi.prime(r.then); this.__signT0 = t0; await this.authAccept(r.data); return; }
                        TssApi.setToken(null);
                        if (r.code === 'UNAUTHENTICATED' && !this.authNotice) this.authNotice = 'เซสชันก่อนหน้าหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่';
                        if (r.code === 'NETWORK') { this.authGo('login', true); this.authError = r.message; return; }
                    }
                    this.authGo('login', true);   // keep the logout / expiry notice visible
                },

                async authLogin() {
                    if (this.authBusy) return;            // ignore double clicks / repeated Enter
                    this.authError = ''; this.authNotice = ''; this.authFieldError = '';
                    const id = this.authForm.identifier.trim();
                    if (!id) { this.authError = 'กรุณากรอกชื่อผู้ใช้หรืออีเมล'; this.authFieldError = 'identifier'; this.$refs.authIdentifier.focus(); return; }
                    if (!this.authForm.password) { this.authError = 'กรุณากรอกรหัสผ่าน'; this.authFieldError = 'password'; this.$refs.authPassword.focus(); return; }
                    this.authBusy = true;
                    try {
                        const t0 = Date.now(), r = await TssApi.call('auth.login', { identifier: id, password: this.authForm.password, then: TssApi.startup() });
                        this.authForm.password = '';       // never keep the password in memory longer than needed
                        this.authShowPw = false;
                        if (!r.ok) {
                            this.authError = r.message || 'เข้าสู่ระบบไม่สำเร็จ';
                            this.authFieldError = 'password';
                            this.$nextTick(() => this.$refs.authPassword && this.$refs.authPassword.focus());
                            return;
                        }
                        try { if (this.authForm.remember) localStorage.setItem('tss_remember_identifier', id); else localStorage.removeItem('tss_remember_identifier'); } catch (e) {}
                        TssApi.setToken(r.data.token);
                        TssApi.prime(r.then); this.__signT0 = t0;
                        await this.authAccept(r.data, true);
                    } finally {
                        this.authBusy = false;
                    }
                },

                async authAccept(info, freshLogin) {
                    this.authUser = Object.assign({}, info.user, { studentAccount: !!info.studentAccount });
                    this.st.data = null; this.st.trim = null; this.st.arch = null; this.st.split = null; this.st.backup = false; this.st.last = ''; this.st.msg = '';
                    this.rgReset(); this.crReset(); this.ph.meta = null; this.ph.cur = { clientId: '', url: '', sid: '', loading: false }; this.phReset(); this.ph.one = { q: '', data: null, err: '', busy: false, reason: '', delBusy: false, delErr: '' };
                    this.ua.data = null; this.ua.users = null; this.ua.sel = null; this.ua.hist = null; this.ua.mig = null;
                    this.cm.meta = null; this.cm.list = null; this.cm.year = ''; this.cm.view = 'cards'; this.cm.sel = null; this.cm.att = null; this.cm.rep = null;
                    this.permissions = Array.isArray(info.permissions) ? info.permissions : [];
                    this.authHome = info.home || 'tools';
                    this.idleTimeoutMinutes = Number(info.idleTimeoutMinutes) || 30;
                    this.passwordMinLength = Number(info.passwordMinLength) || 10;
                    this.username = info.user.fullName;
                    const labels = info.user.roleLabels || [];
                    this.selectedRole = labels.find(l => !/ผู้ดูแลระบบ/.test(l)) || labels[0] || 'ผู้ใช้งาน';
                    if (info.user.mustChangePassword) { this.isLoggedIn = false; this.pwForm = { current: '', password: '', confirm: '' }; this.authGo('change'); return; }
                    this.authError = ''; this.authNotice = '';
                    this.isLoggedIn = true;
                    this.lastActivity = this.lastServerTouch = Date.now();
                    this.startIdleWatch();
                    if (info.studentAccount) { this.currentTab = 'clubs'; this.requestedTab = ''; this.modLoad(); await this.clMeta(); return; }   // club check-in only: no case data is requested
                    this.clMeta();
                    const wanted = this.requestedTab && this.tabAllowed(this.requestedTab) ? this.requestedTab : (this.hm.homeFirst || (!this.tabAllowed('dashboard') && this.authHome === 'tools') ? 'today' : this.authHome);
                    this.currentTab = this.tabAllowed(wanted) ? wanted : 'tools';
                    this.requestedTab = '';
                    { const t = this.todayISO(); this.currentYear = Number(t.slice(0, 4)); this.currentMonth = Number(t.slice(5, 7)) - 1; this.scheduleWeekStart = this.mondayOf(t); }
                    // data first; the welcome window follows once the page has its data, so it never covers the loading animation
                    const modP = this.modLoad();                                 // in parallel with the first load (was: after it)
                    await this.loadData();
                    await modP;
                    if (this.__signT0) { try { if (window.TssPerf) window.TssPerf.span('เข้าสู่ระบบ → ข้อมูลแสดงบนหน้าจอ', Date.now() - this.__signT0); } catch (e) {} this.__signT0 = 0; }
                    if (freshLogin && this.isLoggedIn && this.authUser && this.authUser.id === info.user.id) this.openWelcome();
                },

                /** Every authenticated call goes through here so expiry/permission errors are handled uniformly. */
                async apiCall(action, payload) {
                    const pwEpoch = this.__pwEpoch || 0;
                    this.netPending++;
                    if (!this.__netTimer) this.__netTimer = setTimeout(() => { this.__netTimer = null; if (this.netPending > 0) this.netBusy = true; }, 250);
                    let r;
                    try { r = await TssApi.call(action, payload); }
                    finally { this.netPending = Math.max(0, this.netPending - 1); if (!this.netPending) { this.netBusy = false; if (this.__netTimer) { clearTimeout(this.__netTimer); this.__netTimer = null; } } }
                    if (!r.ok && r.code === 'UNAUTHENTICATED' && this.isLoggedIn) this.endSession('เซสชันหมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบใหม่');
                    else if (!r.ok && r.code === 'PASSWORD_CHANGE_REQUIRED') { if (pwEpoch === (this.__pwEpoch || 0)) { this.isLoggedIn = false; if (this.authView !== 'change') this.authGo('change'); } }
                    else if (r.ok) this.lastServerTouch = Date.now();
                    if (r.ok && !this.lpIsRead(action)) { this.__wAt = Date.now(); this.lpInvalidate(); }     // something was saved: no older copy is shown
                    return r;
                },

                normalizeClient(c) {
                    const out = Object.assign({}, c);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(out.lastUpdate || '')) out.lastUpdate = this.formatThaiDateDisplay(out.lastUpdate);
                    if (!out.avatar) out.avatar = '';   // no photo → the page's own placeholder (no outside image service)
                    if (!out.lastUpdate) out.lastUpdate = '-';
                    out.nickname = out.nickname || '-';
                    out.parentName = out.parentName || 'ไม่ระบุ';
                    out.parentPhone = out.parentPhone || '-';
                    return out;
                },

                /* ===== light first load (2026-11-09): the case list arrives with the number of notes per file; the notes themselves
                   (data.logs) and the service-report rows (data.reports) are read when a page that shows them is opened. */
                modsReady: false, profilePrefetched: false, logsLoaded: false, logsLoading: false, logsError: '', logCounts: null, reportsLoaded: false, reportsLoading: false, reportsError: '',
                pfResetData() {
                    this.logsLoaded = false; this.logsLoading = false; this.logsError = ''; this.logCounts = null; this.__logsFull = {}; this.__logsSeq = (this.__logsSeq || 0) + 1;
                    this.reportsLoaded = false; this.reportsLoading = false; this.reportsError = ''; this.__repSeq = (this.__repSeq || 0) + 1;
                    this.__logsP = null; this.__repP = null; this.__spMemo = null;
                },
                pfAfterBootstrap(d) {
                    this.pfResetData();
                    if (d.logs) { this.logs = d.logs; this.logsLoaded = true; } else { this.logs = {}; this.logCounts = d.logCounts || {}; }      // an older server sends everything at once
                    if (d.reportRowsLazy) this.serverReportRows = []; else { this.serverReportRows = d.reportRows || []; this.reportsLoaded = true; }
                    if ((this.currentTab === 'clients' || this.currentTab === 'history') && this.tabAllowed(this.currentTab)) this.ensureLogs();
                    if (this.currentTab === 'reports' && this.tabAllowed('reports')) this.ensureReports();
                },
                pfLogsFull(id) { if (!this.__logsFull) this.__logsFull = {}; this.__logsFull[id] = Date.now(); },
                /** number of notes of a file: the notes when they are here, else the count from the first load */
                logCountOf(id) {
                    if (this.logsLoaded || (this.__logsFull && this.__logsFull[id])) return (this.logs[id] || []).length;
                    return this.logCounts ? (this.logCounts[id] || 0) : (this.logs[id] || []).length;
                },
                ensureLogs(force) {
                    if (!this.isLoggedIn || !this.can('view_case')) return Promise.resolve(false);
                    if (this.logsLoaded && !force) return Promise.resolve(true);
                    if (this.__logsP) return this.__logsP;
                    const seq = this.__logsSeq, who = this.authUser && this.authUser.id, started = Date.now();
                    this.logsLoading = true; this.logsError = '';
                    this.__logsP = (async () => {
                        let r;
                        try { r = await this.apiCall('data.logs', {}); } finally { this.__logsP = null; }
                        if (seq !== this.__logsSeq || !this.isLoggedIn || (this.authUser && this.authUser.id) !== who) return false;   // signed out / reloaded meanwhile
                        this.logsLoading = false;
                        if (!r.ok) { this.logsError = r.message || 'โหลดไม่สำเร็จ'; return false; }
                        const got = r.data.logs || {}, next = Object.assign({}, this.logs);
                        Object.keys(got).forEach(id => { if (!(this.__logsFull && this.__logsFull[id] > started)) next[id] = got[id]; });   // a file opened meanwhile keeps its newer notes
                        this.logs = next; this.logsLoaded = true;
                        return true;
                    })();
                    return this.__logsP;
                },
                ensureReports(force) {
                    if (!this.isLoggedIn || !this.can('view_reports')) return Promise.resolve(false);
                    if (this.reportsLoaded && !force) return Promise.resolve(true);
                    if (this.__repP) return this.__repP;
                    const seq = this.__repSeq, who = this.authUser && this.authUser.id;
                    this.reportsLoading = true; this.reportsError = '';
                    this.__repP = (async () => {
                        let r;
                        try { r = await this.apiCall('data.reports', {}); } finally { this.__repP = null; }
                        if (seq !== this.__repSeq || !this.isLoggedIn || (this.authUser && this.authUser.id) !== who) return false;
                        this.reportsLoading = false;
                        if (!r.ok) { this.reportsError = r.message || 'โหลดไม่สำเร็จ'; return false; }
                        this.serverReportRows = r.data.reportRows || []; this.reportsLoaded = true;
                        return true;
                    })();
                    return this.__repP;
                },

                /* ===== load my students first (2026-11-09, choice A): the general part of the files of the class levels set on the
                   user's roles + files assigned to them, fetched in the background after the first screen. Kept in page memory only
                   (never in browser storage), at most 10 minutes, cleared on sign-out and after any change the user saves.
                   Opening such a file shows this copy at once; client.detail still runs (permission check, audit, specialist parts)
                   and its answer replaces the copy. */
                lpRun(force) {
                    if (!this.isLoggedIn || !this.can('view_case')) return;
                    const S = window.__tssLp || (window.__tssLp = { who: '', at: 0, busy: false, items: new Map() });
                    const who = this.authUser && this.authUser.id;
                    if (S.who !== who) { S.items = new Map(); S.at = 0; S.who = who; }
                    if (S.busy || (!force && Date.now() - S.at < 120000)) return;
                    S.busy = true;
                    TssApi.call('data.prefetch', {}).then(r => {                // background: no global busy indicator
                        S.busy = false;
                        if (!r || !r.ok || !this.isLoggedIn || (this.authUser && this.authUser.id) !== S.who) return;
                        const m = new Map(), at = Date.now();
                        (r.data.items || []).forEach(x => { if (x && x.client && x.client.id) m.set(String(x.client.id), { d: x, at }); });
                        S.items = m; S.at = at; S.levels = r.data.levels || []; S.total = r.data.total || 0;
                    }, () => { S.busy = false; });
                },
                lpGet(id) {
                    const S = window.__tssLp; if (!S || !S.items) return null;
                    const e = S.items.get(String(id)); if (!e) return null;
                    if (Date.now() - e.at > 600000 || S.who !== (this.authUser && this.authUser.id)) { S.items.delete(String(id)); return null; }
                    return e.d;
                },
                lpDrop(id) { const S = window.__tssLp; if (S && S.items) S.items.delete(String(id)); },
                /** after anything the user saves: forget every copy (never show an older state), fetch again a little later */
                lpInvalidate() {
                    const S = window.__tssLp; if (!S) return;
                    S.items = new Map(); S.at = 0;
                    clearTimeout(this.__lpT); this.__lpT = setTimeout(() => this.lpRun(true), 3000);
                },
                lpReset() { window.__tssLp = null; clearTimeout(this.__lpT); },
                lpIsRead(action) { return /^data\./.test(action) || /\.(list|get|catalog|defs|meta|search|detail|summary|today|alerts|status|history|source)$/.test(action) || action === 'auth.me'; },

                async loadData() {
                    if (this.__dataInFlight) return this.__dataInFlight;          // one bootstrap at a time (repeated Retry clicks, etc.)
                    const seq = (this.__dataSeq = (this.__dataSeq || 0) + 1);
                    const who = this.authUser && this.authUser.id;
                    this.dataLoading = true; this.dataError = '';
                    this.loadAppointments();                                    // independent of the bootstrap → requested in parallel
                    this.loadRequests();                                        // Google Form requests (only for staff who review them)
                    if (this.can('view_assessment')) this.rlLoad();              // Red Alert count for the four professions (no details)
                    this.__dataInFlight = (async () => {
                        let r;
                        try { r = await this.apiCall('data.bootstrap', { lite: true }); }
                        finally { this.__dataInFlight = null; }
                        // a newer load, a sign-out or a different user since this request started → drop this answer
                        if (seq !== this.__dataSeq || !this.isLoggedIn || (this.authUser && this.authUser.id) !== who) return;
                        this.dataLoading = false;
                        if (!r.ok) { this.dataError = 'โหลดข้อมูลไม่สำเร็จ: ' + r.message; return; }
                        this.students = (r.data.clients || []).map(c => this.normalizeClient(c));
                        this.pfAfterBootstrap(r.data);
                        clearTimeout(this.__lpT); this.__lpT = setTimeout(() => this.lpRun(), 1500);   // after the first screen
                        this.mentalHealthAssessments = {}; this.studentFamilyRecords = {}; this.studentEcomapRecords = {};
                    })();
                    return this.__dataInFlight;
                },

                async authRequestReset() {
                    if (this.authBusy) return;
                    this.authError = ''; this.authNotice = '';
                    if (!this.authForm.identifier.trim()) { this.authError = 'กรุณากรอกชื่อผู้ใช้หรืออีเมล'; return; }
                    this.authBusy = true;
                    const r = await TssApi.call('auth.requestReset', { identifier: this.authForm.identifier.trim() });
                    this.authBusy = false;
                    if (!r.ok) { this.authError = r.message; return; }
                    this.authGo('login', true);
                    this.authNotice = r.data.message;
                },

                pwFormProblem() {
                    const p = this.pwForm.password;
                    if (p.length < this.passwordMinLength) return 'รหัสผ่านใหม่ต้องมีอย่างน้อย ' + this.passwordMinLength + ' ตัวอักษร';
                    if (this.pwClassCount(p) < 2) return 'รหัสผ่านใหม่ต้องมีตัวอักษรอย่างน้อย 2 ประเภท';
                    if (p !== this.pwForm.confirm) return 'ยืนยันรหัสผ่านไม่ตรงกัน';
                    return '';
                },

                async authResetPassword() {
                    if (this.authBusy) return;
                    this.authError = '';
                    const problem = this.pwFormProblem();
                    if (problem) { this.authError = problem; return; }
                    this.authBusy = true;
                    const r = await TssApi.call('auth.resetPassword', { resetToken: this.resetToken, newPassword: this.pwForm.password });
                    this.authBusy = false;
                    this.pwForm = { current: '', password: '', confirm: '' };
                    if (!r.ok) { this.authError = r.message; return; }
                    this.resetToken = '';
                    this.authGo('login');
                    this.authNotice = r.data.message;
                },

                async authChangePassword(voluntary) {
                    if (this.authBusy) return;
                    this.authError = '';
                    if (!this.pwForm.current) { this.authError = 'กรุณากรอกรหัสผ่านปัจจุบัน'; return; }
                    const problem = this.pwFormProblem();
                    if (problem) { this.authError = problem; return; }
                    this.authBusy = true;
                    const r = await TssApi.call('auth.changePassword', { currentPassword: this.pwForm.current, newPassword: this.pwForm.password });
                    this.authBusy = false;
                    if (!r.ok) { this.authError = r.message; if (r.code === 'UNAUTHENTICATED') this.endSession(r.message); return; }
                    this.pwForm = { current: '', password: '', confirm: '' };
                    this.__pwEpoch = (this.__pwEpoch || 0) + 1;
                    if (voluntary) { this.showChangePw = false; this.showToast('เปลี่ยนรหัสผ่านเรียบร้อย เซสชันบนอุปกรณ์อื่นถูกยกเลิกแล้ว'); return; }
                    await this.authAccept(r.data, true);
                },

                async authLogout() {
                    const token = TssApi.getToken();
                    if (token) await TssApi.call('auth.logout');
                    this.endSession('ออกจากระบบเรียบร้อยแล้ว');
                },

                /** Wipe everything sensitive from memory and return to the login screen. */
                endSession(notice) {
                    this.__leaving = true;
                    this.welcome.open = false;
                    this.clearCaseDrafts();
                    TssApi.setToken(null);
                    clearInterval(this.idleTimerId);
                    if (!TssApi.inAppsScript()) {
                        try { sessionStorage.setItem('tss_auth_notice', notice || ''); } catch (e) {}
                        location.replace(location.pathname + location.search); // full reload clears every in-memory copy
                        return;
                    }
                    this.isLoggedIn = false; this.idleWarning = false;
                    this.__dataSeq = (this.__dataSeq || 0) + 1; this.dataLoading = false; this.dataError = ''; this.profileLoading = false;
                    this.aw.open = false; this.aw.list = []; this.aw.listFor = ''; this.aw.defs = null; this.profilePins = []; this.ilClose(); this.il.catalog = null; this.ilr.open = false; this.ilr.src = null; this.ilr.built = null; this.dw.meta = null; this.dw.data = null; this.dw.type = ''; this.dw.dirty = false; this.dw.pages = []; this.dw.mine = { items: [], loading: false, error: '', loaded: false }; this.dh.items = []; this.dh.loaded = false; this.dh.detail.open = false; this.a3ResetCase(); this.a3.meta = null; this.a3.set.open = false; this.a3.set.form = null; this.tl.clientId = ''; this.tl.data = null; this.tl.detail.open = false; this.rtc.open = false; this.bf.open = false; this.ra.open = false; this.ra.data = null; this.bp.clientId = ''; this.bp.data = null; this.bm.meta = null; this.rl.items = []; this.rl.open = 0; this.rl.loaded = false; this.rlStop(); this.bc.data = null; this.bc.ed = null; this.cp.clientId = ''; this.cp.data = null; this.rf.open = false; this.rv.items = []; this.rv.loaded = false; this.ov.data = null; this.ov.wl = null; this.cs.data = null; this.cs.form = null; this.sp.items = []; this.sp.loaded = false; this.io.data = null; this.io.form = null; this.cpl.data = null; this.cpl.clientId = ''; this.gs.open = false; this.modForm.open = false; this.ba.sum = null; this.ba.at = 0; this.bap.stu = null; this.bap.clientId = ''; this.bap.sch = null; this.pv.meta = null; this.pv.trends = null; this.pv.overview = null; this.pv.flags = null; this.pv.suggest = null; this.pv.lib = null; this.pv.events = null; this.pva.f = null; this.pve.f = null; this.pvr.f = null; this.pvi.items = null; this.pvp.items = null; this.ck.meta = null; this.ck.groups = null; this.ck.notes = null; this.ck.link = null; this.ckNote.f = null; this.ckSer.f = null; this.ckGrp.f = null; this.pcv.open = false; this.hm.data = null; this.hq.open = false; this.pb.data = null; this.pb.clientId = ''; this.pm.meta = null; this.cpf.open = false; this.cdf.open = false; this.pbs.f = null; this.bl.data = null; this.bl.reports = null; this.bl.dash = null; this.bl.link = null; this.blr.open = false; this.bld.open = false; this.bld.data = null; this.blt.id = ''; this.is.fo.open = false; this.is.fo.items = []; this.is.fo.loaded = false; this.is.fo.clientId = ''; this.is.fo.client = null; this.is.fo.plans = []; this.is.pl.open = false; this.is.pl.data = null; this.is.ed.open = false; this.is.ed.f = null; this.is.ev.open = false; this.is.gr.open = false; this.is.st.open = false; this.is.doc.open = false; this.is.doc.built = null; this.is.pf = { clientId: '', loading: false, error: '', data: null }; this.is.meta = null;
                    this.students = []; this.logs = {}; this.pfResetData(); this.lpReset(); this.mentalHealthAssessments = {}; this.studentFamilyRecords = {}; this.studentEcomapRecords = {};
                    this.serverReportRows = []; this.appointments = []; this.rq.items = []; this.rq.loaded = false; this.rq.error = ''; this.rq.loadedAt = 0; this.activeFormRequest = null; this.showFormRequestModal = false; this.fb.rows = []; this.fb.columns = []; this.activeStudent = null; this.activeStudentLogs = []; this.permissions = []; this.authUser = null;
                    this.showProfileModal = false; this.showNewLogModal = false;
                    this.admin.users = []; this.admin.audit = []; this.admin.clients = []; this.admin.link = '';
                    this.authNotice = notice || '';
                    this.authGo('login', true);
                },

                /* ---- idle timeout: warn shortly before the server-side idle limit, keep the server session alive while active ---- */
                startIdleWatch() {
                    if (!this.__activityBound) {
                        const mark = () => { if (!this.idleWarning) this.lastActivity = Date.now(); };
                        ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'].forEach(ev => window.addEventListener(ev, mark, { passive: true }));
                        this.__activityBound = true;
                    }
                    clearInterval(this.idleTimerId);
                    this.idleTimerId = setInterval(() => this.idleTick(), 5000);
                },
                idleTick() {
                    if (!this.isLoggedIn) return;
                    const now = Date.now(), limit = this.idleTimeoutMinutes * 60000, warnAt = limit - 90000;
                    const idleFor = now - this.lastActivity;
                    if (idleFor >= limit - 5000) { this.endSession('ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานเกิน ' + this.idleTimeoutMinutes + ' นาที'); return; }
                    if (idleFor >= warnAt) {
                        if (!this.idleWarning) { this.idleWarning = true; this.$nextTick(() => { const b = document.getElementById('idle-continue'); if (b) b.focus(); }); }
                        this.idleSecondsLeft = Math.max(0, Math.round((limit - idleFor) / 1000));
                        return;
                    }
                    // user is active: refresh the server session every 5 minutes of activity
                    if (now - this.lastServerTouch > 5 * 60000 && idleFor < 60000) { this.lastServerTouch = now; this.refreshPermissions(); }
                },
                async idleContinue() {
                    this.idleWarning = false;
                    this.lastActivity = Date.now();
                    const r = await this.apiCall('auth.me');
                    if (r.ok) this.lastServerTouch = Date.now();
                },

                /* ---- hash routing (only internal page ids are accepted → no open redirect) ---- */
                routeFromHash(initial) {
                    if (TssApi.inAppsScript()) return;
                    const m = /^#\/([a-z_]{2,30})$/.exec(location.hash || '');
                    if (!m || !Object.prototype.hasOwnProperty.call(this.tabPermissions, m[1])) return;
                    if (initial || !this.isLoggedIn) this.requestedTab = m[1];
                    else this.currentTab = m[1];
                },
                syncHash() {
                    if (TssApi.inAppsScript() || !this.isLoggedIn) return;
                    try { if (location.hash !== '#/' + this.currentTab) history.replaceState(null, '', location.pathname + location.search + '#/' + this.currentTab); } catch (e) {}
                },

                /* ---- administration ---- */
                adminFormatTs(ts) { const t = Date.parse(ts); return isNaN(t) ? String(ts || '') : new Date(t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); },
                async adminLoadUsers() {
                    this.admin.loading = true; this.admin.error = '';
                    const r = await this.apiCall('admin.listUsers');
                    this.admin.loading = false;
                    if (!r.ok) { this.admin.error = r.message; return; }
                    Object.assign(this.admin, { users: r.data.users, roles: r.data.roles, statuses: r.data.statuses, canManageRoles: r.data.canManageRoles });
                },
                adminOpenCreate() {
                    this.admin.formError = '';
                    this.admin.form = { open: true, id: '', email: '', username: '', fullName: '', staffId: '', department: '', roles: [], status: 'Pending' };
                },
                adminOpenEdit(u) {
                    this.admin.formError = '';
                    this.admin.form = { open: true, id: u.id, email: u.email, username: u.username, fullName: u.fullName, staffId: u.staffId || '', department: u.department || '', roles: [...u.roles], status: u.status };
                },
                async adminSaveUser() {
                    if (this.admin.saving) return;
                    const f = this.admin.form;
                    this.admin.formError = '';
                    if (!f.fullName.trim()) { this.admin.formError = 'กรุณาระบุชื่อ-นามสกุล'; return; }
                    this.admin.saving = true;
                    let r;
                    if (f.id) {
                        const payload = { userId: f.id, fullName: f.fullName, staffId: f.staffId, department: f.department, status: f.status };
                        if (this.admin.canManageRoles) payload.roles = f.roles;
                        r = await this.apiCall('admin.updateUser', payload);
                    } else {
                        r = await this.apiCall('admin.createUser', { email: f.email, username: f.username, fullName: f.fullName, staffId: f.staffId, department: f.department, roles: this.admin.canManageRoles ? f.roles : [] });
                    }
                    this.admin.saving = false;
                    if (!r.ok) { this.admin.formError = r.message; return; }
                    this.admin.form.open = false;
                    this.showToast(f.id ? ('บันทึกการเปลี่ยนแปลงแล้ว' + (r.data.revokedSessions ? ' • ยกเลิก ' + r.data.revokedSessions + ' เซสชัน' : '')) : 'สร้างบัญชีแล้ว (สถานะ Pending)');
                    await this.adminLoadUsers();
                },
                async adminPasswordLink(u) {
                    this.admin.error = '';
                    const r = await this.apiCall('admin.passwordLink', { userId: u.id });
                    if (!r.ok) { this.admin.error = r.message; return; }
                    this.admin.link = r.data.link; this.admin.linkEmailed = r.data.emailed;
                    if (r.data.emailed && r.mail && r.mail.ids && window.TssApi.watchMail) {   // Edge: the e-mail is queued — show "รอส่ง" until the sender confirms
                        const link = r.data.link;
                        window.TssApi.watchMail(r.mail.ids, (st) => { if (this.admin.link === link) this.admin.linkEmailed = st === 'sent' ? true : st === 'failed' ? false : 'queued'; });
                    }
                    this.admin.linkFor = (r.data.purpose === 'invite' ? 'ลิงก์ตั้งรหัสผ่านครั้งแรกสำหรับ ' : 'ลิงก์ตั้งรหัสผ่านใหม่สำหรับ ') + u.fullName;
                },
                async adminRevoke(u) {
                    if (!confirm('ยกเลิกเซสชันที่ใช้งานอยู่ทั้งหมดของ ' + u.fullName + '?')) return;
                    const r = await this.apiCall('admin.revokeSessions', { userId: u.id });
                    if (!r.ok) { this.admin.error = r.message; return; }
                    this.showToast('ยกเลิก ' + r.data.revoked + ' เซสชันแล้ว');
                    await this.adminLoadUsers();
                },
                async adminLoadAudit() {
                    this.admin.error = '';
                    const r = await this.apiCall('admin.auditLog', { query: this.admin.auditQuery, action: this.admin.auditAction, limit: 300 });
                    if (!r.ok) { this.admin.error = r.message; return; }
                    this.admin.audit = r.data.entries; this.admin.auditTotal = r.data.total;
                },
                async adminLoadClients() {
                    const r = await this.apiCall('admin.clients');
                    if (!r.ok) { this.admin.error = r.message; return; }
                    this.admin.clients = r.data.clients; this.admin.staff = r.data.staff;
                },
                adminOpenAssign(c) { this.admin.formError = ''; this.admin.assign = { open: true, clientId: c.id, name: c.displayName, userIds: [...c.assignedUserIds] }; },
                async adminSaveAssign() {
                    if (this.admin.saving) return;
                    this.admin.saving = true;
                    const r = await this.apiCall('admin.assignClient', { clientId: this.admin.assign.clientId, userIds: this.admin.assign.userIds });
                    this.admin.saving = false;
                    if (!r.ok) { this.admin.formError = r.message; return; }
                    this.admin.assign.open = false;
                    this.showToast('บันทึกการมอบหมายแล้ว');
                    await this.adminLoadClients();
                },
                copyText(text) {
                    try { navigator.clipboard.writeText(text).then(() => this.showToast('คัดลอกแล้ว')); } catch (e) { this.showToast('คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกเอง'); }
                },
                /* =================== END AUTHENTICATION & RBAC =================== */

                t(key) {
                    if (this.currentLang === 'th') return key;
                    const dict = this.translations[this.currentLang];
                    return (dict && dict[key]) ? dict[key] : key;
                },

                selectedRole: 'นักสังคมสงเคราะห์',
                username: 'ดร.สมชาย ใจดี',
                currentTab: 'dashboard',


                profileTab: 'timeline',
                filterRisk: 'all',
                historyFilter: 'all', historyLimit: 200,
                searchQuery: '',
                scheduleProviderFilter: 'all',
                scheduleStatusFilter: 'all',
                showProfileModal: false,
                showNewLogModal: false,
                showClientTypeModal: false,
                showAppointmentModal: false,
                showScheduleModal: false,
                showFormRequestModal: false,
                sidebarOpen: false,
                toastMessage: '',
                scrollY: 0,
                

                activeStudent: null,
                activeStudentLogs: [],
                activeAppointment: null,
                activeFormRequest: null,
                appointmentStudentInfo: null,
                appointmentStudentLogs: [],

                selectedClientType: 'ผู้รับบริการรายใหม่',
                formStudentId: '',
                formBehaviors: [],
                formNote: '',

                newScheduleForm: { id: '', clientId: '', dateISO: '', startTime: '09:30', endTime: '10:30', type: 'counseling', responsibleUserId: '', status: 'scheduled', topic: '' },
                // Appointments: loaded from the server (one shared store for the calendar and the dashboard)
                appointments: [],
                apptMeta: { staff: [], canManage: false, canAssign: false,
                            types: { counseling: 'ให้คำปรึกษา', follow_up: 'ติดตามผล', assessment: 'ประเมิน', crisis: 'ภาวะวิกฤต', meeting: 'ประชุม/ประสานงาน', other: 'อื่น ๆ' },
                            statuses: { scheduled: 'นัดหมายแล้ว', completed: 'รับบริการแล้ว', postponed: 'เลื่อนนัด', cancelled: 'ยกเลิก', no_show: 'ไม่มาตามนัด' } },
                apptLoading: false,
                apptError: '',
                scheduleWeekStart: '',
                scheduleError: '',
                scheduleSaving: false,
                apptConfirmDelete: null,

                printData: { refNo: '001/2569', date: '25 ตุลาคม 2026', studentName: '', grade: '', riskText: '', behaviors: '', note: '', counselorName: 'ดร.สมชาย ใจดี' },
                appointmentViewMode: 'week',
                


                advisorTeachersList: [
                    'ครูวิไล รักษ์ศิษย์',
                    'อาจารย์สมศรี มีสุข',
                    'ครูกิตติพงศ์ ใจดี',
                    'ครูพิมพ์ชนก สว่างวงศ์',
                    'ดร.สมชาย ใจดี'
                ],

                availableGradesInSystem: ['ม.1/1', 'ม.2/1', 'ม.3/1', 'ม.4/1', 'ม.4/2', 'ม.4/3', 'ม.5/1', 'ม.5/2', 'ม.6/3'],

                officialIssueCategories: [
                    'สุขภาพกาย',
                    'ความเครียด',
                    'อาการวิตกกังวล',
                    'การนอน',
                    'การเสพติด',
                    'พฤติกรรมที่ไม่พึงประสงค์',
                    'การเรียนรู้',
                    'สภาพเศรษฐกิจ',
                    'ความสัมพันธ์',
                    'ครอบครัว',
                    'สังคม',
                    'ระบุประเด็นปัญหาอื่นๆ'
                ],
                otherIssueCategory: 'ระบุประเด็นปัญหาอื่นๆ',

                counselingToolsOptions: [
                    'การรับฟังอย่างตั้งใจ (Active Listening)',
                    'การตั้งคำถามปลายเปิด (Open-ended Questioning)',
                    'การสะท้อนความรู้สึก (Reflection of Feeling)',
                    'การแก้ปัญหาร่วมกัน (Collaborative Problem Solving)',
                    'การปรับโครงสร้างความคิด (Cognitive Restructuring)',
                    'การฝึกสติและผ่อนคลาย (Mindfulness & Relaxation)'
                ],



                // Client records are loaded from the server after login — only what this account may see.
                // The sample records formerly embedded here now live in apps-script/SampleData.gs (optional seed).
                students: [],
                logs: {},
                mentalHealthAssessments: {},
                studentFamilyRecords: {},
                studentEcomapRecords: {},



                timeSlots: [
                    { time: '08:30 - 09:30' },
                    { time: '09:30 - 10:30' },
                    { time: '10:30 - 11:30' },
                    { time: '13:00 - 14:00' },
                    { time: '14:00 - 15:00' }
                ],



                // DATA REPORTS & EXPORT STATE (Requirement 1)
                reportFilters: {
                    searchName: '',
                    startDate: '',
                    endDate: '',
                    grade: 'all',
                    gender: 'all',
                    minAge: '',
                    maxAge: ''
                },
                reportCurrentPage: 1,
                reportPageSize: 10,
                exportAllWithoutFilter: false,
                isExporting: false,
                reportExportStatus: '',
                reportExportError: false,
                googleSheetsWebhookUrl: '',
                auditLogs: [],

                reportRowFromServer(r) {
                    const restricted = '(จำกัดสิทธิ์ — ต้องเป็นผู้ดูแลเคสนี้)';
                    return {
                        recordId: r.recordId, studentId: r.studentId, studentName: r.studentName, grade: r.grade || 'ไม่ระบุ', gender: r.gender || 'ไม่ระบุ',
                        birthDateISO: r.birthDateISO || '', ageAtService: this.calculateAgeAtDate(r.birthDateISO, r.serviceDateISO),
                        serviceDateISO: r.serviceDateISO, serviceDateThai: this.formatThaiDateDisplay(r.serviceDateISO),
                        issueCategories: r.issueCategories || [],
                        issueCategoriesText: (r.issueCategories || []).length ? r.issueCategories.map(c => c === this.otherIssueCategory && r.otherIssueText ? 'อื่นๆ: ' + r.otherIssueText.replace(/\s+/g, ' ') : c).join(', ') : 'ไม่ระบุ',
                        otherIssueText: r.otherIssueText === null ? restricted : (r.otherIssueText || ''),
                        presentingProblem: r.presentingProblem === null ? restricted : (r.presentingProblem || '-'),
                        carePlan: r.carePlan === null ? '(จำกัดสิทธิ์ — เฉพาะ 4 วิชาชีพที่ดูแลเคสนี้)' : (r.carePlan || '-'),
                        risk: r.risk || 'none', totalScoreText: (typeof r.avgScore === 'number' ? r.avgScore.toFixed(1) + ' / 10' : '-'), author: r.author || 'ไม่ระบุ'
                    };
                },

                // Rows come from the server, already limited to what this account may see.
                get allServiceReportRows() {
                    return (this.serverReportRows || []).map(r => this.reportRowFromServer(r));
                },

                get filteredServiceReportRows() {
                    return this.allServiceReportRows.filter(row => {
                        const q = (this.reportFilters.searchName || '').trim().toLowerCase();
                        if (q && !row.studentName.toLowerCase().includes(q)) return false;
                        if (this.reportFilters.startDate && row.serviceDateISO < this.reportFilters.startDate) return false;
                        if (this.reportFilters.endDate && row.serviceDateISO > this.reportFilters.endDate) return false;
                        if (this.reportFilters.grade !== 'all' && row.grade !== this.reportFilters.grade) return false;
                        if (this.reportFilters.gender !== 'all' && row.gender !== this.reportFilters.gender) return false;
                        if (this.reportFilters.minAge !== '' && this.reportFilters.minAge !== null) {
                            if (row.ageAtService === null || row.ageAtService < Number(this.reportFilters.minAge)) return false;
                        }
                        if (this.reportFilters.maxAge !== '' && this.reportFilters.maxAge !== null) {
                            if (row.ageAtService === null || row.ageAtService > Number(this.reportFilters.maxAge)) return false;
                        }
                        return true;
                    });
                },

                get reportTotalPages() {
                    return Math.max(1, Math.ceil(this.filteredServiceReportRows.length / this.reportPageSize));
                },

                get paginatedServiceReportRows() {
                    const start = (this.reportCurrentPage - 1) * this.reportPageSize;
                    return this.filteredServiceReportRows.slice(start, start + this.reportPageSize);
                },

                clearReportFilters() {
                    this.reportFilters = {
                        searchName: '',
                        startDate: '',
                        endDate: '',
                        grade: 'all',
                        gender: 'all',
                        minAge: '',
                        maxAge: ''
                    };
                    this.reportCurrentPage = 1;
                },

                sanitizeFormulaCell(val) {
                    if (val === null || val === undefined) return '';
                    const str = String(val);
                    if (/^[=+\-@]/.test(str)) {
                        return "'" + str;
                    }
                    return str;
                },

                getRowsForExport(source) {
                    return source.map((r, idx) => ({
                        'ลำดับ': idx + 1,
                        'วันที่ให้บริการ (พ.ศ.)': this.sanitizeFormulaCell(r.serviceDateThai),
                        'วันที่ให้บริการ (ISO)': this.sanitizeFormulaCell(r.serviceDateISO),
                        'ชื่อ-นามสกุลผู้รับบริการ': this.sanitizeFormulaCell(r.studentName),
                        'ระดับชั้น': this.sanitizeFormulaCell(r.grade),
                        'เพศ': this.sanitizeFormulaCell(r.gender),
                        'อายุ ณ วันรับบริการ (ปี)': r.ageAtService !== null ? r.ageAtService : 'ไม่ระบุ',
                        'ประเภทประเด็นปัญหา': this.sanitizeFormulaCell(r.issueCategoriesText),
                        'ประเด็นปัญหาแรกรับ': this.sanitizeFormulaCell(r.presentingProblem),
                        'คะแนนความเสี่ยงรวม': this.sanitizeFormulaCell(r.totalScoreText),
                        'ระดับความเสี่ยง': r.risk === 'green' ? 'ปกติ (สีเขียว)' : (r.risk === 'yellow' ? 'เฝ้าระวัง (สีเหลือง)' : (r.risk === 'red' ? 'เร่งด่วน (สีแดง)' : 'ไม่ได้ประเมิน')),
                        'แผนการช่วยเหลือ': this.sanitizeFormulaCell(r.carePlan),
                        'ผู้ให้บริการ': this.sanitizeFormulaCell(r.author)
                    }));
                },

                /** Ask the server to authorise (and audit) the export; it returns only rows this account may export. */
                async fetchAuthorizedExportRows(format) {
                    const source = this.exportAllWithoutFilter ? this.allServiceReportRows : this.filteredServiceReportRows;
                    if (!source.length) return { error: 'ไม่มีรายการข้อมูลที่ตรงตามเงื่อนไขสำหรับการส่งออก' };
                    const r = await this.apiCall('reports.export', { recordIds: source.map(x => x.recordId), format: format });
                    if (!r.ok) return { error: r.message };
                    return { rows: this.getRowsForExport(r.data.rows.map(x => this.reportRowFromServer(x))) };
                },

                downloadCsv(exportData, prefix) {
                    const headers = Object.keys(exportData[0]);
                    const csvContent = '\uFEFF' + [headers.join(','), ...exportData.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
                    link.click();
                },

                async exportReportToExcel() {
                    if (!this.can('export_reports')) { this.reportExportError = true; this.reportExportStatus = 'บัญชีของคุณไม่มีสิทธิ์ส่งออกรายงาน'; return; }
                    if (this.isExporting) return;
                    this.isExporting = true;
                    this.reportExportError = false;
                    try {
                        const res = await this.fetchAuthorizedExportRows('xlsx');
                        if (res.error) { this.reportExportError = true; this.reportExportStatus = res.error; return; }
                        const exportData = res.rows;
                        if (!exportData.length) { this.reportExportError = true; this.reportExportStatus = 'ไม่มีรายการที่คุณมีสิทธิ์ส่งออก'; return; }
                        try { await window.TssLib.load('xlsx'); } catch (e) { /* CSV below */ }
                        if (typeof XLSX !== 'undefined' && XLSX && XLSX.utils) {
                            const ws = XLSX.utils.json_to_sheet(exportData);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, 'Service_Report');
                            XLSX.writeFile(wb, `TSS_Service_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
                        } else {
                            this.downloadCsv(exportData, 'TSS_Service_Report');
                        }
                        this.reportExportStatus = `ส่งออกไฟล์สำเร็จ จำนวน ${exportData.length} รายการ (บันทึกใน Audit Log แล้ว)`;
                    } catch (err) {
                        this.reportExportError = true;
                        this.reportExportStatus = 'เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel';
                    } finally {
                        this.isExporting = false;
                    }
                },

                async exportReportToGoogleSheets() {
                    if (!this.can('export_reports')) { this.reportExportError = true; this.reportExportStatus = 'บัญชีของคุณไม่มีสิทธิ์ส่งออกรายงาน'; return; }
                    if (this.isExporting) return;
                    const hook = (this.googleSheetsWebhookUrl || '').trim();
                    // Personal data may only go to a Google Apps Script endpoint, never to arbitrary sites.
                    if (hook && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}\/exec$/.test(hook)) {
                        this.reportExportError = true; this.reportExportStatus = 'อนุญาตเฉพาะ URL ของ Google Apps Script (https://script.google.com/macros/s/…/exec) เท่านั้น'; return;
                    }
                    this.isExporting = true;
                    this.reportExportError = false;
                    try {
                        const res = await this.fetchAuthorizedExportRows(hook ? 'gsheets-webhook' : 'gsheets-csv');
                        if (res.error) { this.reportExportError = true; this.reportExportStatus = res.error; return; }
                        const exportData = res.rows;
                        if (!exportData.length) { this.reportExportError = true; this.reportExportStatus = 'ไม่มีรายการที่คุณมีสิทธิ์ส่งออก'; return; }
                        if (hook) {
                            await fetch(hook, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, referrerPolicy: 'no-referrer',
                                body: JSON.stringify({ action: 'export_report', actor: this.username, rows: exportData }) });
                            this.reportExportStatus = `ส่งคำขอ ${exportData.length} รายการไปยัง Google Apps Script แล้ว (ตรวจผลในชีตปลายทาง — โหมด no-cors ไม่สามารถยืนยันผลจากหน้านี้ได้)`;
                        } else {
                            this.downloadCsv(exportData, 'TSS_GoogleSheets_Import');
                            this.reportExportStatus = `ดาวน์โหลดไฟล์สำหรับนำเข้า Google Sheets สำเร็จ (${exportData.length} รายการ)`;
                        }
                    } catch (err) {
                        this.reportExportError = true;
                        this.reportExportStatus = 'ไม่สามารถส่งออกไปยัง Google Sheets ได้';
                    } finally {
                        this.isExporting = false;
                    }
                },

                // NEW CASE INTAKE & BIOPSYCHOSOCIAL ASSESSMENT STATE (Requirement 4 + Full-Screen + Specialist)
                intakeActiveTab: 'client_info',
                specialistSubTab: 'st5',
                isCaseFormDirty: false,
                caseShowErrors: false,          // highlight invalid required fields only after a save attempt
                caseDraftOffer: null,           // a draft from this tab session that can be restored
                caseDraftSavedAt: '',
                showUnsavedExitConfirm: false,
                profileAssessmentFilterTool: 'all',
                isCreatingNewStudentInCase: false,
                caseStudentSearchQuery: '',
                issueCategorySearch: '',
                caseFormValidationError: '',
                isSubmittingCase: false,

                // Official ST-5 Questions & Options (กรมสุขภาพจิต กระทรวงสาธารณสุข)
                st5Questions: [
                    'มีปัญหาการนอน นอนไม่หลับหรือนอนมาก',
                    'มีสมาธิน้อยลง',
                    'หงุดหงิด / กระวนกระวาย / ว้าวุ่นใจ',
                    'รู้สึกเบื่อ เซ็ง',
                    'ไม่อยากพบปะผู้คน'
                ],
                st5Options: [
                    { val: 0, label: 'แทบไม่มี' },
                    { val: 1, label: 'เป็นบางครั้ง' },
                    { val: 2, label: 'บ่อยครั้ง' },
                    { val: 3, label: 'เป็นประจำ' }
                ],

                // Official GAD-7 Questions & Options (Thai Standard Version)
                gad7Questions: [
                    'รู้สึกตึงเครียด วิตกกังวล หรือกระวนกระวาย',
                    'ไม่สามารถหยุดหรือควบคุมความกังวลได้',
                    'กังวลมากเกินไปในเรื่องต่างๆ',
                    'ทำตัวให้ผ่อนคลายได้ยาก',
                    'กระสับกระส่ายจนนั่งนิ่งๆ ได้ยาก',
                    'กลายเป็นคนขี้รำคาญ หรือหงุดหงิดง่าย',
                    'รู้สึกกลัวเหมือนว่าจะมีเรื่องร้ายๆ เกิดขึ้น'
                ],
                gad7Options: [
                    { val: 0, label: 'ไม่มีเลย' },
                    { val: 1, label: 'เป็นบางวัน' },
                    { val: 2, label: 'มากกว่าครึ่งหนึ่งของจำนวนวัน' },
                    { val: 3, label: 'เป็นแทบทุกวัน' }
                ],

                // Official SDQ 25 Items (กรมสุขภาพจิต กระทรวงสาธารณสุข - 5 ด้าน ด้านละ 5 ข้อ พร้อมการกลับคะแนนในข้อ 7, 11, 14, 21, 25)
                sdqOptions: [
                    { val: 0, label: 'ไม่จริง (0)' },
                    { val: 1, label: 'จริงบางครั้ง (1)' },
                    { val: 2, label: 'จริงแน่นอน (2)' }
                ],
                sdqItems: [
                    { text: 'ห่วงใยความรู้สึกของคนอื่น', domain: 'prosocial', domainLabel: 'สัมพันธภาพทางสังคม', reverse: false },
                    { text: 'อยู่ไม่นิ่ง นั่งนิ่งๆ ไม่ค่อยได้', domain: 'hyperactivity', domainLabel: 'อยู่ไม่นิ่ง/สมาธิสั้น', reverse: false },
                    { text: 'มักบ่นว่าปวดศีรษะ ปวดท้อง หรือไม่สบายบ่อยๆ', domain: 'emotional', domainLabel: 'ด้านอารมณ์', reverse: false },
                    { text: 'เต็มใจแบ่งปันสิ่งของให้เพื่อน (ขนม ของเล่น ปากกา เป็นต้น)', domain: 'prosocial', domainLabel: 'สัมพันธภาพทางสังคม', reverse: false },
                    { text: 'มักจะอาละวาด หรือโมโหร้าย', domain: 'conduct', domainLabel: 'ด้านความประพฤติ', reverse: false },
                    { text: 'ค่อนข้างแยกตัว ชอบเล่นคนเดียว', domain: 'peer', domainLabel: 'ความสัมพันธ์กับเพื่อน', reverse: false },
                    { text: 'เชื่อฟัง มักทำตามที่ผู้ใหญ่บอก', domain: 'conduct', domainLabel: 'ด้านความประพฤติ', reverse: true },
                    { text: 'ขี้กังวลในหลายๆ เรื่อง ดูวิตกกังวลเสมอ', domain: 'emotional', domainLabel: 'ด้านอารมณ์', reverse: false },
                    { text: 'เป็นที่พึ่งได้เวลาที่คนอื่นเสียใจ อารมณ์ไม่ดี หรือไม่สบายใจ', domain: 'prosocial', domainLabel: 'สัมพันธภาพทางสังคม', reverse: false },
                    { text: 'อยู่ไม่สุข วุ่นวายอย่างมาก', domain: 'hyperactivity', domainLabel: 'อยู่ไม่นิ่ง/สมาธิสั้น', reverse: false },
                    { text: 'มีเพื่อนสนิทอย่างน้อยหนึ่งคน', domain: 'peer', domainLabel: 'ความสัมพันธ์กับเพื่อน', reverse: true },
                    { text: 'มักมีเรื่องทะเลาะวิวาทกับเด็กอื่น หรือรังแกเด็กอื่น', domain: 'conduct', domainLabel: 'ด้านความประพฤติ', reverse: false },
                    { text: 'ดูไม่มีความสุข ท้อแท้ ร้องไห้บ่อย', domain: 'emotional', domainLabel: 'ด้านอารมณ์', reverse: false },
                    { text: 'เป็นที่ชื่นชอบของเพื่อนๆ ในวัยเดียวกัน', domain: 'peer', domainLabel: 'ความสัมพันธ์กับเพื่อน', reverse: true },
                    { text: 'วอกแวกง่าย สมาธิสั้น', domain: 'hyperactivity', domainLabel: 'อยู่ไม่นิ่ง/สมาธิสั้น', reverse: false },
                    { text: 'รู้สึกเครียด ไม่มั่นใจในสถานการณ์ใหม่ๆ เสียความเชื่อมั่นง่าย', domain: 'emotional', domainLabel: 'ด้านอารมณ์', reverse: false },
                    { text: 'ใจดีกับเด็กที่เล็กกว่า', domain: 'prosocial', domainLabel: 'สัมพันธภาพทางสังคม', reverse: false },
                    { text: 'มักโกหก หรือขี้โกง', domain: 'conduct', domainLabel: 'ด้านความประพฤติ', reverse: false },
                    { text: 'ถูกเด็กคนอื่นแกล้งหรือรังแก', domain: 'peer', domainLabel: 'ความสัมพันธ์กับเพื่อน', reverse: false },
                    { text: 'มักอาสาช่วยเหลือผู้อื่น (พ่อแม่ ครู เด็กคนอื่น)', domain: 'prosocial', domainLabel: 'สัมพันธภาพทางสังคม', reverse: false },
                    { text: 'คิดก่อนทำ', domain: 'hyperactivity', domainLabel: 'อยู่ไม่นิ่ง/สมาธิสั้น', reverse: true },
                    { text: 'ขโมยของที่บ้าน ที่โรงเรียน หรือที่อื่น', domain: 'conduct', domainLabel: 'ด้านความประพฤติ', reverse: false },
                    { text: 'เข้ากับผู้ใหญ่ได้ดีกว่าเด็กวัยเดียวกัน', domain: 'peer', domainLabel: 'ความสัมพันธ์กับเพื่อน', reverse: false },
                    { text: 'ขี้กลัว รู้สึกหวาดกลัวได้ง่าย', domain: 'emotional', domainLabel: 'ด้านอารมณ์', reverse: false },
                    { text: 'ทำงานได้จนเสร็จ มีความตั้งใจในการทำงานดี', domain: 'hyperactivity', domainLabel: 'อยู่ไม่นิ่ง/สมาธิสั้น', reverse: true }
                ],

                specialistForm: {
                    assessedAtISO: '2026-10-26T11:00',
                    purpose: '',
                    clinicalNote: '',
                    st5Answers: [null, null, null, null, null],
                    gad7Answers: [null, null, null, null, null, null, null],
                    sdqInformantVersion: 'student',
                    sdqAnswers: Array(25).fill(null),
                    familyMembers: [],
                    genogramFacts: '',
                    genogramObservations: '',
                    ecomapNodes: []
                },

                newFamilyMemberDraft: {
                    name: '',
                    relation: '',
                    ageInfo: '',
                    cohabiting: 'อยู่ร่วมบ้าน',
                    relationshipQuality: ''
                },

                newEcomapDraft: {
                    systemType: 'ครอบครัว',
                    name: '',
                    strength: '',
                    supportOrBarrier: '',
                    recordType: 'fact'
                },

                /* ===== แบบประเมินสุขภาพจิตและพฤติกรรม (instruments.* API) =====
                   Content and scoring live on the server (InstrumentContent.gs / Instruments.gs); this code never scores anything.
                   Results are read back from the server (tools.list / instruments.get), never only from page state. */
                il: {
                    catalog: null, modes: {}, loading: false, error: '', hist: '', q: '', f: '', gradeHint: '',
                    open: false, mode: 'detail', code: '', clientId: '', def: null, viewDef: null, item: null, id: '', form: '',
                    answers: {}, extras: {}, ctx: { normSex: '', ageYears: '', grade: '', priorDx: '', priorDxText: '', p1Areas: {}, round: '', screener2: '', cert1: '', cert2: '', guardian: '', consent: '', service: '' }, req: null, showIds: false, respondent: { name: '', relation: '', mode: '' },
                    notes: { observation: '', followUp: '' }, assessedDate: '', requestId: '', expectedVersion: null, supersedesId: '',
                    dirty: false, confirmClose: false, busy: false, err: '', errors: {}, hasDob: false, ageNote: '', sexHint: '', preview: null
                },
                async ilEnsureCatalog(force) {
                    if (!this.canAccessSpecialistData() || this.il.loading || (this.il.catalog && !force)) return;
                    this.il.loading = true; this.il.error = '';
                    const r = await this.apiCall('instruments.catalog');
                    this.il.loading = false;
                    if (!r.ok) { this.il.error = r.message; this.awHandleDenied(r); return; }
                    this.il.catalog = r.data.instruments; this.il.modes = r.data.modes || {};
                },
                ilVisible(clientId) {
                    const q = (this.il.q || '').trim().toLowerCase();
                    return (this.il.catalog || []).filter(t => (!q || [t.name, t.fullName, t.purpose, t.target].join(' ').toLowerCase().includes(q)) &&
                        (this.il.f !== 'ready' || t.status === 'ready') && (this.il.f !== 'done' || this.ilFinals(t.code, clientId).length));
                },
                get ilCountReady() { return (this.il.catalog || []).filter(t => t.status === 'ready').length; },
                ilCountDone(clientId) { return (this.il.catalog || []).reduce((n, t) => n + this.ilFinals(t.code, clientId).length, 0); },
                ilMono(t) { return ({ PHQA: 'PHQ', SNAP: 'SNAP', GAST: 'GAST', KUSSI: 'KUS', EQ: 'EQ', NINES: '9S', LDS: 'LD', PSK: 'พม.' })[t && t.code] || ''; },
                ilIsReq(t) { return !!t && t.kind === 'request'; },
                /* ---- แบบ ปสค. (request form, no scoring) ---- */
                pskBlank() {
                    const person = { title: '', firstName: '', lastName: '', idNo: '', idNoneReason: '', age: '', phone: '', mobile: '', email: '' };
                    return { notifier: Object.assign({ relation: '' }, person),
                        applicant: Object.assign({ birthDate: '', houseNo: '', moo: '', village: '', trok: '', soi: '', road: '', subdistrict: '', district: '', province: '', postcode: '', fax: '' }, person),
                        marital: '', housing: {}, rentAmount: '', occupation: '', income: '', incomeSrc: {}, incomeSrcOther: '', memberCount: '', care: {}, careOther: '', members: [],
                        stateAid: { status: '', times: '', amount: '', types: {}, texts: {} }, problem: '',
                        need: { money: false, bank: '', account: '', goods: false, goodsText: '', other: false, otherText: '' },
                        proxy: { name: '', phone: '', houseNo: '', relation: '' }, signName: '', signDate: '' };
                },
                pskFrom(saved) {
                    const b = this.pskBlank(), q = JSON.parse(JSON.stringify(saved || {}));
                    Object.keys(b).forEach(k => {
                        if (q[k] === undefined) return;
                        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) b[k] = Object.assign(b[k], q[k]); else b[k] = q[k];
                    });
                    b.stateAid.types = b.stateAid.types || {}; b.stateAid.texts = b.stateAid.texts || {};
                    b.members = (b.members || []).map(m => Object.assign({ idNo: '', name: '', age: '', relation: '', occupation: '', income: '', health: '', selfHelp: '' }, m));
                    return b;
                },
                /** an edited field loses its old server message (the server checks everything again on save) */
                pskClearErr(e) {
                    const el = e && e.target && e.target.closest ? e.target.closest('[data-err]') : null;
                    if (!el) return;
                    const k = el.getAttribute('data-err'), x = Object.assign({}, this.il.errors);
                    if (!(k in x)) return;
                    delete x[k]; this.il.errors = x;
                    if (!Object.keys(x).length) this.il.err = '';
                },
                pskAddMember() { if (this.il.req.members.length < 10) { this.il.req.members.push({ idNo: '', name: '', age: '', relation: '', occupation: '', income: '', health: '', selfHelp: '' }); this.il.dirty = true; } },
                pskDelMember(i) { this.il.req.members.splice(i, 1); this.il.dirty = true; },
                pskIdState(v) {
                    const d = String(v || '').replace(/[\s-]/g, '');
                    if (!d) return '';
                    if (!/^\d{13}$/.test(d)) return 'ต้องเป็นตัวเลข 13 หลัก (ตอนนี้ ' + d.length + ' หลัก)';
                    let s = 0; for (let i = 0; i < 12; i++) s += Number(d[i]) * (13 - i);
                    return (11 - s % 11) % 10 === Number(d[12]) ? 'ok' : 'เลขตรวจสอบหลักสุดท้ายไม่ถูกต้อง — โปรดตรวจทานเลขบัตร';
                },
                ilMask(v) { const d = String(v || ''); return d.length > 4 ? '•'.repeat(Math.max(0, d.length - 4)) + d.slice(-4) : d; },
                pskShow(v) { return this.il.showIds ? String(v || '') : this.ilMask(v); },
                pskName(o) { return o ? [o.title, o.firstName, o.lastName].filter(Boolean).join(' ').replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง) /, '$1') : ''; },
                pskLabel(list, key) { const x = (list || []).find(a => a[0] === key); return x ? x[1] : ''; },
                pskFlagText(list, flags, otherText) { return (list || []).filter(a => flags && flags[a[0]]).map(a => a[0] === 'other' && otherText ? a[1] + ' ' + otherText : a[1]).join(' • ') || '—'; },
                get pskDef() { const d = this.il.viewDef || this.il.def; return (d && d.request) || null; },
                /* ---- LD screening ---- */
                ilDispNo(no) {
                    const d = this.il.def || this.il.viewDef, fm = d && (d.forms.find(x => x.key === (this.il.form || (this.il.item && this.il.item.instrument && this.il.item.instrument.form))) || d.forms[0]);
                    const q = fm && fm.items ? fm.items.find(x => x.no === no) : null; if (q && q.dno) return q.dno;
                    if (!d || d.numbering !== 'local') return no;
                    const s = (d.sections || []).filter(x => no >= x.from && no <= x.to)[0]; return s ? no - s.from + 1 : no;
                },
                get ldsPart1Found() { return [1, 2, 3].every(n => this.il.answers[n] === 0); },
                get ldsPart1Decided() { return [1, 2, 3].every(n => this.il.answers[n] !== undefined); },
                ilShortTarget(t) { return String(t.target || '').split(' (')[0]; },
                ilRespondents(t) { return [...new Set(t.forms.map(f => f.respondentLabel))].join(' / '); },
                get ilProgressPct() { if (this.il.code === 'BES') return Math.round(this.besReviewed / 3 * 100); const n = this.ilItems.length + this.ilExtras.length; return n ? Math.round((this.ilAnswered + this.ilExtrasAnswered) / n * 100) : 0; },
                ilCompOf(no) { const f = this.ilForm, d = this.il.def; return f && f.itemComponents && d && d.components ? d.components[f.itemComponents[no - 1]] : ''; },
                ilGaugeDash(score, max) { const c = 2 * Math.PI * 50, v = max ? Math.max(0, Math.min(1, score / max)) : 0; return (v * c).toFixed(1) + ' ' + c.toFixed(1); },
                ilItemCountText(c) {
                    if (!c || c.status !== 'ready') return '';
                    if (c.kind === 'request') return 'แบบคำขอ ' + c.forms.length + ' แบบ — ไม่มีคะแนนและไม่มีการแปลผล';
                    if (c.code === 'Q298') return '2Q 2 ข้อ → 9Q 9 ข้อ → 8Q 8 ข้อ (+ข้อ 3.1) — ทำต่อตามผลของแต่ละส่วน';
                    if (c.code === 'BES') return '71 รายการ ใน 3 ด้าน (Bio • Ed • Social) — เลือกทุกรายการที่พบ ไม่มีคะแนน';
                    if (c.code === 'LDS') return 'ส่วนที่ 1: 3 ข้อ • ส่วนที่ 2: 40 ข้อ (4 ด้าน ด้านละ 10 ข้อ) — คำตอบ ใช่ / ไม่ใช่';
                    if (c.forms.length > 1 && c.code === 'KUSSI') return c.forms.reduce((a, f) => a + f.itemCount, 0) + ' ข้อ ใน ' + c.forms.length + ' ด้าน (ทำทีละด้านได้)';
                    const f = c.forms[0];
                    return f.itemCount + ' ข้อ' + (f.extraCount ? ' + คำถามเพิ่มเติม ' + f.extraCount + ' ข้อ (ไม่คิดคะแนน)' : '');
                },
                get ilModes() { return this.il.modes || {}; },
                get ilCat() { return (this.il.catalog || []).find(t => t.code === this.il.code) || null; },
                ilItemsOf(code, clientId) {
                    if (!clientId || this.aw.listFor !== clientId) return [];
                    return this.aw.list.filter(x => x.toolCode === 'I:' + code);
                },
                ilFinals(code, clientId) {
                    return this.ilItemsOf(code, clientId).filter(x => x.status === 'final')
                        .sort((a, b) => String(b.assessedDate + b.finalizedAt).localeCompare(String(a.assessedDate + a.finalizedAt)));
                },
                ilCardStatus(t, clientId) {
                    if (t.status !== 'ready') return { key: 'pending', label: 'รอตรวจสอบคู่มือ', icon: '#i-lock' };
                    const items = this.ilItemsOf(t.code, clientId);
                    if (items[0] && items[0].status === 'draft') return { key: 'draft', label: 'แบบร่าง', icon: '#i-square-pen' };
                    if (items.some(x => x.status === 'final')) return { key: 'final', label: t.kind === 'request' ? 'จัดทำแล้ว' : 'ประเมินแล้ว', icon: '#i-circle-check' };
                    return { key: 'none', label: t.kind === 'request' ? 'ยังไม่เคยจัดทำ' : 'ยังไม่เคยประเมิน', icon: '#i-dot-fill' };
                },
                ilLatestText(code, clientId) {
                    if (!clientId) return '—';
                    if (this.aw.listFor !== clientId) return this.aw.listLoading ? 'กำลังโหลด…' : '—';
                    const f = this.ilFinals(code, clientId)[0];
                    return f ? this.awFmtDate(f.assessedDate) + ' • ' + this.ilResultText(f) : '—';
                },
                ilResultText(h) {
                    const r = h && h.result;
                    if (!r) return '';
                    if (r.kind === 'request') return r.band || 'แบบคำขอ';
                    if (!r.complete) return 'ตอบแล้ว ' + r.answered + '/' + r.total + ' ข้อ';
                    const parts = [];
                    if (typeof r.score === 'number') parts.push(r.score + (r.maxPossible ? '/' + r.maxPossible : '') + ' คะแนน');
                    if (r.band) parts.push(r.band.split(' — ')[0]);
                    return parts.join(' • ');
                },
                ilLevelIcon(level) { return level === 'concern' ? '#i-triangle-alert' : level === 'watch' ? '#i-eye' : level === 'ok' ? '#i-circle-check' : '#i-info'; },
                get ilForm() { const d = this.il.def; return d ? d.forms.find(f => f.key === this.il.form) || null : null; },
                get ilItems() {
                    if (!this.ilForm) return [];
                    if (this.il.code === 'Q298') { const A = this.il.answers, pos = A[1] === 0 || A[2] === 0;
                        return this.ilForm.items.filter(it => it.no <= 2 || (pos && (it.no !== 15 || A[14] === 1))); }
                    if (this.il.code === 'LDS' && !this.ldsPart1Found) return this.ilForm.items.filter(it => it.no <= 3);
                    return this.ilForm.items;
                },
                get ilExtras() { return this.ilForm ? (this.ilForm.extras || []) : []; },
                get ilAnswered() { return this.ilItems.filter(it => this.il.answers[it.no] !== undefined).length; },
                get ilExtrasAnswered() { return this.ilExtras.filter(x => typeof this.il.extras[x.key] === 'boolean').length; },
                /* ---- per-item options (2Q / 8Q), section notes, 2Q 9Q 8Q guidance, BioEdSocial checklist ---- */
                ilNormStyle(sc) { const m = /^(\d+)–(\d+)$/.exec(sc.normal || ''); if (!m || !sc.max) return ''; return 'left:' + (m[1] / sc.max * 100) + '%;width:' + ((m[2] - m[1]) / sc.max * 100) + '%'; },
                ilOpts(it) { return (it && it.options) || (this.ilForm && this.ilForm.options) || []; },
                ilSectionNote(no) { const list = (this.il.def && this.il.def.sections) || []; const s = list.find(x => x.from === no); return s ? (s.note || '') : ''; },
                get q298State() {
                    const A = this.il.answers, f = this.ilForm; if (this.il.code !== 'Q298' || !f) return null;
                    const two = A[1] !== undefined && A[2] !== undefined, pos = A[1] === 0 || A[2] === 0;
                    const nine = [3, 4, 5, 6, 7, 8, 9, 10, 11].every(n => A[n] !== undefined) ? [3, 4, 5, 6, 7, 8, 9, 10, 11].reduce((t, n) => t + f.options[A[n]].points, 0) : null;
                    const started8 = [12, 13, 14, 15, 16, 17, 18, 19, 20].some(n => A[n] !== undefined);
                    return { two, pos, nine, need8: pos && ((nine !== null && nine >= 7) || started8), started8 };
                },
                get besReviewed() { const r = this.il.ctx.reviewed || {}; return ['bio', 'ed', 'social'].filter(k => r[k]).length; },
                besItems(g, kind) { return this.ilForm ? this.ilForm.items.filter(it => it.group === g && it.kind === kind) : []; },
                besCount(g, kind) { return this.besItems(g, kind).filter(it => this.il.answers[it.no] === 1).length; },
                besToggle(it) { if (this.il.answers[it.no] === 1) delete this.il.answers[it.no]; else this.il.answers[it.no] = 1; this.il.answers = Object.assign({}, this.il.answers); this.il.dirty = true; },
                besReview(g, on) { this.il.ctx.reviewed = Object.assign({}, this.il.ctx.reviewed || {}, { [g]: on }); this.il.dirty = true; },
                ilSectionAt(no) { const list = (this.ilForm && this.ilForm.sections) || (this.il.def && this.il.def.sections) || []; const s = list.find(x => x.from === no); return s ? s.label : ''; },
                get ilErrorList() {
                    const e = this.il.errors || {}, out = [];
                    Object.keys(e).forEach(k => { if (!/^item\d+$/.test(k)) out.push(e[k]); });
                    return out;
                },
                ilRespondentText(it) {
                    const r = (it && it.respondent) || {}, f = it && it.instrument && this.ilCat ? this.ilCat.forms.find(x => x.key === it.instrument.form) : null;
                    const who = f ? f.respondentLabel : '';
                    if (it && it.toolCode === 'I:LDS') { const c = it.context || {};
                        return [r.name + (c.cert1 ? ' (ใบวุฒิบัตร ' + c.cert1 + ')' : ''), c.screener2 ? c.screener2 + (c.cert2 ? ' (ใบวุฒิบัตร ' + c.cert2 + ')' : '') : ''].filter(Boolean).join(' • ') + (r.mode && this.ilModes[r.mode] ? ' • ' + this.ilModes[r.mode] : ''); }
                    return [who, r.name, r.relation ? '(' + r.relation + ')' : ''].filter(Boolean).join(' ') + (r.mode && this.ilModes[r.mode] ? ' • ' + this.ilModes[r.mode] : '');
                },
                get ilAnswerRows() {
                    const it = this.il.item, d = this.il.viewDef; if (!it || !d) return [];
                    const f = d.forms.find(x => x.key === it.instrument.form); if (!f) return [];
                    const lds = it.toolCode === 'I:LDS', p1 = lds && it.result && it.result.part1;
                    const ip = (it.result && it.result.itemPoints) || {}, q298 = it.toolCode === 'I:Q298', bes = it.toolCode === 'I:BES';
                    if (bes) return f.items.filter(q => it.answers[q.no] === 1).map(q => ({ k: 'i' + q.no, no: (d.groups.find(g => g.key === q.group) || {}).label.split(' ')[0], text: q.text, answer: q.kind === 'protective' ? 'Protective factor' : 'Challenge/ concern', points: '—' }));
                    const rows = f.items.filter(q => (!lds || q.no <= 3 || (p1 && p1.found)) && (!q298 || ip[q.no] !== undefined)).map(q => { const opts = q.options || f.options, a = it.answers[q.no], o = a !== undefined ? opts[a] : null;
                        const sec = lds ? (d.sections || []).find(x => x.from === q.no) : null;
                        return { k: 'i' + q.no, no: lds ? (sec ? sec.key.replace('P1', 'ส่วน 1').replace(/^(RD|WR|MA|BH)$/, m => ({ RD: 'อ่าน', WR: 'เขียน', MA: 'คำนวณ', BH: 'พฤติกรรม' })[m]) + ' ' : '') + this.ilDispNo(q.no) : q.no, text: q.text, answer: o ? o.label : 'ยังไม่ได้ตอบ', points: ip[q.no] !== undefined ? ip[q.no] : (o ? o.points : '—') }; });
                    (f.extras || []).forEach((x, i) => rows.push({ k: x.key, no: 'เพิ่ม ' + (i + 1), text: x.text, answer: it.extras[x.key] === true ? 'ใช่' : (it.extras[x.key] === false ? 'ไม่ใช่' : 'ยังไม่ได้ตอบ'), points: 'ไม่คิดคะแนน' }));
                    return rows;
                },
                ilReset(code, clientId) {
                    Object.assign(this.il, { code, clientId: clientId || '', def: null, viewDef: null, item: null, id: '', form: '', answers: {}, extras: {}, req: null, showIds: false,
                        ctx: { normSex: '', ageYears: '', grade: '', priorDx: '', priorDxText: '', p1Areas: {}, round: '', screener2: '', cert1: '', cert2: '', guardian: '', consent: '', service: '' }, respondent: { name: '', relation: '', mode: '' }, notes: { observation: '', followUp: '' },
                        assessedDate: '', requestId: '', expectedVersion: null, supersedesId: '', dirty: false, confirmClose: false, busy: false,
                        err: '', errors: {}, hasDob: false, ageNote: '', sexHint: '', gradeHint: '', preview: null });
                },
                async ilOpenDetail(code, clientId) {
                    await this.ilEnsureCatalog();
                    this.ilReset(code, clientId); this.il.mode = 'detail'; this.il.open = true;
                },
                ilPrefill() {
                    const st = this.students.find(s => s.id === this.il.clientId) || {};
                    this.il.hasDob = /^\d{4}-\d{2}-\d{2}$/.test(st.birthDateISO || '');
                    if (this.il.code === 'GAST' || this.il.code === 'KUSSI') {
                        const g = st.gender || '';
                        if (!this.il.ctx.normSex) this.il.ctx.normSex = g === 'ชาย' ? 'male' : g === 'หญิง' ? 'female' : '';
                        this.il.sexHint = 'เพศในแฟ้ม: ' + (g || 'ไม่ระบุ') + (g === 'ชาย' || g === 'หญิง' ? ' (เลือกไว้ให้ ตรวจสอบได้)' : ' — กรุณาเลือก ระบบไม่เลือกแทน');
                    }
                    if (this.il.code === 'KUSSI') {
                        const m = /ป\.?\s*([1-6])(?!\d)/.exec(st.grade || '');
                        if (!this.il.ctx.grade && m) this.il.ctx.grade = Number(m[1]);
                        this.il.gradeHint = 'ชั้นในแฟ้ม: ' + (st.grade || 'ไม่ระบุ') + (m ? ' (เลือกไว้ให้ ตรวจสอบได้)' : ' — กรุณาเลือก');
                    }
                    this.ilAgeNote();
                },
                ilAgeNote() {
                    const c = this.ilCat, st = this.students.find(s => s.id === this.il.clientId) || {};
                    this.il.ageNote = '';
                    if (!c || !c.age || !this.il.hasDob || !this.il.assessedDate) return;
                    const n = this.calculateAgeAtDate(st.birthDateISO, this.il.assessedDate);
                    if (n === null || n === undefined) return;
                    const out = n < c.age.min || (c.age.max !== null && n > c.age.max);
                    this.il.ageNote = 'อายุตามวันเกิดในแฟ้ม: ' + n + ' ปี' + (out ? ' — อยู่นอกกลุ่มเป้าหมายของเครื่องมือ (' + c.target + ') ระบบจะแสดงคะแนนโดยไม่แปลผล' : '');
                },
                async ilStart(code, clientId, from) {
                    if (!clientId || !this.canRecordSpecialist()) return;
                    await this.ilEnsureCatalog();
                    this.ilReset(code, clientId);
                    this.il.open = true; this.il.mode = 'run'; this.il.busy = true;
                    this.awLoadList(clientId);
                    const r = await this.apiCall('instruments.def', { code });
                    this.il.busy = false;
                    if (!r.ok || !r.data.def || r.data.def.status !== 'ready') { this.il.mode = 'detail'; this.il.err = r.ok ? 'เครื่องมือนี้ยังรอตรวจสอบคู่มือ' : r.message; return; }
                    this.il.def = r.data.def;
                    this.il.form = from && this.il.def.forms.some(f => f.key === from.form) ? from.form : this.il.def.forms[0].key;
                    this.il.assessedDate = this.aw.today || this.todayISO();
                    this.il.requestId = this.awNewRequestId();
                    if (code === 'PSK') { this.il.req = this.pskFrom(from && from.request); this.il.respondent.mode = 'paper'; if (!this.il.req.signDate) this.il.req.signDate = this.il.assessedDate; }
                    if (from) {
                        this.il.supersedesId = from.id;
                        const fc = from.context || {};
                        this.il.ctx = Object.assign(this.ilCtxBlank(), { normSex: fc.normSex || '', grade: fc.grade || '', priorDx: fc.priorDx || '', priorDxText: fc.priorDxText || '',
                            screener2: fc.screener2 || '', cert1: fc.cert1 || '', cert2: fc.cert2 || '', round: fc.round ? fc.round + 1 : '' });
                        this.il.respondent = Object.assign({ name: '', relation: '', mode: '' }, from.respondent || {});
                    }
                    this.ilPrefill();
                },
                ilCtxBlank() { return { normSex: '', ageYears: '', grade: '', priorDx: '', priorDxText: '', p1Areas: {}, round: '', screener2: '', cert1: '', cert2: '', guardian: '', consent: '', service: '', reviewed: {} }; },
                ilFormChanged() { if (this.il.code === 'PSK') { this.il.dirty = true; this.il.errors = {}; return; } this.il.answers = {}; this.il.extras = {}; this.il.errors = {}; this.il.preview = null; this.il.dirty = true; if (this.il.code !== 'KUSSI') { this.il.respondent.name = ''; this.il.respondent.relation = ''; } },
                ilPayload(status) {
                    const p = { clientId: this.il.clientId, code: this.il.code, form: this.il.form, status, assessedDate: this.il.assessedDate,
                        answers: this.il.answers, extras: this.il.extras, respondent: this.il.respondent, notes: this.il.notes,
                        context: { normSex: this.il.ctx.normSex, ageYears: this.il.ctx.ageYears === '' ? undefined : Number(this.il.ctx.ageYears),
                            grade: this.il.ctx.grade === '' ? undefined : Number(this.il.ctx.grade), priorDx: this.il.ctx.priorDx, priorDxText: this.il.ctx.priorDxText },
                        requestId: this.il.requestId, supersedesId: this.il.supersedesId || undefined };
                    if (this.il.code === 'LDS') Object.assign(p.context, { p1Areas: this.il.ctx.p1Areas, round: this.il.ctx.round === '' ? undefined : Number(this.il.ctx.round),
                        screener2: this.il.ctx.screener2, cert1: this.il.ctx.cert1, cert2: this.il.ctx.cert2, guardian: this.il.ctx.guardian, consent: this.il.ctx.consent, service: this.il.ctx.service });
                    if (this.il.code === 'PSK') { p.request = this.il.req; p.answers = {}; }
                    if (this.il.code === 'BES') p.context.reviewed = this.il.ctx.reviewed || {};
                    if (this.il.id) { p.id = this.il.id; p.expectedVersion = this.il.expectedVersion; }
                    return p;
                },
                async ilPreview() {
                    if (this.il.busy) return;
                    this.il.busy = true; this.il.err = '';
                    const r = await this.apiCall('instruments.preview', this.ilPayload('draft'));
                    this.il.busy = false;
                    if (!r.ok) { this.il.err = 'ดูตัวอย่างผลไม่สำเร็จ: ' + r.message; return; }
                    this.il.preview = r.data.result;
                    this.$nextTick(() => { const el = document.querySelector('[data-il-preview]'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
                },
                async ilSave(status, closeAfter) {
                    if (this.il.busy || !this.il.def) return;
                    this.il.busy = true; this.il.err = ''; this.il.errors = {}; this.il.confirmClose = false;
                    const r = await this.apiCall('instruments.save', this.ilPayload(status));
                    this.il.busy = false;
                    if (!r.ok) {
                        if (r.code !== 'NETWORK') this.il.requestId = this.awNewRequestId();   // a network retry keeps the id, so a lost reply is not saved twice
                        this.il.errors = r.fields || {}; this.il.err = 'บันทึกไม่สำเร็จ: ' + r.message; this.awHandleDenied(r);
                        this.$nextTick(() => { const el = document.querySelector('.il-panel .is-err, .il-item.has-err, .il-errs:not([style*="none"]), .aw-alert'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
                        return;
                    }
                    const it = r.data.item;
                    this.il.dirty = false; this.il.requestId = this.awNewRequestId(); this.il.preview = null;
                    await this.awLoadList(this.il.clientId, true);
                    if (status === 'final') {
                        this.il.item = it; this.il.viewDef = this.il.def; this.ilShowResult();
                        this.showToast((this.il.code === 'PSK' ? 'บันทึกแบบคำขอ ' : 'บันทึกผลการประเมิน ') + this.ilCat.name + ' เรียบร้อย (รหัส ' + it.id + ')');
                    } else {
                        this.il.id = it.id; this.il.expectedVersion = it.version; this.il.item = it;
                        this.showToast(this.il.code === 'PSK' ? 'บันทึกแบบร่างแล้ว' : 'บันทึกแบบร่างแล้ว (ตอบ ' + it.result.answered + '/' + it.result.total + ' ข้อ)');
                        if (closeAfter) this.ilClose();
                    }
                },
                async ilOpenItem(id, clientId) {
                    await this.ilEnsureCatalog();
                    const r = await this.apiCall('instruments.get', { id });
                    if (!r.ok) { this.showToast('เปิดผลการประเมินไม่สำเร็จ: ' + r.message); this.awHandleDenied(r); return; }
                    const it = r.data.item;
                    this.ilReset(String(it.toolCode).slice(2), clientId || it.clientId);
                    this.il.item = it; this.il.viewDef = r.data.def; this.il.open = true;
                    if (!this.aw.list.length || this.aw.listFor !== this.il.clientId) this.awLoadList(this.il.clientId);
                    this.ilShowResult();
                },
                ilEditDraft() {
                    const it = this.il.item; if (!it || !this.il.viewDef) return;
                    Object.assign(this.il, { def: this.il.viewDef, id: it.id, form: it.instrument.form, answers: Object.assign({}, it.answers), extras: Object.assign({}, it.extras),
                        ctx: Object.assign(this.ilCtxBlank(), it.context || {}, { ageYears: (it.context || {}).ageSource === 'entered' ? String(it.context.ageYears) : '',
                            p1Areas: Object.assign({}, (it.context || {}).p1Areas), round: (it.context || {}).round || '' }),
                        req: it.toolCode === 'I:PSK' ? this.pskFrom(it.request) : null,
                        respondent: Object.assign({ name: '', relation: '', mode: '' }, it.respondent || {}), notes: Object.assign({ observation: '', followUp: '' }, it.notes),
                        assessedDate: it.assessedDate, expectedVersion: it.version, supersedesId: it.supersedesId || '', requestId: this.awNewRequestId(), dirty: false, mode: 'run' });
                    this.ilPrefill();
                },
                ilNewVersion() {
                    const it = this.il.item; if (!it) return;
                    this.ilStart(this.il.code, this.il.clientId, { id: it.id, form: it.instrument.form, context: it.context, respondent: it.respondent, request: it.request });
                },
                get ilTrend() {
                    const it = this.il.item; if (!it || !it.instrument) return [];
                    return this.ilItemsOf(this.il.code, this.il.clientId).filter(x => x.status === 'final' && x.result && x.result.complete && typeof x.result.score === 'number' &&
                        x.instrumentForm === it.instrument.form && x.instrumentVersion === it.instrument.version)
                        .sort((a, b) => String(a.assessedDate + a.finalizedAt).localeCompare(String(b.assessedDate + b.finalizedAt)));
                },
                ilShowResult() { this.il.mode = 'result'; this.$nextTick(() => this.ilDrawTrend()); },
                ilDrawTrend() {
                    try { if (window.__ilChart) { window.__ilChart.destroy(); window.__ilChart = null; } } catch (e) {}
                    const el = document.getElementById('il-trend'), data = this.ilTrend;
                    if (!el || data.length < 2) return;
                    if (!window.Chart) { window.TssLib.load('chart').then(() => this.ilDrawTrend(), () => {}); return; }
                    window.__ilChart = new Chart(el, { type: 'line', data: { labels: data.map(x => this.awFmtDate(x.assessedDate)),
                        datasets: [{ label: 'คะแนนรวม', data: data.map(x => x.result.score), borderColor: '#1e3a5f', backgroundColor: 'rgba(30,58,95,.12)', pointRadius: 4, tension: .2 }] },
                        options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: this.il.item.result.maxPossible || undefined, ticks: { precision: 0 } } } } });
                },
                ilRequestClose() { if (this.il.mode === 'run' && this.il.dirty) this.il.confirmClose = true; else this.ilClose(); },
                ilClose() {
                    try { if (window.__ilChart) { window.__ilChart.destroy(); window.__ilChart = null; } } catch (e) {}
                    this.il.open = false; this.il.dirty = false; this.il.confirmClose = false; this.il.item = null; this.il.def = null; this.il.preview = null;
                },
                async ilBackToProfile() {
                    const cid = this.il.clientId;
                    this.ilClose();
                    const st = this.students.find(s => s.id === cid);
                    if (!st) return;
                    if (this.showNewLogModal) { if (this.isCaseFormDirty) { this.showToast('แบบบันทึกเคสยังเปิดอยู่และมีการแก้ไขที่ยังไม่ได้บันทึก — ผลการประเมินบันทึกแล้วและดูได้ในโปรไฟล์เคส'); return; } this.showNewLogModal = false; }
                    if (!this.showProfileModal || !this.activeStudent || this.activeStudent.id !== cid) await this.openProfile(st);
                    this.profileTab = 'tools'; this.awProfileEnter('tools');
                },
                /* ===== print / PDF of ONE saved assessment (TssReport builds the page; data from instruments.report) ===== */
                ilr: { open: false, loading: false, err: '', msg: '', busy: '', src: null, built: null, id: '' },
                async ilrOpen(id) {
                    if (this.ilr.busy) return;
                    Object.assign(this.ilr, { open: true, loading: true, err: '', msg: '', src: null, built: null, id });
                    const r = await this.apiCall('instruments.report', { id });
                    this.ilr.loading = false;
                    if (!r.ok) { this.ilr.err = 'เปิดรายงานไม่สำเร็จ: ' + r.message; this.awHandleDenied(r); return; }
                    this.ilr.src = r.data;
                    this.ilrBuild();
                },
                /** answer sheet of a tab-5 tool (S.D.M.A. / F.A. / S.S.A. / M.S.C.A.) in the same preview → print / PDF */
                async ilrOpenTool(id) {
                    if (this.ilr.busy) return;
                    Object.assign(this.ilr, { open: true, loading: true, err: '', msg: '', src: null, built: null, id });
                    if (!this.aw.defs) await this.awEnsureDefs();
                    for (let i = 0; i < 30 && !this.aw.defs && this.aw.defsLoading; i++) await new Promise(res => setTimeout(res, 100));
                    const r = await this.apiCall('tools.report', { id });
                    this.ilr.loading = false;
                    if (!r.ok) { this.ilr.err = 'เปิดรายงานไม่สำเร็จ: ' + r.message; this.awHandleDenied(r); return; }
                    const def = ((this.aw.defs && this.aw.defs.tools) || []).find(t => t.code === r.data.item.toolCode);
                    if (!def) { this.ilr.err = 'ไม่พบแบบฟอร์มของเครื่องมือนี้'; return; }
                    r.data.item.instrument = { name: def.abbr || def.code, formLabel: def.nameTh, version: 'T:' + def.code };
                    r.data.toolDef = def; this.ilr.src = r.data;
                    this.ilrBuild();
                },
                ilrBuild() {
                    if (!this.ilr.src) return;
                    const b = this.ilr.src.toolDef ? TssReport.buildTool(this.ilr.src, this.ilr.src.toolDef) : TssReport.build(this.ilr.src, {});
                    if (b.error) { this.ilr.err = b.error; this.ilr.built = null; return; }
                    this.ilr.built = b;
                    if (!document.getElementById('ilr-css')) { const st = document.createElement('style'); st.id = 'ilr-css'; st.textContent = b.css; document.head.appendChild(st); }
                },
                ilrClose() { if (this.ilr.busy) return; this.ilr.open = false; this.ilr.src = null; this.ilr.built = null; },
                ilrLoadLib(url, test) {
                    return new Promise((res, rej) => {
                        if (test()) return res();
                        const s = document.createElement('script'); s.src = url; s.async = true;
                        s.onload = () => test() ? res() : rej(new Error('library not ready'));
                        s.onerror = () => rej(new Error('library failed to load'));
                        document.head.appendChild(s);
                        setTimeout(() => rej(new Error('library timeout')), 20000);
                    });
                },
                /** Sarabun as embedded @font-face rules for the PDF image (the page's own font stylesheet is cross-origin, so
                    html-to-image cannot read it). Thai + Latin subsets only. Falls back to the system Thai font when offline. */
                async ilrFontCSS() {
                    if (this.__ilrFont !== undefined) return this.__ilrFont;
                    try {
                        const css = await (await fetch('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap')).text();
                        const blocks = css.split('@font-face').slice(1).filter(b => /U\+0E01|U\+0000-00FF/.test(b));
                        if (!blocks.length) throw new Error('no font rules');
                        const out = [];
                        for (const b of blocks) {
                            const m = /url\((https:[^)]+)\)/.exec(b); if (!m) continue;
                            const blob = await (await fetch(m[1])).blob();
                            const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
                            out.push('@font-face' + b.replace(m[0], 'url(' + data + ')'));
                        }
                        this.__ilrFont = out.join('\n');
                    } catch (e) { this.__ilrFont = ''; }
                    return this.__ilrFont;
                },
                /** print from an isolated frame holding only the report (app UI never printed); the browser can save it as PDF too */
                async ilrPrint() {
                    if (!this.ilr.built || this.ilr.busy) return;
                    this.ilr.busy = 'print'; this.ilr.err = ''; this.ilr.msg = '';
                    const frame = document.createElement('iframe');
                    frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
                    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
                    document.body.appendChild(frame);
                    try {
                        const w = frame.contentWindow, d = w.document;
                        const st = d.createElement('style');
                        st.textContent = this.ilr.built.css + '\n@page{size:A4 portrait;margin:18mm 21mm 18mm 21mm;@bottom-right{content:"หน้า " counter(page) " / " counter(pages);font-size:9pt;color:#555}}\nhtml,body{margin:0;background:#fff}.ilr-doc{width:auto}';
                        d.head.appendChild(st);
                        const fl = d.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap'; d.head.appendChild(fl);
                        d.body.innerHTML = this.ilr.built.html;
                        d.title = this.ilr.built.fileName.replace(/\.pdf$/, '');
                        try { if (d.fonts && d.fonts.ready) await Promise.race([d.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
                        await new Promise(r => setTimeout(r, 250));
                        const prevTitle = document.title; document.title = d.title;
                        w.focus(); w.print();
                        document.title = prevTitle;
                        this.ilr.msg = 'เปิดหน้าต่างพิมพ์แล้ว — เลือกเครื่องพิมพ์ หรือเลือก “บันทึกเป็น PDF”';
                        this.apiCall('instruments.reportLog', { id: this.ilr.src.item.id, as: 'print' });
                    } catch (e) {
                        this.ilr.err = 'เปิดหน้าพิมพ์ไม่สำเร็จ — กรุณาลองใหม่ หรืออนุญาตหน้าต่างพิมพ์ในเบราว์เซอร์';
                    } finally { setTimeout(() => frame.remove(), 1500); this.ilr.busy = ''; }
                },
                /** real PDF file: the report is drawn by the browser (correct Thai shaping), cut into A4 pages at safe places, assembled by jsPDF */
                async ilrPdf() {
                    if (!this.ilr.built || this.ilr.busy) return;
                    this.ilr.busy = 'pdf'; this.ilr.err = ''; this.ilr.msg = '';
                    const host = document.createElement('div');
                    host.setAttribute('aria-hidden', 'true');
                    host.style.cssText = 'position:fixed;left:-12000px;top:0;width:168mm;background:#fff;pointer-events:none;z-index:-1';
                    host.innerHTML = this.ilr.built.html;
                    document.body.appendChild(host);
                    try {
                        await this.ilrLoadLib('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js', () => !!window.htmlToImage);
                        await this.ilrLoadLib('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!(window.jspdf && window.jspdf.jsPDF));
                        try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
                        const docEl = host.firstElementChild;
                        docEl.style.paddingBottom = '1px';
                        const M = { top: 18, left: 21, width: 168, height: 254 };
                        const box = docEl.getBoundingClientRect();
                        const pxPerMm = box.width / M.width, pageH = M.height * pxPerMm, total = docEl.scrollHeight;
                        const rel = el => { const r = el.getBoundingClientRect(); return { top: r.top - box.top, bottom: r.bottom - box.top }; };
                        const cand = [];
                        docEl.querySelectorAll('tbody tr, h1, h2, p, .box, .alert, .grid2, table, .foot, .fields').forEach(el => {
                            const prev = el.previousElementSibling;
                            if (prev && prev.tagName === 'H2' && el.tagName !== 'TR') return;                 // keep a heading with what follows
                            if (el.tagName === 'TR' && el.parentElement.firstElementChild === el) return;
                            cand.push(rel(el).top);
                        });
                        cand.sort((a, b) => a - b);
                        const forced = [...docEl.querySelectorAll('.pb')].map(el => rel(el).top).filter(v => v > 1);
                        const tables = [...docEl.querySelectorAll('table')].map(t => { const th = t.querySelector('thead'); return { r: rel(t), head: th ? rel(th) : null }; });
                        const pages = [];
                        let y = 0;
                        while (y < total - 1 && pages.length < 40) {
                            const t = tables.find(x => x.head && y > x.head.bottom - 1 && y < x.r.bottom - 1);
                            const headH = t ? t.head.bottom - t.head.top : 0;
                            const limit = y + pageH - headH;
                            const fb = forced.find(v => v > y + 1 && v <= limit);
                            if (fb) { pages.push({ from: y, to: fb, head: t ? t.head : null }); y = fb; continue; }
                            if (total <= limit) { pages.push({ from: y, to: total, head: t ? t.head : null }); break; }
                            let best = 0;
                            for (const c of cand) { if (c > y + 1 && c <= limit) best = c; }
                            if (!best || best - y < pageH * 0.25) best = limit;
                            pages.push({ from: y, to: best, head: t ? t.head : null });
                            y = best;
                        }
                        const fontCSS = await this.ilrFontCSS();
                        const imgOpts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false, width: Math.ceil(box.width), height: Math.ceil(total), style: { margin: '0', background: '#ffffff' } };
                        if (fontCSS) imgOpts.fontEmbedCSS = fontCSS; else imgOpts.skipFonts = true;
                        const canvas = await window.htmlToImage.toCanvas(docEl, imgOpts);
                        const s = canvas.width / box.width;
                        const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
                        const name = this.ilr.built.fileName, ref = this.ilr.src.item.id;
                        pages.forEach((pg, i) => {
                            const headPx = pg.head ? pg.head.bottom - pg.head.top : 0;
                            const hPx = headPx + (pg.to - pg.from);
                            const c = document.createElement('canvas');
                            c.width = canvas.width; c.height = Math.max(1, Math.round(hPx * s));
                            const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
                            if (pg.head) g.drawImage(canvas, 0, Math.round(pg.head.top * s), canvas.width, Math.round(headPx * s), 0, 0, canvas.width, Math.round(headPx * s));
                            g.drawImage(canvas, 0, Math.round(pg.from * s), canvas.width, Math.round((pg.to - pg.from) * s), 0, Math.round(headPx * s), canvas.width, Math.round((pg.to - pg.from) * s));
                            if (i) pdf.addPage('a4', 'portrait');
                            pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', M.left, M.top, M.width, hPx / pxPerMm);
                            pdf.setFontSize(8.5); pdf.setTextColor(110);
                            pdf.text((i + 1) + ' / ' + pages.length, 189, 288, { align: 'right' });
                            pdf.text(ref, 21, 288);
                        });
                        pdf.setProperties({ title: name.replace(/\.pdf$/, ''), creator: 'TSS CareSpace' });
                        pdf.save(name);
                        this.ilr.msg = 'ดาวน์โหลดไฟล์ ' + name + ' แล้ว (' + pages.length + ' หน้า)';
                        this.apiCall('instruments.reportLog', { id: ref, as: 'pdf' });
                    } catch (e) {
                        this.ilr.err = 'สร้างไฟล์ PDF ไม่สำเร็จ — กด “ดาวน์โหลด PDF” อีกครั้ง หรือใช้ “พิมพ์ผลการประเมิน” แล้วเลือก “บันทึกเป็น PDF”';
                    } finally { host.remove(); this.ilr.busy = ''; }
                },
                /* ===== เขียนเอกสาร + ประวัติการออกเอกสาร (docs.* API, page layout by TssDoc) =====
                   The server decides what is saved and who may see it; this code never marks a document saved, printed or numbered by itself. */
                dw: {
                    meta: null, metaLoading: false, metaError: '', type: '', data: null, id: '', version: null, status: '', inHistoryAt: '', clientId: '',
                    dirty: false, saving: false, busy: '', err: '', errors: {}, warnings: [], msg: '', requestId: '', lastSaved: '', item: null,
                    pages: [], rendering: false, fontWarn: false, showPreview: true, scale: 0.6, renderTimer: null, readOnly: false,
                    mine: { items: [], loading: false, error: '', loaded: false }, confirmLeave: false, confirmNew: '', settingsOpen: false,
                    sForm: {}, sBusy: false, sErr: '', sMsg: '', sEmblem: undefined, prevTab: 'dashboard'
                },
                dh: {
                    items: [], total: 0, page: 1, hasMore: false, loading: false, error: '', loaded: false, q: '', type: '', status: '', from: '', to: '', qTimer: null,
                    busyId: '', detail: { open: false, item: null, pages: [], revisions: [], loading: false, error: '' }, cancel: { open: false, id: '', version: 0, reason: '', busy: false, err: '' }
                },
                DOC_SALUTATIONS: ['เรียน', 'กราบเรียน', 'นมัสการ'],
                // คำลงท้ายตามคู่มือ [ก] หัวข้อ 4.1 และตารางคำขึ้นต้น สรรพนาม คำลงท้าย (บุคคลธรรมดา / พระภิกษุ)
                DOC_CLOSINGS: ['ขอแสดงความนับถือ', 'ขอแสดงความนับถืออย่างยิ่ง', 'ขอนมัสการด้วยความนับถือ', 'ขอนมัสการด้วยความเคารพ', 'ขอนมัสการด้วยความเคารพอย่างยิ่ง', 'ขอนมัสการด้วยความเคารพอย่างสูง'],
                DOC_CLOSE_FOR: { 'เรียน': 'ขอแสดงความนับถือ', 'กราบเรียน': 'ขอแสดงความนับถืออย่างยิ่ง', 'นมัสการ': 'ขอนมัสการด้วยความนับถือ' },
                DOC_AGENDA_TITLES: ['เรื่องที่ประธานแจ้งให้ที่ประชุมทราบ', 'เรื่องการรับรองรายงานการประชุมครั้งที่', 'เรื่องที่เสนอให้ที่ประชุมทราบ', 'เรื่องที่เสนอให้ที่ประชุมพิจารณา', 'เรื่องอื่นๆ (ถ้ามี)'],
                DOC_TYPE_HINTS: {
                    external: 'ติดต่อราชการที่เป็นแบบพิธี ใช้กระดาษตราครุฑ — ถึงส่วนราชการอื่น หน่วยงานภายนอก หรือบุคคลภายนอก',
                    memo: 'ติดต่อราชการภายในหน่วยงาน/สังกัดเดียวกัน ใช้กระดาษบันทึกข้อความ (ครุฑ 1.5 ซม.) ไม่มีคำลงท้าย',
                    stamped: 'ใช้ประทับตราแทนการลงชื่อของหัวหน้าส่วนราชการระดับกรมขึ้นไป — ใช้เฉพาะเรื่องไม่สำคัญตามที่ระเบียบกำหนด ไม่มีเรื่องและคำลงท้าย',
                    order: 'หนังสือสั่งการ: ข้อความที่ผู้บังคับบัญชาสั่งการให้ปฏิบัติโดยชอบด้วยกฎหมาย',
                    announce: 'หนังสือประชาสัมพันธ์: ข้อความที่ทางราชการประกาศหรือชี้แจงให้ทราบหรือแนะแนวทางปฏิบัติ',
                    certify: 'หนังสือที่ส่วนราชการออกให้เพื่อรับรองแก่บุคคล นิติบุคคล หรือหน่วยงาน',
                    minutes: 'บันทึกความคิดเห็นของผู้มาประชุมและมติของที่ประชุมไว้เป็นหลักฐาน',
                    agenda: 'ระเบียบวาระสำหรับแจ้งผู้เข้าประชุม (ตามตัวอย่างในคู่มือ)'
                },
                get dwTypes() { const t = (this.dw.meta && this.dw.meta.types) || {}; return Object.keys(t).map(k => Object.assign({ key: k }, t[k])); },
                get dwTypeLabel() { const t = this.dw.meta && this.dw.meta.types[this.dw.type]; return t ? t.label : ''; },
                get dwSettings() { return (this.dw.meta && this.dw.meta.settings) || {}; },
                dwBeYear() { return String(Number((this.aw.today || this.todayISO()).slice(0, 4)) + 543); },
                async dwEnsureMeta(force) {
                    if (!this.can('write_documents') || this.dw.metaLoading || (this.dw.meta && !force)) return;
                    this.dw.metaLoading = true; this.dw.metaError = '';
                    const r = await this.apiCall('docs.meta');
                    this.dw.metaLoading = false;
                    if (!r.ok) { this.dw.metaError = r.message; return; }
                    this.dw.meta = r.data;
                },
                async dwEnter() {
                    await this.dwEnsureMeta();
                    if (!this.dw.mine.loaded) this.dwLoadMine();
                    this.$nextTick(() => this.dwFit());
                    if (this.dw.data) this.dwSchedule(0);
                },
                async dwLoadMine() {
                    this.dw.mine.loading = true; this.dw.mine.error = '';
                    const r = await this.apiCall('docs.list', { scope: 'mine', pageSize: 10 });
                    this.dw.mine.loading = false; this.dw.mine.loaded = true;
                    if (!r.ok) { this.dw.mine.error = r.message; return; }
                    this.dw.mine.items = r.data.items;
                },
                dwBlank(type) {
                    const s = this.dwSettings, today = this.aw.today || this.todayISO();
                    const sign = { signerName: s.signerName || '', signerPosition: s.signerPosition || '' };
                    const owner = { ownerUnit: s.ownerUnit || '', ownerPhone: s.ownerPhone || '', ownerFax: s.ownerFax || '', ownerEmail: s.ownerEmail || '' };
                    const agendas = this.DOC_AGENDA_TITLES.map(t => ({ title: t, detail: '', resolution: '', items: [] }));
                    const base = { type, numerals: 'thai' };
                    const by = {
                        external: Object.assign({ speed: '', secret: '', docNoPrefix: s.docNoPrefix || '', docNo: '', docDate: today, orgName: s.orgName || '', orgAddress: s.orgAddress || '', subject: '', salutation: 'เรียน', recipient: '',
                            refs: [], encls: [], paras: ['', '', ''], closing: 'ขอแสดงความนับถือ' }, sign, owner),
                        memo: Object.assign({ speed: '', secret: '', variant: 'para', unit: s.memoUnit || s.ownerUnit || '', unitPhone: s.ownerPhone || '', docNoPrefix: s.docNoPrefix || '', docNo: '', docDate: today, subject: '', salutation: 'เรียน', recipient: '',
                            paras: ['', '', ''], sections: { old: '', fact: '', law: '', consider: '', suggest: '', propose: '' }, closingPara: '' }, sign),
                        stamped: Object.assign({ speed: '', secret: '', docNoPrefix: s.docNoPrefix || '', docNo: '', to: '', paras: ['', '', ''], issuer: s.orgName || '', docDate: today }, owner),
                        order: Object.assign({ issuerTitle: s.orgName || '', orderNo: '', orderYear: this.dwBeYear(), subject: '', paras: [''], tail: '', docDate: today }, sign),
                        announce: Object.assign({ issuerTitle: s.orgName || '', subject: '', paras: [''], tail: '', docDate: today }, sign),
                        certify: Object.assign({ certNo: '', certYear: this.dwBeYear(), orgName: s.orgName || '', orgAddress: s.orgAddress || '', paras: [''], docDate: today }, sign),
                        minutes: { title: '', meetingNo: '', meetDate: today, timeText: '', place: '', present: [{ name: '', position: '' }], absent: [], attend: [], timeStart: '', opening: '', agendas, timeEnd: '',
                            recorder: { name: '', position: '' }, checker: { name: '', position: '' } },
                        agenda: { title: '', meetingNo: '', meetDate: today, timeText: '', place: '', agendas }
                    };
                    return Object.assign(base, JSON.parse(JSON.stringify(by[type])));
                },
                dwStart(type) {
                    if (this.dw.dirty && this.dw.data) { this.dw.confirmNew = type || '-'; return; }
                    this.dwReset(type);
                },
                dwReset(type) {
                    Object.assign(this.dw, { type, data: type ? this.dwBlank(type) : null, id: '', version: null, status: '', inHistoryAt: '', clientId: '', dirty: false, err: '', errors: {}, warnings: [], msg: '',
                        requestId: this.awNewRequestId(), item: null, pages: [], readOnly: false, confirmNew: '', confirmLeave: false });
                    this.dw.lastSaved = JSON.stringify(this.dw.data);
                    this.dwSchedule(0);
                    this.$nextTick(() => { const el = document.querySelector('[data-dw-form] input, [data-dw-form] textarea'); if (el && window.innerWidth > 900) el.focus({ preventScroll: true }); });
                },
                dwChanged() {
                    if (!this.dw.data) return;
                    this.dw.dirty = JSON.stringify(this.dw.data) !== this.dw.lastSaved || this.dw.clientId !== ((this.dw.item && this.dw.item.clientId) || '');
                    if (this.dw.dirty) this.dw.msg = '';
                    this.dwSchedule(250);
                },
                dwClearErr(e) {
                    const el = e && e.target && e.target.closest ? e.target.closest('[data-err]') : null;
                    if (!el) return;
                    const k = el.getAttribute('data-err'); if (!(k in this.dw.errors)) return;
                    const x = Object.assign({}, this.dw.errors); delete x[k]; this.dw.errors = x;
                },
                dwSchedule(ms) {
                    clearTimeout(this.dw.renderTimer);
                    this.dw.renderTimer = setTimeout(() => this.dwRender(), ms);
                },
                async dwRender() {
                    if (!this.dw.data || !window.TssDoc) { this.dw.pages = []; return; }
                    this.dw.rendering = true;
                    const ok = await TssDoc.ready();
                    this.dw.fontWarn = !ok;
                    try { this.dw.pages = TssDoc.render(JSON.parse(JSON.stringify(this.dw.data)), this.dwSettings, this.$refs.dwMeasure || document.body).pages; }
                    catch (e) { this.dw.pages = []; }
                    this.dw.rendering = false;
                    this.$nextTick(() => this.dwFit());
                },
                dwFit() {
                    document.querySelectorAll('[data-doc-preview]').forEach(box => {
                        const w = box.clientWidth; if (!w) return;
                        const sc = Math.min(1, (w - 4) / (210 * 96 / 25.4));
                        box.style.setProperty('--dw-scale', sc.toFixed(4));
                    });
                },
                dwPayload(status) {
                    const p = { type: this.dw.type, status, data: this.dw.data, requestId: this.dw.requestId, clientId: this.dw.clientId || undefined };
                    if (this.dw.id) { p.id = this.dw.id; p.expectedVersion = this.dw.version; }
                    return p;
                },
                async dwSave(status) {
                    if (this.dw.saving || !this.dw.data || this.dw.readOnly) return;
                    if (this.dw.status === 'saved' && status === 'draft') status = 'saved';
                    this.dw.saving = true; this.dw.busy = status; this.dw.err = ''; this.dw.errors = {}; this.dw.msg = ''; this.dw.warnings = [];
                    const r = await this.apiCall('docs.save', this.dwPayload(status));
                    this.dw.saving = false; this.dw.busy = '';
                    if (!r.ok) {
                        if (r.code !== 'NETWORK') this.dw.requestId = this.awNewRequestId();   // a lost reply keeps the id, so it is not saved twice
                        this.dw.errors = r.fields || {}; this.dw.err = 'บันทึกไม่สำเร็จ: ' + r.message;
                        this.$nextTick(() => { const el = document.querySelector('[data-dw-form] .is-err, [data-dw-err]'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
                        return;
                    }
                    this.dwTake(r.data.item);
                    this.dw.warnings = r.data.warnings || [];
                    this.dw.msg = status === 'saved' ? 'บันทึกเอกสารแล้ว (Document ID ' + r.data.item.id + ', ฉบับที่ ' + r.data.item.version + ')' : 'บันทึกร่างแล้ว';
                    this.showToast(this.dw.msg);
                    this.dw.mine.loaded = false; this.dwLoadMine();
                    if (this.dh.loaded) this.dhLoad(true);
                },
                dwTake(it) {
                    Object.assign(this.dw, { id: it.id, version: it.version, status: it.status, inHistoryAt: it.inHistoryAt || '', item: it, type: it.type, clientId: it.clientId || '',
                        data: Object.assign(this.dwBlank(it.type), JSON.parse(JSON.stringify(it.data || {}))), dirty: false, requestId: this.awNewRequestId(), readOnly: !it.canEdit });
                    this.dw.lastSaved = JSON.stringify(this.dw.data);
                    this.dwSchedule(0);
                },
                async dwOpen(id) {
                    if (this.dw.dirty && this.dw.data && !confirm('เอกสารที่กำลังเขียนยังไม่ได้บันทึก — เปิดเอกสารอื่นแทนหรือไม่?')) return;
                    this.dw.busy = 'open'; this.dw.err = '';
                    const r = await this.apiCall('docs.get', { id });
                    this.dw.busy = '';
                    if (!r.ok) { this.dw.err = 'เปิดเอกสารไม่สำเร็จ: ' + r.message; return; }
                    this.dw.msg = ''; this.dw.warnings = []; this.dw.errors = {};
                    this.dwTake(r.data.item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                },
                /** print the SAVED record (read again from the server), never unsaved screen content */
                async dwPrintSaved(id, version) {
                    const r = await this.apiCall('docs.get', { id });
                    if (!r.ok) { this.showToast('เปิดเอกสารเพื่อพิมพ์ไม่สำเร็จ: ' + r.message); return null; }
                    const it = r.data.item;
                    if (it.status !== 'saved') { this.showToast(it.status === 'cancelled' ? 'เอกสารนี้ถูกยกเลิกแล้ว — พิมพ์ไม่ได้' : 'กรุณาบันทึกเอกสารก่อนพิมพ์'); return null; }
                    if (version && it.version !== version) { this.showToast('มีฉบับใหม่กว่าที่บันทึกไว้ — กรุณาเปิดฉบับล่าสุดก่อนพิมพ์'); return null; }
                    await TssDoc.ready();
                    const pages = TssDoc.render(it.data, this.dwSettings).pages;
                    await TssDoc.print(pages, (it.docNo || it.title || it.id).replace(/[\\/:*?"<>|]+/g, '-'));
                    const lg = await this.apiCall('docs.printLog', { id: it.id, version: it.version });
                    return lg.ok ? lg.data.item : it;
                },
                async dwPrint() {
                    if (this.dw.dirty) { this.dw.err = 'มีการแก้ไขที่ยังไม่ได้บันทึก — กรุณากด “บันทึกเอกสาร” ก่อนพิมพ์ เพื่อให้พิมพ์ฉบับล่าสุด'; return; }
                    if (this.dw.status !== 'saved') { this.dw.err = 'กรุณากด “บันทึกเอกสาร” ก่อนพิมพ์'; return; }
                    this.dw.busy = 'print'; this.dw.err = '';
                    const it = await this.dwPrintSaved(this.dw.id, this.dw.version);
                    this.dw.busy = '';
                    if (it) { this.dw.item = it; this.dw.msg = 'เปิดหน้าต่างพิมพ์แล้ว — เลือกเครื่องพิมพ์ หรือ “บันทึกเป็น PDF”'; }
                },
                async dwAddHistory() {
                    if (this.dw.busy || this.dw.status !== 'saved' || this.dw.dirty) return;
                    this.dw.busy = 'history'; this.dw.err = '';
                    const r = await this.apiCall('docs.addToHistory', { id: this.dw.id });
                    this.dw.busy = '';
                    if (!r.ok) { this.dw.err = 'เพิ่มไว้ในประวัติไม่สำเร็จ (เอกสารยังบันทึกอยู่ ลองใหม่ได้): ' + r.message; return; }
                    this.dw.inHistoryAt = r.data.item.inHistoryAt; this.dw.item = r.data.item;
                    this.dw.msg = r.data.already ? 'เอกสารนี้อยู่ในประวัติการออกเอกสารแล้ว — ไม่ได้เพิ่มซ้ำ' : 'เพิ่มไว้ในประวัติการออกเอกสารแล้ว';
                    this.showToast(this.dw.msg);
                    this.dh.loaded = false;
                },
                dwRequestBack() { if (this.dw.dirty) this.dw.confirmLeave = true; else this.dwBack(); },
                dwBack() { this.dw.confirmLeave = false; this.currentTab = this.dw.prevTab && this.dw.prevTab !== 'docs' ? this.dw.prevTab : (this.authHome || 'dashboard'); },
                dwListAdd(arr, v) { arr.push(v); this.dwChanged(); },
                dwListDel(arr, i) { arr.splice(i, 1); this.dwChanged(); },
                dwListMove(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; const x = arr[i]; arr[i] = arr[j]; arr[j] = x; this.dwChanged(); },
                dwParaLabel(i, n) {
                    if (['external', 'stamped'].includes(this.dw.type) || (this.dw.type === 'memo' && this.dw.data.variant === 'para')) {
                        if (n === 3) return ['ภาคเหตุ (ย่อหน้าที่ 1)', 'ภาคความประสงค์', 'ภาคสรุป'][i];
                    }
                    return 'ย่อหน้าที่ ' + (i + 1);
                },
                dwParaHint(i, n) {
                    if (!['external', 'stamped'].includes(this.dw.type) && !(this.dw.type === 'memo' && this.dw.data.variant === 'para')) return 'ขึ้นบรรทัดใหม่ในช่องเดียวกัน = ขึ้นบรรทัดใหม่ที่เยื้องเท่ากัน (เช่น รายชื่อ)';
                    if (n !== 3) return '';
                    return ['เช่น “ด้วย…” “เนื่องด้วย…” “ตามที่…นั้น” — เหตุที่มีหนังสือไป', 'เช่น “จึง…” “ในการนี้…” “บัดนี้…” — จุดประสงค์ ระบุว่าจะให้ทำอะไร', 'เช่น “จึงเรียนมาเพื่อโปรดทราบ” “จึงเรียนมาเพื่อโปรดพิจารณา”'][i];
                },
                dwSalChange() { const c = this.DOC_CLOSE_FOR[this.dw.data.salutation]; if (c && 'closing' in this.dw.data) this.dw.data.closing = c; this.dwChanged(); },
                dwStatusChip() {
                    if (!this.dw.data) return null;
                    if (this.dw.status === 'cancelled') return { k: 'cancel', t: 'ยกเลิกแล้ว' };
                    if (this.dw.dirty) return { k: 'dirty', t: this.dw.status === 'saved' ? 'มีการแก้ไขที่ยังไม่ได้บันทึก' : 'ยังไม่ได้บันทึก' };
                    if (this.dw.status === 'saved') return { k: 'saved', t: 'บันทึกแล้ว' + (this.dw.inHistoryAt ? ' • อยู่ในประวัติ' : '') };
                    if (this.dw.status === 'draft') return { k: 'draft', t: 'ร่าง (บันทึกไว้แล้ว)' };
                    return { k: 'new', t: 'เอกสารใหม่' };
                },
                dwOpenSettings() {
                    const s = this.dwSettings;
                    this.dw.sForm = { orgName: s.orgName || '', orgAddress: s.orgAddress || '', docNoPrefix: s.docNoPrefix || '', memoUnit: s.memoUnit || '', ownerUnit: s.ownerUnit || '', ownerPhone: s.ownerPhone || '',
                        ownerFax: s.ownerFax || '', ownerEmail: s.ownerEmail || '', signerName: s.signerName || '', signerPosition: s.signerPosition || '', emblemNote: s.emblemNote || '' };
                    this.dw.sEmblem = undefined; this.dw.sErr = ''; this.dw.sMsg = ''; this.dw.settingsOpen = true;
                },
                async dwPickEmblem(ev) {
                    const f = ev.target.files && ev.target.files[0]; if (!f) return;
                    this.dw.sErr = '';
                    if (!/^image\/(png|jpeg)$/.test(f.type)) { this.dw.sErr = 'ไฟล์ตราต้องเป็นภาพ PNG หรือ JPG'; return; }
                    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(f); });
                    // keep it small enough for one record: at most 360 px high (3 cm at about 300 dpi)
                    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
                    const h = Math.min(360, img.naturalHeight), w = Math.round(img.naturalWidth * h / img.naturalHeight);
                    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
                    let out = c.toDataURL('image/png');
                    if (out.length > 115000) out = c.toDataURL('image/jpeg', 0.9);
                    if (out.length > 115000) { this.dw.sErr = 'ภาพยังใหญ่เกินไปหลังย่อขนาด — กรุณาใช้ไฟล์ที่เรียบง่ายกว่านี้'; return; }
                    this.dw.sEmblem = out;
                },
                async dwSaveSettings() {
                    if (this.dw.sBusy) return;
                    this.dw.sBusy = true; this.dw.sErr = ''; this.dw.sMsg = '';
                    const p = Object.assign({}, this.dw.sForm); if (this.dw.sEmblem !== undefined) p.emblem = this.dw.sEmblem;
                    const r = await this.apiCall('docs.settings.save', p);
                    this.dw.sBusy = false;
                    if (!r.ok) { this.dw.sErr = r.message + (r.fields ? ' — ' + Object.values(r.fields).join(' • ') : ''); return; }
                    this.dw.meta.settings = r.data.settings; this.dw.sEmblem = undefined; this.dw.sMsg = 'บันทึกค่าตั้งต้นแล้ว';
                    this.dwSchedule(0);
                },
                /* ---------- ประวัติการออกเอกสาร ---------- */
                async dhEnter() { await this.dwEnsureMeta(); if (!this.dh.loaded) this.dhLoad(true); },
                async dhLoad(reset) {
                    if (this.dh.loading) return;
                    if (reset) { this.dh.page = 1; }
                    this.dh.loading = true; this.dh.error = '';
                    const r = await this.apiCall('docs.list', { scope: 'history', q: this.dh.q, type: this.dh.type, status: this.dh.status, from: this.dh.from, to: this.dh.to, page: this.dh.page, pageSize: 15 });
                    this.dh.loading = false;
                    if (!r.ok) { this.dh.error = r.message; if (reset) this.dh.items = []; return; }
                    this.dh.items = reset ? r.data.items : this.dh.items.concat(r.data.items.filter(x => !this.dh.items.some(y => y.id === x.id)));
                    this.dh.total = r.data.total; this.dh.hasMore = r.data.hasMore; this.dh.loaded = true;
                },
                dhMore() { if (this.dh.hasMore && !this.dh.loading) { this.dh.page++; this.dhLoad(false); } },
                dhFilter(delay) { clearTimeout(this.dh.qTimer); this.dh.qTimer = setTimeout(() => this.dhLoad(true), delay || 0); },
                dhClear() { Object.assign(this.dh, { q: '', type: '', status: '', from: '', to: '' }); this.dhLoad(true); },
                async dhOpen(id) {
                    Object.assign(this.dh.detail, { open: true, item: null, pages: [], loading: true, error: '' });
                    const r = await this.apiCall('docs.get', { id, withRevisions: true });
                    if (!r.ok) { this.dh.detail.loading = false; this.dh.detail.error = r.message; return; }
                    await TssDoc.ready();
                    this.dh.detail.item = r.data.item; this.dh.detail.revisions = r.data.revisions || [];
                    this.dh.detail.pages = TssDoc.render(r.data.item.data, this.dwSettings).pages;
                    this.dh.detail.loading = false;
                    this.$nextTick(() => this.dwFit());
                },
                async dhPrint(it) {
                    this.dh.busyId = it.id;
                    const out = await this.dwPrintSaved(it.id);
                    this.dh.busyId = '';
                    if (out) { const i = this.dh.items.findIndex(x => x.id === it.id); if (i >= 0) this.dh.items.splice(i, 1, Object.assign({}, this.dh.items[i], { printCount: out.printCount, lastPrintAt: out.lastPrintAt })); }
                },
                dhEdit(it) {
                    this.dh.detail.open = false;
                    this.dw.prevTab = 'doc_history';
                    this.currentTab = 'docs';
                    this.dwOpen(it.id);
                },
                dhAskCancel(it) { Object.assign(this.dh.cancel, { open: true, id: it.id, version: it.version, reason: '', busy: false, err: '' }); },
                async dhDoCancel() {
                    if (this.dh.cancel.busy) return;
                    this.dh.cancel.busy = true; this.dh.cancel.err = '';
                    const r = await this.apiCall('docs.cancel', { id: this.dh.cancel.id, expectedVersion: this.dh.cancel.version, reason: this.dh.cancel.reason });
                    this.dh.cancel.busy = false;
                    if (!r.ok) { this.dh.cancel.err = r.message + (r.fields && r.fields.reason ? ' — ' + r.fields.reason : ''); return; }
                    this.dh.cancel.open = false;
                    this.showToast('ยกเลิกเอกสารแล้ว (ข้อความเดิมยังเก็บไว้)');
                    if (this.dh.detail.open && this.dh.detail.item && this.dh.detail.item.id === r.data.item.id) this.dh.detail.item = r.data.item;
                    if (this.dw.id === r.data.item.id) this.dwTake(r.data.item);
                    this.dhLoad(true);
                },
                dhStatusClass(s) { return s === 'saved' ? 'is-saved' : s === 'cancelled' ? 'is-cancel' : 'is-draft'; },
                dhDate(iso) { if (!iso) return '—'; const p = window.TssDoc && TssDoc.dParts(String(iso).slice(0, 10)); return p ? p.d + ' ' + p.m.slice(0, 3) + '. ' + p.y : iso; },
                /* ===== Case Record: การประเมินนักเรียน 360° • ชีวจิตสังคมและความเสี่ยง (ส่วนมีโครงสร้าง) • แผนช่วยเหลือ • ประวัติ (a360.* API)
                   Scores shown here are a live preview; the server recalculates and stores the score, formula and rule version.
                   Nothing is shown as "saved" until the server confirms it. No diagnosis and no severity bands unless approved by the school. */
                a3: {
                    meta: null, metaLoading: false, metaError: '',
                    clientId: '', loading: false, error: '', loaded: false, snapshots: [], plans: [], staff: [], today: '',
                    s360: { form: null, dirty: false, saving: false, error: '', conflict: false, fieldErrors: {}, savedAt: '', reqId: '', open: {} },
                    bps: { form: null, dirty: false, saving: false, error: '', conflict: false, fieldErrors: {}, savedAt: '', reqId: '', cleared: [], baseDate: '' },
                    plan: { edit: {}, dirty: {}, busy: {}, err: {}, fieldErr: {}, act: {}, reqId: {}, addBusy: '', addErr: '', flash: '' },
                    leaveAsk: '', hist: { a: '', b: '' },
                    set: { open: false, loading: false, saving: false, err: '', fieldErr: {}, msg: '', form: null, maxRisk: 0, maxProtective: 0 }
                },
                A3_SRC: { student: 'นักเรียน', teacher: 'ครู', parent: 'ผู้ปกครอง', attendance: 'บันทึกการมาเรียน', other: 'อื่น ๆ' },
                A3_RISK_OPTS: [{ v: 'found', label: 'พบ', hint: 'พบพฤติกรรม/พบความเสี่ยง — นับคะแนน' }, { v: 'not_found', label: 'ไม่พบ', hint: 'ไม่พบพฤติกรรม/ไม่พบความเสี่ยง — 0 คะแนน' },
                               { v: 'insufficient', label: 'ข้อมูลไม่เพียงพอ', hint: 'ยังไม่มีข้อมูลเพียงพอที่จะประเมิน — ไม่นับคะแนน และต้องติดตามเพิ่ม' }, { v: 'na', label: 'ไม่เกี่ยวข้อง/ยังไม่ได้ประเมิน', hint: 'ไม่นับคะแนน และไม่ถือว่าไม่มีความเสี่ยง' }],
                A3_PROT_OPTS: [{ v: 'found', label: 'พบปัจจัยคุ้มครอง', hint: 'นับเป็นคะแนนปัจจัยคุ้มครอง' }, { v: 'no_evidence', label: 'ยังไม่พบหลักฐาน', hint: '0 คะแนน' },
                               { v: 'insufficient', label: 'ข้อมูลไม่เพียงพอ', hint: 'ไม่นับคะแนน และต้องติดตามเพิ่ม' }],
                A3_STATUS_TEXT: { found: 'พบ', not_found: 'ไม่พบ', insufficient: 'ข้อมูลไม่เพียงพอ', na: 'ไม่เกี่ยวข้อง/ยังไม่ได้ประเมิน', no_evidence: 'ยังไม่พบหลักฐาน', '': 'ยังไม่ประเมิน' },
                A3_OUTCOME: { improved: 'ดีขึ้น', same: 'คงเดิม', worse: 'แย่ลง', insufficient: 'ข้อมูลไม่เพียงพอ' },
                A3_DIM_STYLE: { AC: 'a3-dim-ac', BH: 'a3-dim-bh', MO: 'a3-dim-mo' },

                a3Ready() { return this.canAccessSpecialistData() && !this.isCreatingNewStudentInCase && !!this.formStudentId; },
                a3Dirty() { return !!(this.a3.s360.dirty || this.a3.bps.dirty || Object.keys(this.a3.plan.dirty).some(k => this.a3.plan.dirty[k])); },
                a3Fmt(iso) { return iso ? this.formatThaiDateDisplay(String(iso).slice(0, 10)) : '-'; },
                a3Time(iso) { try { return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }); } catch (e) { return iso || ''; } },
                a3Item(code) { return ((this.a3.meta && this.a3.meta.def.items) || []).find(i => i.code === code) || null; },
                a3DimItems(dim, type) { return ((this.a3.meta && this.a3.meta.def.items) || []).filter(i => i.dim === dim && (!type || i.type === type)); },
                a3StaffName(id) { const u = this.a3.staff.find(x => x.id === id); return u ? u.fullName : ''; },
                a3Latest(kind) { return this.a3.snapshots.find(s => s.kind === kind) || null; },     // newest saved first (server order)

                async a3EnsureMeta(force) {
                    if ((this.a3.meta && !force) || this.a3.metaLoading) return;
                    this.a3.metaLoading = true; this.a3.metaError = '';
                    const r = await this.apiCall('a360.meta', {});
                    this.a3.metaLoading = false;
                    if (r.ok) this.a3.meta = r.data;
                    else { this.a3.metaError = r.message || 'โหลดแบบประเมินไม่สำเร็จ'; this.awHandleDenied(r); }
                },
                /** called by each panel's x-effect: loads definitions and this case's records once per case */
                a3Enter() {
                    if (!this.showNewLogModal || !this.a3Ready()) return;
                    this.a3EnsureMeta();
                    if (this.a3.clientId !== String(this.formStudentId) && !this.a3.loading) this.a3Load(false);
                },
                a3ResetCase() {
                    Object.assign(this.a3, { clientId: '', loading: false, error: '', loaded: false, snapshots: [], plans: [], staff: [], leaveAsk: '', hist: { a: '', b: '' } });
                    Object.assign(this.a3.s360, { form: null, dirty: false, saving: false, error: '', conflict: false, fieldErrors: {}, savedAt: '', reqId: '', open: {} });
                    Object.assign(this.a3.bps, { form: null, dirty: false, saving: false, error: '', conflict: false, fieldErrors: {}, savedAt: '', reqId: '', cleared: [], baseDate: '' });
                    this.a3.plan = { edit: {}, dirty: {}, busy: {}, err: {}, fieldErr: {}, act: {}, reqId: {}, addBusy: '', addErr: '', flash: '' };
                },
                async a3Load(keepForms) {
                    const cid = String(this.formStudentId || '');
                    if (!cid) return;
                    if (!keepForms || this.a3.clientId !== cid) this.a3ResetCase();
                    this.a3.clientId = cid; this.a3.loading = true; this.a3.error = '';
                    const r = await this.apiCall('a360.list', { clientId: cid });
                    if (this.a3.clientId !== cid) return;              // the case changed while loading
                    this.a3.loading = false;
                    if (!r.ok) { this.a3.error = r.message || 'โหลดข้อมูลไม่สำเร็จ'; this.awHandleDenied(r); return; }
                    this.a3.loaded = true;
                    this.a3.snapshots = r.data.snapshots || []; this.a3.plans = r.data.plans || []; this.a3.staff = r.data.staff || []; this.a3.today = r.data.today || this.todayISO();
                    if (!this.a3.s360.form || !keepForms) { this.a3.s360.form = this.a3BlankS360(); this.a3.s360.dirty = false; }
                    if (!this.a3.bps.form || !keepForms) { this.a3.bps.form = this.a3BpsFrom(this.a3Latest('bps')); this.a3.bps.dirty = false; this.a3.bps.cleared = []; }
                    this.a3.plans.forEach(p => { if (!this.a3.plan.dirty[p.id]) this.a3.plan.edit[p.id] = this.a3PlanCopy(p); });
                    const s = this.a3.snapshots.filter(x => x.kind === 's360');
                    this.a3.hist = { a: s[1] ? s[1].id : '', b: s[0] ? s[0].id : '' };
                },

                /* ---------- 360° form ---------- */
                a3BlankItem() { return { s: '', fact: '', interp: '', freq: '', ctx: '', src: [], srcOther: '', date: '' }; },
                a3BlankS360() {
                    const items = {};
                    ((this.a3.meta && this.a3.meta.def.items) || []).forEach(i => { items[i.code] = this.a3BlankItem(); });
                    return { assessedDate: this.a3.today || this.todayISO(), note: '', followUp: false, items, copiedFrom: '' };
                },
                a3S360Items() {
                    const f = this.a3.s360.form;
                    if (f && this.a3.meta) this.a3.meta.def.items.forEach(i => { if (!f.items[i.code]) f.items[i.code] = this.a3BlankItem(); });
                    return f ? f.items : {};
                },
                a3CopyPrevious() {
                    const last = this.a3Latest('s360');
                    if (!last) return;
                    const f = this.a3BlankS360();
                    Object.keys(last.items || {}).forEach(k => { if (f.items[k]) f.items[k] = Object.assign(this.a3BlankItem(), JSON.parse(JSON.stringify(last.items[k]))); });
                    f.copiedFrom = last.assessedDate;
                    this.a3.s360.form = f; this.a3.s360.dirty = true; this.a3.s360.fieldErrors = {};
                },
                a3ClearS360() { this.a3.s360.form = this.a3BlankS360(); this.a3.s360.dirty = false; this.a3.s360.fieldErrors = {}; this.a3.s360.error = ''; },
                a3Pick(code, v) {
                    const it = this.a3S360Items()[code];
                    it.s = it.s === v ? '' : v;      // clicking the chosen option again clears it
                    this.a3.s360.dirty = true; this.a3.s360.reqId = '';
                    delete this.a3.s360.fieldErrors['item_' + code];
                },
                a3Touch(sec) { this.a3[sec].dirty = true; this.a3[sec].reqId = ''; },
                a3ToggleSrc(arr, v) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); },
                /** mirror of a360Score_ on the server (same rules) — preview only */
                a3Score(items) {
                    items = items || {};
                    const blank = () => ({ risk: 0, protective: 0, net: 0, total: 0, assessed: 0, insufficient: 0, notAssessed: 0, pendingRisk: 0, pendingProtective: 0, found: [], protectiveFound: [] });
                    const dims = { AC: blank(), BH: blank(), MO: blank() }, all = blank();
                    ((this.a3.meta && this.a3.meta.def.items) || []).forEach(it => {
                        const s = (items[it.code] || {}).s || '', w = Math.abs(it.weight);
                        [dims[it.dim], all].forEach(x => {
                            x.total++;
                            if (it.type === 'risk') {
                                if (s === 'found') { x.risk += w; x.assessed++; x.found.push(it.code); }
                                else if (s === 'not_found') x.assessed++;
                                else { if (s === 'insufficient') x.insufficient++; else x.notAssessed++; x.pendingRisk += w; }
                            } else {
                                if (s === 'found') { x.protective += w; x.assessed++; x.protectiveFound.push(it.code); }
                                else if (s === 'no_evidence') x.assessed++;
                                else { if (s === 'insufficient') x.insufficient++; else x.notAssessed++; x.pendingProtective += w; }
                            }
                        });
                    });
                    [...Object.values(dims), all].forEach(x => { x.net = x.risk - x.protective; x.complete = x.assessed === x.total; });
                    return { dims, all };
                },
                get a3Live() { return this.a3Score(this.a3.s360.form && this.a3.s360.form.items); },
                get a3Settings() { return (this.a3.meta && this.a3.meta.settings) || { showNet: true, showTotal: true, bands: null, safetyProcedure: '' }; },
                a3Band(sc) {
                    const b = this.a3Settings.bands;
                    if (!b || !b.enabled || !this.a3Settings.showTotal) return null;
                    if (!sc.all.complete) return { pending: true };
                    const v = b.basis === 'risk' ? sc.all.risk : sc.all.net;
                    let hit = null; (b.bands || []).slice().sort((p, q) => p.min - q.min).forEach(x => { if (v >= x.min) hit = x; });
                    return { label: hit ? hit.label : '', below: !hit, reference: b.reference || '', basis: b.basis };
                },
                a3ValidateS360() {
                    const f = this.a3.s360.form, e = {};
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.assessedDate || '')) e.assessedDate = 'กรุณาระบุวันที่ประเมิน';
                    else if (f.assessedDate > (this.a3.today || this.todayISO())) e.assessedDate = 'วันที่ประเมินต้องไม่อยู่ในอนาคต';
                    const items = this.a3S360Items();
                    if (!Object.keys(items).some(k => items[k].s)) e._form = 'ยังไม่ได้เลือกผลการประเมินรายการใดเลย';
                    Object.keys(items).forEach(k => { const d = items[k].date; if (d && d > (this.a3.today || this.todayISO())) e['item_' + k] = k + ': วันที่สังเกตต้องไม่อยู่ในอนาคต'; });
                    return e;
                },
                async a3SaveS360() {
                    const st = this.a3.s360;
                    if (st.saving || !st.form) return;
                    st.error = ''; st.conflict = false;
                    st.fieldErrors = this.a3ValidateS360();
                    if (Object.keys(st.fieldErrors).length) { st.error = Object.values(st.fieldErrors)[0]; this.a3FocusErr('s360'); return false; }
                    const items = {};
                    Object.entries(this.a3S360Items()).forEach(([k, v]) => {
                        const o = {}; ['s', 'fact', 'interp', 'freq', 'ctx', 'srcOther', 'date'].forEach(x => { if (v[x]) o[x] = v[x]; });
                        if (v.src && v.src.length) o.src = v.src.slice();
                        if (Object.keys(o).length) items[k] = o;
                    });
                    if (!st.reqId) st.reqId = this.awNewRequestId();
                    const last = this.a3Latest('s360');
                    st.saving = true;
                    const r = await this.apiCall('a360.save', { clientId: this.a3.clientId, kind: 's360', assessedDate: st.form.assessedDate, note: st.form.note, followUp: !!st.form.followUp,
                                                               items, basedOnId: last ? last.id : '', requestId: st.reqId });
                    st.saving = false;
                    if (!r.ok) {
                        if (r.code !== 'NETWORK') st.reqId = '';
                        st.conflict = r.code === 'CONFLICT'; st.fieldErrors = r.fields || {};
                        st.error = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ');
                        this.awHandleDenied(r); this.a3FocusErr('s360'); return false;
                    }
                    if (!this.a3.snapshots.some(x => x.id === r.data.item.id)) this.a3.snapshots.unshift(r.data.item);
                    st.dirty = false; st.reqId = ''; st.savedAt = r.data.item.createdAt; st.form.copiedFrom = '';
                    const s = this.a3.snapshots.filter(x => x.kind === 's360'); this.a3.hist = { a: s[1] ? s[1].id : '', b: s[0].id };
                    this.showToast('บันทึกผลการประเมิน 360° แล้ว (ยืนยันจากเซิร์ฟเวอร์)');
                    return true;
                },
                a3FocusErr(sec) { this.$nextTick(() => { const el = document.querySelector('[data-a3-sec="' + sec + '"] .a3-err, [data-a3-sec="' + sec + '"] [aria-invalid="true"]'); if (el) el.scrollIntoView({ block: 'center', behavior: this.a3Motion() }); }); },
                a3Motion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; },

                /* ---------- structured biopsychosocial & risk ---------- */
                a3BpsFrom(snap) {
                    const d = (snap && snap.bps) || {}, def = this.a3.meta && this.a3.meta.bps, topics = {}, text = {};
                    (def ? def.groups : []).forEach(g => {
                        g.topics.forEach(t => { const x = (d.topics || {})[t.k] || {}; topics[t.k] = { s: x.s || '', note: x.note || '' }; });
                        if (g.text) text[g.text.k] = (d.text || {})[g.text.k] || '';
                    });
                    const rk = d.risk || {};
                    this.a3.bps.baseDate = snap ? snap.assessedDate : '';
                    return { assessedDate: this.a3.today || this.todayISO(), note: '', topics, text,
                             risk: { risks: rk.risks || '', evidence: rk.evidence || '', sources: (rk.sources || []).slice(), urgency: rk.urgency || '', protective: rk.protective || '',
                                     actions: rk.actions || '', followPlan: rk.followPlan || '', followOwner: rk.followOwner || '', followDate: rk.followDate || '',
                                     safetyNotified: !!rk.safetyNotified, notifiedWho: rk.notifiedWho || '' } };
                },
                /** a field that had a value from the last record and is now emptied is sent as "cleared", so the server does not keep the old value */
                a3BpsEdit(path, value) {
                    const st = this.a3.bps; st.dirty = true; st.reqId = '';
                    const i = st.cleared.indexOf(path);
                    if ((value === '' || value == null || (Array.isArray(value) && !value.length)) && st.baseDate) { if (i < 0) st.cleared.push(path); }
                    else if (i >= 0) st.cleared.splice(i, 1);
                    delete st.fieldErrors['bps_' + path.split('.').slice(-2)[0]]; delete st.fieldErrors['bps_' + path.split('.').pop()];
                },
                a3ValidateBps() {
                    const f = this.a3.bps.form, e = {}, def = this.a3.meta.bps, today = this.a3.today || this.todayISO();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.assessedDate || '')) e.assessedDate = 'กรุณาระบุวันที่ประเมิน';
                    else if (f.assessedDate > today) e.assessedDate = 'วันที่ประเมินต้องไม่อยู่ในอนาคต';
                    def.groups.forEach(g => g.topics.forEach(t => { const x = f.topics[t.k]; if (x.s === 'concern' && !x.note.trim()) e['bps_' + t.k] = t.label + ': กรุณาระบุรายละเอียดเมื่อเลือก “มีประเด็นที่ควรดูแล”'; }));
                    const rk = f.risk;
                    if (['urgent', 'soon', 'routine'].includes(rk.urgency)) {
                        if (!rk.followOwner) e.bps_followOwner = 'กรุณาเลือกผู้รับผิดชอบการติดตาม';
                        if (!rk.followDate) e.bps_followDate = 'กรุณาระบุวันที่ติดตาม';
                        else if (f.assessedDate && rk.followDate < f.assessedDate) e.bps_followDate = 'วันที่ติดตามต้องไม่ก่อนวันที่ประเมิน';
                    }
                    if (rk.urgency === 'urgent') {
                        if (!rk.actions.trim()) e.bps_actions = 'กรณีเร่งด่วน กรุณาบันทึกการดำเนินการที่ทำไปแล้ว';
                        if (!rk.safetyNotified) e.bps_safetyNotified = 'กรณีเร่งด่วน กรุณายืนยันว่าได้แจ้งผู้รับผิดชอบตามขั้นตอนความปลอดภัยของสถานศึกษาแล้ว';
                    }
                    return e;
                },
                async a3SaveBps() {
                    const st = this.a3.bps;
                    if (st.saving || !st.form) return;
                    st.error = ''; st.conflict = false;
                    st.fieldErrors = this.a3ValidateBps();
                    if (Object.keys(st.fieldErrors).length) { st.error = Object.values(st.fieldErrors)[0]; this.a3FocusErr('bps'); return false; }
                    if (!st.reqId) st.reqId = this.awNewRequestId();
                    const last = this.a3Latest('bps');
                    st.saving = true;
                    const r = await this.apiCall('a360.save', { clientId: this.a3.clientId, kind: 'bps', assessedDate: st.form.assessedDate, note: st.form.note,
                                                               bps: { topics: st.form.topics, text: st.form.text, risk: st.form.risk }, cleared: st.cleared.slice(), basedOnId: last ? last.id : '', requestId: st.reqId });
                    st.saving = false;
                    if (!r.ok) {
                        if (r.code !== 'NETWORK') st.reqId = '';
                        st.conflict = r.code === 'CONFLICT'; st.fieldErrors = r.fields || {};
                        st.error = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ');
                        this.awHandleDenied(r); this.a3FocusErr('bps'); return false;
                    }
                    if (!this.a3.snapshots.some(x => x.id === r.data.item.id)) this.a3.snapshots.unshift(r.data.item);
                    st.form = this.a3BpsFrom(r.data.item); st.dirty = false; st.reqId = ''; st.cleared = []; st.savedAt = r.data.item.createdAt;
                    const n = r.data.notify;
                    this.showToast('บันทึกการประเมินชีวจิตสังคมและความเสี่ยงแล้ว (ยืนยันจากเซิร์ฟเวอร์)' + (n && n.sent ? ' • ส่งอีเมลแจ้งผู้รับผิดชอบให้เข้าสู่ระบบแล้ว' : ''));
                    return true;
                },
                async a3Reload(sec) {
                    // keep what the user typed; only refresh the records it is based on
                    await this.a3Load(true);
                    if (sec) { this.a3[sec].conflict = false; this.a3[sec].error = this.a3.error || ''; this.a3[sec].reqId = ''; }
                    if (!this.a3.error) this.showToast('โหลดข้อมูลล่าสุดแล้ว — ข้อมูลที่กรอกยังอยู่ ตรวจสอบแล้วกดบันทึกอีกครั้ง');
                },

                /* ---------- recommendations + plan ---------- */
                get a3Recs() {
                    const last = this.a3Latest('s360');
                    if (!last || !this.a3.meta) return [];
                    const order = { risk: 0, protective: 1 };
                    return this.a3.meta.def.items.filter(i => ((last.items || {})[i.code] || {}).s === 'found')
                        .sort((a, b) => order[a.type] - order[b.type])
                        .map(i => ({ item: i, a: last.items[i.code], snap: last, plan: this.a3.plans.find(p => p.itemCode === i.code && p.status !== 'closed') || null }));
                },
                get a3UnsavedFound() { const f = this.a3.s360.form; return !!(this.a3.s360.dirty && f && Object.values(f.items).some(x => x.s === 'found')); },
                async a3AddPlan(rec) {
                    if (this.a3.plan.addBusy) return;
                    this.a3.plan.addBusy = rec.item.code; this.a3.plan.addErr = '';
                    const key = 'add_' + rec.item.code;
                    if (!this.a3.plan.reqId[key]) this.a3.plan.reqId[key] = this.awNewRequestId();
                    const r = await this.apiCall('a360.plan.add', { clientId: this.a3.clientId, itemCode: rec.item.code, sourceAssessmentId: rec.snap.id, requestId: this.a3.plan.reqId[key] });
                    this.a3.plan.addBusy = '';
                    if (!r.ok) { if (r.code !== 'NETWORK') delete this.a3.plan.reqId[key]; this.a3.plan.addErr = r.message || 'เพิ่มเข้าแผนไม่สำเร็จ'; this.awHandleDenied(r); return; }
                    delete this.a3.plan.reqId[key];
                    const p = r.data.item, i = this.a3.plans.findIndex(x => x.id === p.id);
                    if (i >= 0) this.a3.plans.splice(i, 1, p); else this.a3.plans.unshift(p);
                    if (!this.a3.plan.dirty[p.id]) this.a3.plan.edit[p.id] = this.a3PlanCopy(p);
                    this.a3.plan.flash = p.id;
                    this.showToast(r.data.existing ? 'รายการนี้อยู่ในแผนช่วยเหลือแล้ว — ไม่ได้สร้างซ้ำ' : 'เพิ่มเข้าแผนช่วยเหลือแล้ว (สถานะ: เสนอแนะ — ยังต้องตรวจสอบและอนุมัติ)');
                    this.$nextTick(() => { const el = document.querySelector('[data-plan="' + p.id + '"]'); if (el) el.scrollIntoView({ block: 'center', behavior: this.a3Motion() }); });
                },
                a3PlanCopy(p) { return { goal: p.goal || '', steps: p.steps || '', indicator: p.indicator || '', notes: p.notes || '', ownerUserId: p.ownerUserId || '', startDate: p.startDate || '', followUpDate: p.followUpDate || '', ownerConfirmed: !!p.ownerConfirmed }; },
                a3PlanTouch(p) { this.a3.plan.dirty[p.id] = true; delete this.a3.plan.reqId[p.id]; this.a3.plan.err[p.id] = ''; },
                a3PlanReset(p) { this.a3.plan.edit[p.id] = this.a3PlanCopy(p); this.a3.plan.dirty[p.id] = false; this.a3.plan.fieldErr[p.id] = {}; this.a3.plan.err[p.id] = ''; },
                a3PlanAct(p, to) { this.a3.plan.act[p.id] = { to, outcome: '', evidence: '', note: '' }; this.a3.plan.err[p.id] = ''; this.a3.plan.fieldErr[p.id] = {}; },
                a3NextLabel(to) { return { approved: 'อนุมัติแผน', implemented: 'บันทึกว่าดำเนินการแล้ว', monitoring: 'บันทึกผลติดตาม', closed: 'ยุติแผน' }[to] || to; },
                async a3PlanSave(p, to) {
                    if (this.a3.plan.busy[p.id]) return;
                    const e = this.a3.plan.edit[p.id], act = this.a3.plan.act[p.id] || {};
                    const payload = { id: p.id, expectedVersion: p.version, fields: Object.assign({}, e) };
                    if (to) { payload.toStatus = to; payload.outcome = act.outcome || ''; payload.evidence = act.evidence || ''; payload.note = act.note || ''; }
                    const key = p.id + ':' + (to || 'edit');
                    if (!this.a3.plan.reqId[key]) this.a3.plan.reqId[key] = this.awNewRequestId();
                    payload.requestId = this.a3.plan.reqId[key];
                    this.a3.plan.busy[p.id] = true; this.a3.plan.err[p.id] = ''; this.a3.plan.fieldErr[p.id] = {};
                    const r = await this.apiCall('a360.plan.update', payload);
                    this.a3.plan.busy[p.id] = false;
                    if (!r.ok) {
                        if (r.code !== 'NETWORK') delete this.a3.plan.reqId[key];
                        this.a3.plan.fieldErr[p.id] = r.fields || {};
                        this.a3.plan.err[p.id] = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ');
                        this.awHandleDenied(r); return false;
                    }
                    delete this.a3.plan.reqId[key];
                    const np = r.data.item, i = this.a3.plans.findIndex(x => x.id === np.id);
                    if (i >= 0) this.a3.plans.splice(i, 1, np);
                    this.a3.plan.edit[np.id] = this.a3PlanCopy(np); this.a3.plan.dirty[np.id] = false; delete this.a3.plan.act[np.id];
                    this.showToast(to ? 'บันทึกสถานะ “' + np.statusLabel + '” แล้ว' : 'บันทึกแผนแล้ว');
                    return true;
                },
                async a3SavePlansDirty() {
                    for (const p of this.a3.plans) if (this.a3.plan.dirty[p.id]) { const ok = await this.a3PlanSave(p); if (!ok) return false; }
                    return true;
                },
                a3PlanDue(p) { return p.status !== 'closed' && p.followUpDate && p.followUpDate <= (this.a3.today || this.todayISO()); },

                /* ---------- tab status (filling progress is never a statement about the student's safety) ---------- */
                a3TabStatus(key) {
                    if (!this.a3Ready()) return null;
                    const S = (k, label) => ({ k, label });
                    if (key === 's360' || key === 'biopsychosocial') {
                        const sec = key === 's360' ? 's360' : 'bps', kind = key === 's360' ? 's360' : 'bps';
                        if (this.a3[sec].dirty) return S('filled', 'กรอกแล้ว ยังไม่บันทึก');
                        if (!this.a3.loaded) return null;
                        const l = this.a3Latest(kind);
                        if (!l) return S('none', 'ยังไม่เริ่ม');
                        return l.followUp ? S('follow', 'ต้องติดตามเพิ่มเติม') : S('saved', 'บันทึกแล้ว');
                    }
                    if (key === 'care_plan') {
                        if (Object.values(this.a3.plan.dirty).some(Boolean)) return S('filled', 'กรอกแล้ว ยังไม่บันทึก');
                        if (!this.a3.loaded) return null;
                        const open = this.a3.plans.filter(p => p.status !== 'closed');
                        if (!this.a3.plans.length) return S('none', 'ยังไม่เริ่ม');
                        return open.some(p => this.a3PlanDue(p) || p.status === 'proposed') ? S('follow', 'ต้องติดตามเพิ่มเติม') : S('saved', 'บันทึกแล้ว');
                    }
                    return null;
                },
                a3SecForTab(key) { return key === 's360' ? 's360' : key === 'biopsychosocial' ? 'bps' : key === 'care_plan' ? 'plan' : ''; },
                a3SecDirty(sec) { return sec === 'plan' ? Object.values(this.a3.plan.dirty).some(Boolean) : !!(sec && this.a3[sec].dirty); },
                /** tab change inside the Case Record: warn first when the section being left has unsaved changes */
                caseTabGo(key) {
                    if (key === this.intakeActiveTab) return;
                    const sec = this.a3SecForTab(this.intakeActiveTab);
                    if (sec && this.a3SecDirty(sec)) { this.a3.leaveAsk = key; return; }
                    this.intakeActiveTab = key;
                    this.$nextTick(() => { const b = this.$refs.caseScroll; if (b) b.scrollTo({ top: 0, behavior: this.a3Motion() }); });
                },
                async a3LeaveSave() {
                    const sec = this.a3SecForTab(this.intakeActiveTab), to = this.a3.leaveAsk;
                    const ok = sec === 's360' ? await this.a3SaveS360() : sec === 'bps' ? await this.a3SaveBps() : await this.a3SavePlansDirty();
                    if (!ok) { this.a3.leaveAsk = ''; return; }
                    this.a3LeaveGo(to);
                },
                a3LeaveGo(to) {
                    this.a3.leaveAsk = '';
                    if (to === '__close') { this.a3Discard(); this.attemptCloseFullScreenIntake(); return; }
                    this.intakeActiveTab = to;
                },
                a3Discard() {
                    this.a3.s360.dirty = false; this.a3.bps.dirty = false;
                    Object.keys(this.a3.plan.dirty).forEach(k => { this.a3.plan.dirty[k] = false; });
                },

                /* ---------- history ---------- */
                get a3S360Hist() { return this.a3.snapshots.filter(x => x.kind === 's360').slice().sort((a, b) => (a.assessedDate + a.createdAt).localeCompare(b.assessedDate + b.createdAt)); },
                get a3BpsHist() { return this.a3.snapshots.filter(x => x.kind === 'bps'); },
                a3Changes() {
                    const A = this.a3.snapshots.find(x => x.id === this.a3.hist.a), B = this.a3.snapshots.find(x => x.id === this.a3.hist.b);
                    if (!A || !B || !this.a3.meta) return null;
                    const out = [];
                    this.a3.meta.def.items.forEach(i => {
                        const x = ((A.items || {})[i.code] || {}).s || '', y = ((B.items || {})[i.code] || {}).s || '';
                        if (x !== y) out.push({ item: i, from: this.A3_STATUS_TEXT[x], to: this.A3_STATUS_TEXT[y] });
                    });
                    return { A, B, rows: out };
                },
                /** small line chart points for one dimension (risk & protective), drawn on a fixed 0–max scale */
                a3Spark(dim, field) {
                    const h = this.a3S360Hist; if (!h.length || !this.a3.meta) return '';
                    const max = this.a3DimItems(dim, field === 'risk' ? 'risk' : 'protective').reduce((a, i) => a + Math.abs(i.weight), 0) || 1;
                    const W = 220, H = 56, n = h.length;
                    return h.map((s, i) => { const v = ((s.score || {}).dims || {})[dim] ? s.score.dims[dim][field] : 0; return [(n === 1 ? W / 2 : 8 + i * (W - 16) / (n - 1)).toFixed(1), (H - 6 - v / max * (H - 12)).toFixed(1)].join(','); }).join(' ');
                },

                /* ---------- admin settings (approved bands only) ---------- */
                async a3OpenSettings() {
                    const S = this.a3.set; S.open = true; S.loading = true; S.err = ''; S.msg = ''; S.fieldErr = {};
                    const r = await this.apiCall('a360.settings.get', {});
                    S.loading = false;
                    if (!r.ok) { S.err = r.message || 'โหลดการตั้งค่าไม่สำเร็จ'; return; }
                    const s = r.data.settings, b = s.bands || {};
                    S.maxRisk = r.data.maxRisk; S.maxProtective = r.data.maxProtective;
                    S.form = { showNet: s.showNet, showTotal: s.showTotal, urgentEmail: !!s.urgentEmail, safetyProcedure: s.safetyProcedure || '',
                               bandsOn: !!b.enabled, basis: b.basis || 'net', bands: (b.bands || []).map(x => ({ min: x.min, label: x.label })), reference: b.reference || '', approvedBy: b.approvedBy || '', approvedDate: b.approvedDate || '' };
                },
                async a3SaveSettings() {
                    const S = this.a3.set, f = S.form; if (!f || S.saving) return;
                    S.saving = true; S.err = ''; S.msg = ''; S.fieldErr = {};
                    const r = await this.apiCall('a360.settings.save', { showNet: f.showNet, showTotal: f.showTotal, urgentEmail: f.urgentEmail, safetyProcedure: f.safetyProcedure,
                        bands: f.bandsOn ? { enabled: true, basis: f.basis, bands: f.bands.map(x => ({ min: Number(x.min), label: x.label })), reference: f.reference, approvedBy: f.approvedBy, approvedDate: f.approvedDate } : { enabled: false } });
                    S.saving = false;
                    if (!r.ok) { S.fieldErr = r.fields || {}; S.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    S.msg = 'บันทึกการตั้งค่าแล้ว'; if (this.a3.meta) this.a3EnsureMeta(true);
                },

                /* ===== Case Profile: ไทม์ไลน์การให้บริการ (timeline.* API — read-only; the server decides what each role sees) ===== */
                tl: {
                    clientId: '', loading: false, error: '', data: null, prevTab: 'timeline',
                    f: { from: '', to: '', types: [], status: '', actor: '', q: '' }, sort: 'desc', shown: 20, moreOpen: false,
                    detail: { open: false, loading: false, error: '', ev: null, data: null }, exporting: false, scrollTop: 0
                },
                TL_GROUPS: [
                    { k: 'counseling', label: 'ให้บริการ/ให้คำปรึกษา', icon: 'i-message-square' },
                    { k: 'appointment', label: 'นัดหมาย', icon: 'i-calendar-days' },
                    { k: 'assessment', label: 'การประเมิน', icon: 'i-clipboard-check' },
                    { k: 'followup', label: 'แผนและการติดตามผล', icon: 'i-target' },
                    { k: 'document', label: 'เอกสาร', icon: 'i-file-text' },
                    { k: 'behavior', label: 'พฤติกรรม', icon: 'i-list-checks' },
                    { k: 'alert', label: 'Red Alert', icon: 'i-siren' },
                    { k: 'case', label: 'เปิดเคส', icon: 'i-plus' }
                ],
                TL_TYPE_ICON: { case_open: 'i-plus', counseling: 'i-message-square', appointment: 'i-calendar-days', screening: 'i-brain', sw_tool: 'i-clipboard-list',
                                s360: 'i-radar', bps: 'i-list-checks', plan: 'i-target', followup: 'i-trending-up', document: 'i-file-text',
                                behavior: 'i-list-checks', red_alert: 'i-siren', alert_open: 'i-eye', bplan: 'i-target', bfollow: 'i-trending-up', bplan_close: 'i-circle-check' },
                TL_DATE_KIND: { service: 'วันที่รับบริการ', appointment: 'วันนัดหมาย', assessed: 'วันที่ประเมิน', recorded: 'วันที่บันทึก', document: 'ลงวันที่', occurred: 'วันที่เกิดเหตุ', followup: 'วันที่ติดตาม' },
                openServiceTimeline() {
                    if (this.profileTab !== 'svc_timeline') this.tl.prevTab = this.profileTab;
                    this.profileTab = 'svc_timeline';
                    this.tlEnter();
                },
                tlEnter() {
                    const id = this.activeStudent && this.activeStudent.id;
                    if (!id) return;
                    if (this.tl.clientId !== id) {          // another student: start clean (filters belong to one case)
                        Object.assign(this.tl, { clientId: id, data: null, error: '', shown: 20, moreOpen: false, f: { from: '', to: '', types: [], status: '', actor: '', q: '' }, sort: 'desc' });
                        this.tl.detail = { open: false, loading: false, error: '', ev: null, data: null };
                    }
                    if (!this.tl.data && !this.tl.loading) this.tlLoad();
                },
                async tlLoad() {
                    const id = this.tl.clientId; if (!id) return;
                    this.tl.loading = true; this.tl.error = '';
                    const r = await this.apiCall('timeline.get', { clientId: id });
                    if (this.tl.clientId !== id) return;
                    this.tl.loading = false;
                    if (!r.ok) { this.tl.error = r.message || 'โหลดไทม์ไลน์ไม่สำเร็จ'; return; }
                    this.tl.data = r.data;
                },
                tlReset() { this.tl.f = { from: '', to: '', types: [], status: '', actor: '', q: '' }; this.tl.shown = 20; },
                tlToggleType(k) { const a = this.tl.f.types, i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); this.tl.shown = 20; },
                get tlFilterOn() { const f = this.tl.f; return !!(f.from || f.to || f.types.length || f.status || f.actor || f.q.trim()); },
                get tlAll() { return (this.tl.data && this.tl.data.events) || []; },
                get tlFiltered() {
                    const f = this.tl.f, q = f.q.trim().toLowerCase();
                    const out = this.tlAll.filter(e => (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to) && (!f.types.length || f.types.includes(e.group))
                        && (!f.status || e.statusLabel === f.status) && (!f.actor || e.actor === f.actor)
                        && (!q || (e.title + ' ' + (e.summary || '') + ' ' + e.typeLabel + ' ' + (e.tags || []).join(' ')).toLowerCase().includes(q)));
                    const k = e => (e.date || '') + ' ' + (e.time || '') + ' ' + (e.recordedAt || '');
                    out.sort((a, b) => this.tl.sort === 'desc' ? k(b).localeCompare(k(a)) : k(a).localeCompare(k(b)));
                    return out;
                },
                get tlShownList() { return this.tlFiltered.slice(0, this.tl.shown); },
                get tlStatuses() { return [...new Set(this.tlAll.map(e => e.statusLabel).filter(Boolean))].sort(); },
                get tlActors() { return [...new Set(this.tlAll.map(e => e.actor).filter(Boolean))].sort(); },
                /** summary numbers follow the same filter as the list; each source record is counted once (unique sourceType:sourceId) */
                get tlStats() {
                    const L = this.tlFiltered, today = (this.tl.data && this.tl.data.today) || this.todayISO();
                    const uniq = arr => new Set(arr.map(e => e.key)).size;
                    return {
                        counseling: uniq(L.filter(e => e.type === 'counseling')),
                        assessments: uniq(L.filter(e => e.group === 'assessment' && e.status !== 'draft')),
                        appointments: uniq(L.filter(e => e.type === 'appointment')),
                        upcoming: uniq(L.filter(e => e.type === 'appointment' && e.status === 'scheduled' && e.date >= today)),
                        openFollow: uniq(L.filter(e => e.type === 'plan' && e.open)),
                        behavior: uniq(L.filter(e => e.type === 'behavior' && e.behaviorRecord))
                    };
                },
                tlAge(iso) {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
                    const t = ((this.tl.data && this.tl.data.today) || this.todayISO()).split('-').map(Number), b = iso.split('-').map(Number);
                    let a = t[0] - b[0]; if (t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) a--;
                    return a >= 0 && a < 30 ? a : '';
                },
                tlStatusTone(e) {
                    const s = e.status || '';
                    if (['completed', 'final', 'recorded', 'saved', 'outcome_improved', 'approved', 'implemented'].includes(s)) return 'ok';
                    if (['follow', 'scheduled', 'proposed', 'monitoring', 'postponed', 'outcome_same', 'outcome_insufficient', 'draft'].includes(s)) return 'wait';
                    if (['cancelled', 'no_show', 'closed', 'outcome_worse', 'bplan_terminated'].includes(s)) return 'stop';
                    if (['alert_open', 'alert_reviewing', 'alert_in_progress'].includes(s) || /^bplan_(draft|pending|approved|in_progress|awaiting_followup)$/.test(s)) return 'wait';
                    if (['alert_resolved', 'bplan_completed'].includes(s)) return 'ok';
                    return 'none';
                },
                async tlOpen(ev) {
                    const body = document.querySelector('.pf-body'); this.tl.scrollTop = body ? body.scrollTop : 0;
                    this.tl.detail = { open: true, loading: true, error: '', ev, data: null };
                    const r = await this.apiCall('timeline.item', { clientId: this.tl.clientId, sourceType: ev.sourceType, sourceId: ev.sourceId });
                    if (!this.tl.detail.open || this.tl.detail.ev !== ev) return;
                    this.tl.detail.loading = false;
                    if (!r.ok) { this.tl.detail.error = r.status === 403 ? 'ไม่มีสิทธิ์เปิดรายละเอียดของรายการนี้ หรือรายการนี้ไม่อยู่ในเคสนี้แล้ว' : (r.message || 'โหลดรายละเอียดไม่สำเร็จ'); return; }
                    this.tl.detail.data = r.data;
                    this.$nextTick(() => { const b = document.querySelector('[data-tl-detail] [data-tl-back]'); if (b) b.focus(); });
                },
                tlCloseDetail() {
                    this.tl.detail.open = false;
                    this.$nextTick(() => { const body = document.querySelector('.pf-body'); if (body) body.scrollTop = this.tl.scrollTop; const k = this.tl.detail.ev && document.querySelector('[data-tl-ev="' + this.tl.detail.ev.key + '"] .tl-open'); if (k) k.focus({ preventScroll: true }); });
                },
                tlGoSource(o) {
                    if (!o) return;
                    this.tl.detail.open = false;
                    if (o.tab) { this.profileTab = o.tab; if (o.tab === 'tools') this.awProfileEnter('tools'); if (o.tab === 'behavior') this.bpEnter(); return; }
                    if (o.caseTab) { this.openNewLogModalFromProfile(); this.$nextTick(() => this.caseTabGo(o.caseTab)); return; }
                    if (o.docId) { this.showProfileModal = false; this.currentTab = 'doc_history'; this.$nextTick(() => this.dhOpen(o.docId)); }
                    if (o.alertId) this.raOpen(o.alertId);
                },
                tlSourceLabel(o) {
                    if (!o) return '';
                    if (o.tab) return { general: 'เปิดข้อมูลทั่วไป', timeline: 'เปิดในประวัติการให้บริการ', behavior: 'เปิดในข้อมูลพฤติกรรม', appointments_history: 'เปิดในประวัติการนัดหมาย', assessments: 'เปิดในประวัติการประเมินสุขภาพจิต', tools: 'เปิดในเครื่องมือการประเมินเพิ่มเติม' }[o.tab] || 'เปิดส่วนต้นทาง';
                    if (o.caseTab) return 'เปิดในบันทึกข้อมูลผู้รับบริการ';
                    if (o.docId) return 'เปิดในประวัติการออกเอกสาร';
                    if (o.alertId) return 'เปิด Red Alert';
                    return '';
                },
                tlMoreTabs() {
                    const sp = this.canAccessSpecialistData();
                    return [{ k: 'general', l: 'ข้อมูลทั่วไป' }, { k: 'timeline', l: 'ประวัติการให้บริการ (บันทึกเคส)' }, { k: 'behavior', l: 'ข้อมูลพฤติกรรม' }, { k: 'appointments_history', l: 'ประวัติการนัดหมาย' }]
                        .concat(sp ? [{ k: 'assessments', l: 'ประวัติการประเมินสุขภาพจิต' }, { k: 'tools', l: 'เครื่องมือการประเมินเพิ่มเติม' }, { k: 'careplan', l: 'แผนการช่วยเหลือและการติดตาม' }] : []);
                },
                tlGoTab(k) { this.tl.moreOpen = false; this.profileTab = k; if (['tools', 'family', 'ecosystem'].includes(k)) this.awProfileEnter(k); if (k === 'behavior') this.bpEnter(); },
                async tlExport() {
                    if (this.tl.exporting || !(this.tl.data && this.tl.data.access.canExport)) return;
                    const rows = this.tlFiltered;
                    this.tl.exporting = true;
                    const r = await this.apiCall('timeline.exportLog', { clientId: this.tl.clientId, rows: rows.length });   // permission + audit first
                    this.tl.exporting = false;
                    if (!r.ok) { this.showToast(r.message || 'ส่งออกไม่สำเร็จ'); return; }
                    const esc = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"' : s; };
                    const head = ['วันที่', 'เวลา', 'ความหมายของวันที่', 'ประเภท', 'รายการ', 'สรุป', 'สถานะ', 'ผู้บันทึก/ผู้รับผิดชอบ', 'แหล่งข้อมูล', 'รหัสระเบียน'];
                    const lines = [head].concat(rows.map(e => [e.date, e.time, this.TL_DATE_KIND[e.dateKind] || '', e.typeLabel, e.title, e.summary, e.statusLabel, e.actor, e.sourceType, e.sourceId]));
                    const blob = new Blob(['﻿' + lines.map(l => l.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'timeline_' + this.tl.clientId + '_' + this.todayISO() + '.csv';
                    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
                    this.showToast('ส่งออก ' + rows.length + ' รายการตามตัวกรองแล้ว (ระดับสรุป ไม่มีเนื้อหาบันทึก)');
                },

                /* ===== บันทึกพฤติกรรมนักเรียน • ข้อมูลพฤติกรรม • Red Alert • แผน/ติดตาม (behavior.* API) =====
                   Counts, alerts and notification status come from the server; the page never decides them. */
                rtc: { open: false, source: 'global' },
                bm: { meta: null, loading: false, error: '' },
                bf: { abc: { place: '', period: '', subject: '', antecedent: '', consequence: '' }, open: false, mode: 'new', id: '', version: 0, clientId: '', locked: false, st: { first: '', last: '', nick: '', level: '', room: '' }, suggest: false, fq: '', dom: '', cat: 'bh', codes: [],
                      detail: '', sources: [], sourceOther: '', handling: '', saving: false, error: '', fe: {}, reqId: '', result: null, dirty: false, leaveAsk: '' },
                bp: { clientId: '', loading: false, error: '', data: null, code: '', sort: 'occurred', rec: null, cancel: { id: '', reason: '', busy: false, err: '' } },
                ra: { open: false, id: '', loading: false, error: '', data: null, review: { note: '', to: '', busy: false, err: '' }, notifyBusy: false,
                      plan: { editId: '', form: null, busy: false, err: '', fe: {}, to: '', reason: '', reqId: '' }, fu: { planId: '', form: null, busy: false, err: '', fe: {}, reqId: '' } },
                rl: { items: [], open: 0, loading: false, error: '', loaded: false, status: 'active', code: '', popup: [], timer: null },
                BH_LEVEL: { green: '1–4 ครั้ง', yellow: '5–7 ครั้ง', orange: '8–10 ครั้ง', red: 'ถึงเกณฑ์ Red Alert' },
                BH_DOM_STYLE: { BH: 'bh-bh', LA: 'bh-la', EF: 'bh-ef', MO: 'bh-mo', SI: 'bh-si', FM: 'bh-fm', PD: 'bh-pd' },

                /* ---- chooser: บันทึกเคสใหม่ → ให้คำปรึกษา (เดิม) | พฤติกรรม ---- */
                openRecordChooser(source) { this.rtc = { open: true, source: source || 'global' }; },
                rtcPick(kind) {
                    if (kind === 'counseling' && !this.can('create_case')) return;
                    if (kind === 'issp' && !this.can('view_case')) return;
                    const src = this.rtc.source; this.rtc.open = false;
                    if (kind === 'bullying') { this.blReportOpen(); return; }
                    if (kind === 'issp') { this.isOpenFolder(src === 'profile' && this.activeStudent ? this.activeStudent.id : ''); return; }
                    if (kind === 'counseling') { if (src === 'profile') this.openNewLogModalFromProfile(); else this.openClientTypeModal(); return; }
                    this.openBehaviorForm(src === 'profile' && this.activeStudent ? this.activeStudent.id : '');
                },
                async bmEnsure(force) {
                    if ((this.bm.meta && !force) || this.bm.loading) return;
                    this.bm.loading = true; this.bm.error = '';
                    const r = await this.apiCall('behavior.meta', {});
                    this.bm.loading = false;
                    if (r.ok) this.bm.meta = r.data; else this.bm.error = r.message || 'โหลดแบบบันทึกไม่สำเร็จ';
                },
                bhItem(code) { const m = this.bm.meta || {}; return (m.allItems || (m.def && m.def.items) || []).find(i => i.code === code) || { code, text: '' }; },
                bhLabel(rec, c) { const now = this.bhItem(c).text, then = rec && rec.labels && rec.labels[c]; return c + ' ' + (now || then || '') + (then && now && then !== now ? ' (ชื่อขณะบันทึก: ' + then + ')' : ''); },
                bhDomain(code) { return ((this.bm.meta && this.bm.meta.def.domains) || []).find(d => d.code === code) || { code, nameTh: '' }; },
                bhGrade(g) { const m = /(?:ม\.?|มัธยมศึกษาปีที่)\s*([1-6])\s*\/\s*([1-9]\d?|[A-Za-z])(?![0-9A-Za-z])/.exec(String(g || '')); return m ? { level: Number(m[1]), room: m[2].toUpperCase() } : null; },
                /** rooms of a level at this school: ม.1–3 → 1–5, ม.4–6 → A–F (no level chosen: all) */
                schoolRooms(level) { const n = Number(level) || 0, a = ['1', '2', '3', '4', '5'], b = ['A', 'B', 'C', 'D', 'E', 'F']; return n >= 1 && n <= 3 ? a : (n >= 4 && n <= 6 ? b : a.concat(b)); },
                roomOk(level, room) { return !!room && this.schoolRooms(level).includes(String(room).toUpperCase()); },
                bhNameParts(n) { const s = String(n || '').trim().replace(/\s+/g, ' '); const i = s.indexOf(' '); return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, '']; },

                /* ---- behaviour form ---- */
                openBehaviorForm(clientId, rec) {
                    this.spReset('bf');
                    this.bf = Object.assign(this.bf, { open: true, mode: rec ? 'edit' : 'new', id: rec ? rec.id : '', version: rec ? rec.version : 0, clientId: '', studentId: '', rosterPick: null, locked: !!clientId,
                        st: { first: '', last: '', nick: '', level: '', room: '' }, suggest: false, fq: '', dom: '', codes: rec ? rec.codes.slice() : [],
                        detail: rec ? (rec.detail || '') : '', sources: rec ? (rec.sources || []).slice() : [], sourceOther: rec ? (rec.sourceOther || '') : '',
                        handling: rec ? (rec.handling || '') : '', abc: Object.assign({ place: '', period: '', subject: '', antecedent: '', consequence: '' }, (rec && rec.abc) || {}), saving: false, error: '', fe: {}, reqId: '', result: null, dirty: false, leaveAsk: '' });
                    // big category tab: an edited record opens where its codes are (BH first, as the form lists it)
                    this.bf.cat = rec && rec.codes.length && !rec.codes.some(c => /^BH/.test(c)) ? 'gen' : 'bh';
                    const s = clientId && this.students.find(x => String(x.id) === String(clientId));
                    if (s) this.bfLink(s); else if (clientId) this.bf.clientId = String(clientId);
                    this.bf.dirty = false;
                    this.bmEnsure(); this.pmEnsure();
                },
                get bfStudent() { return this.bf.clientId ? (this.students.find(s => String(s.id) === String(this.bf.clientId)) || null) : null; },
                /** suggestions from files the user may see (only roles with case access have a student list) */
                get bfMatches() {
                    if (this.bf.clientId || !this.can('view_case')) return [];
                    const q = (this.bf.st.first + ' ' + this.bf.st.last).trim().toLowerCase(); if (q.length < 1) return [];
                    return this.students.filter(s => (s.name + ' ' + (s.nickname || '')).toLowerCase().includes(q)).slice(0, 6);
                },
                bfLink(s) {
                    const n = this.bhNameParts(s.name), g = this.bhGrade(s.grade);
                    this.bf.clientId = String(s.id);
                    this.bf.st = { first: n[0], last: n[1], nick: s.nickname && s.nickname !== '-' ? s.nickname : '', level: g ? g.level : '', room: g ? g.room : '' };
                    this.bf.suggest = false; ['firstName', 'lastName', 'level', 'room'].forEach(k => delete this.bf.fe[k]);
                },
                bfPickStudent(s) { this.bfLink(s); this.bf.dirty = true; },
                bfUnlink() { this.bf.clientId = ''; this.bf.studentId = ''; this.bf.rosterPick = null; this.spReset('bf'); this.bf.locked = false; this.bf.st = { first: '', last: '', nick: '', level: '', room: '' }; this.bf.dirty = true; },
                bfSt(k) { this.bf.dirty = true; this.bf.reqId = ''; this.bf.suggest = true; delete this.bf.fe[{ first: 'firstName', last: 'lastName', level: 'level', room: 'room' }[k]]; },
                bfToggle(code) { const a = this.bf.codes, i = a.indexOf(code); if (i >= 0) a.splice(i, 1); else a.push(code); this.bf.dirty = true; this.bf.reqId = ''; delete this.bf.fe.codes; },
                bfItems(dom) {
                    const q = this.bf.fq.trim().toLowerCase(), items = ((this.bm.meta && this.bm.meta.def.items) || []).filter(i => i.domain === dom);
                    return q ? items.filter(i => (i.code + ' ' + i.text + ' ' + (i.description || '') + ' ' + (i.group || '')).toLowerCase().includes(q)) : items;
                },
                get bfMO7() { return this.bf.codes.includes('MO7'); },
                bfTouch(k) { this.bf.dirty = true; this.bf.reqId = ''; if (k) delete this.bf.fe[k]; },
                bfValidate() {
                    const e = {}, t = this.bf.st;
                    if (!this.bf.clientId && !this.bf.studentId) {
                        if (!t.first.trim()) e.firstName = 'กรุณากรอกชื่อ';
                        if (!t.last.trim()) e.lastName = 'กรุณากรอกนามสกุล';
                        if (!t.level) e.level = 'กรุณาเลือกระดับชั้น';
                        if (!this.roomOk(t.level, t.room)) e.room = 'กรุณาเลือกห้อง';
                    }
                    if (!this.bf.codes.length) e.codes = 'กรุณาเลือกพฤติกรรมที่ปรากฏอย่างน้อย 1 รายการ';
                    if (this.bfMO7 && !this.bf.detail.trim()) e.detail = 'เมื่อเลือก MO7 กรุณาบันทึกบริบทและรายละเอียดที่จำเป็นตามแนวทางของสถานศึกษา';
                    return e;
                },
                async bfSave() {
                    if (this.bf.saving) return;
                    this.bf.error = ''; this.bf.fe = this.bfValidate();
                    if (Object.keys(this.bf.fe).length) { this.bf.error = Object.values(this.bf.fe)[0]; this.$nextTick(() => { const el = document.querySelector('[data-bf] .bf-err'); if (el) el.scrollIntoView({ block: 'center', behavior: this.a3Motion() }); }); return; }
                    if (!this.bf.reqId) this.bf.reqId = this.awNewRequestId();
                    const p = { codes: this.bf.codes.slice(), detail: this.bf.detail, sources: this.bf.sources.slice(), sourceOther: this.bf.sourceOther, handling: this.bf.handling, abc: Object.assign({}, this.bf.abc), requestId: this.bf.reqId };
                    if (this.bf.clientId) p.clientId = this.bf.clientId;
                    else if (this.bf.studentId) p.studentId = this.bf.studentId;   // from the roster: the server links by StudentID
                    else p.student = { firstName: this.bf.st.first, lastName: this.bf.st.last, nickname: this.bf.st.nick, level: Number(this.bf.st.level), room: String(this.bf.st.room).toUpperCase() };
                    if (this.bf.mode === 'edit') { p.id = this.bf.id; p.expectedVersion = this.bf.version; }
                    this.bf.saving = true;
                    const r = await this.apiCall('behavior.save', p);
                    this.bf.saving = false;
                    if (r.ok && p.studentId && this.can('view_case')) this.loadData();
                    if (!r.ok) {
                        if (r.code !== 'NETWORK') this.bf.reqId = '';
                        this.bf.fe = r.fields || {}; this.bf.error = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return;
                    }
                    this.bf.result = r.data; this.bf.dirty = false; this.bf.reqId = '';
                    const cid = r.data.item && r.data.item.clientId;
                    if (cid && this.bp.clientId === String(cid)) this.bpLoad();
                    if (cid && this.tl.clientId === String(cid)) this.tl.data = null;
                    if (r.data.student && r.data.student.created && this.can('view_case')) this.loadData();
                    if (this.can('view_assessment')) this.rlLoad();
                },
                bfClose(force) {
                    if (!force && this.bf.dirty && !this.bf.result) { this.bf.leaveAsk = 'close'; return; }
                    this.bf.open = false; this.bf.leaveAsk = '';
                },
                bfBack() {
                    if (this.bf.dirty && !this.bf.result) { this.bf.leaveAsk = 'back'; return; }
                    this.bf.open = false; this.openRecordChooser(this.bf.locked ? 'profile' : 'global');
                },
                bfLeave() { const k = this.bf.leaveAsk; this.bf.dirty = false; this.bf.leaveAsk = ''; if (k === 'back') this.bfBack(); else this.bfClose(true); },
                bfAnother() { const id = this.bf.locked ? this.bf.clientId : ''; this.openBehaviorForm(id); },
                get bfCanOpenProfile() { const id = this.bf.result && this.bf.result.item && this.bf.result.item.clientId; return !!(id && this.can('view_case') && this.students.some(s => String(s.id) === String(id))); },
                bfOpenProfile() {
                    const id = this.bf.result && this.bf.result.item && this.bf.result.item.clientId;
                    const s = this.students.find(x => String(x.id) === String(id)); this.bf.open = false; if (!s) return;
                    if (this.showProfileModal && this.activeStudent && this.activeStudent.id === s.id) { this.openBehaviorTab(); return; }
                    this.openProfile(s).then(() => this.openBehaviorTab());
                },

                /* ---- profile tab “ข้อมูลพฤติกรรม” ---- */
                openBehaviorTab() { this.profileTab = 'behavior'; this.bpEnter(); },
                bpEnter() {
                    const id = this.activeStudent && String(this.activeStudent.id); if (!id) return;
                    this.bmEnsure(); this.pbEnter();
                    if (this.bp.clientId !== id) { this.bp = Object.assign(this.bp, { clientId: id, data: null, error: '', code: '', rec: null }); }
                    if (!this.bp.data && !this.bp.loading) this.bpLoad();
                },
                async bpLoad() {
                    const id = this.bp.clientId; if (!id) return;
                    this.bp.loading = true; this.bp.error = '';
                    const r = await this.apiCall('behavior.list', { clientId: id });
                    if (this.bp.clientId !== id) return;
                    this.bp.loading = false;
                    if (!r.ok) { this.bp.error = r.message || 'โหลดข้อมูลพฤติกรรมไม่สำเร็จ'; return; }
                    this.bp.data = r.data;
                },
                get bpRecords() {
                    const d = this.bp.data; if (!d) return [];
                    const list = d.records.filter(r => !this.bp.code || r.codes.includes(this.bp.code));
                    const key = r => this.bp.sort === 'occurred' ? ((r.occurredDate || String(r.recordedAt).slice(0, 10)) + (r.occurredTime || '') + r.recordedAt) : r.recordedAt;
                    return list.slice().sort((a, b) => String(key(b)).localeCompare(String(key(a))));
                },
                /** frequency colour bands set by the school (1–4 green, 5–7 yellow, 8–10 orange); 11+ and MO7 are Red Alerts */
                bpLevel(f) {
                    const n = this.bpN(f);
                    if (f.mode ? f.mode === 'immediate' : f.code === 'MO7') return 'red';
                    if ((f.mode || 'frequency') === 'frequency' && n >= (f.threshold || 11)) return 'red';      // each category's own Red Alert rule
                    if (n >= 8) return 'orange'; if (n >= 5) return 'yellow'; return 'green';
                },
                bpN(f) { return f.mode === 'frequency' && f.windowDays ? f.windowCount : f.count; },
                bpShowHistory(code) { this.bp.code = code; this.$nextTick(() => { const el = document.querySelector('[data-bp-history]'); if (el) el.scrollIntoView({ block: 'start', behavior: this.a3Motion() }); }); },
                bpOpenRec(r) { this.bp.rec = r; this.bp.cancel = { id: '', reason: '', busy: false, err: '' }; },
                async bpCancelRec() {
                    const c = this.bp.cancel; if (c.busy) return;
                    c.busy = true; c.err = '';
                    const r = await this.apiCall('behavior.cancel', { clientId: this.bp.clientId, id: c.id, reason: c.reason });
                    c.busy = false;
                    if (!r.ok) { c.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'ยกเลิกไม่สำเร็จ'); return; }
                    this.bp.rec = null; this.showToast('ยกเลิกระเบียนแล้ว — คำนวณความถี่ใหม่จากเซิร์ฟเวอร์'); this.bpLoad(); if (this.tl.clientId === this.bp.clientId) this.tl.data = null;
                },
                bpEditRec(r) { this.bp.rec = null; this.openBehaviorForm(this.bp.clientId, r); },

                /* ---- Red Alert list page + dialog (four professions; the server refuses everyone else) ---- */
                async rlLoad() {
                    if (!this.can('view_assessment') || !this.isLoggedIn) return;
                    this.rl.loading = true; this.rl.error = '';
                    const r = await this.apiCall('behavior.alerts', {});
                    this.rl.loading = false; this.rl.loaded = true;
                    if (!r.ok) { this.rl.error = r.message || 'โหลดรายการไม่สำเร็จ'; return; }
                    this.rl.items = r.data.items; this.rl.open = r.data.open;
                    // open alerts this user has not been shown yet → pop up under the navbar (ids only are remembered in this browser)
                    const seen = this.rlSeen(), fresh = r.data.items.filter(a => a.status !== 'resolved' && !seen.includes(a.id));
                    if (fresh.length) this.rl.popup = fresh.slice(0, 5);
                    if (!this.rl.timer) this.rl.timer = setInterval(() => { if (this.isLoggedIn && this.can('view_assessment') && !document.hidden) this.rlLoad(); }, 60000);
                },
                rlSeenKey() { return 'tss_ra_seen::' + ((this.authUser && this.authUser.id) || ''); },
                rlSeen() { try { return JSON.parse(localStorage.getItem(this.rlSeenKey()) || '[]'); } catch (e) { return this.__raSeen || []; } },
                rlMarkSeen(ids) {
                    const all = [...new Set(this.rlSeen().concat(ids))].slice(-300); this.__raSeen = all;
                    try { localStorage.setItem(this.rlSeenKey(), JSON.stringify(all)); } catch (e) {}
                    this.rl.popup = this.rl.popup.filter(a => !ids.includes(a.id));
                },
                rlPopupOpen(a) { this.rlMarkSeen([a.id]); this.raOpen(a.id); },
                rlStop() { if (this.rl.timer) { clearInterval(this.rl.timer); this.rl.timer = null; } this.rl.popup = []; },
                get rlShown() { return this.rl.items.filter(a => (this.rl.status === 'all' ? true : this.rl.status === 'active' ? a.status !== 'resolved' : a.status === this.rl.status) && (!this.rl.code || a.code === this.rl.code)); },
                rlCodes() { return [...new Set(this.rl.items.map(a => a.code))].sort(); },
                async raOpen(id) {
                    if (this.rl.popup.some(a => a.id === id)) this.rlMarkSeen([id]);
                    this.ra = Object.assign(this.ra, { open: true, id, loading: true, error: '', data: null, review: { note: '', to: '', busy: false, err: '' }, notifyBusy: false,
                        plan: { editId: '', form: null, busy: false, err: '', fe: {}, to: '', reason: '', reqId: '' }, fu: { planId: '', form: null, busy: false, err: '', fe: {}, reqId: '' } });
                    this.bmEnsure();
                    await this.raLoad();
                },
                async raLoad() {
                    const id = this.ra.id; this.ra.loading = true; this.ra.error = '';
                    const r = await this.apiCall('behavior.alert.get', { id });
                    if (this.ra.id !== id) return;
                    this.ra.loading = false;
                    if (!r.ok) { this.ra.error = r.status === 403 ? 'ไม่มีสิทธิ์เปิด Red Alert นี้' : (r.message || 'โหลดไม่สำเร็จ'); return; }
                    this.ra.data = r.data;
                },
                raClose() {
                    if (this.ra.plan.form && this.ra.plan.dirty) { if (!this.ra.plan.confirmClose) { this.ra.plan.confirmClose = true; this.ra.plan.err = 'มีแผนที่ยังไม่บันทึก — กดปิดอีกครั้งเพื่อออกโดยไม่บันทึก'; return; } }
                    this.ra.open = false;
                    if (this.bp.clientId && this.ra.data && this.bp.clientId === this.ra.data.client.id) this.bpLoad();
                    if (this.currentTab === 'red_alerts') this.rlLoad();
                },
                async raNotify() {
                    if (this.ra.notifyBusy) return; this.ra.notifyBusy = true;
                    const r = await this.apiCall('behavior.alert.notify', { id: this.ra.id });
                    this.ra.notifyBusy = false;
                    if (!r.ok) { this.showToast(r.message || 'ส่งไม่สำเร็จ'); return; }
                    this.showToast('สถานะการแจ้ง: ' + r.data.notifyLabel); this.raLoad();
                },
                async raSaveReview() {
                    const v = this.ra.review; if (v.busy) return;
                    v.busy = true; v.err = '';
                    const r = await this.apiCall('behavior.alert.update', { id: this.ra.id, expectedVersion: this.ra.data.alert.version, toStatus: v.to, note: v.note, requestId: this.awNewRequestId() });
                    v.busy = false;
                    if (!r.ok) { v.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ra.review = { note: '', to: '', busy: false, err: '' }; this.showToast('บันทึกผลการตรวจสอบแล้ว'); this.raLoad();
                },
                raNewPlan() {
                    const a = this.ra.data.alert;
                    this.ra.plan = { editId: 'new', form: { title: '', issue: '', evidence: 'Red Alert ' + a.code + ' — ' + (a.kind === 'frequency' ? 'บันทึก ' + a.countAtCreate + ' ครั้ง ณ วันที่สร้าง' : 'แจ้งทันทีจากการบันทึก'), goal: '', methods: '', ownerUserId: '', involved: '', startDate: '', followDate: '', indicator: '', indicatorUnit: '', baseline: '', target: '', outcome: '', nextSteps: '', safetyCheck: '' },
                                     busy: false, err: '', fe: {}, to: '', reason: '', reqId: '', dirty: false };
                },
                raEditPlan(p) {
                    const f = {}; ['title', 'issue', 'evidence', 'goal', 'methods', 'involved', 'indicator', 'indicatorUnit', 'baseline', 'target', 'outcome', 'nextSteps', 'safetyCheck', 'ownerUserId', 'startDate', 'followDate'].forEach(k => { f[k] = p[k] || ''; });
                    this.ra.plan = { editId: p.id, form: f, version: p.version, busy: false, err: '', fe: {}, to: '', reason: '', reqId: '', dirty: false };
                },
                async raSavePlan(to) {
                    const P = this.ra.plan; if (P.busy || !P.form) return;
                    if (!P.reqId) P.reqId = this.awNewRequestId();
                    const body = { fields: Object.assign({}, P.form), toStatus: to || '', reason: P.reason, requestId: P.reqId };
                    if (P.editId === 'new') body.alertId = this.ra.id; else { body.id = P.editId; body.expectedVersion = P.version; }
                    P.busy = true; P.err = ''; P.fe = {};
                    const r = await this.apiCall('behavior.plan.save', body);
                    P.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') P.reqId = ''; P.fe = r.fields || {}; P.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ra.plan = { editId: '', form: null, busy: false, err: '', fe: {}, to: '', reason: '', reqId: '' };
                    this.showToast(to ? 'บันทึกสถานะแผน “' + r.data.plan.statusLabel + '” แล้ว' : 'บันทึกแผนแล้ว'); this.raLoad();
                },
                async raPlanStatus(p, to) {
                    // a status change on a saved plan uses its stored fields (plus a reason when ending it)
                    if (to === 'terminated' || (to === 'completed' && !p.outcome) || (['pending', 'approved'].includes(to) && (!p.goal || !p.methods || !p.indicator || !p.ownerUserId))) {
                        this.raEditPlan(p); this.ra.plan.to = to; return;
                    }
                    this.raEditPlan(p); await this.raSavePlan(to);
                },
                raNewFollow(p) { this.ra.fu = { planId: p.id, form: { date: (this.bm.meta && this.bm.meta.today) || this.todayISO(), actions: '', observed: '', progress: '', obstacles: '', next: '', nextDate: '', progressPct: p.progressPct != null ? p.progressPct : 0, measured: '', trend: '' }, busy: false, err: '', fe: {}, reqId: '' }; },
                async raSaveFollow() {
                    const F = this.ra.fu; if (F.busy) return;
                    if (!F.reqId) F.reqId = this.awNewRequestId();
                    F.busy = true; F.err = ''; F.fe = {};
                    const r = await this.apiCall('behavior.followup.add', Object.assign({ planId: F.planId, requestId: F.reqId }, F.form));
                    F.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') F.reqId = ''; F.fe = r.fields || {}; F.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ra.fu = { planId: '', form: null, busy: false, err: '', fe: {}, reqId: '' }; this.showToast('บันทึกการติดตามแล้ว (ประวัติเดิมไม่ถูกแก้ไข)'); this.raLoad();
                },
                /* progress charts (SVG points on a fixed 0–100 / indicator scale) */
                raPctPoints(p) {
                    const f = p.followUps.filter(x => x.progressPct !== undefined && x.progressPct !== ''); if (!f.length) return '';
                    const W = 300, H = 90, n = f.length;
                    return f.map((x, i) => [(n === 1 ? W / 2 : 14 + i * (W - 28) / (n - 1)).toFixed(1), (H - 10 - Number(x.progressPct) / 100 * (H - 20)).toFixed(1)].join(',')).join(' ');
                },
                raIndScale(p) {
                    const vals = p.followUps.map(x => x.measured).filter(v => v !== undefined && v !== '').map(Number).concat([p.baseline, p.target].filter(v => v !== '' && v != null).map(Number));
                    if (!vals.length) return null; let lo = Math.min(...vals), hi = Math.max(...vals); if (lo === hi) { lo -= 1; hi += 1; }
                    return { lo, hi, y: v => (80 - (Number(v) - lo) / (hi - lo) * 60).toFixed(1) };
                },
                raIndPoints(p) {
                    const sc = this.raIndScale(p), f = p.followUps.filter(x => x.measured !== undefined && x.measured !== ''); if (!sc || !f.length) return '';
                    const n = f.length; return f.map((x, i) => [(n === 1 ? 150 : 14 + i * 272 / (n - 1)).toFixed(1), sc.y(x.measured)].join(',')).join(' ');
                },
                raIndY(p, v) { const sc = this.raIndScale(p); return sc && v !== '' && v != null ? sc.y(v) : 0; },
                raWeekMax(p) { const t = p.trend; if (!t) return 1; return Math.max(1, t.beforeWeekly, ...t.weeks.map(w => w.count)); },
                raPlanNextLabel(to) { return { pending: 'ส่งขออนุมัติ', approved: 'อนุมัติแผน', in_progress: 'เริ่มดำเนินการ', awaiting_followup: 'รอติดตามผล', completed: 'ดำเนินการเสร็จสิ้น', terminated: 'ยุติแผน', draft: 'ส่งกลับเป็นร่าง' }[to] || to; },

                /* ===== แผนสนับสนุนนักเรียนรายบุคคล (ISSP) — issp.* API =====
                   Scores, completeness and the final result come from the server summary; the page only shows them. Each plan is loaded by its own id,
                   and every document is built from the one plan that is open (never from another plan of the same student). */
                is: {
                    meta: null, metaErr: '',
                    fo: { open: false, loading: false, error: '', loaded: false, items: [], q: '', canCreate: false, clientId: '', client: null, plans: [], plLoading: false, plError: '',
                          staff: [], alerts: [], fromAlert: '', status: 'all', type: '' },
                    pl: { open: false, id: '', loading: false, error: '', data: null, tab: 'detail' },
                    pf: { clientId: '', loading: false, error: '', data: null },
                    ed: { open: false, id: '', version: 0, clientId: '', client: null, f: null, staff: [], alerts: [], saving: false, err: '', fe: {}, reqId: '', dirty: false,
                          resultsExist: false, origThreshold: 70, leaveAsk: false, confirm: null, step: 'basic' },
                    ev: { open: false, act: null, round: 1, f: null, ex: null, busy: false, err: '', fe: {}, reqId: '' },
                    gr: { open: false, goal: null, f: null, busy: false, err: '', fe: {}, reqId: '' },
                    st: { open: false, to: '', reason: '', busy: false, err: '', reqId: '' },
                    doc: { open: false, kind: '', mode: 'progress', built: null, busy: '', err: '', msg: '' }
                },
                IS_ED_STEPS: [
                    { k: 'basic', label: 'ข้อมูลพื้นฐาน' }, { k: 'issue', label: 'ปัญหานำและการประเมินเบื้องต้น' }, { k: 'master', label: 'แผนปฏิบัติการแม่บท' },
                    { k: 'goals', label: 'แผนพัฒนาผู้เรียนรายบุคคล' }, { k: 'tools', label: 'เครื่องมือและเกณฑ์' }
                ],
                isEsc(v) { return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
                isDate(iso) { return iso ? this.formatThaiDateDisplay(iso) : '—'; },
                isPct(n) { const v = Number(n) || 0; return (Math.round(v * 100) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + '%'; },
                isGoalCls(s) { return s === 'achieved' ? 'is-ok' : s === 'not_achieved' ? 'is-bad' : 'is-wait'; },
                isResCls(s) { return s === 'pass' ? 'is-ok' : s === 'fail' ? 'is-bad' : 'is-wait'; },
                isStatusCls(s) { return { draft: 'is-draft', active: 'is-active', closed: 'is-closed', cancelled: 'is-cancel' }[s] || ''; },
                async isEnsureMeta() {
                    if (this.is.meta) return true;
                    const r = await this.apiCall('issp.meta', {});
                    if (r.ok) { this.is.meta = r.data; this.is.metaErr = ''; return true; }
                    this.is.metaErr = r.message || 'โหลดข้อมูลแบบฟอร์ม ISSP ไม่สำเร็จ'; return false;
                },

                /* ---- แฟ้มติดตามต่อเนื่อง: student cards → plans of one student → one plan ---- */
                async isOpenFolder(clientId, opts) {
                    if (!this.can('view_case')) return;
                    this.is.fo.open = true; this.is.fo.fromAlert = (opts && opts.alertId) || '';
                    this.isEnsureMeta();
                    if (clientId) { this.isPickStudent(clientId); this.isLoadFolder(); }
                    else { this.is.fo.clientId = ''; this.is.fo.client = null; this.isLoadFolder(); }
                },
                isCloseFolder() { this.is.fo.open = false; this.is.fo.fromAlert = ''; },
                async isLoadFolder() {
                    if (this.is.fo.loading) return;
                    this.is.fo.loading = true; this.is.fo.error = '';
                    const r = await this.apiCall('issp.folder', {});
                    this.is.fo.loading = false;
                    if (r.ok) { this.is.fo.items = r.data.items; this.is.fo.canCreate = r.data.canCreate; this.is.fo.loaded = true; }
                    else this.is.fo.error = r.message || 'โหลดแฟ้มติดตามไม่สำเร็จ';
                },
                isFolderShown() {
                    const q = (this.is.fo.q || '').trim().toLowerCase();
                    return this.is.fo.items.filter(x => !q || (x.name + ' ' + x.nickname + ' ' + x.grade).toLowerCase().includes(q));
                },
                isCaseMatches() {      // students the caller can open but who have no plan yet (for “create a plan” from the folder)
                    const q = (this.is.fo.q || '').trim().toLowerCase();
                    if (!q || !this.is.fo.canCreate) return [];
                    const have = new Set(this.is.fo.items.map(x => String(x.clientId)));
                    return (this.students || []).filter(s => !have.has(String(s.id)) && (String(s.name) + ' ' + String(s.nickname || '') + ' ' + String(s.grade || '')).toLowerCase().includes(q)).slice(0, 6);
                },
                async isPickStudent(clientId) {
                    this.is.fo.clientId = String(clientId); this.is.fo.client = null; this.is.fo.plans = []; this.is.fo.plError = ''; this.is.fo.plLoading = true;
                    const r = await this.apiCall('issp.list', { clientId: String(clientId) });
                    if (this.is.fo.clientId !== String(clientId)) return;
                    this.is.fo.plLoading = false;
                    if (!r.ok) { this.is.fo.plError = r.message || 'โหลดรายการแผนไม่สำเร็จ'; return; }
                    this.is.fo.client = r.data.client; this.is.fo.plans = r.data.plans; this.is.fo.canCreate = r.data.canCreate;
                    this.is.fo.staff = r.data.staff || []; this.is.fo.alerts = r.data.alerts || [];
                },
                isPlansShown() {
                    const s = this.is.fo.status, t = this.is.fo.type;
                    return this.is.fo.plans.filter(p => (s === 'all' || p.status === s) && (!t || (t === 'both' ? p.shortEnabled && p.longEnabled : t === 'short' ? p.shortEnabled : p.longEnabled)));
                },
                isFromAlertRef() { return this.is.fo.alerts.find(a => a.id === this.is.fo.fromAlert) || null; },

                /* ---- plan profile ---- */
                async isOpenPlan(id) {
                    this.io.data = null; this.io.form = null;
                    this.is.pl = { open: true, id: String(id), loading: true, error: '', data: null, tab: (this.is.pl.id === String(id) && this.is.pl.tab) || 'detail' };
                    await this.isReloadPlan();
                },
                async isReloadPlan() {
                    const id = this.is.pl.id; this.is.pl.loading = true; this.is.pl.error = '';
                    const r = await this.apiCall('issp.get', { id });
                    if (this.is.pl.id !== id) return;
                    this.is.pl.loading = false;
                    if (r.ok) { this.is.pl.data = r.data; if (this.is.pl.tab === 'dash') this.ioLoad(); } else { this.is.pl.error = r.message || 'เปิดแผนไม่สำเร็จ'; this.is.pl.data = null; }
                },
                isClosePlan() { this.is.pl.open = false; this.is.pl.data = null; this.is.pl.id = ''; this.is.doc.open = false; },
                isAfterChange(clientId) {          // refresh what is on screen after a server-confirmed change
                    if (this.is.pl.open) this.isReloadPlan();
                    if (this.is.fo.open) { this.isLoadFolder(); if (this.is.fo.clientId && String(this.is.fo.clientId) === String(clientId)) this.isPickStudent(clientId); }
                    if (this.is.pf.clientId && String(this.is.pf.clientId) === String(clientId)) this.isProfileLoad();
                },
                isAct(id) { return ((this.is.pl.data && this.is.pl.data.activities) || []).find(a => a.id === id) || null; },
                isActSum(id) { return ((this.is.pl.data && this.is.pl.data.plan.summary.activities) || []).find(a => a.id === id) || { pass: 0, fail: 0, pending: 0, contribution: 0, done: false }; },
                isEvalOf(actId, round) { return ((this.is.pl.data && this.is.pl.data.evaluations) || []).find(e => e.activityId === actId && e.round === round) || null; },
                isCanEvalAct(a) { const c = this.is.pl.data && this.is.pl.data.plan.can; return !!c && this.is.pl.data.plan.status === 'active' && (c.evalAll || c.respActs.includes(a.id)); },
                isCanReviewGoal(g) { const c = this.is.pl.data && this.is.pl.data.plan.can; return !!c && this.is.pl.data.plan.status === 'active' && (c.evalAll || c.respGoals.includes(g.id)); },
                /** every planned round of every activity: evaluated rounds by evaluation date, then rounds still waiting, in activity/round order */
                isRounds() {
                    const d = this.is.pl.data; if (!d) return [];
                    const out = [];
                    d.activities.forEach(a => { for (let r = 1; r <= a.rounds; r++) out.push({ key: a.id + '#' + r, act: a, round: r, ev: this.isEvalOf(a.id, r) }); });
                    const dated = x => x.ev && x.ev.result !== 'pending';
                    return out.sort((x, y) => (dated(y) - dated(x)) || (dated(x) ? String(x.ev.evalDate).localeCompare(String(y.ev.evalDate)) : 0) || (x.act.seq - y.act.seq) || (x.round - y.round));
                },
                isGoalReviews(goalId) { return ((this.is.pl.data && this.is.pl.data.reviews) || []).filter(r => r.goalId === goalId); },
                isRoundPct() { const t = this.is.pl.data ? this.is.pl.data.plan.summary.totals : null; return t && t.rounds ? Math.round(((t.pass + t.fail) / t.rounds) * 100) : 0; },
                isScoreBar() { const s = this.is.pl.data ? this.is.pl.data.plan.summary : null; return s ? Math.max(0, Math.min(100, s.score)) : 0; },

                /* ---- case profile tab ---- */
                isProfileEnter() { if (this.activeStudent && this.is.pf.clientId !== String(this.activeStudent.id)) { this.is.pf = { clientId: String(this.activeStudent.id), loading: false, error: '', data: null }; this.isProfileLoad(); } },
                async isProfileLoad() {
                    const id = this.is.pf.clientId; if (!id) return;
                    this.is.pf.loading = true; this.is.pf.error = '';
                    const r = await this.apiCall('issp.list', { clientId: id });
                    if (this.is.pf.clientId !== id) return;
                    this.is.pf.loading = false;
                    if (r.ok) this.is.pf.data = r.data; else this.is.pf.error = r.message || 'โหลดแผน ISSP ไม่สำเร็จ';
                },
                isFromAlert(clientId, alertId) { this.isOpenFolder(clientId, { alertId }); },

                /* ---- create / edit ---- */
                isBlankAct() { return { id: '', period: '', name: '', method: '', indicator: '', weight: '', rounds: 1, scope: '', responsibleUserId: '', responsibleName: '', responsibleRole: '' }; },
                isBlankGoal(type) { return { id: '', type: type || '', title: '', criteria: '', frequency: 'w1', method: '', evaluatorUserId: '', evaluatorName: '', evaluatorRole: '', startDate: this.is.ed.f ? this.is.ed.f.startDate : '', dueDate: '' }; },
                async isNewPlan(clientId, alertId) {
                    if (!(await this.isEnsureMeta())) { this.showToast(this.is.metaErr); return; }
                    let L = (this.is.fo.client && String(this.is.fo.clientId) === String(clientId)) ? { client: this.is.fo.client, staff: this.is.fo.staff, alerts: this.is.fo.alerts, canCreate: this.is.fo.canCreate } : null;
                    if (!L) { const r = await this.apiCall('issp.list', { clientId: String(clientId) }); if (!r.ok) { this.showToast(r.message || 'โหลดข้อมูลนักเรียนไม่สำเร็จ'); return; } L = r.data; }
                    if (!L.canCreate) { this.showToast('การสร้างแผน ISSP ทำได้เฉพาะนักสังคมสงเคราะห์ นักจิตวิทยา แพทย์ และจิตแพทย์'); return; }
                    const t = this.todayISO();
                    const f = { title: '', startDate: t, endDate: '', primaryUserId: (L.staff || []).some(s => s.id === (this.authUser && this.authUser.id)) ? this.authUser.id : '', primaryRole: '',
                                coCaregivers: [], shortEnabled: true, longEnabled: false, decisionRule: '', passThreshold: this.is.meta.defaultThreshold, thresholdReason: '',
                                leadIssue: '', alertIds: [], initial: { problem: '', needs: '', strengths: '', limits: '', other: '' }, tools: [''], masterCriteria: '',
                                activities: [], goals: [] };
                    this.is.ed = { open: true, id: '', version: 0, clientId: String(clientId), client: L.client, f, staff: L.staff || [], alerts: L.alerts || [], saving: false, err: '', fe: {}, reqId: '', dirty: false,
                                   resultsExist: false, origThreshold: this.is.meta.defaultThreshold, leaveAsk: false, confirm: null, step: 'basic' };
                    f.activities.push(this.isBlankAct()); f.goals.push(this.isBlankGoal('short'));
                    const a = alertId && (L.alerts || []).find(x => x.id === alertId);
                    if (a) this.isToggleAlert(a);
                },
                async isEditPlan() {
                    const d = this.is.pl.data; if (!d || !d.plan.can || !d.plan.can.edit) return;
                    if (!(await this.isEnsureMeta())) return;
                    const p = d.plan, cp = o => JSON.parse(JSON.stringify(o));
                    const f = { title: p.title, startDate: p.startDate, endDate: p.endDate, primaryUserId: p.primaryUserId, primaryRole: p.primaryRole, coCaregivers: cp(p.coCaregivers),
                                shortEnabled: p.shortEnabled, longEnabled: p.longEnabled, decisionRule: p.decisionRule, passThreshold: p.passThreshold, thresholdReason: '',
                                leadIssue: p.leadIssue, alertIds: p.alertIds.slice(), initial: Object.assign({ problem: '', needs: '', strengths: '', limits: '', other: '' }, cp(p.initial)),
                                tools: p.tools.length ? p.tools.slice() : [''], masterCriteria: p.masterCriteria,
                                activities: d.activities.map(a => ({ id: a.id, period: a.period, name: a.name, method: a.method, indicator: a.indicator, weight: String(a.weight), rounds: a.rounds, scope: a.scope,
                                                                     responsibleUserId: a.responsibleUserId, responsibleName: a.responsibleUserId ? '' : a.responsibleName, responsibleRole: a.responsibleRole })),
                                goals: d.goals.map(g => ({ id: g.id, type: g.type, title: g.title, criteria: g.criteria, frequency: g.frequency, method: g.method, evaluatorUserId: g.evaluatorUserId,
                                                           evaluatorName: g.evaluatorUserId ? '' : g.evaluatorName, evaluatorRole: g.evaluatorRole, startDate: g.startDate, dueDate: g.dueDate })) };
                    this.is.ed = { open: true, id: p.id, version: p.version, clientId: String(d.client.id), client: d.client, f, staff: d.staff || [], alerts: d.alerts || [], saving: false, err: '', fe: {}, reqId: '', dirty: false,
                                   resultsExist: d.evaluations.some(e => e.result !== 'pending'), origThreshold: p.passThreshold, leaveAsk: false, confirm: null, step: 'basic' };
                },
                isEdTouch() { this.is.ed.dirty = true; },
                isEdClose(force) { if (!force && this.is.ed.dirty) { this.is.ed.leaveAsk = true; return; } this.is.ed.open = false; this.is.ed.leaveAsk = false; },
                isWeightSum() { const f = this.is.ed.f; if (!f) return 0; return Math.round(f.activities.reduce((s, a) => s + (Number(a.weight) || 0), 0) * 100) / 100; },
                isScopeOpts() { const f = this.is.ed.f, o = []; if (!f) return o; if (f.shortEnabled) o.push(['short', 'แผนระยะสั้น']); if (f.longEnabled) o.push(['long', 'แผนระยะยาว']); if (f.shortEnabled && f.longEnabled) o.push(['both', 'ทั้งระยะสั้นและระยะยาว']); return o; },
                isAddAct() { this.is.ed.f.activities.push(this.isBlankAct()); this.isEdTouch(); },
                isAddGoal() { const f = this.is.ed.f; this.is.ed.f.goals.push(this.isBlankGoal(f.shortEnabled ? 'short' : 'long')); this.isEdTouch(); },
                isAskRemove(kind, i) {
                    const f = this.is.ed.f, x = kind === 'act' ? f.activities[i] : f.goals[i];
                    const label = kind === 'act' ? (x.name || 'กิจกรรมที่ ' + (i + 1)) : (x.title || 'เป้าหมายที่ ' + (i + 1));
                    this.is.ed.confirm = { kind, i, label };
                },
                isDoRemove() {
                    const c = this.is.ed.confirm; if (!c) return;
                    if (c.kind === 'act') this.is.ed.f.activities.splice(c.i, 1); else this.is.ed.f.goals.splice(c.i, 1);
                    this.is.ed.confirm = null; this.is.ed.fe = {}; this.isEdTouch();
                },
                isMove(kind, i, dir) {
                    const L = kind === 'act' ? this.is.ed.f.activities : this.is.ed.f.goals, j = i + dir;
                    if (j < 0 || j >= L.length) return; const t = L[i]; L.splice(i, 1); L.splice(j, 0, t); this.isEdTouch();
                },
                isAddCo() { this.is.ed.f.coCaregivers.push({ userId: '', name: '', role: '' }); this.isEdTouch(); },
                isToggleAlert(a) {
                    const f = this.is.ed.f, i = f.alertIds.indexOf(a.id);
                    if (i >= 0) { f.alertIds.splice(i, 1); this.isEdTouch(); return; }
                    f.alertIds.push(a.id);
                    const line = 'อ้างอิง Red Alert ' + a.code + ' — ' + a.text + ' (' + (a.kind === 'immediate' ? 'แจ้งทันที' : 'พบ ' + a.countAtCreate + ' ครั้ง') + ' เมื่อ ' + this.isDate(String(a.createdAt).slice(0, 10)) + ')';
                    if (!(f.leadIssue || '').includes(line)) f.leadIssue = (f.leadIssue ? f.leadIssue.trim() + '\n' : '') + line;
                    this.isEdTouch();
                },
                isSubToggled() {
                    const f = this.is.ed.f;
                    if (!(f.shortEnabled && f.longEnabled)) f.decisionRule = '';
                    this.isEdTouch();
                },
                isEdErrStep(k) {
                    const fe = this.is.ed.fe, keys = Object.keys(fe);
                    const map = { basic: /^(title|startDate|endDate|primaryUserId|primaryUserIdRole|co_|coCaregivers|subplans|decisionRule)/, issue: /^(leadIssue|alertIds|ini_)/,
                                  master: /^(act_|activities|weightSum|sub_)/, goals: /^(goal_|goals)/, tools: /^(tools|passThreshold|thresholdReason)/ };
                    return keys.some(x => map[k].test(x));
                },
                isValidate() {
                    const f = this.is.ed.f, e = {};
                    if (!f.title.trim()) e.title = 'กรุณาระบุชื่อแผน';
                    if (!f.startDate) e.startDate = 'กรุณาระบุวันที่เริ่มแผน';
                    if (!f.endDate) e.endDate = 'กรุณาระบุวันที่สิ้นสุดแผน'; else if (f.startDate && f.endDate < f.startDate) e.endDate = 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มแผน';
                    if (!f.primaryUserId) e.primaryUserId = 'กรุณาเลือกผู้ดูแลหลัก';
                    if (!f.primaryRole.trim()) e.primaryUserIdRole = 'กรุณาระบุตำแหน่งหรือบทบาท';
                    f.coCaregivers.forEach((c, i) => { if (!c.userId && !String(c.name || '').trim()) e['co_' + i] = 'กรุณาเลือกบุคลากรหรือพิมพ์ชื่อ'; if (!String(c.role || '').trim()) e['co_' + i + 'Role'] = 'กรุณาระบุตำแหน่งหรือบทบาท'; });
                    if (!f.shortEnabled && !f.longEnabled) e.subplans = 'กรุณาเปิดใช้แผนระยะสั้น แผนระยะยาว หรือทั้งสองแผน';
                    if (f.shortEnabled && f.longEnabled && !f.decisionRule) e.decisionRule = 'กรุณาเลือกเกณฑ์ตัดสินผลของแผนย่อย';
                    if (!f.leadIssue.trim()) e.leadIssue = 'กรุณาระบุประเด็นปัญหานำ';
                    if (!f.initial.problem.trim()) e.ini_problem = 'กรุณาบันทึกสภาพปัญหา';
                    if (!f.initial.needs.trim()) e.ini_needs = 'กรุณาบันทึกความต้องการของนักเรียน';
                    if (!f.activities.length) e.activities = 'กรุณาเพิ่มกิจกรรมอย่างน้อย 1 กิจกรรม';
                    const scopes = this.isScopeOpts().map(o => o[0]);
                    f.activities.forEach((a, i) => {
                        const k = 'act_' + i + '_';
                        if (!a.period.trim()) e[k + 'period'] = 'กรุณาระบุสัปดาห์/ช่วงเวลา';
                        if (!a.name.trim()) e[k + 'name'] = 'กรุณาระบุชื่อกิจกรรม';
                        if (!a.method.trim()) e[k + 'method'] = 'กรุณาระบุวิธีดำเนินการ';
                        if (!a.indicator.trim()) e[k + 'indicator'] = 'กรุณาระบุตัวชี้วัด';
                        const w = String(a.weight).trim(); if (!/^\d+(\.\d{1,2})?$/.test(w) || !(Number(w) > 0 && Number(w) <= 100)) e[k + 'weight'] = 'ค่าน้ำหนัก 0–100 (ทศนิยมไม่เกิน 2 ตำแหน่ง)';
                        const r = Number(a.rounds); if (!(r >= 1 && r <= 60 && Math.floor(r) === r)) e[k + 'rounds'] = 'จำนวนรอบ 1–60';
                        if (!scopes.includes(a.scope)) e[k + 'scope'] = 'กรุณาเลือกประเภทแผนย่อย';
                        if (!a.responsibleUserId && !String(a.responsibleName || '').trim()) e[k + 'responsible'] = 'กรุณาเลือกหรือพิมพ์ชื่อผู้รับผิดชอบ';
                    });
                    if (f.activities.length && Math.abs(this.isWeightSum() - 100) > 0.001) e.weightSum = 'ผลรวมค่าน้ำหนักต้องเท่ากับ 100% (ตอนนี้ ' + this.isWeightSum() + '%)';
                    f.goals.forEach((g, i) => {
                        const k = 'goal_' + i + '_';
                        if (!g.title.trim()) e[k + 'title'] = 'กรุณาระบุเป้าหมาย';
                        if (!(g.type === 'short' && f.shortEnabled || g.type === 'long' && f.longEnabled)) e[k + 'type'] = 'กรุณาเลือกประเภทเป้าหมายที่เปิดใช้';
                        if (!g.criteria.trim()) e[k + 'criteria'] = 'กรุณาระบุเกณฑ์การบรรลุเป้าหมาย';
                        if (!g.method.trim()) e[k + 'method'] = 'กรุณาระบุวิธีติดตามและประเมินผล';
                        if (!g.evaluatorUserId && !String(g.evaluatorName || '').trim()) e[k + 'evaluator'] = 'กรุณาเลือกหรือพิมพ์ชื่อผู้รับผิดชอบการประเมิน';
                        if (!g.startDate) e[k + 'startDate'] = 'กรุณาระบุวันที่เริ่มต้น';
                        if (!g.dueDate) e[k + 'dueDate'] = 'กรุณาระบุกำหนดประเมิน'; else if (g.startDate && g.dueDate < g.startDate) e[k + 'dueDate'] = 'กำหนดประเมินต้องไม่ก่อนวันที่เริ่มต้น';
                    });
                    ['short', 'long'].forEach(t => {
                        if (!(t === 'short' ? f.shortEnabled : f.longEnabled)) return;
                        const nm = t === 'short' ? 'ระยะสั้น' : 'ระยะยาว';
                        if (!f.goals.some(g => g.type === t)) e['sub_' + t] = 'แผน' + nm + 'ที่เปิดใช้ต้องมีเป้าหมายอย่างน้อย 1 รายการ';
                        else if (!f.activities.some(a => a.scope === t || a.scope === 'both')) e['sub_' + t] = 'ต้องมีกิจกรรมในแผนแม่บทที่สนับสนุนแผน' + nm + 'อย่างน้อย 1 กิจกรรม';
                    });
                    if (!f.tools.some(t => String(t).trim())) e.tools = 'กรุณาระบุเครื่องมือการประเมินอย่างน้อย 1 รายการ';
                    const th = Number(f.passThreshold);
                    if (!(th > 0 && th <= 100)) e.passThreshold = 'เกณฑ์ผ่านต้องเป็นตัวเลข 1–100';
                    else if (Math.abs(th - this.is.ed.origThreshold) > 0.001) {
                        if (this.is.ed.resultsExist) e.passThreshold = 'มีผลประเมินแล้ว — เปลี่ยนเกณฑ์ผ่านย้อนหลังไม่ได้';
                        else if (!f.thresholdReason.trim()) e.thresholdReason = 'กรุณาระบุเหตุผลที่กำหนดเกณฑ์ผ่านต่างจากเดิม';
                    }
                    return e;
                },
                isFocusErr() {
                    const k = this.IS_ED_STEPS.find(s => this.isEdErrStep(s.k)); if (k) this.is.ed.step = k.k;
                    this.$nextTick(() => { const el = document.querySelector('[data-is-ed] .is-err'); if (el) el.scrollIntoView({ block: 'center', behavior: this.a3Motion() }); });
                },
                async isSave() {
                    const ed = this.is.ed; if (ed.saving) return;
                    ed.err = ''; ed.fe = this.isValidate();
                    if (Object.keys(ed.fe).length) { ed.err = 'ยังบันทึกไม่ได้ — ' + Object.keys(ed.fe).length + ' ช่องต้องแก้ไข: ' + Object.values(ed.fe)[0]; this.isFocusErr(); return; }
                    if (!ed.reqId) ed.reqId = this.awNewRequestId();
                    const f = ed.f;
                    const plan = { title: f.title, startDate: f.startDate, endDate: f.endDate, primaryUserId: f.primaryUserId, primaryRole: f.primaryRole, coCaregivers: f.coCaregivers,
                                   shortEnabled: !!f.shortEnabled, longEnabled: !!f.longEnabled, decisionRule: f.decisionRule, passThreshold: String(f.passThreshold), thresholdReason: f.thresholdReason,
                                   leadIssue: f.leadIssue, alertIds: f.alertIds, initial: f.initial, tools: f.tools.filter(t => String(t).trim()), masterCriteria: f.masterCriteria };
                    const p = { plan, activities: f.activities.map(a => Object.assign({}, a, { weight: String(a.weight).trim(), rounds: Number(a.rounds) })), goals: f.goals, requestId: ed.reqId };
                    if (ed.id) { p.id = ed.id; p.expectedVersion = ed.version; } else p.clientId = ed.clientId;
                    ed.saving = true;
                    const r = await this.apiCall('issp.save', p);
                    ed.saving = false;
                    if (!r.ok) {
                        if (r.code !== 'NETWORK') ed.reqId = '';
                        ed.fe = r.fields || {}; ed.err = r.fields ? 'ยังบันทึกไม่ได้ — ' + Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ');
                        if (r.fields) this.isFocusErr(); return;
                    }
                    ed.dirty = false; ed.reqId = ''; ed.open = false;
                    this.showToast((ed.id ? 'บันทึกการแก้ไขแผน ' : 'บันทึกแผนใหม่ ') + r.data.planNo + ' แล้ว');
                    this.isAfterChange(ed.clientId);
                    if (!ed.id) { if (this.is.fo.open && !this.is.fo.clientId) this.isPickStudent(ed.clientId); this.isOpenPlan(r.data.id); }
                },
                isStaffName(id) { const s = (this.is.ed.staff || []).find(x => x.id === id); return s ? s.fullName : ''; },

                /* ---- evaluation of one round / review of one goal ---- */
                isOpenEval(a, round) {
                    if (!this.isCanEvalAct(a)) return;
                    const ex = this.isEvalOf(a.id, round);
                    this.is.ev = { open: true, act: a, round, ex, busy: false, err: '', fe: {}, reqId: '',
                                   f: { round, evalDate: ex ? ex.evalDate : this.todayISO(), result: ex ? ex.result : '', tool: ex ? ex.tool : (this.is.pl.data.plan.tools[0] || ''), evidence: ex ? ex.evidence : '', note: ex ? ex.note : '' } };
                },
                isEvRoundChanged() { const ev = this.is.ev, ex = this.isEvalOf(ev.act.id, Number(ev.f.round)); ev.ex = ex; if (ex) Object.assign(ev.f, { evalDate: ex.evalDate, result: ex.result, tool: ex.tool, evidence: ex.evidence, note: ex.note }); },
                async isSaveEval() {
                    const ev = this.is.ev; if (ev.busy) return;
                    const e = {}, t = this.todayISO();
                    if (!ev.f.evalDate) e.evalDate = 'กรุณาระบุวันที่ประเมิน'; else if (ev.f.evalDate > t) e.evalDate = 'วันที่ประเมินต้องไม่อยู่ในอนาคต';
                    if (!ev.f.result) e.result = 'กรุณาเลือกผลประเมิน';
                    if (ev.f.result && ev.f.result !== 'pending' && !String(ev.f.tool).trim()) e.tool = 'กรุณาระบุเครื่องมือหรือหลักฐานที่ใช้ตัดสินผล';
                    ev.fe = e; if (Object.keys(e).length) { ev.err = Object.values(e)[0]; return; }
                    if (!ev.reqId) ev.reqId = this.awNewRequestId();
                    const p = { planId: this.is.pl.id, activityId: ev.act.id, round: Number(ev.f.round), evalDate: ev.f.evalDate, result: ev.f.result, tool: ev.f.tool, evidence: ev.f.evidence, note: ev.f.note, requestId: ev.reqId };
                    if (ev.ex) p.expectedVersion = ev.ex.version;
                    ev.busy = true; ev.err = '';
                    const r = await this.apiCall('issp.eval.save', p);
                    ev.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') ev.reqId = ''; ev.fe = r.fields || {}; ev.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกผลประเมินไม่สำเร็จ'); return; }
                    ev.open = false; this.showToast('บันทึกผลประเมินรอบที่ ' + p.round + ' แล้ว');
                    this.isAfterChange(this.is.pl.data.client.id);
                },
                isOpenReview(g) {
                    if (!this.isCanReviewGoal(g)) return;
                    this.is.gr = { open: true, goal: g, busy: false, err: '', fe: {}, reqId: '', f: { date: this.todayISO(), status: '', note: '', evidence: '' } };
                },
                async isSaveReview() {
                    const gr = this.is.gr; if (gr.busy) return;
                    const e = {};
                    if (!gr.f.date) e.date = 'กรุณาระบุวันที่ประเมิน'; else if (gr.f.date > this.todayISO()) e.date = 'วันที่ประเมินต้องไม่อยู่ในอนาคต';
                    if (!gr.f.status) e.status = 'กรุณาเลือกผลการประเมินเป้าหมาย';
                    if (gr.f.status && gr.f.status !== 'pending' && !gr.f.evidence.trim()) e.evidence = 'กรุณาระบุข้อมูล/หลักฐานที่ใช้พิจารณาตามเกณฑ์';
                    gr.fe = e; if (Object.keys(e).length) { gr.err = Object.values(e)[0]; return; }
                    if (!gr.reqId) gr.reqId = this.awNewRequestId();
                    gr.busy = true; gr.err = '';
                    const r = await this.apiCall('issp.goal.review', { planId: this.is.pl.id, goalId: gr.goal.id, date: gr.f.date, status: gr.f.status, note: gr.f.note, evidence: gr.f.evidence, requestId: gr.reqId });
                    gr.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') gr.reqId = ''; gr.fe = r.fields || {}; gr.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    gr.open = false; this.showToast('บันทึกผลการประเมินเป้าหมายแล้ว');
                    this.isAfterChange(this.is.pl.data.client.id);
                },
                isOpenStatus(to) { this.is.st = { open: true, to, reason: '', busy: false, err: '', reqId: '' }; },
                async isSaveStatus() {
                    const st = this.is.st; if (st.busy) return;
                    if (st.to === 'cancelled' && !st.reason.trim()) { st.err = 'กรุณาระบุเหตุผลการยกเลิกแผน'; return; }
                    if (!st.reqId) st.reqId = this.awNewRequestId();
                    st.busy = true; st.err = '';
                    const r = await this.apiCall('issp.status', { id: this.is.pl.id, toStatus: st.to, reason: st.reason, expectedVersion: this.is.pl.data.plan.version, requestId: st.reqId });
                    st.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') st.reqId = ''; st.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'เปลี่ยนสถานะไม่สำเร็จ'); return; }
                    st.open = false; this.showToast('สถานะแผน: ' + r.data.statusLabel);
                    this.isAfterChange(this.is.pl.data.client.id);
                },

                /* ---- documents (3 buttons): built from the open plan only; A4, Thai font, page numbers ---- */
                isDocOpen(kind) {
                    if (!this.is.pl.data) return;
                    this.is.doc = { open: true, kind, mode: kind === 'summary' ? (this.is.pl.data.plan.summary.complete ? 'final' : 'progress') : kind, built: null, busy: '', err: '', msg: '' };
                    this.isDocBuild();
                },
                isDocSetMode(m) {
                    if (m === 'final' && !this.is.pl.data.plan.summary.complete) return;
                    this.is.doc.mode = m; this.isDocBuild();
                },
                isDocBuild() {
                    const d = this.is.pl.data, k = this.is.doc.mode;
                    if (k === 'final' && !d.plan.summary.complete) { this.is.doc.built = null; return; }
                    const body = k === 'plan' ? this.isDocPlan(d) : k === 'form' ? this.isDocForm(d) : this.isDocSummary(d, k === 'final');
                    const names = { plan: 'แผน', form: 'แบบฟอร์มประเมิน', progress: 'รายงานความคืบหน้า', final: 'รายงานสรุปผล' };
                    this.is.doc.built = { html: '<div class="isd">' + body + '</div>', css: this.isDocCss(), fileName: d.plan.planNo + '_' + names[k] + '_' + this.todayISO() + '.pdf', ref: d.plan.planNo };
                },
                isDocCss() {
                    return `.isd{font-family:'Sarabun','Noto Sans Thai','Leelawadee UI',Tahoma,sans-serif;color:#111;font-size:11.5pt;line-height:1.5;width:168mm;background:#fff}
.isd *{box-sizing:border-box}.isd .sysbar{display:flex;justify-content:space-between;gap:8px;font-size:8.5pt;color:#555;border-bottom:1px solid #999;padding-bottom:3px;margin-bottom:8px}
.isd h1{font-size:15.5pt;margin:4px 0 2px;text-align:center;line-height:1.3}.isd h1 small{display:block;font-size:11pt;font-weight:400;color:#333}
.isd .kind{text-align:center;margin:2px 0 10px}.isd .kind span{display:inline-block;border:1.5px solid #111;border-radius:4px;padding:1px 10px;font-weight:700;font-size:11pt}
.isd h2{font-size:12.5pt;margin:12px 0 5px;padding:3px 8px;background:#f0f0f0;border-left:4px solid #555}
.isd p{margin:3px 0}.isd .fields{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;font-size:10.8pt}.isd .fields div{padding:2px 0;border-bottom:1px dotted #bbb}.isd .fields b{font-weight:700}
.isd table{width:100%;border-collapse:collapse;margin:4px 0 6px;font-size:10pt;table-layout:fixed}
.isd th,.isd td{border:1px solid #777;padding:3px 5px;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}.isd th{background:#e9e9e9;font-weight:700;text-align:left}
.isd td.c,.isd th.c{text-align:center}.isd td.r{text-align:right}.isd .box{border:1px solid #888;border-radius:4px;padding:5px 8px;margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere}
.isd .note{font-size:9.5pt;color:#333}.isd .res{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:4px 0}.isd .res div{border:1px solid #777;border-radius:4px;padding:4px 6px;text-align:center}
.isd .res b{display:block;font-size:13pt}.isd .final{border:2px solid #111;border-radius:6px;padding:6px 10px;margin:6px 0}
.isd .sig{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;margin-top:14px}.isd .sig div{text-align:center;font-size:10.5pt;padding-top:26px}
.isd .sig .ln{border-top:1px dotted #111;margin:0 12px 3px}.isd .blank{display:inline-block;min-width:80px;border-bottom:1px dotted #111}
.isd .chk{display:inline-block;width:11px;height:11px;border:1px solid #111;margin-right:4px;vertical-align:-1px}.isd .foot{margin-top:10px;font-size:8.5pt;color:#555;border-top:1px solid #bbb;padding-top:3px}`;
                },
                isDocHead(d, title, kindLabel) {
                    const e = v => this.isEsc(v), p = d.plan;
                    return '<div class="sysbar"><span>โรงเรียนสาธิตแห่งมหาวิทยาลัยธรรมศาสตร์ • TSS CareSpace</span><span>รหัสแผน ' + e(p.planNo) + '</span></div>' +
                        '<h1>' + e(title) + '<small>แผนสนับสนุนนักเรียนรายบุคคล (Individual Student Support Plan: ISSP)</small></h1>' +
                        (kindLabel ? '<div class="kind"><span>' + e(kindLabel) + '</span></div>' : '') +
                        '<div class="fields"><div><b>นักเรียน:</b> ' + e(d.client.name) + (d.client.nickname ? ' (' + e(d.client.nickname) + ')' : '') + '</div><div><b>ชั้น:</b> ' + e(d.client.grade || '—') + '</div>' +
                        '<div><b>รหัสประจำตัวในระบบ:</b> ' + e(d.client.id) + '</div><div><b>รหัสแผน:</b> ' + e(p.planNo) + '</div>' +
                        '<div><b>ชื่อแผน:</b> ' + e(p.title) + '</div><div><b>สถานะแผน:</b> ' + e(p.statusLabel) + '</div>' +
                        '<div><b>ระยะเวลา:</b> ' + e(this.isDate(p.startDate)) + ' – ' + e(this.isDate(p.endDate)) + '</div><div><b>วันที่ออกเอกสาร:</b> ' + e(this.isDate(this.todayISO())) + '</div></div>';
                },
                isDocPeople(d) {
                    const e = v => this.isEsc(v), p = d.plan;
                    return '<table><thead><tr><th style="width:28%">บทบาทในแผน</th><th>ชื่อ–นามสกุล</th><th style="width:34%">ตำแหน่ง/บทบาท</th></tr></thead><tbody>' +
                        '<tr><td>ผู้ดูแลหลัก</td><td>' + e(p.primaryName) + '</td><td>' + e(p.primaryRole || '—') + '</td></tr>' +
                        (p.coCaregivers.length ? p.coCaregivers.map(c => '<tr><td>ผู้ดูแลร่วม</td><td>' + e(c.name) + '</td><td>' + e(c.role || '—') + '</td></tr>').join('') : '<tr><td>ผู้ดูแลร่วม</td><td colspan="2">ไม่มี</td></tr>') +
                        '<tr><td>ผู้จัดทำแผน</td><td>' + e(p.createdByName) + '</td><td>บันทึกเมื่อ ' + e(this.a3Time(p.createdAt)) + '</td></tr></tbody></table>';
                },
                isDocActs(d, withScore) {
                    const e = v => this.isEsc(v), s = d.plan.summary;
                    let h = '<table><thead><tr><th class="c" style="width:6%">ที่</th><th style="width:13%">ช่วงเวลา</th><th>กิจกรรม / วิธีดำเนินการ</th><th style="width:19%">ตัวชี้วัด</th><th class="c" style="width:9%">น้ำหนัก</th><th class="c" style="width:7%">รอบ</th>' +
                        (withScore ? '<th class="c" style="width:13%">ผ่าน/ไม่ผ่าน/รอ</th><th class="c" style="width:10%">คะแนนส่วนร่วม</th>' : '<th style="width:14%">ผู้รับผิดชอบ</th><th style="width:10%">แผนย่อย</th>') + '</tr></thead><tbody>';
                    d.activities.forEach((a, i) => {
                        const x = s.activities.find(y => y.id === a.id) || {};
                        h += '<tr><td class="c">' + (i + 1) + '</td><td>' + e(a.period) + '</td><td><b>' + e(a.name) + '</b><br>' + e(a.method) + '</td><td>' + e(a.indicator) + '</td><td class="c">' + e(this.isPct(a.weight)) + '</td><td class="c">' + a.rounds + '</td>' +
                            (withScore ? '<td class="c">' + (x.pass || 0) + ' / ' + (x.fail || 0) + ' / ' + (x.pending || 0) + '</td><td class="c">' + e(this.isPct(x.contribution)) + '</td>'
                                       : '<td>' + e(a.responsibleName) + (a.responsibleRole ? '<br><span class="note">' + e(a.responsibleRole) + '</span>' : '') + '</td><td>' + e(a.scopeLabel) + '</td>') + '</tr>';
                    });
                    h += '<tr><td colspan="4" class="r"><b>รวม</b></td><td class="c"><b>' + e(this.isPct(s.weightSum)) + '</b></td><td class="c">' + s.totals.rounds + '</td>' +
                        (withScore ? '<td class="c">' + s.totals.pass + ' / ' + s.totals.fail + ' / ' + s.totals.pending + '</td><td class="c"><b>' + e(this.isPct(s.score)) + '</b></td>' : '<td colspan="2"></td>') + '</tr></tbody></table>';
                    return h;
                },
                isDocGoals(d, withStatus) {
                    const e = v => this.isEsc(v);
                    let h = '';
                    ['short', 'long'].forEach(t => {
                        if (!(t === 'short' ? d.plan.shortEnabled : d.plan.longEnabled)) return;
                        const G = d.goals.filter(g => g.type === t);
                        h += '<p><b>เป้าหมาย' + (t === 'short' ? 'ระยะสั้น' : 'ระยะยาว') + '</b>' + (withStatus ? ' — สถานะรวม: <b>' + e(t === 'short' ? d.plan.summary.shortLabel : d.plan.summary.longLabel) + '</b>' : '') + '</p>';
                        h += '<table><thead><tr><th class="c" style="width:6%">ที่</th><th>เป้าหมาย / เกณฑ์การบรรลุ</th><th style="width:20%">วิธีติดตามและประเมินผล</th><th style="width:13%">ความถี่</th><th style="width:16%">ผู้ประเมิน</th><th style="width:15%">' + (withStatus ? 'สถานะ' : 'เริ่ม – กำหนดประเมิน') + '</th></tr></thead><tbody>' +
                            G.map((g, i) => '<tr><td class="c">' + (i + 1) + '</td><td><b>' + e(g.title) + '</b><br><span class="note">เกณฑ์: ' + e(g.criteria) + '</span></td><td>' + e(g.method) + '</td><td>' + e(g.frequencyLabel) + '</td><td>' + e(g.evaluatorName) + '</td><td>' +
                                (withStatus ? e(g.statusLabel) : e(this.isDate(g.startDate)) + ' – ' + e(this.isDate(g.dueDate))) + '</td></tr>').join('') + '</tbody></table>';
                    });
                    return h;
                },
                isDocPlan(d) {
                    const e = v => this.isEsc(v), p = d.plan, ini = p.initial || {};
                    let h = this.isDocHead(d, 'แผนสนับสนุนนักเรียนรายบุคคล (ISSP)', '');
                    h += '<h2>ผู้ดูแลแผน</h2>' + this.isDocPeople(d);
                    h += '<h2>ประเด็นปัญหานำ</h2><div class="box">' + e(p.leadIssue) + '</div>';
                    h += '<h2>ผลการประเมินเบื้องต้น</h2><table><tbody>' + [['สภาพปัญหา', ini.problem], ['ความต้องการ', ini.needs], ['จุดแข็ง', ini.strengths], ['ข้อจำกัด', ini.limits], ['ข้อมูลอื่นที่เกี่ยวข้อง', ini.other]]
                        .map(r => '<tr><th style="width:24%">' + r[0] + '</th><td>' + (r[1] ? e(r[1]) : '—') + '</td></tr>').join('') + '</tbody></table>';
                    h += '<h2>แผนพัฒนาผู้เรียนรายบุคคล (เป้าหมายที่เปิดใช้)</h2>' + this.isDocGoals(d, false);
                    if (p.shortEnabled && p.longEnabled) h += '<p class="note">เกณฑ์ตัดสินผลของแผนย่อย: ' + e(p.decisionRuleLabel) + '</p>';
                    h += '<h2>แผนปฏิบัติการแม่บท</h2>' + this.isDocActs(d, false);
                    h += '<h2>เครื่องมือการประเมินและเกณฑ์ผ่าน</h2><p><b>เครื่องมือ:</b> ' + p.tools.map(e).join(' • ') + '</p>' +
                        '<p><b>เกณฑ์ผ่านแผนแม่บท:</b> คะแนนแผนแม่บทตั้งแต่ ' + e(this.isPct(p.passThreshold)) + ' ขึ้นไป เมื่อประเมินครบทุกรอบ (คะแนนส่วนร่วมของกิจกรรม = ค่าน้ำหนัก × จำนวนรอบที่ผ่าน ÷ จำนวนรอบที่กำหนด)</p>' +
                        (p.masterCriteria ? '<p><b>รายละเอียดเกณฑ์แผนแม่บท:</b> ' + e(p.masterCriteria) + '</p>' : '') +
                        '<p><b>เกณฑ์ของเป้าหมายย่อย:</b> ตัดสินแยกรายเป้าหมายตามเกณฑ์การบรรลุที่ระบุในตารางเป้าหมาย (บรรลุ / ยังไม่บรรลุ / รอประเมิน) ไม่คิดเป็นเปอร์เซ็นต์</p>';
                    h += '<h2>ระยะเวลาดำเนินงาน</h2><p>' + e(this.isDate(p.startDate)) + ' ถึง ' + e(this.isDate(p.endDate)) + '</p>';
                    h += '<div class="foot">เอกสารจากระบบ TSS CareSpace • ข้อมูลอ่อนไหวของนักเรียน ใช้เพื่อการดูแลช่วยเหลือเท่านั้น • แก้ไขล่าสุด ' + e(this.a3Time(p.updatedAt)) + ' โดย ' + e(p.updatedByName) + '</div>';
                    return h;
                },
                isDocForm(d) {
                    const e = v => this.isEsc(v), p = d.plan;
                    let h = this.isDocHead(d, 'แบบฟอร์มบันทึกผลการประเมินกิจกรรม ISSP', '');
                    h += '<p class="note">ผลประเมินแต่ละรอบ: ทำเครื่องหมายในช่อง ผ่าน / ไม่ผ่าน / รอประเมิน • รอบที่ยังไม่ได้ประเมินให้คงสถานะ “รอประเมิน” (ไม่ถือว่าไม่ผ่าน) • เกณฑ์ผ่านแผนแม่บท ' + e(this.isPct(p.passThreshold)) + '</p>';
                    d.activities.forEach((a, i) => {
                        h += '<h2>กิจกรรมที่ ' + (i + 1) + ': ' + e(a.name) + '</h2><p><b>ช่วงเวลา:</b> ' + e(a.period) + ' • <b>น้ำหนัก:</b> ' + e(this.isPct(a.weight)) + ' • <b>จำนวนรอบ:</b> ' + a.rounds + ' • <b>ผู้รับผิดชอบ:</b> ' + e(a.responsibleName) + '</p>' +
                            '<p><b>ตัวชี้วัด:</b> ' + e(a.indicator) + '</p>' +
                            '<table><thead><tr><th class="c" style="width:7%">รอบ</th><th style="width:14%">วันที่ประเมิน</th><th style="width:17%">ผู้ประเมิน</th><th style="width:18%">เครื่องมือ/หลักฐาน</th><th style="width:20%">ผลประเมิน</th><th>หมายเหตุและข้อเสนอแนะ</th></tr></thead><tbody>';
                        for (let r = 1; r <= a.rounds; r++) {
                            const x = this.isEvalOf(a.id, r);
                            h += '<tr><td class="c">' + r + '</td><td>' + (x && x.result !== 'pending' ? e(this.isDate(x.evalDate)) : '') + '</td><td>' + (x && x.result !== 'pending' ? e(x.evaluatorName) : '') + '</td><td>' + (x && x.result !== 'pending' ? e(x.tool) : '') + '</td><td>' +
                                ['pass', 'fail', 'pending'].map(k => '<span class="chk"' + (x && x.result === k && k !== 'pending' ? ' style="background:#111"' : '') + '></span>' + ({ pass: 'ผ่าน', fail: 'ไม่ผ่าน', pending: 'รอประเมิน' }[k])).join('<br>') + '</td><td>' + (x && x.result !== 'pending' ? e(x.note) : '') + '</td></tr>';
                        }
                        h += '</tbody></table>';
                    });
                    h += '<h2>เป้าหมายย่อย (บันทึกการพิจารณาตามเกณฑ์)</h2><table><thead><tr><th style="width:9%">ประเภท</th><th>เป้าหมาย / เกณฑ์</th><th style="width:14%">วันที่</th><th style="width:24%">ผลการพิจารณา</th><th style="width:22%">ข้อมูล/หลักฐาน</th></tr></thead><tbody>' +
                        d.goals.map(g => '<tr><td>' + e(g.typeLabel) + '</td><td><b>' + e(g.title) + '</b><br><span class="note">เกณฑ์: ' + e(g.criteria) + ' • ความถี่ ' + e(g.frequencyLabel) + '</span></td><td></td><td><span class="chk"></span>บรรลุเป้าหมาย<br><span class="chk"></span>ยังไม่บรรลุเป้าหมาย<br><span class="chk"></span>รอประเมิน</td><td></td></tr>').join('') + '</tbody></table>';
                    h += '<div class="sig"><div><div class="ln"></div>ผู้ประเมิน<br>(<span class="blank"></span>)<br>วันที่ <span class="blank"></span></div><div><div class="ln"></div>ผู้ดูแลหลัก<br>(' + e(p.primaryName) + ')<br>' + e(p.primaryRole) + '</div></div>';
                    return h;
                },
                isDocSummary(d, final) {
                    const e = v => this.isEsc(v), p = d.plan, s = p.summary;
                    let h = this.isDocHead(d, final ? 'รายงานสรุปผลแผนสนับสนุนนักเรียนรายบุคคล (ISSP)' : 'รายงานความคืบหน้าแผนสนับสนุนนักเรียนรายบุคคล (ISSP)', final ? 'รายงานสรุปผลสุดท้าย' : 'รายงานความคืบหน้าระหว่างดำเนินแผน • ออกรายงาน ' + this.isDate(this.todayISO()));
                    h += '<h2>ผู้ดูแลแผน</h2>' + this.isDocPeople(d);
                    h += '<h2>' + (final ? 'ผลการประเมินแผนแม่บท' : 'สรุปความคืบหน้า') + '</h2>' +
                        '<div class="res"><div>รอบที่ผ่าน<b>' + s.totals.pass + '</b></div><div>รอบที่ไม่ผ่าน<b>' + s.totals.fail + '</b></div><div>รอบที่รอประเมิน<b>' + s.totals.pending + '</b></div></div>' +
                        (final ? '<div class="final"><p><b>คะแนนสุดท้ายของแผนแม่บท: ' + e(this.isPct(s.score)) + '</b> (เกณฑ์ผ่าน ' + e(this.isPct(s.threshold)) + ') — ผลแผนแม่บท: <b>' + e(s.masterLabel) + '</b></p></div>'
                               : '<p><b>คะแนนระหว่างดำเนินแผน: ' + e(this.isPct(s.score)) + '</b> (ยังไม่ใช่คะแนนสุดท้าย • ตัวหารคือจำนวนรอบที่กำหนดทั้งหมด ' + s.totals.rounds + ' รอบ • เกณฑ์ผ่าน ' + e(this.isPct(s.threshold)) + ')</p>' +
                                 '<p class="note">สถานะข้อมูล: ' + e(s.stateLabel) + (s.missing.length ? ' — ' + s.missing.map(e).join(' • ') : '') + '</p>');
                    h += '<h2>รายละเอียดแผนปฏิบัติการแม่บทและค่าน้ำหนัก</h2>' + this.isDocActs(d, true);
                    h += '<h2>แผนย่อยที่เปิดใช้</h2>' + this.isDocGoals(d, true) + (p.shortEnabled && p.longEnabled ? '<p class="note">เกณฑ์ตัดสินผลของแผนย่อย: ' + e(p.decisionRuleLabel) + ' — ผลแผนย่อย: <b>' + e(s.subLabel) + '</b></p>' : '');
                    const rounds = this.isRounds();
                    h += '<h2>ไทม์ไลน์การประเมิน</h2><table><thead><tr><th style="width:14%">วันที่ประเมิน</th><th>กิจกรรม</th><th class="c" style="width:7%">รอบ</th><th style="width:12%">ผล</th><th style="width:17%">ผู้ประเมิน</th><th style="width:22%">' + (final ? 'เครื่องมือ/หลักฐาน' : 'หมายเหตุ') + '</th></tr></thead><tbody>' +
                        rounds.map(x => '<tr><td>' + (x.ev && x.ev.result !== 'pending' ? e(this.isDate(x.ev.evalDate)) : '—') + '</td><td>' + e(x.act.name) + '</td><td class="c">' + x.round + '</td><td>' + e(x.ev ? x.ev.resultLabel : 'รอประเมิน') + '</td><td>' + (x.ev && x.ev.result !== 'pending' ? e(x.ev.evaluatorName) : '—') + '</td><td>' +
                            (x.ev ? e(final ? [x.ev.tool, x.ev.evidence].filter(Boolean).join(' — ') : x.ev.note) : '') + '</td></tr>').join('') + '</tbody></table>';
                    if (d.reviews.length) h += '<h2>บันทึกการประเมินเป้าหมาย</h2><table><thead><tr><th style="width:14%">วันที่</th><th>เป้าหมาย</th><th style="width:20%">ผล</th><th style="width:16%">ผู้ประเมิน</th><th style="width:24%">ข้อมูล/หลักฐาน</th></tr></thead><tbody>' +
                        d.reviews.map(r => { const g = d.goals.find(x => x.id === r.goalId); return '<tr><td>' + e(this.isDate(r.date)) + '</td><td>' + e(g ? g.title : '') + '</td><td>' + e(r.statusLabel) + '</td><td>' + e(r.byName) + '</td><td>' + e(r.evidence) + '</td></tr>'; }).join('') + '</tbody></table>';
                    if (final) {
                        h += '<h2>ข้อสรุปผลตามเกณฑ์ของแผน</h2><div class="final"><p>แผนแม่บท: <b>' + e(s.masterLabel) + '</b> (คะแนน ' + e(this.isPct(s.score)) + ' เทียบเกณฑ์ ' + e(this.isPct(s.threshold)) + ')</p>' +
                            (p.shortEnabled ? '<p>เป้าหมายระยะสั้น: <b>' + e(s.shortLabel) + '</b></p>' : '') + (p.longEnabled ? '<p>เป้าหมายระยะยาว: <b>' + e(s.longLabel) + '</b></p>' : '') +
                            (p.shortEnabled && p.longEnabled ? '<p>ผลแผนย่อยตามเกณฑ์ “' + e(p.decisionRuleLabel) + '”: <b>' + e(s.subLabel) + '</b></p>' : '') + '</div>';
                        const co = p.coCaregivers[0];
                        const sig = (role, name, pos) => '<div><div class="ln"></div>(' + (name ? e(name) : '<span class="blank" style="min-width:150px"></span>') + ')<br>' + role + (pos ? '<br><span class="note">' + e(pos) + '</span>' : '<br><span class="note">ตำแหน่ง <span class="blank"></span></span>') + '</div>';
                        h += '<h2>การลงนาม</h2><div class="sig">' + sig('นักเรียน', d.client.name, 'นักเรียน ชั้น ' + (d.client.grade || '')) + sig('ผู้ดูแลหลัก', p.primaryName, p.primaryRole) +
                            sig('ผู้ดูแลร่วม', co ? p.coCaregivers.map(c => c.name).join(', ') : '', co ? p.coCaregivers.map(c => c.role).join(', ') : '') + sig('หัวหน้าฝ่ายสนับสนุนนักเรียน', '', 'หัวหน้าฝ่ายสนับสนุนนักเรียน') + '</div>';
                    }
                    h += '<div class="foot">' + (final ? 'รายงานสรุปผลสุดท้าย — ออกเมื่อข้อมูลการประเมินครบตามเงื่อนไขของแผน' : 'รายงานความคืบหน้าระหว่างดำเนินแผน — ไม่ใช่รายงานสรุปผลสุดท้าย') + ' • วันที่ออกเอกสาร ' + e(this.isDate(this.todayISO())) + ' • ' + e(p.planNo) + '</div>';
                    return h;
                },
                async isDocPrint() {
                    const b = this.is.doc.built; if (!b || this.is.doc.busy) return;
                    this.is.doc.busy = 'print'; this.is.doc.err = ''; this.is.doc.msg = '';
                    const log = await this.apiCall('issp.printLog', { id: this.is.pl.id, kind: this.is.doc.mode, as: 'print' });
                    if (!log.ok) { this.is.doc.busy = ''; this.is.doc.err = log.message || 'ออกเอกสารไม่ได้'; return; }
                    const frame = document.createElement('iframe');
                    frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
                    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
                    document.body.appendChild(frame);
                    try {
                        const w = frame.contentWindow, d = w.document;
                        const st = d.createElement('style');
                        st.textContent = b.css + '\n@page{size:A4 portrait;margin:16mm 18mm 16mm 18mm;@bottom-right{content:"หน้า " counter(page) " / " counter(pages);font-size:9pt;color:#555}@bottom-left{content:"' + b.ref + '";font-size:9pt;color:#555}}\nhtml,body{margin:0;background:#fff}.isd{width:auto}.isd tr,.isd .sig,.isd .final{break-inside:avoid}.isd h2{break-after:avoid}.isd thead{display:table-header-group}';
                        d.head.appendChild(st);
                        const fl = d.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap'; d.head.appendChild(fl);
                        d.body.innerHTML = b.html; d.title = b.fileName.replace(/\.pdf$/, '');
                        try { if (d.fonts && d.fonts.ready) await Promise.race([d.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
                        await new Promise(r => setTimeout(r, 250));
                        const prevTitle = document.title; document.title = d.title; w.focus(); w.print(); document.title = prevTitle;
                        this.is.doc.msg = 'เปิดหน้าต่างพิมพ์แล้ว — เลือกเครื่องพิมพ์ หรือเลือก “บันทึกเป็น PDF”';
                    } catch (e) { this.is.doc.err = 'เปิดหน้าพิมพ์ไม่สำเร็จ — กรุณาลองใหม่ หรือใช้ “ดาวน์โหลด PDF”'; }
                    finally { setTimeout(() => frame.remove(), 1500); this.is.doc.busy = ''; }
                },
                /** real A4 PDF: the document is drawn by the browser (Thai shaping), cut at safe places (rows, headings), table headers repeated, page numbers added */
                async isDocPdf() {
                    const b = this.is.doc.built; if (!b || this.is.doc.busy) return;
                    this.is.doc.busy = 'pdf'; this.is.doc.err = ''; this.is.doc.msg = '';
                    const log = await this.apiCall('issp.printLog', { id: this.is.pl.id, kind: this.is.doc.mode, as: 'pdf' });
                    if (!log.ok) { this.is.doc.busy = ''; this.is.doc.err = log.message || 'ออกเอกสารไม่ได้'; return; }
                    const host = document.createElement('div');
                    host.setAttribute('aria-hidden', 'true');
                    host.style.cssText = 'position:fixed;left:-12000px;top:0;width:174mm;background:#fff;pointer-events:none;z-index:-1';
                    host.innerHTML = '<style>' + b.css + '\n.isd{width:174mm}</style>' + b.html;
                    document.body.appendChild(host);
                    try {
                        await this.ilrLoadLib('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js', () => !!window.htmlToImage);
                        await this.ilrLoadLib('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!(window.jspdf && window.jspdf.jsPDF));
                        try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
                        const docEl = host.querySelector('.isd');
                        docEl.style.paddingBottom = '1px';
                        const M = { top: 16, left: 18, width: 174, height: 258 };
                        const box = docEl.getBoundingClientRect();
                        const pxPerMm = box.width / M.width, pageH = M.height * pxPerMm, total = docEl.scrollHeight;
                        const rel = el => { const r = el.getBoundingClientRect(); return { top: r.top - box.top, bottom: r.bottom - box.top }; };
                        const cand = [];
                        docEl.querySelectorAll('tbody tr, h1, h2, p, .box, .res, .final, table, .sig, .foot, .fields').forEach(el => {
                            const prev = el.previousElementSibling;
                            if (prev && prev.tagName === 'H2' && el.tagName !== 'TR') return;                  // keep a heading with what follows
                            if (el.tagName === 'TR' && el.parentElement.firstElementChild === el) return;
                            cand.push(rel(el).top);
                        });
                        cand.sort((x, y) => x - y);
                        const tables = [...docEl.querySelectorAll('table')].map(t => { const th = t.querySelector('thead'); return { r: rel(t), head: th ? rel(th) : null }; });
                        const pages = []; let y = 0;
                        while (y < total - 1 && pages.length < 60) {
                            const t = tables.find(x => x.head && y > x.head.bottom - 1 && y < x.r.bottom - 1);
                            const headH = t ? t.head.bottom - t.head.top : 0, limit = y + pageH - headH;
                            if (total <= limit) { pages.push({ from: y, to: total, head: t ? t.head : null }); break; }
                            let best = 0; for (const c of cand) { if (c > y + 1 && c <= limit) best = c; }
                            if (!best || best - y < pageH * 0.25) best = limit;
                            pages.push({ from: y, to: best, head: t ? t.head : null }); y = best;
                        }
                        const fontCSS = await this.ilrFontCSS();
                        const imgOpts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false, width: Math.ceil(box.width), height: Math.ceil(total), style: { margin: '0', background: '#ffffff' } };
                        if (fontCSS) imgOpts.fontEmbedCSS = fontCSS; else imgOpts.skipFonts = true;
                        const canvas = await window.htmlToImage.toCanvas(docEl, imgOpts);
                        const sc = canvas.width / box.width;
                        const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
                        pages.forEach((pg, i) => {
                            const headPx = pg.head ? pg.head.bottom - pg.head.top : 0, hPx = headPx + (pg.to - pg.from);
                            const c = document.createElement('canvas'); c.width = canvas.width; c.height = Math.max(1, Math.round(hPx * sc));
                            const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
                            if (pg.head) g.drawImage(canvas, 0, Math.round(pg.head.top * sc), canvas.width, Math.round(headPx * sc), 0, 0, canvas.width, Math.round(headPx * sc));
                            g.drawImage(canvas, 0, Math.round(pg.from * sc), canvas.width, Math.round((pg.to - pg.from) * sc), 0, Math.round(headPx * sc), canvas.width, Math.round((pg.to - pg.from) * sc));
                            if (i) pdf.addPage('a4', 'portrait');
                            pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', M.left, M.top, M.width, hPx / pxPerMm);
                            pdf.setFontSize(8.5); pdf.setTextColor(110);
                            pdf.text((i + 1) + ' / ' + pages.length, 192, 288, { align: 'right' }); pdf.text(b.ref, 18, 288);
                        });
                        pdf.setProperties({ title: b.fileName.replace(/\.pdf$/, ''), creator: 'TSS CareSpace' });
                        pdf.save(b.fileName);
                        this.is.doc.msg = 'ดาวน์โหลดไฟล์ ' + b.fileName + ' แล้ว (' + pages.length + ' หน้า)';
                    } catch (e) {
                        this.is.doc.err = 'สร้างไฟล์ PDF ไม่สำเร็จ — กดอีกครั้ง หรือใช้ “พิมพ์” แล้วเลือก “บันทึกเป็น PDF”';
                    } finally { host.remove(); this.is.doc.busy = ''; }
                },
                /* ===== ตั้งค่าประเภทพฤติกรรม + เกณฑ์ Red Alert (behavior.cats.* — manage_settings, checked on the server) ===== */
                bc: { data: null, loading: false, error: '', q: '', dom: '', status: 'active', ed: null, busy: false, err: '', fe: {}, reqId: '', orderBusy: false, showLog: false },
                async bcLoad() {
                    if (this.bc.loading) return;
                    this.bc.loading = true; this.bc.error = '';
                    const r = await this.apiCall('behavior.cats.get', {});
                    this.bc.loading = false;
                    if (r.ok) this.bc.data = r.data; else this.bc.error = r.message || 'โหลดการตั้งค่าไม่สำเร็จ';
                },
                bcShown() {
                    const d = this.bc.data; if (!d) return [];
                    const q = this.bc.q.trim().toLowerCase();
                    return d.items.filter(c => (!this.bc.dom || c.domain === this.bc.dom) && (this.bc.status === 'all' || (this.bc.status === 'active') === c.active)
                        && (!q || (c.code + ' ' + c.name + ' ' + c.description).toLowerCase().includes(q)));
                },
                bcFiltered() { return !!(this.bc.q || this.bc.dom || this.bc.status !== 'active'); },
                bcClearFilters() { this.bc.q = ''; this.bc.dom = ''; this.bc.status = 'active'; },
                bcRule(c) { return c.alertMode === 'immediate' ? 'แจ้งทันทีทุกครั้งที่บันทึก' : c.alertMode === 'off' ? 'ปิดการแจ้งเตือน' : c.alertMode === 'unset' ? 'ยังไม่ได้ตั้งค่า' : c.threshold + ' ครั้ง' + (c.windowDays ? ' ภายใน ' + c.windowDays + ' วัน' : ' (นับทุกระเบียน)'); },
                bcDomName(code) { const d = ((this.bc.data && this.bc.data.domains) || []).find(x => x.code === code); return d ? d.nameTh : code; },
                bcOpen(c) {
                    this.bc.err = ''; this.bc.fe = {}; this.bc.reqId = '';
                    this.bc.ed = c ? { code: c.code, version: c.version, locked: c.locked, builtin: c.builtin, originalText: c.originalText, domain: c.domain,
                                       name: c.name, description: c.description, group: c.group || '', safetyCandidate: !!c.safetyCandidate, active: c.active, alertMode: c.alertMode, threshold: String(c.threshold), windowDays: String(c.windowDays), note: '',
                                       orig: { alertMode: c.alertMode, threshold: String(c.threshold), windowDays: String(c.windowDays), active: c.active } }
                                   : { code: '', version: 0, locked: false, builtin: false, originalText: '', domain: '', name: '', description: '', group: '', safetyCandidate: false, active: true, alertMode: '', threshold: '', windowDays: '0', note: '', orig: null };
                },
                bcRuleChanged() { const e = this.bc.ed; return !!(e && e.orig && (e.orig.alertMode !== e.alertMode || (e.alertMode === 'frequency' && (e.orig.threshold !== String(e.threshold) || e.orig.windowDays !== String(e.windowDays))))); },
                async bcSave() {
                    const e = this.bc.ed; if (!e || this.bc.busy) return;
                    const fe = {};
                    if (!e.code && !e.domain) fe.domain = 'กรุณาเลือกด้าน';
                    if (!String(e.name).trim()) fe.name = 'กรุณาระบุชื่อประเภทพฤติกรรม';
                    if (!e.alertMode) fe.alertMode = 'กรุณาเลือกรูปแบบการแจ้งเตือน';
                    if (e.alertMode === 'frequency') {
                        const t = Number(e.threshold); if (!(t >= 1 && t <= 999 && Math.floor(t) === t)) fe.threshold = 'จำนวนครั้งต้องเป็นจำนวนเต็ม 1–999';
                        const w = Number(e.windowDays); if (!(String(e.windowDays).trim() !== '' && w >= 0 && w <= 3650 && Math.floor(w) === w)) fe.windowDays = 'ช่วงเวลา 0–3650 วัน (0 = นับทุกระเบียน)';
                    }
                    this.bc.fe = fe; if (Object.keys(fe).length) { this.bc.err = Object.values(fe)[0]; return; }
                    if (!this.bc.reqId) this.bc.reqId = this.awNewRequestId();
                    const fields = { name: e.name, description: e.description, group: e.group || '', active: !!e.active, alertMode: e.alertMode };
                    if (e.alertMode === 'frequency') { fields.threshold = Number(e.threshold); fields.windowDays = Number(e.windowDays); }
                    if (!e.code) fields.domain = e.domain;
                    const p = { fields, note: e.note, requestId: this.bc.reqId };
                    if (e.code) { p.code = e.code; p.expectedVersion = e.version; }
                    this.bc.busy = true; this.bc.err = '';
                    const r = await this.apiCall('behavior.cats.save', p);
                    this.bc.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.bc.reqId = ''; this.bc.fe = r.fields || {}; this.bc.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.bc.ed = null; this.bc.reqId = '';
                    this.showToast((r.data.action === 'created' ? 'เพิ่มประเภท ' : 'บันทึกการตั้งค่า ') + r.data.code + ' แล้ว');
                    this.bm.meta = null;                                     // the recording form reloads the list next time it opens
                    await this.bcLoad();
                },
                async bcMove(code, dir) {
                    const L = this.bc.data.items.map(c => c.code), i = L.indexOf(code), j = i + dir;
                    if (i < 0 || j < 0 || j >= L.length || this.bc.orderBusy) return;
                    L.splice(i, 1); L.splice(j, 0, code);
                    this.bc.orderBusy = true;
                    const r = await this.apiCall('behavior.cats.order', { codes: L, requestId: this.awNewRequestId() });
                    this.bc.orderBusy = false;
                    if (!r.ok) { this.showToast(r.message || 'จัดลำดับไม่สำเร็จ'); return; }
                    this.bc.data.items = r.data.items; this.bm.meta = null;
                },
                bcLogText(l) {
                    if (l.action === 'deleted') return 'ลบประเภทที่ยังไม่เคยใช้งาน' + (l.data && l.data.before ? ' “' + l.data.before.name + '”' : '');
                    const F = { name: 'ชื่อ', description: 'คำอธิบาย', group: 'กลุ่ม', active: 'สถานะ', alertMode: 'รูปแบบแจ้งเตือน', threshold: 'จำนวนครั้ง', windowDays: 'ช่วงเวลา (วัน)' };
                    const v = (k, x) => k === 'active' ? (x ? 'เปิดใช้งาน' : 'ปิดใช้งาน') : k === 'alertMode' ? ((this.bc.data.modes || {})[x] || x) : k === 'windowDays' ? (Number(x) ? x + ' วัน' : 'นับทุกระเบียน') : (x === '' ? '—' : x);
                    if (l.action === 'reordered') return 'จัดลำดับการแสดงผลใหม่';
                    const ch = (l.data && l.data.changes) || {};
                    return Object.keys(ch).map(k => F[k] + ': ' + (l.action === 'created' ? v(k, ch[k].to) : v(k, ch[k].from) + ' → ' + v(k, ch[k].to))).join(' • ');
                },
                BC_ACTION: { created: 'เพิ่มใหม่', updated: 'แก้ไข', archived: 'ปิดใช้งาน', restored: 'เปิดใช้งานอีกครั้ง', reordered: 'จัดลำดับ', deleted: 'ลบ (ไม่เคยใช้งาน)' },
                bcGroups(dom) { const L = (this.bc.data && this.bc.data.items) || []; return [...new Set(L.filter(c => c.group && (!dom || c.domain === dom)).map(c => c.group))]; },
                bcDel: { c: null, confirm: '', busy: false, err: '', reqId: '' },
                bcDelAsk(c) { this.bcDel = { c, confirm: '', busy: false, err: '', reqId: '' }; },
                async bcDelGo() {
                    const D = this.bcDel; if (!D.c || D.busy) return;
                    if (D.confirm.trim() !== D.c.code) { D.err = 'พิมพ์รหัส ' + D.c.code + ' เพื่อยืนยันการลบ'; return; }
                    if (!D.reqId) D.reqId = this.awNewRequestId();
                    D.busy = true; D.err = '';
                    const r = await this.apiCall('behavior.cats.delete', { code: D.c.code, confirm: D.confirm.trim(), expectedVersion: D.c.version, requestId: D.reqId });
                    D.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') D.reqId = ''; D.err = r.message || 'ลบไม่สำเร็จ'; return; }
                    this.showToast('ลบประเภท ' + D.c.code + ' แล้ว'); this.bcDel = { c: null, confirm: '', busy: false, err: '', reqId: '' }; this.bm.meta = null; await this.bcLoad();
                },
                /* ===== การดูแลต่อเนื่องและความปลอดภัย (care.*, referral.*, behavior.alert.safety, behavior.review.*, issp.outcomes) =====
                   Every status shown here comes from the server; nothing is marked saved before the server confirms. */
                cp: { clientId: '', loading: false, error: '', data: null, form: null, busy: false, err: '', fe: {}, reqId: '', rmId: '' },
                sf: { step: '', f: {}, busy: false, err: '', fe: {}, reqId: '' },
                rf: { open: false, clientId: '', alertId: '', f: {}, upd: null, busy: false, err: '', fe: {}, reqId: '', items: [], loading: false },
                rv: { items: [], loading: false, error: '', loaded: false, canWrite: false, move: null, busyId: '' },
                ov: { data: null, wl: null, loading: false, error: '' },
                cs: { data: null, form: null, busy: false, err: '', fe: {}, sheet: null, sheetBusy: false, backupBusy: false, backupMsg: '', retention: null, decide: null, escBusy: false, escMsg: '' },
                sp: { items: [], loading: false, error: '', loaded: false, f: null, busy: false, err: '', fe: {}, reqId: '' },
                io: { data: null, loading: false, error: '', form: null, busy: false, err: '', fe: {}, reqId: '' },
                careErr(r) { return r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); },

                /* ---- profile tab “การดูแลต่อเนื่อง” ---- */
                cpEnter() { if (this.activeStudent && this.cp.clientId !== String(this.activeStudent.id)) { this.cp = { clientId: String(this.activeStudent.id), loading: false, error: '', data: null, form: null, busy: false, err: '', fe: {}, reqId: '', rmId: '' }; this.cpLoad(); } },
                async cpLoad() {
                    const id = this.cp.clientId; if (!id) return;
                    this.cp.loading = true; this.cp.error = '';
                    const r = await this.apiCall('care.profile', { clientId: id });
                    if (this.cp.clientId !== id) return;
                    this.cp.loading = false;
                    if (r.ok) this.cp.data = r.data; else this.cp.error = r.message || 'โหลดข้อมูลไม่สำเร็จ';
                },
                cpOpen(kind) {
                    const t = this.todayISO();
                    const F = { tier: { tier: '', date: t, reason: '' }, strength: { category: '', text: '' },
                                consent: { type: '', giver: '', giverName: '', status: '', date: t, scope: '', method: '' },
                                disclosure: { date: t, toName: '', toRole: '', categories: [], basis: '', purpose: '' }, close: { reason: '', closedDate: t, note: '' } };
                    this.cp.form = { kind, f: F[kind] }; this.cp.err = ''; this.cp.fe = {}; this.cp.reqId = '';
                },
                async cpSave() {
                    const fm = this.cp.form; if (!fm || this.cp.busy) return;
                    if (fm.kind === 'close' && !fm.confirm) { this.cp.err = 'กรุณาทำเครื่องหมายยืนยันการปิดแฟ้มก่อน'; return; }
                    if (!this.cp.reqId) this.cp.reqId = this.awNewRequestId();
                    const base = { clientId: this.cp.clientId, requestId: this.cp.reqId };
                    const A = { tier: ['care.tier.save', Object.assign(base, fm.f)], strength: ['care.strength.save', Object.assign(base, fm.f)],
                                consent: ['care.consent.save', Object.assign(base, { fields: fm.f })], disclosure: ['care.disclosure.save', Object.assign(base, { fields: fm.f })],
                                close: ['care.case.close', Object.assign(base, fm.f)] }[fm.kind];
                    this.cp.busy = true; this.cp.err = '';
                    const r = await this.apiCall(A[0], A[1]);
                    this.cp.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.cp.reqId = ''; this.cp.fe = r.fields || {}; this.cp.err = this.careErr(r); return; }
                    this.cp.form = null; this.cp.reqId = '';
                    this.showToast('บันทึกแล้ว');
                    if (fm.kind === 'close') { this.showProfileModal = false; this.loadData(); return; }
                    this.cpLoad();
                },
                async cpRemoveStrength(s) {
                    if (this.cp.rmId !== s.id) { this.cp.rmId = s.id; return; }        // second click confirms
                    this.cp.rmId = '';
                    const r = await this.apiCall('care.strength.save', { clientId: this.cp.clientId, removeId: s.id, requestId: this.awNewRequestId() });
                    if (!r.ok) { this.showToast(this.careErr(r)); return; }
                    this.cpLoad();
                },
                cpToggleCat(k) { const L = this.cp.form.f.categories, i = L.indexOf(k); if (i >= 0) L.splice(i, 1); else L.push(k); },

                /* ---- referrals (create / next status) ---- */
                rfNew(clientId, alertId) {
                    this.rf = { open: true, clientId: String(clientId), alertId: alertId || '', upd: null, busy: false, err: '', fe: {}, reqId: '', items: [], loading: false,
                                f: { destination: '', destType: '', reason: '', contact: '', sentDate: this.todayISO() } };
                },
                rfStep(item, to) { this.rf = { open: true, clientId: item.clientId, alertId: '', f: {}, upd: { item, to, note: '', appointmentDate: '' }, busy: false, err: '', fe: {}, reqId: '', items: [], loading: false }; },
                async rfSave() {
                    const rf = this.rf; if (rf.busy) return;
                    if (!rf.reqId) rf.reqId = this.awNewRequestId();
                    const p = rf.upd ? { id: rf.upd.item.id, toStatus: rf.upd.to, note: rf.upd.note, appointmentDate: rf.upd.appointmentDate, expectedVersion: rf.upd.item.version, requestId: rf.reqId }
                                     : { clientId: rf.clientId, fields: Object.assign({ alertId: rf.alertId }, rf.f), requestId: rf.reqId };
                    rf.busy = true; rf.err = '';
                    const r = await this.apiCall('referral.save', p);
                    rf.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') rf.reqId = ''; rf.fe = r.fields || {}; rf.err = this.careErr(r); return; }
                    const created = !rf.upd, alertId = rf.alertId;
                    rf.open = false; this.showToast(created ? 'บันทึกการส่งต่อแล้ว' : 'ปรับสถานะการส่งต่อแล้ว');
                    if (this.cp.clientId === String(r.data.item.clientId)) this.cpLoad();
                    if (created && alertId && this.ra.open && this.ra.data && this.ra.data.alert.id === alertId) { this.sfOpen('referral'); this.sf.f.referralId = r.data.item.id; await this.sfSave(); }
                    else if (this.ra.open) this.raOpen(this.ra.id);
                    if (this.tl.clientId === String(r.data.item.clientId)) this.tl.data = null;
                },

                /* ---- Red Alert safety checklist ---- */
                SF_STEPS: [{ k: 'immediate', label: 'ดูแลความปลอดภัยเฉพาะหน้า' }, { k: 'parent', label: 'การแจ้งผู้ปกครอง' }, { k: 'referral', label: 'การส่งต่อ (ถ้ามี)' }, { k: 'followup', label: 'ติดตามหลังเหตุการณ์' }],
                sfDone(k) { const s = this.ra.data && this.ra.data.alert.safety; return !!(s && s.done && s.done[k]); },
                sfCount() { return this.SF_STEPS.filter(s => this.sfDone(s.k)).length; },
                sfOpen(step) {
                    const t = this.todayISO();
                    this.sf = { step, busy: false, err: '', fe: {}, reqId: '',
                                f: { immediate: { done: false, note: '' }, parent: { status: '', date: t, method: '', note: '' }, referral: { referralId: '', note: '' },
                                     followup: { mode: (this.ra.data.alert.safetyData && this.ra.data.alert.safetyData.followup && this.ra.data.alert.safetyData.followup.dueDate) ? 'done' : 'due', dueDate: '', note: '' } }[step] };
                },
                async sfSave() {
                    const sf = this.sf; if (!sf.step || sf.busy) return;
                    if (!sf.reqId) sf.reqId = this.awNewRequestId();
                    let fields = Object.assign({}, sf.f);
                    if (sf.step === 'followup') fields = sf.f.mode === 'done' ? { done: true, note: sf.f.note } : { dueDate: sf.f.dueDate };
                    sf.busy = true; sf.err = '';
                    const r = await this.apiCall('behavior.alert.safety', { id: this.ra.id, step: sf.step, fields, requestId: sf.reqId });
                    sf.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') sf.reqId = ''; sf.fe = r.fields || {}; sf.err = this.careErr(r); return; }
                    this.sf = { step: '', f: {}, busy: false, err: '', fe: {}, reqId: '' };
                    this.showToast('บันทึกขั้นตอนความปลอดภัยแล้ว');
                    this.raOpen(this.ra.id); if (this.can('view_assessment')) this.rlLoad();
                },

                /* ---- review queue ---- */
                async rvLoad() {
                    this.rv.loading = true; this.rv.error = '';
                    const r = await this.apiCall('behavior.review.list', {});
                    this.rv.loading = false;
                    if (r.ok) { this.rv.items = r.data.items; this.rv.canWrite = r.data.canWrite; this.rv.loaded = true; } else this.rv.error = r.message || 'โหลดคิวตรวจทานไม่สำเร็จ';
                },
                async rvConfirm(x) {
                    this.rv.busyId = x.id;
                    const r = await this.apiCall('behavior.review.confirm', { id: x.id, note: '' });
                    this.rv.busyId = '';
                    if (!r.ok) { this.showToast(this.careErr(r)); return; }
                    this.showToast('ตรวจทานแล้ว'); this.rvLoad();
                },
                rvStudents(x) { return (this.students || []).filter(s => String(s.id) !== String(x.clientId)); },
                async rvMove() {
                    const m = this.rv.move; if (!m || m.busy) return;
                    if (!m.toClientId) { m.err = 'กรุณาเลือกนักเรียนที่ถูกต้อง'; return; }
                    if (!m.reason.trim()) { m.err = 'กรุณาระบุเหตุผล'; return; }
                    m.busy = true; m.err = '';
                    const r = await this.apiCall('behavior.review.move', { id: m.id, toClientId: m.toClientId, reason: m.reason });
                    m.busy = false;
                    if (!r.ok) { m.err = this.careErr(r); return; }
                    this.rv.move = null;
                    this.showToast(r.data.archivedSource ? 'ย้ายระเบียนแล้ว และเก็บแฟ้มที่สร้างซ้ำเข้าคลัง' : 'ย้ายระเบียนแล้ว');
                    this.rvLoad(); this.loadData();
                },

                /* ---- overview + workload ---- */
                async ovLoad() {
                    this.ov.loading = true; this.ov.error = '';
                    const r = await this.apiCall('care.overview', {});
                    if (r.ok) { this.ov.data = r.data; if (r.data.canWorkload) { const w = await this.apiCall('care.workload', {}); this.ov.wl = w.ok ? w.data : null; } }
                    else this.ov.error = r.message || 'โหลดภาพรวมไม่สำเร็จ';
                    this.ov.loading = false;
                },

                /* ---- care settings (admin) ---- */
                async csLoad() {
                    const r = await this.apiCall('care.settings.get', {});
                    if (!r.ok) { this.cs.err = r.message || 'โหลดการตั้งค่าไม่สำเร็จ'; return; }
                    this.cs.data = r.data; const s = r.data.settings;
                    this.cs.form = { escalateHours: s.escalateHours, escalateUserIds: s.escalateUserIds.slice(), emergencyContacts: s.emergencyContacts, retentionYears: s.retentionYears, backupKeep: s.backupKeep };
                    const rl = await this.apiCall('care.retention.list', {}); if (rl.ok) this.cs.retention = rl.data;
                },
                csToggleUser(id) { const L = this.cs.form.escalateUserIds, i = L.indexOf(id); if (i >= 0) L.splice(i, 1); else L.push(id); },
                async csSave() {
                    if (this.cs.busy) return;
                    this.cs.busy = true; this.cs.err = ''; this.cs.fe = {};
                    const r = await this.apiCall('care.settings.save', { settings: this.cs.form });
                    this.cs.busy = false;
                    if (!r.ok) { this.cs.fe = r.fields || {}; this.cs.err = this.careErr(r); return; }
                    this.showToast('บันทึกการตั้งค่าแล้ว'); this.csLoad();
                },
                async csSheet() { this.cs.sheetBusy = true; const r = await this.apiCall('care.sheetCheck', {}); this.cs.sheetBusy = false; this.cs.sheet = r.ok ? r.data : { error: r.message }; },
                async csBackup() {
                    this.cs.backupBusy = true; this.cs.backupMsg = '';
                    const r = await this.apiCall('care.backup.run', {});
                    this.cs.backupBusy = false;
                    this.cs.backupMsg = r.ok ? (r.data.ok ? 'สำรองข้อมูลแล้ว: ' + r.data.name : r.data.error) : (r.message || 'สำรองไม่สำเร็จ');
                    this.csLoad();
                },
                async csEscalate() { this.cs.escBusy = true; const r = await this.apiCall('care.escalate.run', {}); this.cs.escBusy = false; this.cs.escMsg = r.ok ? (r.data.configured ? 'ตรวจแล้ว — แจ้งต่อ ' + r.data.escalated + ' รายการ' : 'ยังไม่ได้ตั้งเวลาและผู้รับการแจ้งต่อ') : r.message; },
                async csDecide() {
                    const d = this.cs.decide; if (!d || d.busy) return;
                    d.busy = true; d.err = '';
                    const r = await this.apiCall('care.retention.decide', { id: d.id, decision: d.decision, note: d.note });
                    d.busy = false;
                    if (!r.ok) { d.err = this.careErr(r); return; }
                    this.cs.decide = null; this.showToast('บันทึกผลการทบทวนแล้ว'); this.csLoad();
                },

                /* ---- supervision & self-care (private) ---- */
                async spLoad() {
                    this.sp.loading = true; this.sp.error = '';
                    const r = await this.apiCall('care.sup.list', {});
                    this.sp.loading = false;
                    if (r.ok) { this.sp.items = r.data.items; this.sp.loaded = true; } else this.sp.error = r.message || 'โหลดไม่สำเร็จ';
                },
                spNew() { this.sp.f = { date: this.todayISO(), supervisor: '', topics: '', selfCare: '' }; this.sp.err = ''; this.sp.fe = {}; this.sp.reqId = ''; },
                async spSave() {
                    if (this.sp.busy) return;
                    if (!this.sp.reqId) this.sp.reqId = this.awNewRequestId();
                    this.sp.busy = true; this.sp.err = '';
                    const r = await this.apiCall('care.sup.save', { fields: this.sp.f, requestId: this.sp.reqId });
                    this.sp.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.sp.reqId = ''; this.sp.fe = r.fields || {}; this.sp.err = this.careErr(r); return; }
                    this.sp.f = null; this.showToast('บันทึกแล้ว'); this.spLoad();
                },

                /* ---- ISSP outcomes ---- */
                async ioLoad() {
                    if (!this.is.pl.id) return;
                    const id = this.is.pl.id; this.io.loading = true; this.io.error = '';
                    const r = await this.apiCall('issp.outcomes', { id });
                    if (this.is.pl.id !== id) return;
                    this.io.loading = false;
                    if (r.ok) this.io.data = r.data; else this.io.error = r.message || 'โหลดผลลัพธ์ไม่สำเร็จ';
                },
                ioOpen(kind, name) { this.io.form = { kind, measureName: name || '', value: '', unit: '', baseline: !name, date: this.todayISO(), rating: '', note: '' }; this.io.err = ''; this.io.fe = {}; this.io.reqId = ''; },
                async ioSave() {
                    const f = this.io.form; if (!f || this.io.busy) return;
                    if (!this.io.reqId) this.io.reqId = this.awNewRequestId();
                    this.io.busy = true; this.io.err = '';
                    const r = await this.apiCall('issp.outcome.add', Object.assign({ planId: this.is.pl.id, requestId: this.io.reqId }, f));
                    this.io.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.io.reqId = ''; this.io.fe = r.fields || {}; this.io.err = this.careErr(r); return; }
                    this.io.form = null; this.showToast('บันทึกผลลัพธ์แล้ว'); this.ioLoad();
                },
                ioBeh(b) {
                    const t = b.trend; if (!t) return '';
                    const wk = t.weeks.length ? Math.round(t.since / t.weeks.length * 10) / 10 : 0;
                    return 'ก่อนเริ่มแผน (4 สัปดาห์): เฉลี่ย ' + t.beforeWeekly + ' ครั้ง/สัปดาห์ • ระหว่างแผน: ' + t.since + ' ครั้งใน ' + t.weeks.length + ' สัปดาห์ (เฉลี่ย ' + wk + ' ครั้ง/สัปดาห์)';
                },
                /* ===== System settings hub: features • access rights (roles.*) • appearance; all-school case directory (cases.directory) ===== */
                sys: { tab: 'features' },
                sysEnter() {
                    if (!this.sysCanTab(this.sys.tab)) this.sys.tab = ['features', 'roles', 'look'].find(t => this.sysCanTab(t)) || 'features';
                    if (this.sys.tab === 'roles') this.rpLoad();
                    this.sdEnter(this.sys.tab); this.uaEnter(this.sys.tab); this.phEnter(this.sys.tab); this.stEnter(this.sys.tab);
                    if (this.sys.tab === 'look') this.apEdit();
                },
                sysCanTab(t) {
                    if (t === 'access_history') return this.can('manage_roles') || this.can('view_audit_logs');
                    return ['roles', 'access_matrix', 'access_users'].includes(t) ? (this.can('manage_roles') || this.can('manage_users')) : this.can('manage_settings');
                },
                sysGo(t) { this.sys.tab = t; if (t === 'roles') this.rpLoad(); if (t === 'look') this.apEdit(); this.sdEnter(t); this.uaEnter(t); this.phEnter(t); this.stEnter(t); },
                get sysFeats() {
                    const go = (tab, before) => () => { if (before) before(); this.currentTab = tab; };
                    return [
                        { key: 'behavior', mod: '', icon: 'i-siren', title: 'บันทึกพฤติกรรม • Red Alert', desc: 'บันทึกพฤติกรรมด้วยรหัส แจ้ง Red Alert ตามเกณฑ์ และคิวตรวจทาน — ส่วนหลัก ปิดไม่ได้',
                          links: [{ label: 'ประเภทพฤติกรรม / เชิงบวก / CICO', run: go('bh_settings'), show: () => this.tabAllowed('bh_settings') }] },
                        { key: 'care', mod: '', icon: 'i-hand-heart', title: 'แฟ้มนักเรียนและการดูแลต่อเนื่อง', desc: 'แฟ้ม ระดับการดูแล การส่งต่อ การแจ้งต่อเมื่อไม่มีผู้รับ การสำรองข้อมูล — ส่วนหลัก ปิดไม่ได้',
                          links: [{ label: 'ความปลอดภัย การแจ้งต่อ และข้อมูล', run: go('care_settings'), show: () => this.tabAllowed('care_settings') },
                                  { label: 'แบบประเมิน 360°', run: () => this.a3OpenSettings(), show: () => this.can('manage_settings') }] },
                        { key: 'bullying', mod: 'bullying', icon: 'i-shield-check', title: 'School Bullying', desc: 'รับแจ้งจากครูและนักเรียน จัดการเรื่องตามขั้นตอน นโยบายของโรงเรียน',
                          links: [{ label: 'นโยบายและขั้นตอน', run: go('bullying', () => { this.bl.tab = 'policy'; }), show: () => this.tabAllowed('bullying') }] },
                        { key: 'issp', mod: 'issp', icon: 'i-target', title: 'แผน ISSP', desc: 'แผนช่วยเหลือรายบุคคลร่วมกับทีมและผู้ปกครอง', links: [] },
                        { key: 'pbis', mod: 'pbis', icon: 'i-star', title: 'พฤติกรรมเชิงบวก • ABC • Check-in/Check-out', desc: 'บันทึกพฤติกรรมดี บริบท ABC และบัตรรายวัน CICO',
                          links: [{ label: 'ตั้งค่าเชิงบวกและ CICO', run: go('bh_settings'), show: () => this.tabAllowed('bh_settings') }] },
                        { key: 'counsel', mod: 'counsel', icon: 'i-message-square', title: 'งานให้คำปรึกษา', desc: 'บันทึกการพบ นัดต่อเนื่อง แบบเช็คอินก่อนพบ และกลุ่ม',
                          links: [{ label: 'การแจ้ง “ไม่มาตามนัด” (ปุ่มด้านบนของหน้า)', run: go('counsel'), show: () => this.tabAllowed('counsel') }] },
                        { key: 'prevention', mod: 'prevention', icon: 'i-trending-up', title: 'ป้องกันและส่งเสริม', desc: 'ตัวบ่งชี้เตือนล่วงหน้า นำเข้า CSV คลังกิจกรรม และปฏิทิน',
                          links: [{ label: 'ตัวบ่งชี้และช่วงเวลา', run: go('prevention', () => { this.pv.tab = 'settings'; }), show: () => this.tabAllowed('prevention') }] },
                        { key: 'analytics', mod: 'analytics', icon: 'i-chart-no-axes-combined', title: 'Behavioral Analytics', desc: 'กราฟและแนวโน้มพฤติกรรมรายบุคคลและทั้งโรงเรียน (อ่านอย่างเดียว)', links: [] },
                        { key: 'docs', mod: 'docs', icon: 'i-file-text', title: 'ออกเอกสาร', desc: 'หนังสือราชการและประวัติการออกเอกสาร',
                          links: [{ label: 'ค่าตั้งต้นหัวหนังสือ (ปุ่มในหน้าออกเอกสาร)', run: go('docs'), show: () => this.tabAllowed('docs') || this.can('write_documents') }] },
                        { key: 'clubs', mod: 'clubs', icon: 'i-users-round', title: 'คลับ/ชุมนุม', desc: 'สมาชิกจาก Excel ของระบบสมัครกิจกรรม กิจกรรม เช็กชื่อโดยหัวหน้าคลับ และรายงานการเข้าร่วม (แยกจากงานดูแลช่วยเหลือ)',
                          links: [{ label: 'เปิดหน้าคลับ/ชุมนุม', run: go('clubs'), show: () => this.tabAllowed('clubs') }] }
                    ];
                },
                sysFeatOn(f) { return !f.mod || (this.modForm.open ? !this.modForm.off.includes(f.mod) : this.modOn(f.mod)); },
                /* ---- access rights ---- */
                rp: { data: null, loading: false, err: '', sel: 'social_worker', perms: [], note: '', busy: false, ferr: '', msg: '' },
                async rpLoad(keepSel) {
                    this.rp.loading = true; this.rp.err = '';
                    const r = await this.apiCall('roles.get', {});
                    this.rp.loading = false;
                    if (!r.ok) { this.rp.err = r.message || 'โหลดไม่สำเร็จ'; return; }
                    this.rp.data = r.data;
                    if (!r.data.roles.some(x => x.id === this.rp.sel)) this.rp.sel = r.data.roles[0].id;
                    this.rpPick(this.rp.sel, keepSel);
                },
                rpPick(id, keepMsg) { this.rp.sel = id; const R = this.rpRole; this.rp.perms = R ? R.permissions.slice() : []; this.rp.note = ''; this.rp.ferr = ''; if (!keepMsg) this.rp.msg = ''; },
                get rpRole() { return this.rp.data ? this.rp.data.roles.find(x => x.id === this.rp.sel) : null; },
                get rpGroups() {
                    if (!this.rp.data) return [];
                    const G = [];
                    this.rp.data.permissions.forEach(p => { let g = G.find(x => x.name === p.group); if (!g) G.push(g = { name: p.group, items: [] }); g.items.push(p); });
                    return G;
                },
                rpLocked(p) { const R = this.rpRole; return !R || R.fixed || p.adminOnly || !this.rp.data.canEdit || (R.allowed && !R.allowed.includes(p.key) && !R.permissions.includes(p.key)); },
                rpToggle(p) {
                    if (this.rpLocked(p)) return;
                    const i = this.rp.perms.indexOf(p.key);
                    if (i >= 0) {   // removing a base permission also removes what depends on it
                        const drop = [p.key]; let grew = true;
                        while (grew) { grew = false; this.rp.data.permissions.forEach(q => { if (q.needs && drop.includes(q.needs) && !drop.includes(q.key) && this.rp.perms.includes(q.key)) { drop.push(q.key); grew = true; } }); }
                        this.rp.perms = this.rp.perms.filter(k => !drop.includes(k));
                    } else {        // adding one also adds what it needs
                        const add = [p.key]; let q = p;
                        while (q && q.needs && !this.rp.perms.includes(q.needs) && !add.includes(q.needs)) { add.push(q.needs); q = this.rp.data.permissions.find(x => x.key === q.needs); }
                        this.rp.perms = this.rp.perms.concat(add);
                    }
                    this.rp.msg = '';
                },
                rpDiff(p) { const R = this.rpRole; if (!R) return ''; const on = this.rp.perms.includes(p.key), def = R.defaults.includes(p.key); return on === def ? '' : (on ? 'เพิ่มจากค่าเริ่มต้น' : 'ปิดจากค่าเริ่มต้น'); },
                get rpDirty() { const R = this.rpRole; return !!R && this.rp.perms.slice().sort().join() !== R.permissions.slice().sort().join(); },
                rpDefaults() { const R = this.rpRole; if (R) this.rp.perms = R.defaults.slice(); },
                async rpSave() {
                    if (this.rp.busy || !this.rpDirty) return;
                    if (!this.rp.note.trim()) { this.rp.ferr = 'กรุณาระบุเหตุผลของการเปลี่ยนสิทธิ์'; return; }
                    this.rp.busy = true; this.rp.ferr = '';
                    const r = await this.apiCall('roles.save', { role: this.rp.sel, permissions: this.rp.perms.slice(), note: this.rp.note, expectedVersion: this.rp.data.version });
                    this.rp.busy = false;
                    if (!r.ok) { this.rp.ferr = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); if (r.status === 409) this.rpLoad(true); return; }
                    this.rp.data = r.data; this.rpPick(this.rp.sel);
                    this.rp.msg = 'บันทึกแล้ว — มีผลกับคำสั่งถัดไปของผู้ใช้ทุกคนในบทบาทนี้';
                    this.showToast('บันทึกสิทธิ์ของบทบาทแล้ว');
                    const me = await this.apiCall('auth.me', {});                       // my own permissions may have changed too
                    if (me.ok && Array.isArray(me.data.permissions)) this.permissions = me.data.permissions;
                },
                /* ---- appearance (applies to everyone) ---- */
                appear: { announcement: '', announcementTone: 'info', fontScale: 'normal', menuDefault: 'role', homeDefault: 'dashboard' }, apApplied: false,
                ap: { f: null, busy: false, err: '', fe: {} },
                apApply(first) {
                    const z = { normal: '', large: '1.1', xlarge: '1.2' }[this.appear.fontScale] || '';
                    try { document.documentElement.style.zoom = z; } catch (e) {}
                    let stored = null; try { stored = localStorage.getItem('tss.menuAll'); } catch (e) {}
                    if (stored === null) this.menuAll = this.appear.menuDefault === 'all';
                    if (first) {
                        let hf = null; try { hf = localStorage.getItem('tss.homeFirst'); } catch (e) {}
                        if (hf === null && this.appear.homeDefault === 'today' && this.currentTab === 'dashboard' && !this.requestedTab && this.tabAllowed('today')) this.currentTab = 'today';
                    }
                },
                apEdit() { const a = this.appear; this.ap = { f: { announcement: a.announcement || '', announcementTone: a.announcementTone || 'info', fontScale: a.fontScale || 'normal', menuDefault: a.menuDefault || 'role', homeDefault: a.homeDefault || 'dashboard' }, busy: false, err: '', fe: {} }; },
                async apSave() {
                    if (this.ap.busy) return;
                    this.ap.busy = true; this.ap.err = ''; this.ap.fe = {};
                    const r = await this.apiCall('appearance.save', { settings: Object.assign({}, this.ap.f) });
                    this.ap.busy = false;
                    if (!r.ok) { this.ap.fe = r.fields || {}; this.ap.err = r.fields ? 'กรุณาตรวจสอบช่องที่มีข้อความสีแดง' : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.appear = r.data.appearance; this.apApply(false); this.apEdit();
                    this.showToast('บันทึกการแสดงผลแล้ว — ผู้ใช้คนอื่นเห็นเมื่อโหลดหน้าครั้งถัดไป');
                },
                /* ---- all-school case directory (read-only for the four professions) ---- */
                cd: { list: null, loading: false, err: '', q: '', grade: '', mine: 'all', readOnly: true },
                async cdLoad() {
                    this.cd.loading = true; this.cd.err = '';
                    const r = await this.apiCall('cases.directory', {});
                    this.cd.loading = false;
                    if (r.ok) { this.cd.list = r.data.students; this.cd.readOnly = r.data.readOnly; } else this.cd.err = r.message || 'โหลดไม่สำเร็จ';
                },
                get cdLevels() { const L = []; (this.cd.list || []).forEach(s => { const m = /^(ม|ป)\.?\s*(\d)/.exec(s.grade || ''); const k = m ? m[1] + '.' + m[2] : 'อื่น ๆ'; if (!L.includes(k)) L.push(k); }); return L; },
                get cdShown() {
                    const q = this.cd.q.trim().toLowerCase().replace(/\s/g, '');
                    return (this.cd.list || []).filter(s => {
                        if (this.cd.mine === 'mine' && !s.assignedToMe) return false;
                        if (this.cd.mine === 'other' && s.assignedToMe) return false;
                        if (this.cd.grade) { const m = /^(ม|ป)\.?\s*(\d)/.exec(s.grade || ''); if ((m ? m[1] + '.' + m[2] : 'อื่น ๆ') !== this.cd.grade) return false; }
                        if (!q) return true;
                        return [s.name, s.nickname, s.grade, s.team.join(' ')].join(' ').toLowerCase().replace(/\s/g, '').includes(q);
                    });
                },
                cdOpen(s) { this.openProfile({ id: s.id, name: s.name, grade: s.grade, nickname: s.nickname, riskLevel: s.riskLevel, avatar: '', readOnly: !s.assignedToMe && this.cd.readOnly }); },
                /* ===== School data: academic years, student roster + school calendar import, import history, staff timetables, backups, handbook ===== */
                SYS_GROUPS: [
                    { name: 'ระบบ', tabs: [['features', 'ฟีเจอร์', 'i-layout-grid'], ['roles', 'สิทธิ์การเข้าถึง', 'i-key-round'], ['access_matrix', 'ตารางสิทธิ์', 'i-sheet'], ['access_users', 'มอบหมายบทบาท', 'i-users-round'], ['access_history', 'ประวัติสิทธิ์', 'i-history'], ['look', 'การแสดงผล', 'i-sparkles']] },
                    { name: 'ข้อมูลโรงเรียน', tabs: [['years', 'ปีการศึกษา', 'i-graduation-cap'], ['students', 'ทะเบียนนักเรียน', 'i-users-round'], ['photos', 'รูปนักเรียน', 'i-image'], ['calendar', 'ปฏิทินโรงเรียน', 'i-calendar-range'], ['schedule', 'ตารางนัดหมายเจ้าหน้าที่', 'i-calendar-clock'], ['imports', 'ประวัติการนำเข้า', 'i-history'], ['ext_sources', 'แหล่งข้อมูลเดิม (Google Sheets)', 'i-sheet'], ['backup', 'สำรองข้อมูล', 'i-archive'], ['storage', 'พื้นที่ฐานข้อมูล', 'i-sheet']] },
                    { name: 'ช่วยเหลือ', tabs: [['handbook', 'คู่มือผู้ดูแลระบบ', 'i-book-open']] }
                ],
                sdEnter(t) {
                    if (t === 'years') this.ayLoad();
                    if (t === 'students') { this.ayEnsure(); this.slLoad(); }
                    if (t === 'calendar') { this.ayEnsure().then(() => { if (!this.cy.year) this.cy.year = this.ayDefault(); this.cyLoad(); }); }
                    if (t === 'schedule') this.scLoad();
                    if (t === 'imports') this.ihLoad();
                    if (t === 'ext_sources') { this.xtLoad(); this.xtUnLoad(0); this.xsLoad(); }
                    if (t === 'backup') this.bkLoad();
                    if (t === 'handbook') this.hbLoad();
                },
                /* ---------- academic years ---------- */
                ay: { data: null, loading: false, err: '', f: null, cur: null },
                async ayLoad() { this.ay.loading = true; this.ay.err = ''; const r = await this.apiCall('ay.list', {}); this.ay.loading = false; if (r.ok) this.ay.data = r.data; else this.ay.err = r.message || 'โหลดไม่สำเร็จ'; },
                async ayEnsure() { if (!this.ay.data) await this.ayLoad(); },
                get ayUsable() { return ((this.ay.data && this.ay.data.years) || []).filter(y => y.enabled); },
                ayDefault() { const c = this.ayUsable.find(y => y.isCurrent); return c ? c.id : (this.ayUsable[0] ? this.ayUsable[0].id : ''); },
                AY_STATUS: { active: ['กำลังใช้งาน', 'sd-ok-st'], planning: ['เตรียมการ', 'sd-plan'], closed: ['สิ้นสุดแล้ว', 'sd-closed'] },
                ayNew() { const last = this.ayUsable[0], y = last ? String(Number(last.id) + 1) : String(new Date().getFullYear() + 543); this.ay.f = { isNew: true, id: y, label: 'ปีการศึกษา ' + y, startDate: '', endDate: '', enabled: true, version: 0, busy: false, fe: {}, err: '' }; },
                ayEdit(y) { this.ay.f = { isNew: false, id: y.id, label: y.label, startDate: y.startDate, endDate: y.endDate, enabled: y.enabled, version: y.version, busy: false, fe: {}, err: '' }; },
                async aySave() {
                    const f = this.ay.f; if (!f || f.busy) return;
                    f.busy = true; f.fe = {}; f.err = '';
                    const r = await this.apiCall('ay.save', { fields: { id: f.id, label: f.label, startDate: f.startDate, endDate: f.endDate, enabled: f.enabled }, expectedVersion: f.isNew ? undefined : f.version });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ay.data = r.data; this.ay.f = null; this.showToast('บันทึกปีการศึกษาแล้ว');
                },
                ayCurOpen(y) { this.ay.cur = { id: y.id, confirm: '', note: '', busy: false, err: '' }; },
                async ayCurSave() {
                    const c = this.ay.cur; if (!c || c.busy) return;
                    c.busy = true; c.err = '';
                    const r = await this.apiCall('ay.setCurrent', { id: c.id, confirm: c.confirm.trim(), note: c.note });
                    c.busy = false;
                    if (!r.ok) { c.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ay.data = r.data; this.ay.cur = null; this.modLoad(); this.showToast('เปลี่ยนปีการศึกษาปัจจุบันเป็น ' + c.id + ' แล้ว');
                },
                /* ---------- one import engine for the student roster and the school calendar ---------- */
                IMP_FIELDS: {
                    students: [['studentId', 'StudentID (เลขประจำตัว)', true, ['studentid', 'id', 'รหัส', 'เลขประจำตัว', 'รหัสนักเรียน', 'เลขประจำตัวนักเรียน']], ['prefix', 'คำนำหน้า', false, ['prefix', 'คำนำหน้า', 'คำนำหน้าชื่อ', 'prefixth', 'คำนำหน้าth']],
                               ['firstName', 'ชื่อ', true, ['firstname', 'ชื่อ', 'name', 'nameth', 'ชื่อth']], ['lastName', 'นามสกุล', true, ['lastname', 'นามสกุล', 'surname', 'surnameth', 'นามสกุลth']], ['nickname', 'ชื่อเล่น', false, ['nickname', 'ชื่อเล่น', 'nicknameth', 'ชื่อเล่นth']],
                               ['level', 'ระดับชั้น', true, ['level', 'ระดับชั้น', 'ชั้น', 'grade', 'class']], ['room', 'ห้อง', false, ['room', 'ห้อง', 'ห้องเรียน']], ['number', 'เลขที่', false, ['number', 'no', 'เลขที่']],
                               ['status', 'สถานะการศึกษา', false, ['status', 'สถานะ', 'สถานะการศึกษา']]],
                    club: [['studentId', 'StudentID', true, ['studentid', 'id', 'รหัส', 'รหัสนักเรียน', 'เลขประจำตัว', 'เลขประจำตัวนักเรียน']], ['studentName', 'ชื่อนักเรียน (ไว้ตรวจ)', false, ['studentname', 'name', 'ชื่อ', 'ชื่อนามสกุล', 'ชื่อ-นามสกุล', 'ชื่อ–นามสกุล']],
                           ['clubId', 'ClubID', true, ['clubid', 'club', 'รหัสคลับ', 'รหัสชุมนุม']], ['clubName', 'ชื่อคลับ (ไว้ตรวจ)', false, ['clubname', 'ชื่อคลับ', 'ชื่อชุมนุม', 'ชุมนุม']],
                           ['academicYear', 'ปีการศึกษา', false, ['academicyear', 'year', 'ปีการศึกษา', 'ปี']], ['status', 'สถานะสมาชิก', false, ['membershipstatus', 'status', 'สถานะ', 'สถานะสมาชิก']]],
                    calendar: [['title', 'ชื่อกิจกรรม', true, ['title', 'summary', 'ชื่อกิจกรรม', 'กิจกรรม', 'ชื่อ']], ['startDate', 'วันที่เริ่ม', true, ['startdate', 'dtstart', 'วันที่', 'วันที่เริ่ม', 'วันเริ่ม', 'date']],
                               ['endDate', 'วันที่สิ้นสุด', false, ['enddate', 'dtend', 'วันที่สิ้นสุด', 'ถึงวันที่', 'วันสิ้นสุด']], ['startTime', 'เวลาเริ่ม', false, ['starttime', 'เวลาเริ่ม', 'เวลา']], ['endTime', 'เวลาสิ้นสุด', false, ['endtime', 'เวลาสิ้นสุด', 'ถึงเวลา']],
                               ['location', 'สถานที่', false, ['location', 'สถานที่']], ['category', 'ประเภทกิจกรรม', false, ['category', 'ประเภท', 'ประเภทกิจกรรม']], ['audience', 'กลุ่มเป้าหมาย / ระดับชั้น', false, ['audience', 'กลุ่มเป้าหมาย', 'ระดับชั้น']],
                               ['detail', 'รายละเอียด', false, ['detail', 'description', 'รายละเอียด']], ['owner', 'ผู้รับผิดชอบ', false, ['owner', 'ผู้รับผิดชอบ']], ['status', 'สถานะ', false, ['status', 'สถานะ']], ['key', 'รหัสกิจกรรม (ถ้ามี)', false, ['key', 'uid', 'รหัสกิจกรรม', 'eventid']]]
                },
                imp: { kind: '', step: 1, fileName: '', headers: [], rows: [], map: {}, year: '', mode: 'add_only', dupAction: 'skip', check: null, result: null, confirm: false, busy: false, err: '', reqId: '', xOn: true, xcheck: null, xerr: '', xbusy: false, xnext: 0, xtotal: 0, xres: null, xbatch: '', xdone: false },
                impOpen(kind) { this.imp = { kind, step: 1, fileName: '', headers: [], rows: [], map: {}, year: kind === 'club' ? this.cm.year : this.ayDefault(), mode: kind === 'students' ? 'add_only' : '', dupAction: 'skip', check: null, result: null, confirm: false, busy: false, err: '', reqId: '', xOn: true, xcheck: null, xerr: '', xbusy: false, xnext: 0, xtotal: 0, xres: null, xbatch: '', xdone: false }; },
                impClose() { this.imp.kind = ''; },
                impCell(v) {
                    if (v instanceof Date && !isNaN(v)) {
                        if (v.getFullYear() < 1901) return String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
                        return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
                    }
                    return v === null || v === undefined ? '' : String(v).trim();
                },
                impCsv(text) {
                    text = text.replace(/^﻿/, ''); const out = []; let row = [], cur = '', q = false;
                    for (let i = 0; i < text.length; i++) {
                        const c = text[i];
                        if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
                        else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
                        else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); out.push(row); row = []; cur = ''; }
                        else cur += c;
                    }
                    if (cur || row.length) { row.push(cur); out.push(row); }
                    return out.filter(r => r.some(x => String(x).trim()));
                },
                impIcs(text) {
                    const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/), rows = [['title', 'startDate', 'endDate', 'startTime', 'endTime', 'location', 'detail', 'status', 'key']];
                    let ev = null;
                    const dt = v => { const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(v || ''); return m ? { d: m[1] + '-' + m[2] + '-' + m[3], t: m[4] ? m[4] + ':' + m[5] : '' } : { d: '', t: '' }; };
                    const un = s => String(s || '').replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
                    lines.forEach(l => {
                        if (l === 'BEGIN:VEVENT') ev = {}; else if (l === 'END:VEVENT' && ev) {
                            const s = dt(ev.DTSTART), e = dt(ev.DTEND); let ed = e.d;
                            if (ed && !s.t && !e.t && ed > s.d) { const x = new Date(ed + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); ed = x.toISOString().slice(0, 10); }   // all-day DTEND is exclusive
                            const st = String(ev.STATUS || '').toUpperCase();
                            rows.push([un(ev.SUMMARY), s.d, ed || s.d, s.t, e.t, un(ev.LOCATION), un(ev.DESCRIPTION), st === 'CANCELLED' ? 'ยกเลิก' : 'กำหนดการ', ev.UID || '']); ev = null;
                        } else if (ev) { const i = l.indexOf(':'); if (i > 0) { const k = l.slice(0, i).split(';')[0].toUpperCase(); if (!(k in ev)) ev[k] = l.slice(i + 1); } }
                    });
                    return rows;
                },
                async impFile(e) {
                    const file = e.target.files && e.target.files[0]; e.target.value = '';
                    if (!file) return;
                    this.imp.err = ''; this.imp.check = null; this.imp.result = null;
                    const name = file.name || '', ext = (name.split('.').pop() || '').toLowerCase();
                    if (['xlsx', 'xls', 'csv', 'ics'].indexOf(ext) < 0) { this.imp.err = 'รองรับเฉพาะไฟล์ .xlsx .xls .csv' + (this.imp.kind === 'calendar' ? ' และ .ics' : ''); return; }
                    if (ext === 'ics' && this.imp.kind !== 'calendar') { this.imp.err = 'ไฟล์ .ics ใช้กับปฏิทินโรงเรียนเท่านั้น'; return; }
                    if (file.size > 8 * 1024 * 1024) { this.imp.err = 'ไฟล์ใหญ่เกิน 8 MB — แบ่งไฟล์ก่อน'; return; }
                    let grid = [];
                    try {
                        if (ext === 'ics') grid = this.impIcs(await file.text());
                        else if (ext === 'csv') grid = this.impCsv(await file.text());
                        else {
                            try { await window.TssLib.load('xlsx'); } catch (e) { /* message below */ }
                            if (!window.XLSX) { this.imp.err = 'อ่านไฟล์ Excel ไม่ได้ (โหลดตัวอ่าน Excel ไม่สำเร็จ) — บันทึกเป็น .csv แล้วลองใหม่'; return; }
                            const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
                            const ws = wb.Sheets[wb.SheetNames[0]];
                            grid = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
                        }
                    } catch (err) { this.imp.err = 'อ่านไฟล์ไม่สำเร็จ — ตรวจว่าไฟล์ไม่เสียและไม่ได้ตั้งรหัสผ่าน'; return; }
                    grid = grid.map(r => r.map(v => this.impCell(v))).filter(r => r.some(x => x));
                    if (grid.length < 2) { this.imp.err = 'ไม่พบข้อมูล — แถวแรกต้องเป็นหัวคอลัมน์ และมีข้อมูลอย่างน้อย 1 แถว'; return; }
                    const headers = grid[0].map((h, i) => h || ('คอลัมน์ ' + (i + 1)));
                    this.imp.fileName = name; this.imp.headers = headers; this.imp.rows = grid.slice(1);
                    const norm = s => String(s).toLowerCase().replace(/[\s._\-()*]/g, ''), map = {};
                    this.IMP_FIELDS[this.imp.kind].forEach(([k, , , syn]) => { const i = headers.findIndex(h => syn.some(x => norm(h) === norm(x))); map[k] = i >= 0 ? String(i) : ''; });
                    this.imp.map = map; this.imp.step = 2;
                },
                get impMissing() { return this.imp.kind ? this.IMP_FIELDS[this.imp.kind].filter(f => f[2] && this.imp.map[f[0]] === '').map(f => f[1]) : []; },
                impRecords() { return this.imp.rows.map(r => { const o = {}; Object.keys(this.imp.map).forEach(k => { const i = this.imp.map[k]; o[k] = i === '' ? '' : (r[Number(i)] || ''); }); return o; }); },
                async impCheck() {
                    if (this.imp.busy) return;
                    if (this.impMissing.length) { this.imp.err = 'จับคู่คอลัมน์ที่จำเป็นก่อน: ' + this.impMissing.join(', '); return; }
                    if (!this.imp.year) { this.imp.err = 'เลือกปีการศึกษา'; return; }
                    this.imp.busy = true; this.imp.err = ''; this.imp.check = null;
                    const r = await this.apiCall({ students: 'students.import', calendar: 'calendar.import', club: 'club.import' }[this.imp.kind], { dryRun: true, year: this.imp.year, mode: this.imp.mode, dupAction: this.imp.dupAction, fileName: this.imp.fileName, rows: this.impRecords() });
                    this.imp.busy = false;
                    if (!r.ok) { this.imp.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'ตรวจสอบไม่สำเร็จ'); return; }
                    this.imp.check = r.data; if (this.imp.kind === 'students') await this.rgXCheck(); this.imp.step = 4; this.imp.confirm = false; this.imp.reqId = this.awNewRequestId();
                },
                async impWrite() {
                    if (this.imp.busy || !this.imp.confirm) return;
                    this.imp.busy = true; this.imp.err = '';
                    const r = await this.apiCall({ students: 'students.import', calendar: 'calendar.import', club: 'club.import' }[this.imp.kind], { dryRun: false, requestId: this.imp.reqId, year: this.imp.year, mode: this.imp.mode, dupAction: this.imp.dupAction, fileName: this.imp.fileName, rows: this.impRecords() });
                    this.imp.busy = false;
                    if (!r.ok) { this.imp.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'นำเข้าไม่สำเร็จ'); return; }
                    this.imp.result = r.data.batch; this.imp.step = 5; if (this.imp.kind === 'students') this.rgXWrite(r.data.batch.id);
                    this.showToast('นำเข้าแล้ว ' + r.data.batch.ok + ' รายการ');
                    if (this.imp.kind === 'students') this.slLoad(); else if (this.imp.kind === 'club') { this.imp.transfers = r.data.transfers || 0; this.clLoad(); } else { this.cyLoad(); this.scCalCache = {}; }
                },
                IMP_ACTION: { create: ['เพิ่มใหม่', 'is-new'], update: ['แก้ไข', 'is-upd'], same: ['ไม่เปลี่ยน', ''], skip: ['ข้าม', 'is-skip'], error: ['ผิดพลาด', 'is-err'] },
                impChangeText(ch) { return Object.keys(ch || {}).map(k => (k.replace('enr.', '') + ': ' + (ch[k][0] || '–') + ' → ' + (ch[k][1] || '–'))).join(' • '); },
                csvDownload(name, rows) {
                    const esc = v => { let s = String(v === null || v === undefined ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // a cell starting with = + - @ is not run as a formula in Excel
                        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
                    const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
                },
                impTemplate(kind) {
                    if (kind === 'club') { this.csvDownload('แบบฟอร์มนำเข้าสมาชิกคลับ.csv', [['StudentID', 'StudentName', 'ClubID', 'ClubName', 'AcademicYear', 'MembershipStatus'], ['(ตัวอย่าง — ลบแถวนี้) 69001', 'ชื่อ นามสกุล', 'C01', 'ชุมนุมดนตรี', this.cm.year || '', 'อนุมัติ']]); return; }
                    if (kind === 'students') this.csvDownload('แบบฟอร์มนำเข้านักเรียน.csv', [['StudentID', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'ระดับชั้น', 'ห้อง', 'เลขที่', 'สถานะการศึกษา'], ['(ตัวอย่าง — ลบแถวนี้) 69001', 'เด็กชาย', 'ชื่อ', 'นามสกุล', '', 'ม.1', '1', '1', 'กำลังศึกษา']]);
                    else this.csvDownload('แบบฟอร์มนำเข้าปฏิทินโรงเรียน.csv', [['ชื่อกิจกรรม', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'สถานที่', 'ประเภทกิจกรรม', 'กลุ่มเป้าหมาย', 'รายละเอียด', 'ผู้รับผิดชอบ', 'สถานะ', 'รหัสกิจกรรม'], ['(ตัวอย่าง — ลบแถวนี้) เปิดภาคเรียน', '17/05/2570', '', '', '', '', 'วันสำคัญ', 'ทุกระดับชั้น', '', '', 'กำหนดการ', '']]);
                },
                impErrorsCsv(list, name) { this.csvDownload(name || 'รายงานข้อผิดพลาด.csv', [['แถวในไฟล์', 'รายการ', 'ผล', 'รายละเอียด']].concat((list || []).filter(x => x.error || x.action === 'error' || x.action === 'skip').map(x => [x.row, x.key + (x.title ? ' ' + x.title : ''), (this.IMP_ACTION[x.action] || [x.action])[0], x.error]))); },
                /* ---------- student roster ---------- */
                sl: { data: null, loading: false, err: '', q: '', level: '', status: '', year: '' },
                async slLoad() {
                    this.sl.loading = true; this.sl.err = '';
                    const r = await this.apiCall('students.list', { q: this.sl.q, level: this.sl.level, status: this.sl.status, year: this.sl.year });
                    this.sl.loading = false; if (r.ok) { this.sl.data = r.data; if (!this.sl.year) this.sl.year = r.data.year; } else this.sl.err = r.message || 'โหลดไม่สำเร็จ';
                },
                lk: { s: null, cands: null, busy: false, err: '' },
                async lkOpen(s) {
                    this.lk = { s, cands: null, busy: true, err: '' };
                    const r = await this.apiCall('students.candidates', { studentId: s.studentId });
                    this.lk.busy = false; if (r.ok) this.lk.cands = r.data.candidates; else this.lk.err = r.message || 'ค้นหาไม่สำเร็จ';
                },
                async lkSave(clientId) {
                    if (this.lk.busy) return; this.lk.busy = true; this.lk.err = '';
                    const r = await this.apiCall('students.link', { studentId: this.lk.s.studentId, clientId });
                    this.lk.busy = false;
                    if (!r.ok) { this.lk.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.lk.s = null; this.showToast(clientId ? 'เชื่อมแฟ้มเคสแล้ว' : 'ยกเลิกการเชื่อมแล้ว'); this.slLoad();
                },
                /* bulk linking of case files made before the roster: proposals (same name + class, one-to-one) → tick → link */
                lb: { open: false, data: null, busy: false, err: '', pick: {}, done: null },
                async lbOpen() {
                    this.lb = { open: true, data: null, busy: true, err: '', pick: {}, done: null };
                    const r = await this.apiCall('students.linkSuggest', {});
                    this.lb.busy = false; if (!r.ok) { this.lb.err = r.message || 'โหลดไม่สำเร็จ'; return; }
                    this.lb.data = r.data; const pk = {}; r.data.sure.forEach(x => { pk[x.studentId] = true; }); this.lb.pick = pk;
                },
                get lbCount() { return this.lb.data ? this.lb.data.sure.filter(x => this.lb.pick[x.studentId]).length : 0; },
                async lbSave() {
                    if (this.lb.busy || !this.lbCount) return; this.lb.busy = true; this.lb.err = '';
                    const pairs = this.lb.data.sure.filter(x => this.lb.pick[x.studentId]).map(x => ({ studentId: x.studentId, clientId: x.clientId }));
                    const r = await this.apiCall('students.linkBulk', { pairs });
                    this.lb.busy = false; if (!r.ok) { this.lb.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.lb.done = r.data; this.slLoad(); if (this.can('view_case')) this.loadData();
                },
                /* ---------- school calendar (year view + one-event edit) ---------- */
                cy: { year: '', data: null, loading: false, err: '' }, ce: null,
                async cyLoad() { if (!this.cy.year) return; this.cy.loading = true; const r = await this.apiCall('calendar.year', { year: this.cy.year }); this.cy.loading = false; if (r.ok) this.cy.data = r.data; else this.cy.err = r.message || 'โหลดไม่สำเร็จ'; },
                ceOpen(e) { this.ce = { id: e.id, version: e.version, f: { title: e.title, startDate: e.startDate, endDate: e.endDate, startTime: e.startTime, endTime: e.endTime, location: e.location, category: e.category, audience: e.audience, detail: e.detail, owner: e.owner, status: e.status }, prevStart: e.startDate, note: '', busy: false, err: '', history: e.history || [] }; },
                ceShift() {     // moving the start date keeps the event's length (a postponed 2-day event stays 2 days)
                    const c = this.ce; if (!c) return; const old = c.prevStart, nw = c.f.startDate;
                    if (old && nw && c.f.endDate) { const days = Math.round((Date.parse(c.f.endDate) - Date.parse(old)) / 864e5); c.f.endDate = this.addDaysISO(nw, Math.max(0, days)); }
                    c.prevStart = nw;
                },
                async ceSave() {
                    const c = this.ce; if (!c || c.busy) return; c.busy = true; c.err = '';
                    const r = await this.apiCall('calendar.event.save', { id: c.id, expectedVersion: c.version, note: c.note, fields: c.f });
                    c.busy = false;
                    if (!r.ok) { c.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ce = null; this.showToast('บันทึกกิจกรรมแล้ว (เก็บค่าเดิมไว้ในประวัติ)'); this.cyLoad(); this.scCalCache = {};
                },
                /* ---------- import history ---------- */
                ih: { data: null, loading: false, err: '', sel: null, undo: null },
                async ihLoad() { this.ih.loading = true; const r = await this.apiCall('imports.list', {}); this.ih.loading = false; if (r.ok) this.ih.data = r.data; else this.ih.err = r.message || 'โหลดไม่สำเร็จ'; },
                async ihOpen(b) { const r = await this.apiCall('imports.get', { id: b.id }); if (r.ok) this.ih.sel = r.data; else this.showToast(r.message); },
                ihUndoOpen(b) { this.ih.undo = { b, note: '', busy: false, err: '', done: null }; },
                async ihUndo() {
                    const u = this.ih.undo; if (!u || u.busy) return; u.busy = true; u.err = '';
                    const r = await this.apiCall('imports.undo', { id: u.b.id, note: u.note });
                    u.busy = false;
                    if (!r.ok) { u.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'ย้อนกลับไม่สำเร็จ'); return; }
                    u.done = r.data; this.ihLoad(); this.showToast('ย้อนการนำเข้าแล้ว');
                },
                IMP_KIND: { students: 'ทะเบียนนักเรียน', calendar: 'ปฏิทินโรงเรียน', club_members: 'สมาชิกคลับ' },
                CLUB_IMP: { valid: ['นำเข้าได้', 'is-new'], same: ['มีอยู่แล้ว', ''], duplicate: ['ซ้ำในไฟล์', 'is-err'], invalid: ['ข้อมูลไม่ถูกต้อง', 'is-err'], unmatched_club: ['ไม่พบ ClubID', 'is-skip'], unmatched_student: ['ไม่พบ StudentID', 'is-skip'], conflict: ['ต้องตรวจ (ย้าย/ถอนตัว)', 'is-upd'], missing: ['ไม่อยู่ในไฟล์ใหม่', 'is-upd'] },
                IMP_MODE: { add_only: 'เพิ่มเฉพาะนักเรียนใหม่', update: 'ปรับปรุงข้อมูลนักเรียนเดิม', new_year: 'ข้อมูลปีการศึกษาใหม่', skip: 'ข้ามรายการที่อาจซ้ำ', add: 'เพิ่มรายการที่อาจซ้ำ' },
                /* ---------- staff timetables ---------- */
                sc: { data: null, loading: false, err: '', sel: '', f: null, prev: null, ex: null },
                SC_DAY_ORDER: [1, 2, 3, 4, 5, 6, 0], SC_DAY: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
                async scLoad() { this.sc.loading = true; const r = await this.apiCall('sched.list', {}); this.sc.loading = false; if (r.ok) { this.sc.data = r.data; if (this.sc.sel) this.scPick(this.sc.sel, true); } else this.sc.err = r.message || 'โหลดไม่สำเร็จ'; },
                get scStaff() { return this.sc.data ? this.sc.data.staff.find(s => s.userId === this.sc.sel) : null; },
                scPick(uid, keep) {
                    this.sc.sel = uid; const s = this.scStaff; if (!s) return;
                    const sch = s.schedule, w = {};
                    for (let d = 0; d < 7; d++) w[d] = sch && sch.weekly[d] ? sch.weekly[d].map(r => ({ start: r.start, end: r.end })) : [];
                    this.sc.f = { active: sch ? sch.active : true, slotMinutes: sch ? sch.slotMinutes : 30, gapMinutes: sch ? sch.gapMinutes : 0, weekly: w, note: sch ? sch.note : '', version: sch ? sch.version : 0, busy: false, err: '', fe: {} };
                    if (!keep) this.sc.ex = null;
                    this.scPreview();
                },
                scAdd(d) { const l = this.sc.f.weekly[d], last = l[l.length - 1]; l.push(last ? { start: last.end, end: last.end < '15:00' ? this.addMinutes(last.end, 120) : last.end } : { start: '09:00', end: '12:00' }); },
                scCopyMon() { const src = this.sc.f.weekly[1]; [2, 3, 4, 5].forEach(d => { this.sc.f.weekly[d] = src.map(r => ({ start: r.start, end: r.end })); }); },
                async scSave() {
                    const f = this.sc.f; if (!f || f.busy) return; f.busy = true; f.err = ''; f.fe = {};
                    const r = await this.apiCall('sched.save', { userId: this.sc.sel, expectedVersion: f.version || undefined, fields: { active: f.active, slotMinutes: Number(f.slotMinutes), gapMinutes: Number(f.gapMinutes), weekly: f.weekly, note: f.note } });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.showToast('บันทึกตารางแล้ว — นัดหมายที่ยืนยันแล้วไม่ถูกเปลี่ยน'); await this.scLoad();
                },
                async scPreview() {
                    const uid = this.sc.sel; this.sc.prev = null; if (!uid) return;
                    const r = await this.apiCall('slots.available', { userId: uid, from: this.todayISO(), to: this.addDaysISO(this.todayISO(), 13) });
                    if (this.sc.sel === uid) this.sc.prev = r.ok ? r.data : { error: r.message };
                },
                scExNew() { this.sc.ex = { id: '', kind: 'leave', date: this.todayISO(), endDate: '', allDay: true, start: '09:00', end: '10:00', note: '', busy: false, err: '' }; },
                scExEdit(x) { this.sc.ex = { id: x.id, kind: x.kind, date: x.date, endDate: x.endDate, allDay: x.allDay, start: x.start || '09:00', end: x.end || '10:00', note: x.note || '', busy: false, err: '' }; },
                async scExSave() {
                    const x = this.sc.ex; if (!x || x.busy) return; x.busy = true; x.err = '';
                    const r = await this.apiCall('sched.exception.save', { userId: this.sc.sel, id: x.id || undefined, fields: { kind: x.kind, date: x.date, endDate: x.endDate || x.date, allDay: x.kind === 'hours' ? false : x.allDay, start: x.start, end: x.end, note: x.note } });
                    x.busy = false;
                    if (!r.ok) { x.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.sc.ex = null; this.showToast('บันทึกแล้ว'); await this.scLoad();
                },
                async scExRemove(x) { const r = await this.apiCall('sched.exception.remove', { id: x.id }); if (r.ok) { this.showToast('ลบรายการแล้ว'); this.scLoad(); } else this.showToast(r.message); },
                SLOT_STATE: { free: 'ว่าง', full: 'เต็ม', closed: 'ปิด', past: 'ผ่านแล้ว' },
                /* ---------- slots in the request-approval form + school calendar in the existing calendars ---------- */
                rqs: { key: '', data: null, loading: false },
                async rqSlotsLoad(uid) {
                    if (!uid || !this.isLoggedIn) return;
                    const from = this.todayISO(), key = uid + '|' + from;
                    if (this.rqs.key === key && (this.rqs.data || this.rqs.loading)) return;
                    this.rqs = { key, data: null, loading: true };
                    const r = await this.apiCall('slots.available', { userId: uid, from, to: this.addDaysISO(from, 20) });
                    if (this.rqs.key === key) this.rqs = { key, data: r.ok ? r.data : null, loading: false };
                },
                rqPickSlot(d, s) { this.rq.form.dateISO = d.date; this.rq.form.startTime = s.start; this.rq.form.endTime = s.end; },
                /* school events for a date range, read once per range (cleared after an import or an edit) */
                scCalCache: {},
                schoolRange(from, to) {
                    if (!this.isLoggedIn || !from || !to) return [];
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return [];   // a page not opened yet (e.g. prevention month not set): no request
                    if (!this.modsReady) return [];                              // the academic year is not known yet: one request for the year once it is
                    const yr = this.curYear;
                    if (yr && yr.startDate && yr.endDate && from >= yr.startDate && to <= yr.endDate && !(from === yr.startDate && to === yr.endDate)) {
                        const all = this.schoolRange(yr.startDate, yr.endDate), k2 = from + '|' + to, m = window.__tssScCut || (window.__tssScCut = new Map());   // plain Map: not reactive
                        let e2 = m.get(k2);
                        if (!e2 || e2.src !== all || e2.n !== all.length) { e2 = { src: all, n: all.length, items: all.filter(e => e.startDate <= to && (e.endDate || e.startDate) >= from) }; m.set(k2, e2); }   // same rule as the server
                        return e2.items;
                    }
                    const k = from + '|' + to, c = this.scCalCache;
                    if (!(k in c)) { c[k] = []; this.apiCall('calendar.list', { from, to }).then(r => { this.scCalCache[k] = r.ok ? r.data.items : []; }); }
                    return c[k];
                },
                schoolOn(iso) { const d = this.weekDays; return this.schoolRange(d[0].dateISO, d[4].dateISO).filter(e => e.startDate <= iso && e.endDate >= iso); },
                SCHOOL_ST: { scheduled: '', postponed: 'เลื่อน', cancelled: 'ยกเลิก' },
                curYear: null,      // set by modules.get — changed only by an administrator (ay.setCurrent), never from the clock
                get sdYearEvents() { const y = this.curYear; return y && y.startDate && y.endDate ? this.schoolRange(y.startDate, y.endDate) : []; },
                get sdUpcoming() { const t = this.todayISO(); return this.sdYearEvents.filter(e => e.endDate >= t && e.status !== 'cancelled').slice(0, 3); },
                sdByMonth(items) {
                    const out = [], ix = {}, M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
                    (items || []).forEach(e => { const ym = e.startDate.slice(0, 7); if (!(ym in ix)) { ix[ym] = out.length; out.push({ ym, label: M[Number(ym.slice(5)) - 1] + ' ' + (Number(ym.slice(0, 4)) + 543), items: [] }); } out[ix[ym]].items.push(e); });
                    return out;
                },
                sdEvWhen(e) { const d = s => Number(s.slice(8)) + ' ' + this.thMonthShort(s).split(' ')[0]; return (e.endDate && e.endDate !== e.startDate ? d(e.startDate) + '–' + d(e.endDate) : d(e.startDate)) + (e.startTime ? ' • ' + e.startTime + (e.endTime ? '–' + e.endTime : '') + ' น.' : ''); },
                get heroItems() {
                    const t = this.todayISO(), [y, m] = t.split('-').map(Number), last = new Date(Date.UTC(y, m, 0)).getUTCDate();
                    return this.schoolRange(t.slice(0, 8) + '01', t.slice(0, 8) + String(last).padStart(2, '0')).filter(e => e.status !== 'cancelled');
                },
                get heroMonthLabel() { const t = this.todayISO(), m = Number(t.slice(5, 7)); return ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][m - 1] + ' ' + (Number(t.slice(0, 4)) + 543); },
                thMonthShort(iso) { const m = Number(iso.slice(5, 7)); return ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1] + ' ' + (Number(iso.slice(0, 4)) + 543); },
                /* availability of the provider chosen in the appointment calendar filter (when that person has a timetable) */
                calAv: { key: '', data: null },
                async calAvLoad() {
                    const name = this.scheduleProviderFilter; if (!this.isLoggedIn || !name || name === 'all') { this.calAv = { key: '', data: null }; return; }
                    const st = ((this.apptMeta && this.apptMeta.staff) || []).find(s => s.fullName === name || s.name === name); if (!st) { this.calAv = { key: '', data: null }; return; }
                    const d = this.weekDays, key = (st.id || st.userId) + '|' + d[0].dateISO; if (this.calAv.key === key) return;
                    this.calAv = { key, data: null };
                    const r = await this.apiCall('slots.available', { userId: st.id || st.userId, from: d[0].dateISO, to: d[4].dateISO });
                    if (this.calAv.key === key) this.calAv.data = r.ok && r.data.configured && r.data.active ? r.data : null;
                },
                calCellAv(dayKey, slotIndex) {
                    const a = this.calAv.data; if (!a) return null;
                    const dm = this.weekDays.find(d => d.key === dayKey); if (!dm) return null;
                    const day = a.days.find(x => x.date === dm.dateISO); if (!day) return null;
                    const [s, e] = this.timeSlots[slotIndex].time.split(' - ');
                    const inside = day.slots.filter(x => x.start < e && s < x.end);
                    if (!inside.length) return { label: day.closedReason ? 'ไม่รับนัด' : 'นอกเวลา', cls: 'is-off', title: day.closedReason || 'อยู่นอกเวลาให้บริการ' };
                    const free = inside.filter(x => x.state === 'free').length;
                    if (free) return { label: 'ว่าง ' + free + ' ช่วง', cls: 'is-free', title: inside.filter(x => x.state === 'free').map(x => x.start + '–' + x.end).join(', ') };
                    if (inside.every(x => x.state === 'closed')) return { label: 'ปิดรับนัด', cls: 'is-off', title: inside[0].reason || '' };
                    if (inside.every(x => x.state === 'past')) return { label: 'ผ่านแล้ว', cls: 'is-off', title: '' };
                    return { label: 'เต็ม', cls: 'is-full', title: 'ทุกช่วงมีนัดแล้ว' };
                },
                /* a number + colour per member of staff in the appointment calendars (the number and name carry the meaning, the colour only helps) */
                STAFF_PAL: [['#fde68a', '#78350f'], ['#bae6fd', '#0c4a6e'], ['#bbf7d0', '#14532d'], ['#fbcfe8', '#831843'], ['#ddd6fe', '#4c1d95'], ['#fed7aa', '#7c2d12'], ['#99f6e4', '#134e4a'], ['#e5e7eb', '#1f2937']],
                staffMark(name) {
                    const list = ((this.apptMeta && this.apptMeta.staff) || []).map(s => s.fullName), i = list.indexOf(name);
                    if (i < 0 || list.length < 2) return { n: '', style: '' };
                    const c = this.STAFF_PAL[i % this.STAFF_PAL.length];
                    return { n: String(i + 1), style: 'background:' + c[0] + ';color:' + c[1] };
                },
                staffLabel(name) { const m = this.staffMark(name); return (m.n ? m.n + ' · ' : '') + (name || ''); },
                /* ---------- backups ---------- */
                bk: { data: null, loading: false, err: '', busy: false },
                async bkLoad() { this.bk.loading = true; const r = await this.apiCall('backups.info', {}); this.bk.loading = false; if (r.ok) this.bk.data = r.data; else this.bk.err = r.message || 'โหลดไม่สำเร็จ'; },
                async bkNow() {
                    if (this.bk.busy) return; this.bk.busy = true;
                    const r = await this.apiCall('care.backup.run', {});
                    this.bk.busy = false;
                    if (!r.ok) { this.showToast(r.message); return; }
                    this.showToast(r.data.ok ? 'สำรองข้อมูลแล้ว: ' + r.data.name : (r.data.error || 'สำรองข้อมูลไม่สำเร็จ')); this.bkLoad();
                },
                async bkSchedule(on) { if (this.bk.busy) return; this.bk.busy = true; const r = await this.apiCall('backups.schedule', { on }); this.bk.busy = false; if (r.ok) { this.bk.data = r.data; this.showToast(on ? 'เปิดสำรองข้อมูลอัตโนมัติทุกวันเวลา 02:00 น.' : 'ปิดการสำรองอัตโนมัติแล้ว'); } else this.showToast(r.message); },
                fileSize(n) { n = Number(n) || 0; return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; },
                /* ---------- handbook: live system info + who looks after the system ---------- */
                hb: { data: null, loading: false, err: '', f: null, busy: false, ferr: '' },
                async hbLoad() {
                    this.hb.loading = true; const r = await this.apiCall('system.info', {}); this.hb.loading = false;
                    if (r.ok) { this.hb.data = r.data; this.hb.f = Object.assign({}, r.data.handover); } else this.hb.err = r.message || 'โหลดไม่สำเร็จ';
                },
                async hbSave() {
                    if (this.hb.busy) return; this.hb.busy = true; this.hb.ferr = '';
                    const r = await this.apiCall('handover.save', { fields: this.hb.f }); this.hb.busy = false;
                    if (!r.ok) { this.hb.ferr = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.hb.data.handover = r.data.handover; this.showToast('บันทึกผู้รับผิดชอบระบบแล้ว');
                },
                get hbCellPct() { const d = this.hb.data; return d ? Math.min(100, Math.round(d.cells / d.cellLimit * 1000) / 10) : 0; },
                /* ===== One student search for every form: the school roster (students.search on the server) ===== */
                spx: {
                    bf: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' },
                    hq: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' },
                    intake: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' },
                    ckn: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' },
                    cks: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' },
                    rq: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' },
                    sched: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' },
                    club: { q: '', items: [], loading: false, done: false, short: false, seq: 0, active: -1, msg: '', err: '' }
                },
                __spT: {},
                spReset(id) { Object.assign(this.spx[id], { q: '', items: [], loading: false, done: false, short: false, active: -1, msg: '', err: '' }); this.spx[id].seq++; },
                /** typing: old results go at once (they no longer match), the search runs 350 ms after the last key */
                spTyping(id) {
                    const s = this.spx[id]; s.items = []; s.done = false; s.active = -1; s.msg = ''; s.err = ''; s.seq++;
                    clearTimeout(this.__spT[id]);
                    const q = s.q.replace(/\s+/g, ' ').trim();
                    s.short = !!q && q.replace(/\s/g, '').length < 2 && !/^\d+$/.test(q);
                    if (!q || s.short) { s.loading = false; return; }
                    const hit = this.spMemoGet(q);
                    if (hit) { s.loading = false; s.done = true; s.items = hit.items || []; s.active = s.items.length ? 0 : -1; return; }   // same words a moment ago: no new request
                    s.loading = true;
                    this.__spT[id] = setTimeout(() => this.spRun(id), 350);
                },
                async spRun(id) {
                    const s = this.spx[id], seq = s.seq, q = s.q;
                    const who = this.authUser && this.authUser.id;
                    const r = await this.apiCall('students.search', { q, limit: 12 });
                    if (r.ok && who && this.authUser && this.authUser.id === who) this.spMemoPut(q.replace(/\s+/g, ' ').trim(), r.data, who);
                    if (seq !== s.seq || q !== s.q) return;                 // a newer search has started — drop this answer
                    s.loading = false; s.done = true;
                    if (!r.ok) { s.items = []; s.err = r.message || 'ค้นหาไม่สำเร็จ'; return; }
                    s.items = r.data.items || []; s.active = s.items.length ? 0 : -1;
                },
                /* answers of the last minute for the same words — memory only (never stored in the browser), light items only,
                   cleared on sign-out / another account. Opening a file is still checked by the server every time. */
                spMemoGet(q) {
                    const m = this.__spMemo, who = this.authUser && this.authUser.id;
                    if (!m || m.who !== who) return null;
                    const e = m.map.get(q); if (!e) return null;
                    if (Date.now() - e.at > 60000) { m.map.delete(q); return null; }
                    return e.data;
                },
                spMemoPut(q, data, who) {
                    if (!this.__spMemo || this.__spMemo.who !== who) this.__spMemo = { who, map: new Map() };
                    const m = this.__spMemo.map; m.delete(q); m.set(q, { at: Date.now(), data });
                    while (m.size > 30) m.delete(m.keys().next().value);
                },
                spKey(id, e) {
                    const s = this.spx[id], n = s.items.length;
                    if (e.key === 'ArrowDown' && n) { e.preventDefault(); s.active = (s.active + 1) % n; this.spScroll(id); }
                    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); s.active = (s.active - 1 + n) % n; this.spScroll(id); }
                    else if (e.key === 'Enter') { e.preventDefault(); if (n && s.active >= 0) this.spPick(id, s.items[s.active]); }
                    else if (e.key === 'Escape' && (s.q || n)) { e.stopPropagation(); this.spReset(id); }
                },
                spScroll(id) { this.$nextTick(() => { const el = document.getElementById('sp-' + id + '-o' + this.spx[id].active); if (el) el.scrollIntoView({ block: 'nearest' }); }); },
                spSub(it) {
                    const a = [];
                    if (it.studentId) a.push('StudentID ' + it.studentId);
                    if (it.grade) a.push(it.grade + (it.number ? ' เลขที่ ' + it.number : ''));
                    if (it.status && it.status !== 'studying') a.push(it.statusLabel || it.status);
                    a.push(it.source === 'file' ? 'แฟ้มเดิม (ยังไม่มี StudentID)' : (it.clientId ? 'มีแฟ้มที่คุณดูแล' : (it.hasFile ? 'มีแฟ้มแล้ว' : 'ยังไม่มีแฟ้ม')));
                    return a.join(' • ');
                },
                /** label for a case file in the remaining lists: name • class • StudentID (never the internal id) */
                stuLabel(s) { return s ? [s.name, s.grade, s.studentId ? 'StudentID ' + s.studentId : ''].filter(Boolean).join(' • ') : ''; },
                spGoRoster() { this.currentTab = 'sys_settings'; this.sys.tab = 'students'; this.sysEnter(); },
                spNoFile(id) { this.spx[id].msg = 'นักเรียนคนนี้ยังไม่มีแฟ้มที่คุณดูแล — เปิดแฟ้มก่อนที่ “บันทึกข้อมูลผู้รับบริการ” หรือขอให้หัวหน้างานมอบหมาย'; },
                spPick(id, it) {
                    if (!it) return;
                    const s = this.spx[id];
                    if (id === 'bf') {
                        if (it.clientId) { const f = this.students.find(x => String(x.id) === String(it.clientId)); this.bfPickStudent(f || { id: it.clientId, name: it.name, grade: it.grade, nickname: it.nickname }); this.bf.studentId = ''; this.bf.rosterPick = null; }
                        else { this.bf.clientId = ''; this.bf.studentId = it.studentId; this.bf.rosterPick = it; this.bf.suggest = false; this.bf.dirty = true; this.bf.reqId = ''; ['firstName', 'lastName', 'level', 'room'].forEach(k => delete this.bf.fe[k]); }
                    } else if (id === 'hq') {
                        this.hqPick({ key: it.key, clientId: it.clientId || '', studentId: it.clientId ? '' : it.studentId, name: it.name, grade: [it.grade, it.studentId ? 'StudentID ' + it.studentId : ''].filter(Boolean).join(' • ') });
                    } else if (id === 'intake') {
                        if (it.clientId) { this.isCreatingNewStudentInCase = false; this.formStudentId = it.clientId; this.onSelectStudentForCase(); this.newStudentIntake.studentId = ''; }
                        else if (it.hasFile) { s.msg = 'นักเรียนคนนี้มีแฟ้มเคสอยู่แล้ว แต่คุณยังไม่ได้รับมอบหมาย — ขอให้หัวหน้างานมอบหมายแฟ้มให้ (ไม่เปิดแฟ้มซ้ำ)'; return; }
                        else {
                            this.isCreatingNewStudentInCase = true; this.formStudentId = '';
                            Object.assign(this.newStudentIntake, { name: it.name, nickname: it.nickname || '', studentId: it.studentId, rosterGrade: it.grade });
                            if (it.grade) this.caseForm.grade = it.grade;
                        }
                    } else if (id === 'club') {
                        if (!it.studentId) { s.msg = 'แฟ้มนี้ยังไม่ผูก StudentID — เพิ่มสมาชิกคลับได้เฉพาะนักเรียนในทะเบียนกลาง'; return; }
                        this.clAddMember(it);
                    } else if (id === 'ckn' || id === 'cks' || id === 'rq' || id === 'sched') {
                        if (!it.clientId) { this.spNoFile(id); return; }
                        if (id === 'ckn') { this.ckNote.f.clientId = String(it.clientId); this.ckLoadNotes(); }
                        if (id === 'cks') this.ckSer.f.clientId = String(it.clientId);
                        if (id === 'rq') this.rq.form.clientId = it.clientId;
                        if (id === 'sched') this.newScheduleForm.clientId = it.clientId;
                    }
                    const keepMsg = s.msg; this.spReset(id); s.msg = keepMsg;
                },
                /* ===== Club management (Clubs.gs) — every right is checked on the server; this page only shows what the server returned ===== */
                cm: { meta: null, year: '', view: 'cards', list: null, loading: false, err: '', q: '', fStatus: '', fCat: '', fAdv: '', sel: null, dtab: 'members', mq: '',
                      f: null, cp: null, acts: null, af: null, att: null, asg: null, mv: null, rm: null, tr: null, rep: null, rf: { clubId: '', from: '', to: '' }, staff: null, notice: '', over: null, hist: null },
                get isStudentAcct() { return !!(this.authUser && this.authUser.studentAccount); },
                get clubMine() { return (this.cm.meta && this.cm.meta.mine) || []; },
                get clubCanManage() { return !!(this.cm.meta && this.cm.meta.canManage); },
                get clubAccess() { return this.isStudentAcct || this.can('manage_clubs') || this.clubMine.length > 0; },
                CLUB_ICONS: ['🎵', '🎨', '⚽', '🤖', '📚', '🔬', '🎭', '🌱', '🏀', '♟️', '📷', '🍳', '💻', '🗣️', '🧵', '🎯'],
                async clMeta() { const r = await this.apiCall('club.meta', {}); if (r.ok) { this.cm.meta = r.data; if (!this.cm.year) this.cm.year = r.data.year; } return r.ok; },
                async clEnter() {
                    if (!this.cm.meta) await this.clMeta();
                    if (!this.cm.year && this.cm.meta) this.cm.year = this.cm.meta.year;
                    this.clLoad();
                },
                async clLoad() {
                    if (!this.cm.year) { this.cm.err = 'ยังไม่มีปีการศึกษาปัจจุบัน — ผู้ดูแลระบบตั้งได้ที่ ตั้งค่าระบบ › ปีการศึกษา'; return; }
                    this.cm.loading = true; this.cm.err = '';
                    const r = await this.apiCall('club.list', { year: this.cm.year });
                    this.cm.loading = false; if (r.ok) this.cm.list = r.data; else this.cm.err = r.message || 'โหลดไม่สำเร็จ';
                    if (this.cm.sel && this.cm.view === 'detail') this.clOpen(this.cm.sel.club.clubId, true);
                },
                clYear(y) { this.cm.year = y; this.cm.view = 'cards'; this.cm.sel = null; this.cm.rep = null; this.clLoad(); },
                get clCards() {
                    const L = this.cm.list; if (!L) return [];
                    const q = this.cm.q.trim().toLowerCase();
                    return L.items.filter(c => (!q || (c.clubId + ' ' + c.name + ' ' + c.nameEn + ' ' + c.category + ' ' + c.advisors.map(a => a.name).join(' ')).toLowerCase().includes(q))
                        && (!this.cm.fStatus || c.status === this.cm.fStatus) && (!this.cm.fCat || c.category === this.cm.fCat) && (!this.cm.fAdv || c.advisors.some(a => a.userId === this.cm.fAdv)));
                },
                get clAdvisorOptions() { const m = {}; ((this.cm.list && this.cm.list.items) || []).forEach(c => c.advisors.forEach(a => { m[a.userId] = a.name; })); return Object.keys(m).map(k => ({ id: k, name: m[k] })); },
                clRateText(rate) { return rate === null || rate === undefined ? 'ยังไม่มีข้อมูล' : rate + '%'; },
                clGo(view) { this.cm.view = view; if (view === 'transfers') this.clTransfers(); if (view === 'report') this.clReport(); },
                /* ---------- one club ---------- */
                async clOpen(clubId, keepTab) {
                    const r = await this.apiCall('club.get', { year: this.cm.year, clubId });
                    if (!r.ok) { this.showToast(r.message); return; }
                    this.cm.sel = r.data; this.cm.view = 'detail'; if (!keepTab) { this.cm.dtab = r.data.scope.manage || r.data.scope.advisor ? 'members' : 'activities'; this.cm.mq = ''; this.cm.att = null; }
                    this.clActs();
                },
                clBack() { this.cm.view = 'cards'; this.cm.sel = null; this.cm.att = null; this.clLoad(); },
                get clMembersShown() {
                    const s = this.cm.sel; if (!s) return []; const q = this.cm.mq.trim().toLowerCase();
                    return s.members.filter(m => !q || (m.studentId + ' ' + m.name + ' ' + m.nickname + ' ' + m.grade).toLowerCase().includes(q));
                },
                MEMBER_ST: { active: 'สมาชิก', removed: 'นำออกแล้ว', moved: 'ย้ายคลับแล้ว' },
                clNew() { this.cm.f = { isNew: true, sameClub: false, clubId: '', name: '', nameEn: '', description: '', category: '', icon: '', location: '', capacity: '', schedule: '', status: 'preparing', deputyCanCheck: false, version: 0, note: '', busy: false, err: '', fe: {} }; },
                clEdit() { const c = this.cm.sel.club; this.cm.f = { isNew: false, sameClub: false, clubId: c.clubId, name: c.name, nameEn: c.nameEn, description: c.description, category: c.category, icon: c.icon, location: c.location, capacity: c.capacity === null ? '' : c.capacity, schedule: c.schedule, status: c.status, deputyCanCheck: c.deputyCanCheck, version: c.version, note: '', busy: false, err: '', fe: {} }; },
                async clSave() {
                    const f = this.cm.f; if (!f || f.busy) return; f.busy = true; f.err = ''; f.fe = {};
                    const fields = { clubId: f.clubId.trim(), name: f.name, nameEn: f.nameEn, description: f.description, category: f.category, icon: f.icon, location: f.location, capacity: f.capacity === '' || f.capacity === null ? '' : Number(f.capacity), schedule: f.schedule, status: f.status, deputyCanCheck: !!f.deputyCanCheck };
                    const r = await this.apiCall('club.save', { year: this.cm.year, clubId: f.isNew ? undefined : f.clubId, expectedVersion: f.isNew ? undefined : f.version, sameClub: f.sameClub, note: f.note, fields });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); if (r.status === 409 && /เคยใช้กับคลับ/.test(r.message || '')) f.askSame = true; return; }
                    this.cm.f = null; this.showToast('บันทึกคลับแล้ว');
                    await this.clLoad(); this.clOpen(r.data.club.clubId);
                },
                async clRemove() {
                    const c = this.cm.sel.club; const r = await this.apiCall('club.remove', { year: this.cm.year, clubId: c.clubId });
                    if (!r.ok) { this.showToast('⚠️ ' + r.message); return; }
                    this.cm.f = null; this.showToast('ลบคลับที่ยังไม่มีข้อมูลแล้ว'); this.clBack();
                },
                clCopyOpen() { const ys = (this.cm.meta.years || []).filter(y => y.id !== this.cm.year); this.cm.cp = { from: ys[0] ? ys[0].id : '', busy: false, err: '', done: null }; },
                async clCopy() {
                    const c = this.cm.cp; if (!c || c.busy) return; c.busy = true; c.err = '';
                    const r = await this.apiCall('club.copyYear', { fromYear: c.from, toYear: this.cm.year }); c.busy = false;
                    if (!r.ok) { c.err = r.fields ? Object.values(r.fields)[0] : r.message; return; }
                    c.done = r.data; this.clLoad();
                },
                /* ---------- members ---------- */
                async clAddMember(it, confirmOver) {
                    const s = this.cm.sel; if (!s || !it || !it.studentId) { this.spx.club.msg = 'เลือกนักเรียนจากทะเบียน (ต้องมี StudentID)'; return; }
                    const r = await this.apiCall('club.member.add', { year: this.cm.year, clubId: s.club.clubId, studentId: it.studentId, confirmOver: !!confirmOver });
                    if (!r.ok) { this.spx.club.msg = r.message || 'เพิ่มไม่สำเร็จ'; return; }
                    if (r.data.needsConfirm) { this.cm.over = { it, message: r.data.message }; return; }
                    this.cm.over = null; this.showToast('เพิ่ม ' + it.name + ' แล้ว'); this.clOpen(s.club.clubId, true);
                },
                clRmOpen(m) { this.cm.rm = { m, reason: '', busy: false, err: '' }; },
                async clRm() {
                    const x = this.cm.rm; if (!x || x.busy) return; x.busy = true; x.err = '';
                    const r = await this.apiCall('club.member.remove', { id: x.m.id, reason: x.reason }); x.busy = false;
                    if (!r.ok) { x.err = r.fields ? Object.values(r.fields)[0] : r.message; return; }
                    this.cm.rm = null; this.showToast('นำออกแล้ว (เก็บประวัติไว้)'); this.clOpen(this.cm.sel.club.clubId, true);
                },
                clMvOpen(m) { this.cm.mv = { m, to: '', reason: '', busy: false, err: '' }; },
                async clMv() {
                    const x = this.cm.mv; if (!x || x.busy) return; x.busy = true; x.err = '';
                    const r = await this.apiCall('club.member.move', { year: this.cm.year, id: x.m.id, toClubId: x.to, reason: x.reason }); x.busy = false;
                    if (!r.ok) { x.err = r.fields ? Object.values(r.fields)[0] : r.message; return; }
                    this.cm.mv = null; this.showToast('ย้ายคลับแล้ว — ประวัติคลับเดิมยังอยู่'); this.clOpen(this.cm.sel.club.clubId, true);
                },
                async clHistory(m) {
                    const r = await this.apiCall('club.member.history', { studentId: m.studentId });
                    this.cm.hist = r.ok ? Object.assign({ name: m.name }, r.data) : null; if (!r.ok) this.showToast(r.message);
                },
                /* ---------- advisors / leaders ---------- */
                async clAsgOpen(role) {
                    if (role === 'advisor' && !this.cm.staff) { const r = await this.apiCall('club.staff', {}); this.cm.staff = r.ok ? r.data.staff : []; }
                    this.cm.asg = { role, userId: '', studentId: '', note: '', busy: false, err: '' };
                },
                async clAsg() {
                    const x = this.cm.asg; if (!x || x.busy) return; x.busy = true; x.err = '';
                    const r = await this.apiCall('club.assign', { year: this.cm.year, clubId: this.cm.sel.club.clubId, role: x.role, userId: x.userId, studentId: x.studentId, note: x.note }); x.busy = false;
                    if (!r.ok) { x.err = r.fields ? Object.values(r.fields)[0] : r.message; return; }
                    this.cm.asg = null; this.cm.sel = r.data; this.showToast('มอบหมายแล้ว'); this.clMeta();
                },
                async clUnasg(a) {
                    const r = await this.apiCall('club.unassign', { id: a.id, note: 'สิ้นสุดโดยเจ้าหน้าที่' });
                    if (!r.ok) { this.showToast(r.message); return; } this.cm.sel = r.data; this.showToast('สิ้นสุดการมอบหมายแล้ว (เก็บประวัติ)');
                },
                /* ---------- activities ---------- */
                async clActs() {
                    const s = this.cm.sel; if (!s) return;
                    const r = await this.apiCall('club.activities', { year: this.cm.year, clubId: s.club.clubId });
                    this.cm.acts = r.ok ? r.data : { items: [], error: r.message };
                },
                get clActsShown() { return (this.cm.acts && this.cm.acts.items) || []; },
                clActNew() { this.cm.af = { id: '', title: '', date: this.todayISO(), start: '', end: '', location: (this.cm.sel && this.cm.sel.club.location) || '', kind: 'regular', owner: '', status: 'scheduled', note: '', repeat: false, until: '', version: 0, busy: false, err: '', fe: {}, warnings: [], reqId: this.awNewRequestId() }; },
                clActEdit(a) { this.cm.af = { id: a.id, title: a.title, date: a.date, start: a.start, end: a.end, location: a.location, kind: a.kind, owner: a.owner, status: a.status, note: a.note, repeat: false, until: '', version: a.version, busy: false, err: '', fe: {}, warnings: a.school.length ? [a.date + ': ' + a.school.join(', ')] : [] }; },
                async clActSave() {
                    const f = this.cm.af; if (!f || f.busy) return; f.busy = true; f.err = ''; f.fe = {};
                    const r = await this.apiCall('club.activity.save', { year: this.cm.year, clubId: this.cm.sel.club.clubId, id: f.id || undefined, expectedVersion: f.id ? f.version : undefined, requestId: f.id ? undefined : f.reqId,
                        repeat: !f.id && f.repeat ? { until: f.until } : undefined, fields: { title: f.title, date: f.date, start: f.start, end: f.end, location: f.location, kind: f.kind, owner: f.owner, status: f.status, note: f.note } });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    const w = r.data.warnings || [];
                    this.cm.af = null; this.cm.notice = w.length ? 'บันทึกแล้ว — ตรงกับปฏิทินโรงเรียน: ' + w.join(' • ') : '';
                    this.showToast(r.data.items.length > 1 ? 'สร้างกิจกรรมประจำ ' + r.data.items.length + ' ครั้งแล้ว' : 'บันทึกกิจกรรมแล้ว'); this.clActs();
                },
                /* ---------- attendance ---------- */
                async clAttOpen(a) {
                    const r = await this.apiCall('club.attendance.get', { activityId: a.id });
                    if (!r.ok) { this.showToast(r.message); return; }
                    const marks = {}; r.data.rows.forEach(x => { marks[x.studentId] = { status: x.status, time: x.checkInTime, saved: x.status, savedTime: x.checkInTime }; });
                    this.cm.att = Object.assign(r.data, { marks, reason: '', busy: false, err: '', msg: '', reqId: this.awNewRequestId() });
                },
                clMark(sid, st) {
                    const a = this.cm.att, m = a.marks[sid]; if (!m) return;
                    if (m.saved && !a.canCorrect) return;                         // a saved record is changed only by the advisor / officer
                    m.status = st; if (st === 'late' && !m.time) m.time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
                    a.reqId = this.awNewRequestId();
                },
                clAllPresent() { const a = this.cm.att; Object.keys(a.marks).forEach(k => { if (!a.marks[k].saved && !a.marks[k].status) a.marks[k].status = 'present'; }); a.reqId = this.awNewRequestId(); },
                get clAttChanges() {
                    const a = this.cm.att; if (!a) return { fresh: 0, fixed: 0, blank: 0 };
                    let fresh = 0, fixed = 0, blank = 0;
                    Object.keys(a.marks).forEach(k => { const m = a.marks[k]; if (!m.status) blank++; else if (!m.saved) fresh++; else if (m.status !== m.saved || (m.time || '') !== (m.savedTime || '')) fixed++; });
                    return { fresh, fixed, blank };
                },
                async clAttSave() {
                    const a = this.cm.att; if (!a || a.busy) return;
                    const ch = this.clAttChanges; if (!ch.fresh && !ch.fixed) { a.err = 'ยังไม่มีรายการใหม่หรือรายการที่แก้ไข'; return; }
                    if (ch.fixed && !a.reason.trim()) { a.err = 'การแก้ไขรายการที่บันทึกแล้วต้องระบุเหตุผล'; return; }
                    const entries = Object.keys(a.marks).filter(k => { const m = a.marks[k]; return m.status && (!m.saved || m.status !== m.saved || (m.time || '') !== (m.savedTime || '')); })
                        .map(k => ({ studentId: k, status: a.marks[k].status, checkInTime: a.marks[k].status === 'late' ? (a.marks[k].time || '') : '' }));
                    a.busy = true; a.err = '';
                    const r = await this.apiCall('club.attendance.save', { activityId: a.activity.id, requestId: a.reqId, reason: a.reason, entries });
                    a.busy = false;
                    if (!r.ok) { a.err = r.message || 'บันทึกไม่สำเร็จ'; return; }
                    const ref = r.data.refused || [];
                    this.showToast('เซิร์ฟเวอร์บันทึกแล้ว: ใหม่ ' + r.data.saved + ' • แก้ไข ' + r.data.changed + (ref.length ? ' • ไม่บันทึก ' + ref.length : ''));
                    const act = a.activity; await this.clAttOpen(act); if (this.cm.att) this.cm.att.msg = ref.length ? 'ไม่บันทึก: ' + ref.join(' • ') : '';
                    if (this.cm.sel) this.clActs();
                },
                ATT_KEYS: ['present', 'late', 'leave', 'absent'],
                /* ---------- transfers (from imports) ---------- */
                async clTransfers() { const r = await this.apiCall('club.transfers', { year: this.cm.year }); this.cm.tr = r.ok ? Object.assign(r.data, { d: null }) : { items: [], error: r.message }; },
                async clDecide(t, approve) {
                    const note = (this.cm.tr.note || '').trim(); if (!note) { this.cm.tr.error = 'ระบุเหตุผลก่อนอนุมัติหรือไม่อนุมัติ'; return; }
                    const r = await this.apiCall('club.transfer.decide', { id: t.id, approve, note });
                    if (!r.ok) { this.cm.tr.error = r.message; return; }
                    this.cm.tr.note = ''; this.showToast(approve ? 'อนุมัติย้ายคลับแล้ว' : 'ไม่อนุมัติ — นักเรียนอยู่คลับเดิม'); this.clTransfers(); this.clLoad();
                },
                /* ---------- reports + export ---------- */
                async clReport() {
                    const f = this.cm.rf; this.cm.rep = { loading: true };
                    const r = await this.apiCall('club.report', { year: this.cm.year, clubId: f.clubId, from: f.from, to: f.to });
                    this.cm.rep = r.ok ? r.data : { error: r.message };
                },
                clSafeCell(v) { if (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) return "'" + v; return v === null || v === undefined ? '' : v; },   // no formula runs when the file is opened
                async clExportXlsx() {
                    const R = this.cm.rep; if (!R || !R.summary) return;
                    try { await window.TssLib.load('xlsx'); } catch (e) { /* toast below */ }
                    if (!window.XLSX) { this.showToast('⚠️ โหลดตัวสร้าง Excel ไม่สำเร็จ'); return; }
                    const S = this.clSafeCell, wb = window.XLSX.utils.book_new();
                    const a = [['ClubID', 'ชื่อคลับ', 'สมาชิก', 'กิจกรรมที่จัด', 'ยกเลิก/ไม่มีกิจกรรม', 'มา', 'สาย', 'ลา', 'ขาด', 'อัตราการเข้าร่วม (%)']].concat(R.summary.map(x => [S(x.clubId), S(x.name), x.members, x.held, x.cancelled, x.present, x.late, x.leave, x.absent, x.rate === null ? '' : x.rate]));
                    const b = [['ClubID', 'ชื่อคลับ', 'StudentID', 'ชื่อ–นามสกุล', 'ชั้น', 'สถานะสมาชิก', 'มา', 'สาย', 'ลา', 'ขาด', 'อัตราการเข้าร่วม (%)']].concat(R.students.map(x => [S(x.clubId), S(x.clubName), S(x.studentId), S(x.name), S(x.grade), this.MEMBER_ST[x.memberStatus] || x.memberStatus, x.present, x.late, x.leave, x.absent, x.rate === null ? '' : x.rate]));
                    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(a), 'สรุปรายคลับ');
                    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(b), 'รายบุคคล');
                    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([[R.note]]), 'หมายเหตุ');
                    window.XLSX.writeFile(wb, 'รายงานคลับ-' + R.year + '.xlsx');
                },
                async clExportPdf() {
                    const el = document.querySelector('[data-cl-report-sheet]'); if (!el) return;
                    try {
                        await this.ilrLoadLib('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js', () => !!window.htmlToImage);
                        await this.ilrLoadLib('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!(window.jspdf && window.jspdf.jsPDF));
                        const url = await window.htmlToImage.toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
                        const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                        const img = new Image(); img.src = url; await img.decode();
                        const W = 277, H = W * img.height / img.width, page = 190; let y = 0;
                        while (y < H) { if (y) pdf.addPage(); pdf.addImage(url, 'PNG', 10, 10 - y, W, H); y += page; }
                        pdf.save('รายงานคลับ-' + this.cm.year + '.pdf');
                    } catch (e) { this.showToast('⚠️ สร้าง PDF ไม่สำเร็จ — ใช้ Excel แทน'); }
                },
                /* ===== UIAC: roles, permission matrix, role assignments, history (Access.gs — every change is checked and audited on the server) ===== */
                ua: { data: null, loading: false, err: '', mq: '', mws: '', users: null, uq: '', sel: null, rf: null, af: null, rv: null, hist: null, mig: null },
                UA_STATE: { active: ['ใช้งาน', 'sd-ok-st'], pending: ['ยังไม่เริ่ม', 'sd-plan'], expired: ['หมดวาระ', 'sd-closed'], revoked: ['ยกเลิกแล้ว', 'sd-closed'] },
                UA_ACT: { ROLE_CREATED: 'สร้างบทบาท', ROLE_EDITED: 'แก้ไขบทบาท', ROLE_PERMS_SAVED: 'เปลี่ยนสิทธิ์ของบทบาท', ROLE_ASSIGNED: 'มอบหมายบทบาท', ROLE_REVOKED: 'ยกเลิกบทบาท',
                          ROLES_MIGRATED: 'ย้ายข้อมูลบทบาท', ROLES_MIGRATION_OFF: 'ย้อนกลับไปใช้บทบาทเดิม', ROLES_EXPIRY_SYNC: 'บทบาทหมดวาระ (อัตโนมัติ)', USER_UPDATED: 'แก้ไขผู้ใช้', USER_CREATED: 'สร้างผู้ใช้' },
                uaEnter(t) {
                    if (['roles', 'access_matrix', 'access_users'].includes(t)) this.uaLoad();
                    if (t === 'access_users') this.uaUsers();
                    if (t === 'access_history') this.uaHist();
                },
                async uaLoad() { this.ua.loading = true; this.ua.err = ''; const r = await this.apiCall('access.get', {}); this.ua.loading = false; if (r.ok) this.ua.data = r.data; else this.ua.err = r.message || 'โหลดไม่สำเร็จ'; },
                uaWs(id) { const w = this.ua.data && this.ua.data.workspaces.find(x => x.id === id); return w ? w.label : id; },
                get uaPerms() {
                    const D = this.ua.data; if (!D) return [];
                    const q = this.ua.mq.trim().toLowerCase();
                    return D.permissions.filter(p => (!this.ua.mws || p.workspace === this.ua.mws) && (!q || (p.key + ' ' + p.id + ' ' + p.label + ' ' + p.module).toLowerCase().includes(q)));
                },
                get uaRolesShown() { const D = this.ua.data; if (!D) return []; return D.roles.filter(R => !this.ua.mws || R.workspace === this.ua.mws || (this.ua.mws === 'club' && R.workspace === 'staff' && R.permissions.some(p => ['manage_clubs', 'club_advise'].includes(p)))); },
                uaCell(R, p) {
                    if (!p.handler) return { t: '—', c: 'is-none', title: 'ยังไม่มีระบบรองรับ — ให้สิทธิ์ไม่ได้' };
                    if (R.permissions.includes(p.id)) return { t: '✓', c: 'is-on', title: 'มีสิทธิ์' };
                    if (R.student) return { t: 'ตามมอบหมาย', c: 'is-scope', title: 'บัญชีนักเรียน: ไม่มีสิทธิ์ แต่ทำงานที่ได้รับมอบหมายได้ (เช่น หัวหน้าคลับ)' };
                    return { t: '', c: '', title: 'ไม่มีสิทธิ์' };
                },
                /* ---------- role meta (create / rename / switch off) ---------- */
                uaRoleNew() { this.ua.rf = { id: '', label: '', description: '', workspace: 'staff', student: false, active: true, note: '', version: 0, prefetchLevels: [], busy: false, err: '', fe: {} }; },
                uaRoleEdit(R) { const x = this.ua.data && this.ua.data.roles.find(y => y.id === R.id) || R; this.ua.rf = { id: x.id, label: x.label, description: x.description || '', workspace: x.workspace, student: x.student, active: x.active, note: '', version: x.version || 0, fixed: x.id === 'system_admin', prefetchLevels: (x.prefetchLevels || []).slice(), busy: false, err: '', fe: {} }; },
                async uaRoleSave() {
                    const f = this.ua.rf; if (!f || f.busy) return; f.busy = true; f.err = ''; f.fe = {};
                    const r = await this.apiCall('access.role.save', { id: f.id || undefined, expectedVersion: f.version || undefined, note: f.note, fields: { label: f.label, description: f.description, workspace: f.workspace, student: !!f.student, active: !!f.active, prefetchLevels: (f.prefetchLevels || []).slice() } });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ua.rf = null; this.ua.data = r.data.access; this.showToast(f.id ? 'บันทึกบทบาทแล้ว' : 'สร้างบทบาทแล้ว — กำหนดสิทธิ์ต่อได้เลย');
                    await this.rpLoad(true); this.rpPick(r.data.id);
                },
                /* ---------- users × roles ---------- */
                async uaUsers() { const r = await this.apiCall('access.users', { q: this.ua.uq }); this.ua.users = r.ok ? r.data : { users: [], error: r.message }; },
                async uaUserOpen(u) { const r = await this.apiCall('access.user.get', { userId: u.id }); if (r.ok) this.ua.sel = r.data; else this.showToast(r.message); },
                uaAssignOpen() { this.ua.af = { roleId: '', startDate: this.todayISO(), endDate: '', year: '', note: '', busy: false, err: '', fe: {} }; },
                get uaAssignable() {
                    const D = this.ua.data, S = this.ua.sel; if (!D || !S) return [];
                    const st = S.user.roles.some(r => (D.roles.find(x => x.id === r) || {}).student), any = S.user.roles.length > 0;
                    return D.roles.filter(R => R.active && (!any || R.student === st));
                },
                async uaAssign() {
                    const f = this.ua.af; if (!f || f.busy) return; f.busy = true; f.err = ''; f.fe = {};
                    const r = await this.apiCall('access.assign', { userId: this.ua.sel.user.id, roleId: f.roleId, startDate: f.startDate, endDate: f.endDate, year: f.year, note: f.note });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ua.af = null; this.ua.sel = r.data; this.showToast('มอบหมายบทบาทแล้ว — มีผลตั้งแต่คำสั่งถัดไปของผู้ใช้'); this.uaUsers(); this.uaLoad();
                },
                uaRevokeOpen(a) { this.ua.rv = { a, reason: '', busy: false, err: '' }; },
                async uaRevoke() {
                    const x = this.ua.rv; if (!x || x.busy) return; x.busy = true; x.err = '';
                    const r = await this.apiCall('access.revoke', { id: x.a.id, reason: x.reason }); x.busy = false;
                    if (!r.ok) { x.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'ยกเลิกไม่สำเร็จ'); return; }
                    this.ua.rv = null; this.ua.sel = r.data; this.showToast('ยกเลิกบทบาทแล้ว — ผู้ใช้เสียสิทธิ์นี้ตั้งแต่คำสั่งถัดไป (ประวัติยังอยู่)'); this.uaUsers(); this.uaLoad();
                },
                /* ---------- migration (Users.roles → role assignments) ---------- */
                async uaMigPreview() { this.ua.mig = { loading: true }; const r = await this.apiCall('access.migrate', {}); this.ua.mig = r.ok ? Object.assign(r.data, { backup: false, busy: false, err: '' }) : { err: r.message }; },
                async uaMig() {
                    const m = this.ua.mig; if (!m || m.busy || !m.backup) return; m.busy = true; m.err = '';
                    const r = await this.apiCall('access.migrate', { dryRun: false, backupConfirmed: true }); m.busy = false;
                    if (!r.ok) { m.err = r.fields ? Object.values(r.fields)[0] : r.message; return; }
                    this.ua.mig = null; this.showToast('ย้ายข้อมูลบทบาทแล้ว ' + r.data.created + ' รายการ — สิทธิ์ของทุกคนเหมือนเดิม'); this.uaLoad(); this.uaUsers();
                },
                async uaMigOff() {
                    const note = (this.ua.offNote || '').trim(); if (!note) { this.showToast('⚠️ ระบุเหตุผลของการย้อนกลับ'); return; }
                    const r = await this.apiCall('access.migrate.off', { note }); if (!r.ok) { this.showToast(r.message); return; }
                    this.ua.offNote = ''; this.ua.offOpen = false; this.showToast('ย้อนกลับไปใช้บทบาทเดิม (Users.roles) แล้ว'); this.uaLoad();
                },
                async uaHist() { const r = await this.apiCall('access.history', {}); this.ua.hist = r.ok ? r.data : { items: [], error: r.message }; },
                uaDetail(x) {
                    const d = x.detail || {}, a = [];
                    if (d.role) a.push((this.ua.data && (this.ua.data.roles.find(r => r.id === d.role) || {}).label) || d.role);
                    if (d.added) a.push('เพิ่ม: ' + d.added); if (d.removed) a.push('นำออก: ' + d.removed);
                    if (d.before && d.after) a.push(Object.keys(d.after).filter(k => String(d.before[k]) !== String(d.after[k])).map(k => k + ': ' + d.before[k] + ' → ' + d.after[k]).join(', '));
                    if (d.start || d.end) a.push((d.start || '') + ' – ' + (d.end || 'ไม่กำหนด'));
                    if (d.changes && d.changes.roles) a.push('บทบาท: ' + (d.changes.roles.from || []).join(',') + ' → ' + (d.changes.roles.to || []).join(','));
                    if (d.assignments !== undefined) a.push(d.assignments + ' รายการ'); if (d.users) a.push(d.users + ' บัญชี');
                    const why = d.note || d.reason; if (why) a.push('เหตุผล: ' + why);
                    return a.filter(Boolean).join(' • ');
                },
                uaHomeTab() { return ['clubs', 'today', 'dashboard', 'tools'].find(t => this.tabAllowed(t) && (t !== 'clubs' || this.isStudentAcct)) || ['today', 'dashboard', 'tools', 'clubs'].find(t => this.tabAllowed(t)) || ''; },
                /* ===== รูปนักเรียน (photos.* — upload/delete = manage_settings; view = whoever may open the file; all checked on the server)
                   Images are resized in the browser, kept only in memory while the page is open, never in localStorage. ===== */
                ph: { meta: null, loading: false, err: '', items: [], reading: false, readMsg: '', checked: false, checking: false, consent: false,
                      busy: false, done: 0, total: 0, result: null, filter: '', one: { q: '', data: null, err: '', busy: false, reason: '', delBusy: false, delErr: '' },
                      cur: { clientId: '', url: '', sid: '', loading: false }, pfBusy: false, pfErr: '' },
                PH_ST: { new: 'เพิ่มรูปใหม่', replace: 'มีรูปเดิม — จะแทนที่', not_found: 'ไม่พบ StudentID ในทะเบียน', invalid: 'ชื่อไฟล์ไม่ใช่ StudentID', duplicate: 'StudentID ซ้ำในชุดที่เลือก', bad: 'เปิดรูปไม่ได้', ok: 'อัปโหลดแล้ว', fail: 'อัปโหลดไม่สำเร็จ' },
                phEnter(t) { if (t === 'photos' && !this.ph.meta) this.phLoad(); },
                async phLoad() {
                    this.ph.loading = true; this.ph.err = '';
                    const r = await this.apiCall('photos.meta', {});
                    this.ph.loading = false;
                    if (r.ok) this.ph.meta = r.data; else this.ph.err = r.message || 'โหลดข้อมูลไม่สำเร็จ';
                },
                phReset() { Object.assign(this.ph, { items: [], checked: false, consent: false, result: null, done: 0, total: 0, readMsg: '', filter: '' }); },
                phLib() {                                             // JSZip only when a .zip is used (sample file or upload)
                    if (window.JSZip) return Promise.resolve(window.JSZip);
                    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                        s.onload = () => window.JSZip ? ok(window.JSZip) : no(new Error('zip')); s.onerror = () => no(new Error('zip')); document.head.appendChild(s); });
                },
                phSid(name) { const base = String(name).split('/').pop(); return base.replace(/\.[^.]+$/, '').trim(); },
                phImgOk(name) { return /\.(jpe?g|png|webp)$/i.test(name); },
                /** decode → resize (longest side ≤ maxSide) → JPEG under the size limit. Resolves { data (base64), width, height, url } */
                async phShrink(blob) {
                    const lim = (this.ph.meta && this.ph.meta.limits) || { maxSide: 640, maxBytes: 184320 };
                    const url0 = URL.createObjectURL(blob);
                    try {
                        const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('decode')); i.src = url0; });
                        let side = lim.maxSide;
                        for (let attempt = 0; attempt < 6; attempt++) {
                            const k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
                            const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
                            const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                            const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
                            const q = [0.82, 0.72, 0.62, 0.72, 0.62, 0.55][attempt];
                            const durl = cv.toDataURL('image/jpeg', q), b64 = durl.slice(durl.indexOf(',') + 1), bytes = Math.floor(b64.length * 3 / 4);
                            if (bytes <= lim.maxBytes - 2048) return { data: b64, width: w, height: h, url: durl, bytes };
                            if (attempt === 2) side = Math.round(lim.maxSide * 0.75);
                        }
                        throw new Error('size');
                    } finally { URL.revokeObjectURL(url0); }
                },
                async phPick(ev) {
                    const files = [...((ev.target && ev.target.files) || (ev.dataTransfer && ev.dataTransfer.files) || [])];
                    if (ev.target && ev.target.value !== undefined) ev.target.value = '';
                    if (!files.length) return;
                    this.phReset(); this.ph.reading = true;
                    const raw = [];                                            // [{ name, blob }]
                    try {
                        for (const f of files) {
                            if (/\.zip$/i.test(f.name)) {
                                let Z; try { Z = await this.phLib(); } catch (e) { this.ph.readMsg = 'โหลดตัวอ่านไฟล์ zip ไม่ได้ — ตรวจอินเทอร์เน็ต หรือเลือกรูปทีละหลายไฟล์แทน'; continue; }
                                let zip; try { zip = await Z.loadAsync(f); } catch (e) { raw.push({ name: f.name, err: 'ไฟล์ zip เสียหายหรือเปิดไม่ได้' }); continue; }
                                for (const e of Object.values(zip.files)) {
                                    if (e.dir || /(^|\/)(__MACOSX|\.)/.test(e.name)) continue;
                                    if (!this.phImgOk(e.name)) { if (!/\.(txt|md|pdf|docx?)$/i.test(e.name)) raw.push({ name: e.name, err: 'ไม่ใช่ไฟล์รูป (รับ .jpg .jpeg .png .webp)' }); continue; }
                                    raw.push({ name: e.name, blob: await e.async('blob') });
                                }
                            } else if (this.phImgOk(f.name)) raw.push({ name: f.webkitRelativePath || f.name, blob: f, size: f.size });
                            else if (!f.name.startsWith('.')) raw.push({ name: f.name, err: /\.(heic|heif)$/i.test(f.name) ? 'ไฟล์ HEIC เปิดในเบราว์เซอร์ไม่ได้ — แปลงเป็น .jpg ก่อน' : 'ไม่ใช่ไฟล์รูป (รับ .jpg .jpeg .png .webp)' });
                        }
                        const items = [];
                        for (let i = 0; i < raw.length; i++) {
                            const x = raw[i], it = { key: 'p' + i, file: x.name.split('/').pop(), sid: this.phSid(x.name), status: '', label: '', name: '', url: '', data: '', width: 0, height: 0, bytes: 0, err: x.err || '' };
                            this.ph.readMsg = 'กำลังอ่านและย่อรูป ' + (i + 1) + '/' + raw.length + ' …';
                            if (!it.err && x.blob && x.blob.size > 20 * 1024 * 1024) it.err = 'ไฟล์ใหญ่เกิน 20 MB';
                            if (!it.err) { try { Object.assign(it, await this.phShrink(x.blob)); } catch (e) { it.err = e.message === 'size' ? 'ย่อรูปให้เล็กพอไม่ได้' : 'เปิดรูปไม่ได้ (ไฟล์เสียหรือรูปแบบไม่รองรับ)'; } }
                            if (it.err) { it.status = 'bad'; it.label = it.err; }
                            items.push(it);
                        }
                        this.ph.items = items;
                    } finally { this.ph.reading = false; }
                    if (!this.ph.readMsg.startsWith('โหลดตัวอ่าน')) this.ph.readMsg = '';
                    await this.phCheck();
                },
                async phCheck() {
                    const todo = this.ph.items.filter(i => i.status !== 'bad');
                    if (!todo.length) { this.ph.checked = true; return; }
                    this.ph.checking = true;
                    const r = await this.apiCall('photos.check', { ids: todo.map(i => i.sid) });
                    this.ph.checking = false;
                    if (!r.ok) { this.ph.err = r.message || 'ตรวจรายชื่อไม่สำเร็จ'; return; }
                    r.data.items.forEach((x, k) => { Object.assign(todo[k], { status: x.status, label: x.label, name: x.name || '', inactive: !!x.inactive, statusLabel: x.statusLabel || '' }); });
                    this.ph.checked = true;
                },
                get phReady() { return this.ph.items.filter(i => i.status === 'new' || i.status === 'replace'); },
                phCount(st) { return this.ph.items.filter(i => i.status === st).length; },
                get phShown() { const f = this.ph.filter; return this.ph.items.filter(i => !f || (f === 'ok' ? ['new', 'replace', 'ok'].includes(i.status) : !['new', 'replace', 'ok'].includes(i.status))); },
                async phUpload() {
                    const list = this.phReady; if (!list.length || this.ph.busy || !this.ph.consent) return;
                    this.ph.busy = true; this.ph.done = 0; this.ph.total = list.length; this.ph.result = null;
                    const batchId = 'phb_' + this.awNewRequestId().slice(-20), lim = this.ph.meta.limits, BUDGET = 235000;
                    let ok = 0, fail = 0, i = 0;
                    while (i < list.length) {
                        const part = []; let size = 0;
                        while (i < list.length && part.length < lim.perCall && (size + list[i].data.length <= BUDGET || !part.length)) { part.push(list[i]); size += list[i].data.length; i++; }
                        const r = await this.apiCall('photos.upload', { requestId: this.awNewRequestId(), batchId, items: part.map(x => ({ studentId: x.sid, data: x.data, width: x.width, height: x.height })) });
                        if (!r.ok) { part.forEach(x => { x.status = 'fail'; x.label = r.message || 'อัปโหลดไม่สำเร็จ'; }); fail += part.length; }
                        else r.data.results.forEach((res, k) => { const x = part[k]; if (res.ok) { x.status = 'ok'; x.label = res.replaced ? 'อัปโหลดแล้ว (แทนรูปเดิม)' : 'อัปโหลดแล้ว'; ok++; } else { x.status = 'fail'; x.label = res.error || 'อัปโหลดไม่สำเร็จ'; fail++; } });
                        this.ph.done = Math.min(this.ph.total, this.ph.done + part.length);
                    }
                    this.ph.busy = false; this.ph.result = { ok, fail };
                    this.ph.items.forEach(x => { if (x.status === 'ok') { x.data = ''; } });          // free memory; the thumbnail stays until the page is closed
                    this.showToast(fail ? 'อัปโหลดสำเร็จ ' + ok + ' รูป • ไม่สำเร็จ ' + fail + ' รูป' : 'อัปโหลดสำเร็จ ' + ok + ' รูป');
                    this.phLoad();
                },
                /** sample file: drawn placeholders (not photos of people) named by StudentID + a how-to text */
                async phSample() {
                    let Z; try { Z = await this.phLib(); } catch (e) { this.showToast('โหลดตัวสร้างไฟล์ zip ไม่ได้ — ตรวจอินเทอร์เน็ต'); return; }
                    const zip = new Z();
                    const draw = (sid, bg) => { const cv = document.createElement('canvas'); cv.width = 300; cv.height = 400; const g = cv.getContext('2d');
                        g.fillStyle = bg; g.fillRect(0, 0, 300, 400); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(150, 150, 70, 0, Math.PI * 2); g.fill();
                        g.beginPath(); g.ellipse(150, 360, 120, 110, 0, Math.PI, 0); g.fill(); g.fillStyle = '#1f1b18'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
                        g.fillText('ตัวอย่าง', 150, 60); g.font = 'bold 34px monospace'; g.fillText(sid, 150, 270); return cv.toDataURL('image/jpeg', 0.85).split(',')[1]; };
                    zip.file('69001.jpg', draw('69001', '#86efac'), { base64: true });
                    zip.file('69002.jpg', draw('69002', '#fdba74'), { base64: true });
                    zip.file('69003.jpg', draw('69003', '#93c5fd'), { base64: true });
                    zip.file('อ่านก่อนอัปโหลด.txt', [
                        'วิธีเตรียมรูปนักเรียนสำหรับ TSS CareSpace', '',
                        '1. ตั้งชื่อไฟล์รูปเป็น StudentID ของนักเรียนเท่านั้น เช่น 69001.jpg (ตรงกับ StudentID ในทะเบียนนักเรียน)',
                        '   ระบบจับคู่ด้วย StudentID จากชื่อไฟล์ ไม่ใช้ชื่อ–นามสกุล',
                        '2. รับไฟล์ .jpg .jpeg .png .webp (HEIC จาก iPhone ให้แปลงเป็น .jpg ก่อน) ไฟล์ละไม่เกิน 20 MB',
                        '3. ระบบย่อรูปให้อัตโนมัติ (ด้านยาวไม่เกิน 640 px) ก่อนส่ง — รูปต้นฉบับไม่ถูกส่งขึ้นเซิร์ฟเวอร์',
                        '4. อัปโหลดได้ทั้งเลือกหลายไฟล์ เลือกทั้งโฟลเดอร์ หรือไฟล์ .zip — แนะนำทีละห้องหรือทีละระดับชั้น',
                        '5. ถ้ามีรูปเดิมอยู่แล้ว รูปใหม่จะแทนที่ (รูปเดิมถูกย้ายไปถังขยะของ Google Drive)',
                        '6. ใช้เฉพาะรูปที่โรงเรียนได้รับความยินยอม/เป็นไปตามนโยบายคุ้มครองข้อมูลส่วนบุคคล',
                        '', 'รูป 3 รูปในไฟล์นี้เป็นภาพตัวอย่างวาดขึ้น ไม่ใช่รูปนักเรียน — ลบออกแล้วใส่รูปจริงที่ตั้งชื่อตาม StudentID'].join('\r\n'));
                    const blob = await zip.generateAsync({ type: 'blob' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ตัวอย่างรูปนักเรียน.zip'; document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
                },
                async phOneFind() {
                    const O = this.ph.one, q = O.q.trim(); O.data = null; O.err = ''; O.delErr = ''; O.reason = '';
                    if (!q) return;
                    O.busy = true; const r = await this.apiCall('photos.get', { studentId: q }); O.busy = false;
                    if (!r.ok) { O.err = r.message || 'ไม่พบข้อมูล'; return; }
                    O.data = Object.assign({ studentId: q }, r.data);
                },
                async phOneDelete() {
                    const O = this.ph.one; if (!O.data || !O.data.dataUrl || O.delBusy) return;
                    if (!O.reason.trim()) { O.delErr = 'กรุณาระบุเหตุผลในการลบรูป'; return; }
                    O.delBusy = true; O.delErr = '';
                    const r = await this.apiCall('photos.delete', { studentId: O.data.studentId, reason: O.reason.trim(), requestId: this.awNewRequestId() });
                    O.delBusy = false;
                    if (!r.ok) { O.delErr = (r.fields && r.fields.reason) || r.message || 'ลบไม่สำเร็จ'; return; }
                    this.showToast('ลบรูปของ ' + O.data.studentId + ' แล้ว'); O.data = { studentId: O.data.studentId, none: true }; O.reason = ''; this.phLoad();
                },
                /* ---- case profile: photo of the open file (memory only, cleared when another file opens) ---- */
                async phProfile(clientId) {
                    const C = this.ph.cur; C.clientId = clientId; C.url = ''; C.sid = ''; C.loading = true; this.ph.pfErr = '';
                    const r = await this.apiCall('photos.get', { clientId });
                    if (this.ph.cur.clientId !== clientId) return;        // another file was opened meanwhile
                    C.loading = false;
                    if (r.ok) { C.url = r.data.dataUrl || ''; C.sid = r.data.studentId || ''; }
                },
                phAvatar(fallback) { return (this.ph.cur.clientId && this.activeStudent && String(this.activeStudent.id) === this.ph.cur.clientId && this.ph.cur.url) || fallback || ''; },
                phInitial() { const n = String((this.activeStudent && this.activeStudent.name) || '').replace(/^(เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').trim(); return n ? n.slice(0, 1) : '?'; },
                async phProfileUpload(ev) {
                    const f = ev.target.files && ev.target.files[0]; ev.target.value = '';
                    const sid = this.ph.cur.sid; if (!f || !sid || this.ph.pfBusy) return;
                    this.ph.pfBusy = true; this.ph.pfErr = '';
                    try {
                        if (!this.ph.meta) { const m = await this.apiCall('photos.meta', {}); if (m.ok) this.ph.meta = m.data; }
                        if (!this.phImgOk(f.name)) throw new Error('รับไฟล์ .jpg .jpeg .png .webp เท่านั้น');
                        let x; try { x = await this.phShrink(f); } catch (e) { throw new Error('เปิดรูปไม่ได้ (ไฟล์เสียหรือรูปแบบไม่รองรับ)'); }
                        const r = await this.apiCall('photos.upload', { requestId: this.awNewRequestId(), batchId: 'phb_' + this.awNewRequestId().slice(-20), items: [{ studentId: sid, data: x.data, width: x.width, height: x.height }] });
                        if (!r.ok) throw new Error(r.message || 'อัปโหลดไม่สำเร็จ');
                        if (!r.data.results[0].ok) throw new Error(r.data.results[0].error || 'อัปโหลดไม่สำเร็จ');
                        this.showToast('บันทึกรูปแล้ว'); await this.phProfile(this.ph.cur.clientId);
                    } catch (e) { this.ph.pfErr = e.message; this.showToast(e.message); }
                    this.ph.pfBusy = false;
                },
                /* ===== พื้นที่ฐานข้อมูล (storage.* — manage_settings, every change confirmed by the server; nothing shown as done before it answers) ===== */
                st: { data: null, loading: false, err: '', backup: false, busy: '', msg: '', trim: null, arch: null, mv: null, cleanText: '', last: null, pick: [], to: 'new', toLabel: '', tq: '', customOpen: false, empty: null },
                /* ===== Student file: records from external Google Sheets (Legacy Data Integration Phases 3–4, 2026-11-11) ===== */
                xp: { clientId: '', data: null, items: [], page: 0, type: '', inactive: false, loading: false, err: '', f: null, msg: '', msgKind: '', hist: null, hide: null, seq: 0 },
                XP_SYNC: { synced: 'sd-ok-st', pending: 'sd-plan', conflict: 'is-bad', failed: 'is-bad', source_missing: 'sd-plan', needs_review: 'sd-plan' },
                XP_ACT: { CREATE: 'สร้าง', UPDATE: 'แก้ไข', SOFT_DELETE: 'ซ่อน', RESTORE: 'กู้คืน', CONFLICT_RESOLVED: 'ตัดสินข้อมูลขัดแย้ง' },
                XP_ORIGIN: { TSS: 'ใน TSS', GOOGLE_SHEETS: 'ใน Google Sheets', ADMIN: 'โดยผู้ดูแลระบบ', SYSTEM: 'โดยระบบ' },
                xpWhen(at) {
                    if (!at) return ''; const d = new Date(at); if (isNaN(d)) return '';
                    return d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric' }) + ' เวลา ' + d.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) + ' น.';
                },
                xpMeta(it) {
                    const src = 'แหล่งข้อมูล: ' + (it.sourceName || '—');
                    if (it.sourceKind !== 'new') return 'ข้อมูลย้อนหลังจาก Google Sheets – ' + (it.recorderName ? 'บันทึกโดย ' + it.recorderName : 'ไม่ระบุผู้บันทึกในข้อมูลต้นทาง') + ' • ' + src + (it.importedAt ? ' • นำเข้าสู่ TSS เมื่อ ' + this.xpWhen(it.importedAt) : '');
                    return 'อัปเดตเมื่อ ' + this.xpWhen(it.updatedAt) + (it.updatedByName ? ' โดย ' + it.updatedByName : '') + (it.recorderName ? ' • ผู้บันทึก: ' + it.recorderName : '') + ' • ' + src;
                },
                async xpLoad(page) {
                    const s = this.activeStudent; if (!s) return;
                    const seq = ++this.xp.seq, id = s.id;
                    if (this.xp.clientId !== id) { this.xp.data = null; this.xp.items = []; this.xp.f = null; this.xp.msg = ''; this.xp.type = ''; this.xp.inactive = false; this.xp.hist = null; this.xp.hide = null; }
                    this.xp.clientId = id; this.xp.loading = true; this.xp.err = '';
                    const r = await this.apiCall('ext.records.list', { clientId: id, page: page || 0, type: this.xp.type || undefined, inactive: this.xp.inactive || undefined });
                    if (seq !== this.xp.seq) return;
                    this.xp.loading = false;
                    if (!r.ok) { this.xp.err = r.message || 'โหลดไม่สำเร็จ'; return; }
                    this.xp.data = r.data; this.xp.page = r.data.page;
                    this.xp.items = page ? this.xp.items.concat(r.data.items) : r.data.items;
                },
                xpSrc() { const f = this.xp.f, d = this.xp.data; if (!f || !d) return null; return d.writable.find(s => s.sourceId === f.sourceId) || null; },
                xpNew() {
                    const w = (this.xp.data && this.xp.data.writable) || []; if (!w.length) return;
                    this.xp.msg = ''; this.xp.f = { recordId: '', version: 0, sourceId: w[0].sourceId, eventDate: this.todayISO(), title: '', description: '', recorderName: (this.authUser && this.authUser.fullName) || '', extra: {}, busy: false, fe: {}, err: '', reqId: this.awNewRequestId() };
                },
                xpEdit(it) {
                    this.xp.msg = '';
                    const w = (this.xp.data && this.xp.data.writable) || [];
                    if (!w.some(s => s.sourceId === it.sourceId)) w.push({ sourceId: it.sourceId, sourceName: it.sourceName, recordTypeLabel: it.recordTypeLabel, fields: { title: !!it.title, recorderName: true, extra: Object.keys(it.extra || {}) } });
                    this.xp.f = { recordId: it.recordId, version: it.version, sourceId: it.sourceId, eventDate: it.eventDate, title: it.title, description: it.description, recorderName: it.recorderName, extra: Object.assign({}, it.extra), busy: false, fe: {}, err: '' };
                },
                async xpSave() {
                    const f = this.xp.f; if (!f || f.busy) return;
                    f.busy = true; f.fe = {}; f.err = '';
                    const fields = { eventDate: f.eventDate, title: f.title, description: f.description, recorderName: f.recorderName, extra: f.extra };
                    const r = f.recordId ? await this.apiCall('ext.record.update', { recordId: f.recordId, expectedVersion: f.version, fields })
                                         : await this.apiCall('ext.record.create', { clientId: this.xp.clientId, sourceId: f.sourceId, requestId: f.reqId, fields });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? 'ตรวจช่องที่มีเครื่องหมายแจ้งเตือน' : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    const st = r.data.sync || (r.data.record && r.data.record.syncStatus);
                    this.xp.msgKind = st === 'synced' ? 'is-ok' : 'is-warn';
                    this.xp.msg = st === 'synced' ? 'บันทึกแล้ว และส่งไป Google Sheets แล้ว'
                        : st === 'conflict' ? 'บันทึกใน TSS แล้ว แต่ในไฟล์ Google Sheets มีการแก้รายการเดียวกัน — ระบบไม่เขียนทับ รอผู้ดูแลระบบตรวจและเลือกข้อมูล'
                        : 'บันทึกใน TSS แล้ว — ยังส่งไป Google Sheets ไม่สำเร็จ ระบบจะลองส่งใหม่อัตโนมัติ';
                    this.xp.f = null; this.xpLoad(0);
                },
                async xpHistory(it) {
                    if (this.xp.hist && this.xp.hist.recordId === it.recordId) { this.xp.hist = null; return; }
                    this.xp.hist = { recordId: it.recordId, loading: true, items: [] };
                    const r = await this.apiCall('ext.record.history', { recordId: it.recordId });
                    if (!this.xp.hist || this.xp.hist.recordId !== it.recordId) return;
                    this.xp.hist.loading = false; if (r.ok) this.xp.hist.items = r.data.items; else this.xp.hist.items = [];
                },
                xpHideAsk(it) { this.xp.hide = { recordId: it.recordId, reason: '' }; },
                async xpSetActive(it, active) {
                    const r = await this.apiCall('ext.record.setActive', { recordId: it.recordId, active, reason: active ? undefined : (this.xp.hide && this.xp.hide.reason) });
                    if (!r.ok) { this.xp.err = (r.fields && r.fields.reason) || r.message || 'ไม่สำเร็จ'; return; }
                    this.xp.hide = null; this.showToast(active ? 'กู้คืนแล้ว' : 'ซ่อนแล้ว (แถวใน Google Sheets ยังอยู่)'); this.xpLoad(0);
                },
                /* two-way sync (Phase 4) on the settings page */
                xs: { conf: null, queue: null, err: '' },
                XS_Q: [['PENDING', 'รอส่ง', 'sd-plan'], ['FAILED', 'ส่งไม่สำเร็จ', 'is-bad'], ['CONFLICT', 'ขัดแย้ง', 'is-bad'], ['NEEDS_REVIEW', 'ต้องตรวจ', 'sd-plan'], ['SUCCESS', 'สำเร็จ', 'sd-ok-st']],
                XS_QS: { PENDING: 'รอส่ง (ระบบลองใหม่อัตโนมัติ)', FAILED: 'ส่งไม่สำเร็จ', NEEDS_REVIEW: 'ต้องตรวจ' },
                async xsLoad() {
                    this.xs.err = '';
                    const [a, b] = await Promise.all([this.apiCall('ext.conflicts.list', {}), this.apiCall('ext.queue.list', {})]);
                    if (!a.ok || !b.ok) { this.xs.err = (a.ok ? b : a).message || 'โหลดไม่สำเร็จ'; return; }
                    this.xs.conf = a.data.items.map(c => Object.assign(c, { busy: false, err: '' })); this.xs.queue = b.data;
                },
                async xsResolve(c, decision) {
                    if (c.busy) return; c.busy = true; c.err = '';
                    const r = await this.apiCall('ext.conflict.resolve', { id: c.id, decision });
                    c.busy = false;
                    if (!r.ok) { c.err = r.message || 'ไม่สำเร็จ'; return; }
                    this.showToast(decision === 'keep_tss' ? 'ใช้ข้อมูลจาก TSS แล้ว (เขียนลง Google Sheets แล้ว)' : 'ใช้ข้อมูลจาก Google Sheets แล้ว'); this.xsLoad();
                },
                async xsRetry(q) {
                    const r = await this.apiCall('ext.queue.retry', { queueId: q.queueId });
                    if (!r.ok) { this.xs.err = r.message || 'ไม่สำเร็จ'; return; }
                    this.showToast(r.data.result === 'synced' ? 'ส่งไป Google Sheets แล้ว' : 'ยังส่งไม่สำเร็จ — ระบบจะลองใหม่อัตโนมัติ'); this.xsLoad();
                },
                async xtTwoWay(s, on) {
                    const r = await this.apiCall('ext.source.twoWay', { sourceId: s.sourceId, on });
                    if (!r.ok) { this.xt.err = (r.fields && (r.fields.syncMode || r.fields.cutoverDate)) || r.message || 'ไม่สำเร็จ'; return; }
                    this.xt.err = ''; this.showToast(on ? 'เปิด Sync สองทางแล้ว (เพิ่มคอลัมน์ TSS_ID ในไฟล์แล้ว)' : 'ปิด Sync สองทางแล้ว'); this.xtLoad();
                },
                async xtSyncNow(s) {
                    s.syncing = true;
                    const r = await this.apiCall('ext.source.syncNow', { sourceId: s.sourceId });
                    s.syncing = false;
                    if (!r.ok) { this.xt.err = r.message || 'Sync ไม่สำเร็จ'; return; }
                    this.showToast('Sync แล้ว: เพิ่ม ' + r.data.sweep.created + ' • แก้ไข ' + r.data.sweep.updated + ' • ขัดแย้ง ' + r.data.sweep.conflicts); this.xtLoad(); this.xsLoad();
                },
                /* ===== External Google Sheets (Legacy Data Integration, Phase 2 — 2026-11-11): sources, mapping, check, historical import ===== */
                xt: { data: null, loading: false, err: '', f: null, pv: null, un: null, unErr: '' },
                XT_ST: { draft: ['ร่าง', 'sd-plan'], active: ['ใช้งาน', 'sd-ok-st'], paused: ['พัก', 'sd-closed'] },
                XT_SHARE: { restricted: 'แชร์เฉพาะบุคคล', domain: 'แชร์ภายในองค์กร — ตรวจว่าเหมาะสม', unknown: 'ตรวจการแชร์ไม่ได้ — ตรวจเองใน Google Drive ว่าไม่เปิดสาธารณะ' },
                XT_FIELDS: [['studentId', 'รหัสนักเรียน', true], ['eventDate', 'วันที่', true], ['description', 'รายละเอียด', true], ['title', 'หัวข้อ', false], ['recorderName', 'ผู้บันทึก', false]],
                XT_SUM: [['total', 'ทั้งหมด', ''], ['ok', 'ผ่าน พร้อมนำเข้า', 'sd-ok-st'], ['unmatched', 'จับคู่นักเรียนไม่ได้', 'sd-plan'], ['invalid', 'ไม่ผ่าน', 'is-bad'], ['duplicate', 'ซ้ำในไฟล์', 'sd-closed'], ['done', 'นำเข้าแล้ว', 'is-upd'], ['later', 'หลังวันเริ่ม Sync', 'sd-closed']],
                XT_IS: { unmatched: ['จับคู่ไม่ได้', 'sd-plan'], invalid: ['ไม่ผ่าน', 'is-bad'], duplicate: ['ซ้ำ', 'sd-closed'], later: ['รอ Sync', 'sd-closed'] },
                async xtLoad() {
                    this.xt.loading = true; this.xt.err = '';
                    const r = await this.apiCall('ext.sources.list', {});
                    this.xt.loading = false;
                    if (r.ok) this.xt.data = r.data; else this.xt.err = r.message || 'โหลดไม่สำเร็จ';
                },
                xtBlank() { return { sourceId: '', version: 0, ref: '', file: null, sheetName: '', headerRow: 1, headers: null, sample: [], dataRows: 0,
                                     map: { studentId: '', eventDate: '', description: '', title: '', recorderName: '', extra: [] },
                                     sourceName: '', recordType: '', ownerName: '', dateOrder: 'dmy', era: 'auto', cutoverDate: '', status: 'draft', busy: false, fe: {}, err: '' }; },
                xtNew() { this.xt.pv = null; this.xt.f = this.xtBlank(); },
                async xtEdit(s) {
                    this.xt.pv = null;
                    const r = await this.apiCall('ext.source.get', { sourceId: s.sourceId });
                    if (!r.ok) { this.xt.err = r.message || 'โหลดไม่สำเร็จ'; return; }
                    const x = r.data.source, f = this.xtBlank();
                    Object.assign(f, { sourceId: x.sourceId, version: x.version, ref: x.spreadsheetId, sheetName: x.sheetName, headerRow: x.headerRow, sourceName: x.sourceName,
                                       recordType: x.recordType, ownerName: x.ownerName, dateOrder: x.dateOrder, era: x.era, cutoverDate: x.cutoverDate, status: x.status });
                    f.map = Object.assign(f.map, x.columnMap || {}); if (!Array.isArray(f.map.extra)) f.map.extra = [];
                    this.xt.f = f;
                    await this.xtInspect(true);
                },
                async xtInspect(withSheet) {
                    const f = this.xt.f; if (!f || f.busy) return;
                    f.busy = true; f.fe = {}; f.err = '';
                    const r = await this.apiCall('ext.source.inspect', withSheet ? { ref: f.ref, sheetName: f.sheetName, headerRow: f.headerRow } : { ref: f.ref });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? '' : (r.message || 'เปิดไฟล์ไม่สำเร็จ'); return; }
                    f.file = { title: r.data.title, sharing: r.data.sharing, tabs: r.data.tabs };
                    if (!withSheet) { f.headers = null; if (!f.sheetName && r.data.tabs.length === 1) f.sheetName = r.data.tabs[0].name; return; }
                    f.headers = r.data.headers; f.sample = r.data.sample; f.dataRows = r.data.dataRows;
                    const names = f.headers.map(h => h.text);
                    Object.keys(f.map).forEach(k => { if (k !== 'extra' && f.map[k] && !names.includes(f.map[k])) f.map[k] = ''; });
                    f.map.extra = f.map.extra.filter(h => names.includes(h));
                    Object.entries(r.data.suggested || {}).forEach(([k, v]) => { if (!f.map[k]) f.map[k] = v; });   // suggestions fill empty choices only
                    if (!f.sourceName) f.sourceName = r.data.title + ' — ' + f.sheetName;
                },
                get xtExtraChoices() {
                    const f = this.xt.f; if (!f || !f.headers) return [];
                    const used = ['studentId', 'eventDate', 'description', 'title', 'recorderName'].map(k => f.map[k]).filter(Boolean);
                    return f.headers.map(h => h.text).filter(t => t && !used.includes(t));
                },
                async xtSave() {
                    const f = this.xt.f; if (!f || f.busy) return;
                    f.busy = true; f.fe = {}; f.err = '';
                    const m = f.map, fields = { sourceName: f.sourceName, recordType: f.recordType, spreadsheetId: f.ref, sheetName: f.sheetName, headerRow: f.headerRow,
                        ownerName: f.ownerName, status: f.status, dateOrder: f.dateOrder, era: f.era, cutoverDate: f.cutoverDate,
                        columnMap: { studentId: m.studentId, eventDate: m.eventDate, description: m.description, title: m.title, recorderName: m.recorderName, extra: m.extra.filter(h => this.xtExtraChoices.includes(h)) } };
                    const r = await this.apiCall('ext.source.save', { sourceId: f.sourceId || undefined, fields, expectedVersion: f.sourceId ? f.version : undefined });
                    f.busy = false;
                    if (!r.ok) { f.fe = r.fields || {}; f.err = r.fields ? 'ตรวจช่องที่มีเครื่องหมายแจ้งเตือน' + (r.fields.ref ? ' — ' + r.fields.ref : '') : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.xt.f = null; this.showToast('บันทึกแหล่งข้อมูลแล้ว'); this.xtLoad();
                },
                async xtStatus(s, st) {
                    const r = await this.apiCall('ext.source.status', { sourceId: s.sourceId, status: st });
                    if (r.ok) this.xtLoad(); else this.xt.err = r.message || 'เปลี่ยนสถานะไม่สำเร็จ';
                },
                async xtPreview(s) {
                    this.xt.f = null;
                    this.xt.pv = { source: s, loading: true, err: '', data: null, running: false, progress: '', result: '', reqId: '' };
                    const r = await this.apiCall('ext.source.preview', { sourceId: s.sourceId });
                    if (!this.xt.pv || this.xt.pv.source !== s) return;
                    this.xt.pv.loading = false;
                    if (r.ok) this.xt.pv.data = r.data; else this.xt.pv.err = r.message || 'ตรวจไม่สำเร็จ';
                },
                async xtImport() {
                    const pv = this.xt.pv; if (!pv || pv.running) return;
                    pv.running = true; pv.err = ''; pv.result = ''; pv.reqId = pv.reqId || this.awNewRequestId();
                    let r, rounds = 0;
                    do {                                                                    // the same request continues where it stopped
                        r = await this.apiCall('ext.import.run', { sourceId: pv.source.sourceId, requestId: pv.reqId });
                        rounds++;
                        if (r.ok && !r.data.done) pv.progress = 'นำเข้าแล้ว ' + r.data.totals.imported + ' แถว • เหลือ ' + r.data.remaining + ' แถว';
                    } while (r.ok && !r.data.done && rounds < 200);
                    pv.running = false; pv.progress = '';
                    if (!r.ok) { pv.err = (r.message || 'นำเข้าไม่สำเร็จ') + ' — กด “นำเข้า” อีกครั้งเพื่อทำต่อจากที่ค้าง (ไม่ซ้ำ)'; return; }
                    if (!r.data.done) { pv.err = 'ยังนำเข้าไม่ครบ — กด “นำเข้า” อีกครั้งเพื่อทำต่อ'; return; }
                    pv.result = r.data.duplicate ? 'การนำเข้านี้เสร็จไปแล้ว' : 'นำเข้าเสร็จ: ข้อมูลย้อนหลัง ' + r.data.totals.imported + ' แถว • รอจับคู่นักเรียน ' + r.data.totals.unmatched + ' แถว';
                    pv.reqId = '';
                    this.xtLoad();
                },
                async xtUnLoad(page) {
                    this.xt.unErr = '';
                    const r = await this.apiCall('ext.unmatched.list', { page: Math.max(0, page || 0) });
                    if (!r.ok) { this.xt.unErr = r.message || 'โหลดไม่สำเร็จ'; return; }
                    r.data.items.forEach(u => { u.fix = ''; u.fe = ''; u.busy = false; });
                    this.xt.un = r.data;
                },
                async xtUnResolve(u, action) {
                    if (u.busy) return; u.busy = true; u.fe = '';
                    const r = await this.apiCall('ext.unmatched.resolve', { id: u.id, action, studentId: action === 'link' ? u.fix : undefined });
                    u.busy = false;
                    if (!r.ok) { u.fe = (r.fields && (r.fields.studentId || r.fields.action)) || r.message || 'ไม่สำเร็จ'; return; }
                    this.showToast(action === 'link' ? 'จับคู่และนำเข้าแล้ว' : 'ตั้งเป็นไม่นำเข้าแล้ว');
                    this.xtUnLoad(this.xt.un.page); this.xtLoad();
                },
                stEnter(t) { if (t === 'storage' && !this.st.data) this.stLoad(); },
                async stLoad() {
                    this.st.loading = true; this.st.err = '';
                    const r = await this.apiCall('storage.stats', {});
                    this.st.loading = false;
                    if (r.ok) this.st.data = r.data; else this.st.err = r.message || 'โหลดข้อมูลพื้นที่ไม่สำเร็จ';
                },
                stNum(n) { return Number(n || 0).toLocaleString('th-TH'); },
                stPct(f) { return Math.min(100, Math.max(0, Number(f.pct) || 0)); },
                stLevel(p) { return p >= 80 ? 'is-red' : p >= 50 ? 'is-orange' : p >= 30 ? 'is-yellow' : 'is-ok'; },
                stLevelText(p) { return p >= 80 ? 'ใกล้เต็ม — ต้องจัดการทันที' : p >= 50 ? 'ควรจัดการเร็ว ๆ นี้' : p >= 30 ? 'เริ่มเฝ้าระวัง' : 'ปกติ'; },
                get stTopSheets() {
                    const d = this.st.data; if (!d) return [];
                    return d.files.flatMap(f => (f.sheets || []).map(s => Object.assign({ file: f.label }, s))).sort((a, b) => b.grid - a.grid).slice(0, 12);
                },
                async stCall(action, p, key) {
                    this.st.busy = key; this.st.msg = '';
                    const r = await this.apiCall(action, p);
                    this.st.busy = '';
                    if (!r.ok) { this.st.msg = (r.fields && Object.values(r.fields)[0]) || r.message || 'ทำรายการไม่สำเร็จ'; return null; }
                    return r.data;
                },
                async stTrimPreview() { const d = await this.stCall('storage.trim', { dryRun: true }, 'trim'); if (d) this.st.trim = d; },
                async stTrimRun() {
                    const d = await this.stCall('storage.trim', { dryRun: false, backupConfirmed: this.st.backup }, 'trim');
                    if (d) { this.st.trim = null; this.st.last = 'ตัดเซลล์ว่างแล้ว คืนพื้นที่ ' + this.stNum(d.freed) + ' เซลล์ (ระบบยืนยันแล้ว)'; this.showToast(this.st.last); await this.stLoad(); }
                },
                async stArchPreview() { const d = await this.stCall('storage.archive', { dryRun: true }, 'arch'); if (d) this.st.arch = d; },
                async stArchRun() {
                    const d = await this.stCall('storage.archive', { dryRun: false, backupConfirmed: this.st.backup }, 'arch');
                    if (d) { this.st.arch = null; this.st.last = 'ย้ายไป archive แล้ว ' + this.stNum(d.total) + ' แถว' + (d.more ? ' — ยังเหลือ กดอีกครั้ง' : '') + ' (ระบบยืนยันแล้ว)'; this.showToast(this.st.last); await this.stLoad(); }
                },
                async stSchedule(on) { const d = await this.stCall('storage.schedule', { on }, 'sched'); if (d) { this.showToast(on ? 'เปิดการย้ายข้อมูลเก่าอัตโนมัติทุกวันแล้ว' : 'ปิดการย้ายอัตโนมัติแล้ว'); await this.stLoad(); } },
                stHome(t) { const x = this.st.data.layout.tables.find(y => y.name === t); return x ? x.home : 'main'; },
                stHomeOf(k) { return this.st.data.layout.tables.filter(t => t.home === k).map(t => t.name); },
                stFileLabel(k) { const f = this.st.data.layout.files.find(x => x.key === k); return f ? f.label : k; },
                stRows(t) { const f = this.st.data.files.find(x => x.key === this.stHome(t)); const s = f && (f.sheets || []).find(x => x.name === t); return s ? s.rows : 0; },
                stPresetSome(pt) { return pt.tables.some(t => this.stHome(t) !== 'main'); },
                stPresetWhere(pt) { return [...new Set(pt.tables.map(t => this.stFileLabel(this.stHome(t))))].join(', '); },
                get stMovable() {
                    const d = this.st.data; if (!d) return [];
                    const q = this.st.tq.trim().toLowerCase();
                    return d.layout.tables.filter(t => !t.core && (!q || t.name.toLowerCase().includes(q)));
                },
                stPresetPreview(pt) {
                    const own = this.st.data.layout.files.some(f => f.key === pt.key);
                    return this.stMovePreview(pt.tables, own ? pt.key : 'new', pt.label, pt.key);
                },
                async stMovePreview(tables, target, label, key) {
                    const d = await this.stCall('storage.move', { tables, target, label: (label || '').trim(), dryRun: true }, 'preview');
                    if (d) this.st.mv = Object.assign(d, { req: { tables: d.tables.map(t => t.name), target, label: (label || '').trim(), key } });
                },
                async stMoveRun() {
                    const q = this.st.mv.req;
                    const d = await this.stCall('storage.move', { tables: q.tables, target: q.target, label: q.label, key: q.key, dryRun: false, backupConfirmed: this.st.backup }, 'move');
                    if (d) {
                        this.st.mv = null; this.st.pick = [];
                        this.st.last = 'ย้ายแล้ว ' + d.moved.length + ' ตาราง (' + this.stNum(d.moved.reduce((n, x) => n + x.rows, 0)) + ' แถว) — ระบบอ่านกลับมาตรวจครบทุกแถวและเปลี่ยนไปใช้ไฟล์ใหม่แล้ว'
                            + (d.left.length ? ' • ยังไม่ได้ย้าย ' + d.left.join(', ') + ' — กดย้ายอีกครั้ง' : '');
                        this.showToast(this.st.last); await this.stLoad();
                    }
                },
                async stClean() {
                    const d = await this.stCall('storage.clean', { confirm: this.st.cleanText.trim(), backupConfirmed: this.st.backup }, 'clean');
                    if (d) { this.st.cleanText = ''; this.st.empty = d.emptyFiles; this.st.last = 'ลบสำเนาเดิมแล้ว ' + d.removed.length + ' ตาราง (ระบบยืนยันแล้ว)'; this.showToast(this.st.last); await this.stLoad(); }
                },
                /* ===== ข้อมูลทะเบียนนักเรียนเพิ่มเติม (Registry.gs): extra columns of the roster file, field list, profile block ===== */
                rg: { prof: null, profFor: '', loading: false, err: '', reveal: {}, revealBusy: '',
                      f: { open: false, data: null, rows: [], orig: {}, q: '', g: '', busy: false, err: '', msg: '', add: { label: '', groupKey: 'general', headers: '' } } },
                rgReset() { this.rg.prof = null; this.rg.profFor = ''; this.rg.loading = false; this.rg.err = ''; this.rg.reveal = {}; this.rg.f.open = false; this.rg.f.data = null; this.rg.f.rows = []; },
                async rgProfile(clientId, year) {
                    this.rg.reveal = {}; this.rg.err = '';
                    if (!clientId) { this.rg.prof = null; this.rg.profFor = ''; return; }
                    if (this.rg.profFor !== clientId) this.rg.prof = null;
                    this.rg.profFor = clientId; this.rg.loading = true;
                    const r = await this.apiCall('regprofile.get', { clientId, year: year || '' });
                    if (this.rg.profFor !== clientId) return;                      // another student was opened meanwhile
                    this.rg.loading = false;
                    if (r.ok) this.rg.prof = r.data; else { this.rg.prof = null; this.rg.err = r.status === 403 || r.status === 404 ? '' : (r.message || 'โหลดข้อมูลทะเบียนไม่สำเร็จ'); }
                },
                async rgReveal(key) {
                    if (this.rg.revealBusy) return;
                    this.rg.revealBusy = key;
                    const cid = this.rg.profFor, r = await this.apiCall('regprofile.reveal', { clientId: cid, year: this.rg.prof.year, key });
                    this.rg.revealBusy = '';
                    if (this.rg.profFor !== cid) return;
                    if (r.ok) { this.rg.reveal = Object.assign({}, this.rg.reveal, { [key]: r.data.value }); setTimeout(() => { if (this.rg.reveal[key]) { const o = Object.assign({}, this.rg.reveal); delete o[key]; this.rg.reveal = o; } }, 30000); }
                    else this.showToast(r.message || 'แสดงข้อมูลไม่สำเร็จ');
                },
                /* import: columns of the file not used by the main fields */
                get impXCols() {
                    if (this.imp.kind !== 'students' || !this.imp.headers.length) return [];
                    const used = new Set(Object.values(this.imp.map).filter(v => v !== '').map(Number)), count = {}, out = [];
                    this.imp.headers.forEach((h, i) => { const k = String(h).replace(/\s+/g, '').toLowerCase(); count[k] = (count[k] || 0) + 1; if (!used.has(i)) out.push({ i, h: String(h), n: count[k] }); });
                    return out;
                },
                async rgXCheck() {
                    this.imp.xcheck = null; this.imp.xerr = '';
                    const cols = this.impXCols; if (!this.imp.xOn || !cols.length) return;
                    const r = await this.apiCall('students.importExtra', { dryRun: true, year: this.imp.year, xh: cols.map(c => ({ h: c.h, n: c.n })), rows: [] });
                    if (r.ok) this.imp.xcheck = r.data; else this.imp.xerr = r.fields ? Object.values(r.fields)[0] : (r.message || 'ตรวจคอลัมน์ข้อมูลเพิ่มเติมไม่สำเร็จ');
                },
                rgXRows() {
                    const cols = this.impXCols, si = this.imp.map.studentId, skip = new Set(((this.imp.check && this.imp.check.rows) || []).filter(x => x.action === 'error' || x.action === 'skip').map(x => String(x.key)));
                    return this.imp.rows.map(r => ({ studentId: String(r[Number(si)] || '').replace(/\s/g, ''), x: cols.map(c => r[c.i] || '') }))
                        .filter(o => o.studentId && !skip.has(o.studentId) && o.x.some(v => String(v).trim()));
                },
                async rgXWrite(batchId) {
                    const cols = this.impXCols; if (!this.imp.xOn || !cols.length || !this.imp.xcheck) return;
                    if (batchId) { this.imp.xbatch = batchId; this.imp.xnext = 0; this.imp.xres = { created: 0, updated: 0, same: 0, missing: 0, errors: [], newFields: 0 }; }
                    const rows = this.rgXRows(), xh = cols.map(c => ({ h: c.h, n: c.n })), size = 200;
                    this.imp.xtotal = rows.length; this.imp.xerr = ''; this.imp.xbusy = true;
                    while (this.imp.xnext < rows.length) {
                        const part = rows.slice(this.imp.xnext, this.imp.xnext + size);
                        const r = await this.apiCall('students.importExtra', { dryRun: false, year: this.imp.year, batchId: this.imp.xbatch, xh, rows: part });
                        if (!r.ok) { this.imp.xerr = (r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ')) + ' — บันทึกแล้ว ' + this.imp.xnext + ' จาก ' + rows.length + ' แถว'; this.imp.xbusy = false; return; }
                        const x = this.imp.xres; ['created', 'updated', 'same', 'missing', 'newFields'].forEach(k => { x[k] += r.data[k] || 0; }); x.errors = x.errors.concat(r.data.errors || []);
                        this.imp.xnext += part.length;
                    }
                    this.imp.xbusy = false; this.imp.xdone = true;
                },
                /* field list (ช่องข้อมูลเพิ่มเติม) */
                async rgFieldsOpen() {
                    const F = this.rg.f; F.open = true; F.err = ''; F.msg = ''; F.busy = true;
                    const r = await this.apiCall('regfields.list', {}); F.busy = false;
                    if (!r.ok) { F.err = r.message || 'โหลดไม่สำเร็จ'; return; }
                    this.rgFieldsSet(r.data);
                },
                rgFieldsSet(d) {
                    const F = this.rg.f; F.data = d; F.orig = {};
                    F.rows = d.fields.map(x => { const o = { key: x.key, label: x.label, groupKey: x.groupKey, headers: x.headers.join(', '), ord: x.ord, active: x.active }; F.orig[x.key] = JSON.stringify(o); return o; });
                },
                get rgFieldsShown() {
                    const F = this.rg.f, q = F.q.trim().toLowerCase();
                    return F.rows.filter(x => (!F.g || x.groupKey === F.g) && (!q || (x.label + ' ' + x.headers).toLowerCase().includes(q)));
                },
                get rgFieldsDirty() { const F = this.rg.f; return F.rows.filter(x => JSON.stringify(x) !== F.orig[x.key]); },
                RG_GLABEL: { general: 'ข้อมูลทั่วไป', contact: 'ที่อยู่และการติดต่อ', family: 'ครอบครัวและผู้ปกครอง', health: 'สุขภาพ', identity: 'เชื้อชาติ สัญชาติ ศาสนา', income: 'รายได้', idnum: 'เลขบัตรประชาชน / เลขประจำบ้าน', unsorted: 'ยังไม่จัดหมวด' },
                rgGroupLabel(k) { const g = this.rg.f.data && this.rg.f.data.groups.find(x => x.key === k); return g ? g.label : (this.RG_GLABEL[k] || k); },
                rgGroupCount(k) { return this.rg.f.rows.filter(x => x.groupKey === k).length; },
                async rgFieldsSave(addNew) {
                    const F = this.rg.f; if (F.busy) return;
                    const split = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
                    const changes = addNew ? [] : this.rgFieldsDirty.map(x => ({ key: x.key, label: x.label, groupKey: x.groupKey, headers: split(x.headers), active: x.active, ord: Number(x.ord) }));
                    const add = addNew ? [{ label: F.add.label, groupKey: F.add.groupKey, headers: split(F.add.headers) }] : [];
                    F.busy = true; F.err = ''; F.msg = '';
                    const r = await this.apiCall('regfields.save', { changes, add, expectedVersion: F.data.version });
                    F.busy = false;
                    if (!r.ok) { F.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.rgFieldsSet(Object.assign({}, F.data, r.data));
                    if (addNew) F.add = { label: '', groupKey: 'general', headers: '' };
                    F.msg = addNew ? 'เพิ่มช่องข้อมูลแล้ว (เซิร์ฟเวอร์ยืนยัน)' : 'บันทึกแล้ว ' + changes.length + ' ช่อง (เซิร์ฟเวอร์ยืนยัน)'; this.showToast(F.msg);
                },
                rgTemplate() {
                    const F = this.rg.f; if (!F.data) return;
                    const core = ['StudentID', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'ระดับชั้น', 'ห้อง', 'เลขที่', 'สถานะการศึกษา'];
                    const extra = F.data.fields.filter(x => x.active && x.headers.length).map(x => String(x.headers[0]).replace(/#\d+$/, ''));
                    this.csvDownload('แบบฟอร์มทะเบียนนักเรียน-เต็ม.csv', [core.concat(extra)]);
                },
                /* ===== Case Report (CaseReport.gs): the department's case note, filled from the system, editable, drafts, PDF / Word ===== */
                CR_LOGO: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAACxCAMAAAC8/jmbAAAAkFBMVEX///////3+//7//v/+/v/+/v79/v7+/vz+/f79/f79/f39/fv8/fz8+/v5+fn19/fw8PDn5+ff2tXQ1t3Fx8p7yu10yu90ye90yO5xxuz6qmj5p2b4p2b4p2X5p2PhsIawsrbvo2Wfo6lhs9yOjpB2f4lwcHRoZGNQWmo4PlMeLU4aJ0wbJkYXJkkWI0YTH0FGasS3AAAuAUlEQVR42u1dCWOizLIFtEWbpdlmy2QmpMMuyP//d6+qmk1EozNJvrw79nv33kyimHCo/VSVpt3P/dzP/dzP/dwPnTVj7H4XPjdAuo5fMGbc78anPIzDf5mOEI6paSt+l6fPCZHwo1jCiSPf0bTd/aZ8sgNaLpBpUdWHGv6/KtLY01b32/KpjBG3Q1m07aHZ02natkpD19reb82nOSvmhkXV7Kt909R48MtDKb27xvs8crTSoqLd7w8gP2UBp6zbtmnaMjZMU7/fn09xLBEVB8AILVEYBkEYxWkJ0tQWoWPqd5Q+hV9noxyB4CS+6ATH9GL8VpUI7Q7SZzhbzUc5qovINXVuMzym6aBwtWWo3fXdp/AavESptg3frfsIdmNpEj0JqVn33MNHRUGr8cz0186Iy31Tl6Gx25lD2s6wmF+2+zbVnDtI73kMAwwKngXQ4Jv0fWOteWkLPoO0za1pDqkgw9SdrN632e4O0ntqMROPAVCYlis8OD4c/F/hcgMQBPfaMA3DjUpQdpmvzZN1PKmaNvPuIL2jgkOANN0Snh8EwdPRgW/4ngvGRjftlZ9W+7qKNXs3A4nJ6tAW/t0mvauyczwFz/PDw+Pj46/fdOCLx+fnZ4LK95yNFpXgxaWeac9SQGsmSwTJvoP05tDoOttsTMtyfQTo+fEXgQPI/Jqc379/IVQEVFLt92WsOaeViZhAsu4li7cHCWyN5XoI0PPj48+fPwGOI4DoPOJ3H3//enx4gnDokPpsdwak0L7HSW9uinSDEHr49RPEhTC6cODnz+WhqaV2WuJboyI8FNHmflPf0ASBDOkrDdQcIPQb0JmpuPlBLfjz50Ne120ZafxEXhiCVJfx3SS9IUhrAMkgiB5//Xy8iM+A08/fzzlErIWvr7VTkMKyBbfPuJf+3i4sWunozj09g5Z7vA4jAOnhuWyrNhOr1QJIftFWtdTvjsPbSdLGAogelZ/968rzG0Ha1+lmZSyA5BWHqk2duyS9EUIQubogRb9ugujX4++HpGybSm4WDA/TRFqBlHn32/tG2QXd8tFduE2OUJIy8ODAOVgGSVZor7S7vnuLw1CMwJm7CaAOpKo5lJFpLl3WQR+8DO8gvUlkRNbo8XaMAKS8biAWMhdx2PjFoalijd9v8ht4DOB2//75+OtWiNAmEUihaSygxHRRtHUrxeoeKv2dotN0y8XQCJ3uvwBps0jSd9K2OaT+vYJ+61nDMUjJkUYyNBE8/VKK7maQRnXHl0DiWlwfDqDvrDtIN8iN2TU96Lpp7jZrUHUQvz48/rzZretP5zhst2yh4cXWwrJu2sQ17/ruahnCu7gTeLrM9M6yPfS8f/0pSOiCN00ZL4O00b0UBK30zbt/d7X5sfxIJllRZGkiZRz6QtP9PsfwpyAlJThwchkkw1xHlCO/x7NXihHXPaSVgpGg01ZFKuMIq64Knz8B6ffvR0wL7RNzGaSt7mXtHhyLe/7uqmM6IUC0n56qqsoyz5NnAOqPMPr187dKsKbuarPYhMlXMdgs5LHezxW6zo2Kw6Fpml6S8OumOTSHuuqB+v37583B7K/nHEAqPI0vd8oyPzs0bRndRen1s7XCom6qui4LsEdJkhZlWe1raiZqDm0NEpU9U7n8xjgJffB9WwTnQAIvvIInIfOdO0qvKjs/PdT7Q5VGgSdcZGmFcUJtedj2Ve1JoIo8eXp6AIkiosl1WaKfD1ndUGWWnWk69wsIaCsp7u1kryo75GXXRexhv1dHRxBeEMXg7JXVgYA6KM2HEtU5E1eA9PiIHAdk3TG23Mm8i8vD/lDG7j2D94rzHSKlp4xszbJMdSyVqrFFEKeIU3tA1QdA1aD5kh6nKzTeM2KQOGcEyTC4LVuwhEVk32XpUgbVciT4dW3iOLtJfsbA+6prW1dA+IRAtQoocPvKHqiHDqjzeCETZd9kvm6ZZ2ZsMFB4YJYKf2Pda7Rnz0YPMgCpDLUFniImbHTN2GCcW5R115h87PRdlCkEaQ9GyTkHEtfBsQS3MvWXq073QyBpEdx9CFYgmFl+1hl1toowRomqVQy175w+AOr5IkgJmjvJnHO5H7YSaJYQJedul86qu61siRtnnX+Nbm4517WVF0YyK+taNfv33nmCiQmUqS5V/nvgGhMVpUEuODuboFubrgQRhccEwqn1HY9lkNykBcvta/YrL9zR3BnhK4kCZ2LwzpXqe358+Pnr9/w8g74DpwT8u/OOi5dUB4wAfOMuS2dAEgBSnXrXcA0Yun26tnb9GEwUdfr3wxk61fcw+Oc9SNSMKTXzknvpoVJs6sS7B7WLZ4Ug7a8ECQNfy7K32w2EvCGGUdU45qTqnIljoHp9dynzwxw/BY3XlIl3p6UsmgQNQEKzfX0V21ivV50QhljcKNHh67y+uiyUSD1jTgIt03PeYKZbu9TjYmh+ChqvraRnbu+e+NJjjOEk3EV+UxV7vWbMsgzN9pUzAQ5ag14fIlX2Vurh8ffDQ44TG+ILRgl/CR1kCTReKYV198RPj6XHLZn2m6kG2KtkkjNBGSRVjQKRGt0JkKmnp6TGsRruZT3GrDCrVYLoznhYjibhpqben1WxddPEhM4KU32S0ueHA+IEQBFSABWEVlXhaRZnzDhHZ2DcCFPMiBexsFZ3nOb2wPSSQ1NX0as++AU5UHGwjSkkzMmq9DlZKcz3gcUqQ48Tohd8PMyIY87c4HeQ5iDZqvk48+2/ca3WzOYbwAlzfej20SguAL+v8xapjEKvz2EsR7Wg8cjJsK07LHNfbYWsnX2VhQ5na834U4IVY6ZtmzhlQzcIqRSFqoIYCiSqwTlqCJTvavqZNJ6lY+0RnJgANO9dmOZ3JyzaCm5OLJhubv6cBUeznTgecucdsFORVHXeioYR1mUWe+Y5kHRzG6HG2yce295BmoNkI7cKHOA08gxty/4KJTq7HSBlY9Oy5YGPHsXqRFHki7P6TteZQ8nWUrr8Hi3Nsw6WGxeglCDCSWnQ8J/Og2bHZ8u5tSgSZ+e3cyGpUhvdHfEFRSPAHBwoEE3pYTc37K/FSU22M7lNB1x1x7ExmQ4Qnbv4ltHgNTBL2n12wIksgQOckMo7HKoiiQIXa7PmW4jTqAGJfMc6f/vc46L7WY25Vte+o3Lq/+oiKtARQ5zKDNww4dirtfFmIPXnlXdvNYitMfMg2L24dPz4wjFt6ynJyxqcYKSclAV4ERhVMm6sb56z/ucgrUyXCERFdE/ijQfJQavVamvZ/tPDM8FUI4WrbUrQe2Sf+A55JH9VRGBXv9+gZoumzrw7SL07RSkYB3d8mMGv378enhGnCnGqDjjGW2J7hWFbuw/bqLM1iGL2V3mq/6XDdM31IYiREmOYJ1Wue35+zjqc9ocGcYpDQbIw+M6MveMWpJVJ0dIh9Td3q6QZluZhLUhlA8qiGCrgIE85mSeVIkV/z9+A2jNm5uZ9nhyOJcCmrqR7L9NuuQghdDxQag07KuoWqQp5opDqcNpT4u1QpnHkORbfbXbvDRLWIXGCV1scz3hY/4tdmysRF4dOVrpuF0qEEjk/z3BEJ+o95e5hmJslkdDJ33tnnHamk7R1MxWlDqB/S//pzPZkCXcfLI9a8kFJ0IaqQIe2VSXwLEmSvFDyRHRIiJ88wZnFNzf51Te7M0jY3Dc4gJ84tOaW2UII19RNtl0bxj8DkpDYKol56SgIaMtHkpWqBE6V1YOqrKJQgRsxrD0CnHzP0kzQfO8oT6aQVdO00iZADHPnhTIBB8YTGNH9I3NbDZMqfdiS5Dnd9yzhq3odEeravrJKNXBCCcwW4ARuRCaxfAdab/1eMJkaFgC7ObobQ8RpSe2hRRKHvo3P2D+Qj1g5Im33NVJ7kUk36fGyXOyioBp410cBQKkCK3oXvTJM45Deun0fkIytHVUHoh4zw3AlNUmBvTxgBpgqhzh1wjD+pzXfBitIdZ36NiHUZwU4Z/CMctvxqNWPkOq5jx1KhBNoInLLXcvpIXpjlIjxgDULwzFdDG4xZiN+S9PhJDTdsvn/MkgMN0igj2vz9Xoxm6d1yyxVa9IIVY9SQ2MEIv5eZokZID5Nnfma5mdoIkuQbvw94P+oFA86l+qH50BeSCGevpgdJa3Ycvax+/fpG29MS978nEZFi62qJt8tYcQ23DQVMdhFgj61ZSrvrxnRgntV+A5/J5RMlcJLIxGVTVVnkR9EtF+TfgXwYeoCYgLPXc3/NO66wlWAsFnoPZf4DpsFKNgpSMcQjomX93NxExwFHW5NY72Y4CZtb4Dis6nPQfjg/CFZCz2KAz7PXTdZGQvtnZ4jboS0rayQsgQnNEYatOGFUVLUnWRjTJCGG/MYIxceKhkFiJLrz47QXG+aEGRCwK/t0M8C+LE7wGR70/e5jHli+hdyz4VLza7usbcVJHAb6jrzrggOWd+SbAiPoEozCqrwTrVtGbnrd3Id1qZLa+YOVQl4FIHlWJala7qn2kOpo2Pf4mMy+WTmxlmWSJnmSWBrfprTwZAPTxZoUXbUE5Ak8MD6Wd79PJFRN/hDyCIfDurcZDLjEgxmFmq+VD8tuqvn8ZsaZvwQAClxr33DmvWtzmCubGWr0FUvU/FuKnnLLQ2ZFxVKbZt5WIK3wBM16TmPsDsUvE/csTlSbxmLi8R3GHeDLA+5WhnkiTRVX8DjH5dHQ1+zDEAK0oBWC4E6zQvp2zaBJL3xcK7lONOXj15NpDnqoq7Mgu7qb3oHTC0owLeT5k21PLbZcBuM1WplccfB3pco8lfvBpLJVqaIsqolvVqEoe/ZBnh0FoiUaTmuBwJVts101i7cvDzu1Jmf4fM/yEv/grg4kqQsRZCS7pUMwO/eJmR8bB+yIh+yVAqkvuEtHj/oLbMNBFJTxzr/U0mcfEmOO+rEtzZKyGIxwgRcBbBM6Rc4YeiJjcF1EGtafepFxb6Z9BoABrnb2XT4Ezv1w5RSuwIkPGGO2gEl6RikPIsAGHYCEieQ2HuAFCqQzL+6h+9ZVFIgGS421pQQJaVfvn3/8aMDyiW9h5oPF2/Wid3HtCxOtT6B4sq4v6XXgwR/UEi2ZQEkLcl9dZ0PAokkSX7qHBjy9jQRhmGMi0cApG/fvn778eO7wsnEFJ7t2Al45KnXN3symfWbmpjjebeDBDfdTnKhLYHE/DxRxeKPAKlrYKiTpR0Snwkkk0CSJai0l6/fuvNDCZSPuVbLlvWhHm4S6Lg8OolvbwMJQsgsWgRJ06I86sKvDwBpjS74/pB96g5V4pV7AFKCy+xfvvcgffv69QcBFUJc4yRTkBCPImKabU9K/TeD5CWSQLKHwzqQwOT5Kib+AJA0tk6QzBtuPjdIzPEBpBSnsXWS9B1U3rev3+mgPHlp0xzGpmyIOZM8jdyjNM5tIIExQ2fwxLtDkJjIUpeySx8BEu5qa2n1+Oozg6S7BBKOAP3x9XsHEqKlUPoO4gS29ZC4ujEA4oATTaWUPwUJXp66mkhyOZwATBGCZIPCw40AHwSSSSt6y8j8tIMTyHVEk4TJoT35DQoc+u/+yx8IkjTGFZsoQKFMizwS7E9Bkpk4BsnvQGLo44f4i30MSI7EQcKJMD/pbCw2gIQtS+CBf++MUg+SQumHGqc37d/kHAOopEj8AZk/kSQpeXdsPtgkxkSaYuLhQ0BiHEUJFJ6nb5nxaUHyyANvD9XLl2/zQwrvpTqcNs6jNNmg9YK/skkL3h2eoAD0PsgmbWkSIZb9NN2xlzeY/+cgbdAk4WLnavTAj2F6qRqsilnjzeyeQcwQyZM4iWvR0cImO01OvTu/8+6m6a4BJI5++Ec5Dkj1KJFxUsQ+0iSR7G18NpC4Tx5405bLIH37nqo9WQvpLebIVHRRzRSkPJjcUQF4zIPZC3GSUngy9z8KpPXKwdIn1sGxxGl8QkHqPHAsIX9ZBOnrj6LZt5nonDt4wOWgzBAPbw4SvCKNphWHBP91BJLNz2Uc+q9ARD8KJG1l0jRAeBRx0nQceq4N9lc3GfUl62+fjLg+0ad6BPUd+Q00hP/LkrIj525fp/0ThgmHuGf5c9aXjo5AAoMzVBQ4g/vLjkDinLxsdh4kHFmbxR8FkrbWRVzgcpw9tU9kyO7wXFLvum5u3pozxVS6/JqXcgUS5RuQZdssg/T92ws8ZeXkbroys6nhFz9HJu4cJEz6YGqH0gZIOQcngEBSkosvCrPEU1nwaRFmAhJl9/AqHwIS1qN9WeCYGcSpPdR1VWZIbPMFAcS2b8luuy1pTiCBtvMxc1elCyChTQLnrgHnbj3qr3yoZEZFfOLdYek2yTuvT/NSsC7HkuTHObjY2pmMw5A4yvKPkiTw57YQ00uiAzU4YAt5bSBZiFQU+KJ7buC5XsGLV9tp88u7FjeI3WEaNoKU4FT5ly/fl0D6Ac4d7iOZZkfzJBA2E/BnDaW8I5Cwph77rmb7UZpHDuZ4gjQikkOIZcRu5J6QyZS9YE9AwneUbTiAJLN33vDJ2DAPqOesIk+1UuoPoPI6+2WaWyQW/wVI7EaQ1robdkmhMyB9/ZGi3zDlf3AX4qMETppJ3+4NkZQT/4/7SZbiS7I0wO5phC1J1Hswn6RsmpBZMp6Qj9VddC6YxNUOvYPy/qMUGToIjh/LHIngddPTtUD/kUcBQhV6O+QPmau/qfPdUmZX3eqGp/IN+33x8nUG0lc64DdUh/RokB64BjiEJcHAYvgkzzuqJYNSw1eE/SwlN4joBD7X+kIH96PJAZvlH8VSrj9uqvF8V3vvs2IbmrLw9PyUlKodCXGqO4YxdcKQU+FifkRbgcXdnYup9PMQ4G1HKsn2CpgUSBQlkQPap1dnIH1/QWarPE4Sc947H5P0yvHwED5j0vU/nTo2jM+dnqNHYXpF9gGNqjoICU6BDB6e8mqyP6knQZJMYXtMmiC5193Ru4zTYaA68V51c3WavVBDh+hmbk2Tv0qt4PT6Lt/QVOmP0zAJBemlbPZVPOOlMe1UXtll48j69y2/ZcEWT9/+Yc3E2srycU/5XrHiCZgjFjh+g3a/ZJLcP+t0PLFumg6yptZLqUL01gTSi+yzCxHmIFGdIjnUi5k7AinFtY7hv9NZtjWwbauCO0ItZdRVVpJnPuyoIKQOyqkAje6wmcToph+nqfQXWNOk64Qs4a2Rbq3ZNeZr5ZHfgMXJ06RQZ5JwKof/r4Ckr2wP9Dv4UQVGtEQVRLZqQnTViqDqXYqGumzrInJmIFleUkGolfo6WwBp68QVyGhLq4GvAWmt/IbDvilOtN1okvbFv7JrzjC2ND69LhP/qOPHMJAFLlUXDMrRoWfsH+pUHIGx0gRWe0HapLPgVRjUytLgXln22uAONqbAI7A6Tfrj29dT1w5MEu5OT91/pDnTMB2a8FlEAqm8iu3YTRi0LMe2ibCv2mCILY+tmjOQMH1fo6C1xVJsx7CzEAFuM1/fscsQ4X9Wbu83NOnXJf8bQMJiUvyvrBJed2t5Y4MfGxpsrsBFSkq8BI0XJLGqAdCRWdCj0KL73pahfnrfmB3XB2xlaS/urRhBUqVzkO/mpJikMPr+I0UmeKj9I9ux+CoscVe8Y+/OqMOJz8pVd0Vob2aiQkMfwZRXsbNwDSEPHUivzHEnmAyDK5OENOKXoXaO+PQwobajYtI/MoKI4w3Gu8dfs+i8i+JMZx7sMA0XAxJIcikC95JuR6ra8PeKSTIMtwtlG2IKLcSyAFJLdC6+dIEPzAu/M916TIdL7Cm7Ok/ITOMkYH0NJJQkAql8BSSmQBIBmSS4HpJQ5iB9A4xecJqLdPV3HDH5cVSq1z9pyxMsf16fJ1zo+ma4MhbTFCAqCyBxHtcEkrJJxyWQI4qFquyYFCUh03ufLmVXvwNIFTUdHE9fhr/AC8LAd7s0AnfGg/l87rj4ZZ+kO9EHDF5kj6VbsMN4NXtI6Tnq/XRQqzDNwVd4S/24EwHrilXHWSVuq4tdd893dnobSIuPAjqICFIZLVwGJ8S35N3h6hL03tiIzClIStuFWatM0gJILy8pXA78htmIbD/J0yTJsphgcpOxXy9PAuZGWd/UF6GijKR3/CyFsadFRIHF+x/SxfBqdG+Q/zDp/4sdcG+iNMP8eRKeaIcgnTytUTLlVngx1rS8rhExTyV+IntNkv4GJHWHGbWhNEdNXTMPndrB2tTFffW6tsHZJuwMSMq3Q15kWyyCBIJUwIdl/hFITAuyTEbgcSQ53H5bc8ti5DjGPihdxXnEcTxp6MBNnxpixkQCujqmZeyMixhvX0izYrIAfilbk2UyXi+C4ETmWHuL4jSL7GOpdOOyGFtq4jaZrCxUTAu/zPpfJssi95W7v9VQ3aFNuo3YZRj6SqOR/DrcdjUHB6LVxcw96zIOZaTbhma5AmcFWczAdKw+HgXShsoUSLkDkJZKSd9ewCThmHdxPLxLDP19USEFB5DksWWM+3+LKIEb72aZO02VUlcGgUS08riXsyDJQwgjNJm5RynJKI9VxkMkRzQk6niVWdzjwuMij0entgcp6vD0w6R4bS/OBo0+Gosb59qbIA0Wdo4Kx9hYtpdUbVtlZzKejieLsixi17Y8P3jCEwS+QNILuCEmyhW271HCmdn+ECUtmSR0G17wh/HqOKCO8oCpvkMnxvvtlgm3eyoqmpg4cfuv/RTAiLPpvDYusZyLIDG87VFHt+BYMQf0HQDJG6/H4ZlIbG6TwfHgake/S5T6cuhb4XFKMPcAdiDF3KHroAIs5GVNxnQ0GPvEsG+iCBkbE+xqoO62Z1k6/FZZ4pvLrbg7ww1jDK/cgHao03kKPMsAcMwJSKNJwkBokXKHIKU4oSCaOeBDpx/e1hglKTn6ywEke4g7kIPnpXJiTOBf6AEBSIqbP3TPEJHLQUk66gSA29y9Bq6WHokSUvrC4QkAkKIk9bQZSP2vj/F7VEaXQTIpsVaEt/VnssntBqAEdht7rnVu7Zy+sxzbMuFND5Pz5JuGWuWtm5aud7Qd0nYRabtZ4q63SC+YAj8xfwCSPfxygXMJJMb8PLLhHZPupjjFqjhJkpck033sAFrssQWQBhy98IisjBRLtHCd8MDHgP5z2TJI6Gby5HK/2ErHEUsQkQj96h0Rhr45vt1PgWuDI2Cdj+xWKw4R1jFGDw+Bu9niHP5ekhjbGkrbIcW2OdV2XweQ2tQx1jN15w+FV3y8L4EE8XXkMj8bxi9wkSYYwsWouMLs+MFmwnP4HCSRJ30Nd16gSXC2FoI+gKShArbPgARfhPkromTTuKVK+lfPkjP07ex2P/nWdkcW4UKgalrBMUYPTwKpY/injiARBSXEfOICBwWLFGSS9ofkeOAxwy4vf5hGg1yEMmHTuTrHIKWRgwwT0U8KiuDe8Q4kZPbP/FNyHLzp9ew4i0QHEJu7DTTGo6PAIEggnFnfKHgKEj4zyWUHT3dRt9A+Xk2/qv9P192ZSDwEwnglRcJ07gSPM5BctlMzevQepI3XO+BY8Pv+9TQjBCYJQAKLYM1uZJhn4bBXhkCaeXcTkEDdMWyRDYdRApnQlCSBC5HbC8Eeti5NwypH4nSOk4wBV3ERY70KI0kCqSXn4gxI8JGX83Jrx8WC0qEq4hC3vliMhsmtzpONEaTHOUiKeaqfa9IAhWZtzqi77m3wnJorpe0oYXvCXcUUK2m7fTOfpKui0QSHz3jUYIEgZQPlBwf09SCR4YuRG4k0Vre3FDGJH4IkZMKWQMrjkUKELX9enKQyxtUe/Eg3SkmUvqhTmgSSbSsK8yJImFcr7VcKbTptem3aGmuz+IfoyAk3zxISDN2ZK67AfQ0k3OnnBQ8juI8PT57JzWOQdBXJEi0y/bJEQMEoCTy/WUlrgAljeL+TpDLrDzzbU0nCgQ14mwErcssAtEy9qQNpKW0iy3y4Xpfs96KUxoVNnhfWu3rM6VwHAolzm4iU50CKS/FKQGsqJgrN/CsSiM4FcVx1VXVdLxQKTX9mkzxMJVwGSTeZ5YEsPT4+/CSIwAUfAEJ1R4VzEqQwI1rk12WL9FK1+1ou7EqHW4ATbeAeCnIc0umMLgRJOK7rehA+5mjau7ECTPUlKYtxCaQ8HGmtXDnnXPhxmqXh5IYLmboqwEJlynt1BwovpS7ssyC9ZmhMC6LNiua1t0g1RgIrTktwbXXD18dkO8M0HH8MeLrbTSAZiyCtGYFkbGy3i2UxvnJxsJ5xBNKaOl6IFtksMO5I2YFJoha/c5MjuY95oZl3h/jJIqWT5Zn0OalETya2GnkTagNI7qm6o7TQGTcZZxKF9uDKh6A4ux9klGjoQWKg8NgldfeaJ8C0XYhjsZqewlUptl1MULk0z0cpJq3TTJYYb7fvGisCCeKkk0hpTPpoBsqg5aqxVhZmluaENpUSCmNKN5wy7ggjTNwdwFeaPwysDw0hOETC/ty7c2Wm9tbJPBpIkWEWcPxRKrRe3TEmc3fRcRi9uyPp1dB1GzIKSe73A76kQqcLx5gTZ+EZx8FNMu2KYU9cE5Es6gNRgyqFFI0NRwa/P8jUaoOAYRJhYwrPDwIQfccAnxCnG3MdYJpv1VlZuiHcvr4BUKNXomvG5qSUgikhBRJOmqhevn/9ugxS20CUtDnbRao6kZbipO7nMhnGE3qJxGboJLJHkNAFn0U+rn1ekgC/cJx35+Vt2Z+aEgkDSNzL4Fk444LLazLcGE7iiFycD642ZCuo1IBwgEppQEfrhrQycMs2hmnBHeeGoZ5iN5RgRU3OJn4h35qgSrNoIKB0IrnAIcEEeKftGhrfMMs3fFcYYcGvkpo5A8kLxXihGG7oAkiUu7MhhImHdjMw58yJqC9pAGkWzDIwJ+B4zEDy/UFBcQps+2yDjPsjM+Tz9yBRtUOyRZCiV4LZ/t5pK2R1bEUgsxyfgrolqOq9IvAf6rrsjZXL1kRT0Vf6aqX3w5/XEAu0h1L64BtuTUSOmRwEEALTdlrDMJSDvxTubpTbgMPbD+n3bzOQOow67io/AomDDxCOo5kx+3A244AZns6Bh7dBzImZB22QJHSiUzESvsE/wFbZOUixHMSN2Xna9ax5R12CURFMQKJRENFSWginrVzNHMK/0vSenp+fk4xGY9aKxFp189vrmtjGsbtdEgSdOENVGnsolyvFC/fjolLlvleflHWXW41SpIfN0g29Z6dyQoV/wgLHoH3ICsWpdyEtBE9zX1NhYA3EkJTpgllQX5KN43DonycJVhyBxzukvU6SyF0cUuU2p7wTH1OEjkiyKJmCRDYUXJrotnoePM5PD79pRc9zQmNGy2oyG/xATFTHWNJWAdb2mrpMsAsXjgD9meJKRwhrrqgq6l22IUZW5Dwn9LVXdsRdzRYePFAZ/bPpZ9K5kHGgXv/hZmcRFikmIDHmQuA6zIsBBQG/PZUqjtRrloi+0XOIW3l8hKSL2nMCEqaMkkGSWF9Rgk9zb+Oz6LbtP/36DafzrxNquGj2fQMT5vmEvkTNd6OipqWAFTY3qdXaLb0XvJ9XeYy6GieEbkPT7Oc8oQEj0HZNGS8EsuCURcJhzMEhrAF5d7Zw++MgSM7gWQwtelxgaZSxibpDdkSsugY17nrwpa+8O98eLgfWDcQRO9GYK2K4ybx7OuJpYwwmMqYgwS8ZFmVXT2KCnuMgLqiV97aKuLmx/Kff3Xl4xju9V24ELfJpkQDmLuaMbESp7aItOHvk+MM/sBi4e/2Dmco2IFF/P4tku1QDCRJSKcIln85PigQr3jLPIhfjpDwe693hBCSSjo6EgEtmJg50TFEuPm95DhcLojhTQ3AApEk1XuIc5SgvZBRGcVokvYzNCkvMTVNnChLAn9SxKp/HVD3PizwJb+cumDq3UOPheX7Oy0Pdd1XUFS0YKRPPWnR/meXi3NRuzYUax4+7zKRvsSvKICqQpXpfM6egDBj1tMglKoUXg/iCCMsAO8KceMJJAJDcIBrzpk7HOEG9JaORtBN0RBRmB7K7mMr6gGWaXA3HUzMHnFls75Rxr+JYGIlZuRjQDKKpnvRloMYQ9HCH7h/wS4wVMwyfMqjPCe1PwjEC6IajbwePqi+2xnKQwgzd9GkgNHHGAdh9WWAq7So6sLJIqpR0nG74MWKEZK4qOfd32Wq4dBe+HHG6joNQml44BMETT24SUlLUPa5b4GxyOYcoXeolk8yBfaq3+IzSxchhANFUv9UfUvwMLI5bHmZ9slJtRaeAFn5hgQQ2TOCcfS8zMJ1FO37gYCTsuwZ7ncO4Wq3tTpBSxQH/PgwD+DrFiH4aL1eA+5vB2Oukw1nS4PT7bJzLcY7DOLr8Z4mOJ3sw+kbBsffzT7l0hmGCJ/7wjCvBcCO65/DNMHrkVRdAtxwPOzGwLdrm1/FbVqsuIxTSbqdiNEnfv08gIge8BpO0Ol9bfEtu6RWN2Np/dnAsCjhJiBG2UBBTxLqS9sz4yESGt133V+hdjEQdL0QvPrVGKt2AWT1Pv+/ORJCYhQPX6gP2UFJgev3ANcxFmF1fpXbV2+AZ4J0ghdkYJOEUzxlGROaSrmncMSK7q8c1UuzdD5gvqZu66AQJmzCpU/Y7zi1+mZ+0WSBz/bvHdBMcTe2b9rs3DxvGpld2SIpE324JoL5MsTzk7l88SKjBAqjYbDbv/Uk29qb12u6A6b+Xc6fE1KvQ7iZpSDMBSLFrmu/32K6229XWGRHqGShnMUKeUC3v6MxAEqa5e7cPMSxb+BOI1Ej9iSB9+fLlWNvhpp7oVkH6mHY87WOm2Jyou/qQeqb1bh9hud4RQjgrssGupB4iZH6EX4603b5NfX19MQJgixEu7zrLjk4fa7KlIFT9Z/aGITRis+9eFUK/9UOuO9QTExrOm7d4g0evHRmi4eC270HbhQJHLdv+l5m2M81bnm1iCXvi4qbVxR/espuVWC2a49FMsA+ECfc648aO0HxLlDCG0nUHADpFiBLg9eA2fPFwoRUE0SNK2Dt2WdtxLZDTRDTjfqzm1sWUlI1kcnRiofmhx4P4eLgK80NMjHIezF4vPc3H5KrmT38Qccad7oNi/wNFyWQ+eFqHOg036o823kCFAki4bW8ZIUVu2Hfa7keoSEq6aUdjBhx8O/9SusHWZJsMy65wAl6a50kcJ1meRoKxOFfTk1o1Rgn5d8gKjgv/WEMm4ELKDMt56vV1N3Yp87UICala3M9hwoOs7zDNMxnLLE+CD9R38ItgzLLP4kBgKrfvTVFm2FBnTXxkSkgYw9G6PairFf1jTfjCC3aOEJ63BFAUS5mkaYb5hKIXJNvGhhjdNMPBJB2avbQvpBuwip5n/pC9xK5K0Jqc2wJuYuzajqoAekXEVPHOJpCCbLrekiFzW3OQn63KfI6A9/bFww6kdFICdDj3szxybWYLmuT6cRpv5SWVmgyV0gw1tW4SWympnbvb5bChTj19dQKStiKWynqz23Ab10n6ZwSIkuYVcpTA/a6r3mvwrB3jcGVrAIkoKJG2vZQCgVuYyb4YLmQ+6jEsoA5MriIaYEWQXDmdFIpMlYBI9L1DYefx+PoepOnHimSo7MHn2x8XbK91H1HCeh9NkEwkcoXw9GRbr+MBInDwPOE2WDy2DV8Bjlgexo5N/xw8qnG4qA6TkW292/DDo4XQuBkuPKr36duLgiRxKUjntUWFtMd9VyAakepTYx6xSNS2bQTpmMXFPGpWUiDRO1wkn/av70Fik73ifjH2/U0qsR/i4QlZ4EbXvjBLNaIeLmxWWDg9XTp89ahF0JUaqodcPyy8j0ESmO4NgSR6x6GEwC119dUFkMIyZEHWcYa9LPXYlIKYpR163mTbJYLEnWQkVXFqidHYRJKcRUla7PsDXRkHH+rh6SJUm3eJ1ronikOD9IUerpQAi+NlwC7hk+Dcrz0SZmvckQ0XK6pmmm344m8se2eZbjgl3MUXu+QFNqc6iVT11KiMpkET40HY6cETkKhRpe/bExLbMW8DCUSt/yzHc7WPPAYxjrrF5/3a81oxUvpTV4N0IVjRq/jQ0ntlgw606h4Hh0a+F9PstJcJSmJjgMX/cqztLnmPATgE4+aQc8TgU5AYarhhX0KAXX+3gSRUYwv7T5KK693KdEQQke9VEFsSKZL7CROvqZE1eVA0FYCLxAs5ILECDQ5xbsl/oxGHuC1b0cNQhrIk8oWzXa0QpGqaBPrxBUAdQ1ks2abuhYmeyhxQtzhaJVdJ1Cy0XQaJazLth5N25LnrQWJq4njkqpb/j0//gnumqKiin/pJN7qb+0mDnZAQiWPFccQTfbete304HPxnpTbbdyMoUYbQb8SuOfANwdMmkNJLydWmiq0LksRtJHkPrDqRR845/2IOElHmeqowLlG6ASRkr3CamUNh7n8jTRqOpR4+mbI5EQU2akwreM81idKhM/5Vz3Vtx4M/qolZTqoSXl+SY++ptKRBfz2qu/MZcBqNe5GixkICh7SeAmn5hi2BxJxETctnEMCqVr3LIOXpmLagHicR05j+/3Qu7Jqmqu/YSDB2XEphE2CkC9GjqBCulv6fJKZRKlGxKom6V1VqeD+tWVhxvh6MLy55qYoLpaTqcpzIUkldW+A/oOUX+RlIF0EaOhs8qXrSXwNp7J6IuvZmEcoUxMnT+H9e71qx7RbCWNvG5hNSPrsu0xMpdZh16m1+CuVfYF+G6qHh9rQDhuFOJwACdGC6qO1AkGJncyGXGmQRoyDbjrA3TIzk8GtA8iAIHTY/a9e44Px4uwNmWf0oyRP/sxQlVR7odKC97WJuISAvTrkLvQsBIZTnuSPTd776B4sjOBcPO25A1k603YGmoFyKZOXAIwYv3NHcLHavt0maTWYGe5u6TpVXQVpKuWsiyqX4jJXjNe2XwD0Wo7+xwUd6iyOR8X8ZH4YZMjZ94VREN36KuwZ7nIoZTWh/SMSlLK+Xl0lvKArA05bzuUpdHWEZJGTXcxzQ1Y3UusEFn/AyOb+2I+w/BQzFS1MNy33XskFfsfXlOAK0J3YzUTxGQFUTgSrA6ahibXMh/x0XQwt/ipuoNDWsYeKh+5F/XpJU5ywL034Axy0gTYiuzCuS/z8kDOPoXKFBkZfqx0lBDRxNnzQknIoK3PzsUrqFsSQd/+UmKdfCInYmj8Wwk2oZJHQdQo0nQ3/ZLSBFkRhewPKU/S9TZXCVhevjVjDKSFBXxh5jrj1SJuPdpeKqn0aDKcc0T4ADPv3pmCU/SzjXzoPkg3cYDPMkb8o4xMMDxKg583/7MHtL4xSpfgHBr3LfEa596q8ukBt4nLrjmFtKZGtBlnSTuxA3P+kGZ51Rd5oDPsNYcngVpDELTkkOWyXv4FNz+T/POdNN8uAcEcaYg1Vbgpq2SsOLrh1OB+LTCi0OognzcbFikObDuKdFkEiUxhvMsDJ7HqShcazDN+/n1ntJ4rN/gBhoqD4hmzRfUYIrUWbSuxQisnkFnKHecsANwNQgBAUQv2Qhsy9Kkm3LcmzVQ0nSzoOUjeOgolAwN87xg/xA4uL1f4hhS+MKvW5Pn/NKv1EsjxN1XKJDrfWrFnEb47gmUwzAMC2MewWH3vM4fZ5FIwvTSaKhdhhIBClKp3QWD7NC/U7HUGP/EMN2HEyNiF3+w7mYTwR2hZq7LgKIq6NATLPT9qTk44oxwLbFmHpj7ji9g3vD1Zm6rvCma04dxMWhD/K1f+8Yhon1+FfHI51d+sjngUznJ19zlZsEor8+v3cT/InDOHBVr3jt1a9h7GQzKxvYrPdzP/dzP/dzP///z/8Bgt9mdg68znsAAAAASUVORK5CYII=',
                CR_PARTS: [['header', 'หัวกระดาษ (รหัสเคส / ครูประจำชั้น-ครูที่ปรึกษา)', ''], ['reason', 'พฤติกรรมสำคัญ/สาเหตุที่รับเข้า', '1'], ['current', 'ประวัติปัจจุบัน (ลักษณะพฤติกรรม)', '1'],
                    ['past', 'ประวัติพฤติกรรมในอดีต', '1'], ['family', 'ประวัติครอบครัว', '1'], ['personal', 'ประวัติส่วนตัว (เช่น การเรียน)', '1'], ['personalTable', 'ตารางประวัติส่วนตัว (เทอม GPA Club …)', '1'],
                    ['p4', 'การประเมินสภาวะ 4P × กาย จิต สังคม', '2'], ['plan', 'แผนการให้บริการ (Contract Plan)', '3'], ['progress', 'Progress Note', 'P']],
                CR_P4: [['predisposing', 'Predisposing Factors', 'ปัจจัยเดิม (เป็นมาก่อน เป็นอยู่แล้ว)'], ['precipitating', 'Precipitating Factors', 'ปัจจัยกระตุ้น'], ['perpetuating', 'Perpetuating Factors', 'ปัจจัยคงอยู่'], ['protective', 'Protective Factors', 'ปัจจัยช่วย/ ส่งเสริม']],
                cr: { open: false, clientId: '', loading: false, err: '', msg: '', doc: null, base: '', include: [], limited: [], drafts: [], canSave: false, report: null, title: '', fmt: 'pdf', busy: '', closeAsk: false, delAsk: false, delNote: '' },
                crReset() { Object.assign(this.cr, { open: false, clientId: '', loading: false, err: '', msg: '', doc: null, base: '', include: [], limited: [], drafts: [], canSave: false, report: null, title: '', busy: '', closeAsk: false, delAsk: false, delNote: '' }); },
                crState() { return JSON.stringify({ d: this.cr.doc, i: this.cr.include, t: this.cr.title }); },
                get crDirty() { return !!this.cr.doc && this.crState() !== this.cr.base; },
                crHas(k) { return this.cr.include.indexOf(k) >= 0; },
                crToggle(k) { const i = this.cr.include.indexOf(k); if (i >= 0) this.cr.include.splice(i, 1); else this.cr.include.push(k); this.crGrowAll(); },
                get crHasFact() { return ['reason', 'current', 'past', 'family', 'personal', 'personalTable'].some(k => this.crHas(k)); },
                crDate(iso) { const s = String(iso || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(iso || ''); const m = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'], p = s.split('-').map(Number); return p[2] + ' ' + m[p[1] - 1] + ' ' + (p[0] + 543); },
                get crSources() { return this.cr.doc ? [...new Set(this.cr.doc.progress.map(r => r.source).filter(Boolean))] : []; },
                get crProgressShown() {
                    const d = this.cr.doc; if (!d) return []; const o = d.opt;
                    return d.progress.filter(r => (!o.from || !/^\d{4}-/.test(r.date) || r.date >= o.from) && (!o.to || !/^\d{4}-/.test(r.date) || r.date <= o.to) && (!o.sources.length || !r.source || o.sources.indexOf(r.source) >= 0));
                },
                crSetDoc(doc, include, title, report) {
                    doc.opt = Object.assign({ from: '', to: '', sources: [], showName: false }, doc.opt || {});
                    this.cr.doc = doc; this.cr.include = (include || this.CR_PARTS.map(x => x[0])).slice(); this.cr.title = title || ''; this.cr.report = report || null;
                    this.cr.base = this.crState(); this.cr.closeAsk = false; this.crGrowAll();
                },
                crGrowAll() { const f = () => document.querySelectorAll('[data-cr-paper] textarea').forEach(el => { if (el.offsetParent) this.crGrow(el); }); this.$nextTick(f); setTimeout(f, 80); setTimeout(f, 400); },
                async crOpen() {
                    const s = this.activeStudent; if (!s) return;
                    this.crReset(); this.cr.open = true; this.cr.clientId = String(s.id); await this.crBuild();
                },
                async crBuild() {
                    const cid = this.cr.clientId; this.cr.loading = true; this.cr.err = ''; this.cr.msg = '';
                    const r = await this.apiCall('casereport.source', { clientId: cid });
                    if (this.cr.clientId !== cid) return;
                    this.cr.loading = false;
                    if (!r.ok) { this.cr.err = r.message || 'ดึงข้อมูลจากระบบไม่สำเร็จ'; return; }
                    this.cr.limited = r.data.limited || []; this.cr.drafts = r.data.drafts || []; this.cr.canSave = !!r.data.canSave;
                    this.crSetDoc(r.data.doc, null, 'Case Report ' + this.crDate(r.data.doc.header.date), null);
                },
                async crOpenDraft(id) {
                    if (this.cr.busy) return; this.cr.busy = 'load'; this.cr.err = '';
                    const r = await this.apiCall('casereport.get', { id }); this.cr.busy = '';
                    if (!r.ok) { this.cr.err = r.message || 'เปิดฉบับร่างไม่สำเร็จ'; return; }
                    this.cr.canSave = !!r.data.canSave; this.crSetDoc(r.data.doc, r.data.include, r.data.report.title, r.data.report);
                    this.cr.msg = 'เปิดฉบับร่าง “' + r.data.report.title + '” ฉบับที่ ' + r.data.report.version;
                },
                async crSave() {
                    if (this.cr.busy || !this.cr.canSave) return;
                    if (!this.cr.include.length) { this.cr.err = 'เลือกหัวข้ออย่างน้อย 1 หัวข้อ'; return; }
                    const body = { clientId: this.cr.clientId, requestId: this.awNewRequestId(), title: this.cr.title, doc: this.cr.doc, include: this.cr.include };
                    if (JSON.stringify(body).length > 250000) { this.cr.err = 'รายงานยาวเกินที่ระบบเก็บได้ — ลดจำนวน Progress Note (กรองช่วงวันที่) หรือแยกเป็นหลายฉบับ'; return; }
                    if (this.cr.report) { body.id = this.cr.report.id; body.expectedVersion = this.cr.report.version; }
                    this.cr.busy = 'save'; this.cr.err = ''; this.cr.msg = '';
                    const r = await this.apiCall('casereport.save', body); this.cr.busy = '';
                    if (!r.ok) { this.cr.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.cr.report = r.data.report; this.cr.base = this.crState();
                    this.cr.msg = 'บันทึกฉบับร่างแล้ว (ฉบับที่ ' + r.data.report.version + ') — เซิร์ฟเวอร์ยืนยัน'; this.showToast(this.cr.msg);
                    const l = await this.apiCall('casereport.list', { clientId: this.cr.clientId }); if (l.ok) this.cr.drafts = l.data.drafts;
                },
                async crDelete() {
                    if (!this.cr.report || this.cr.busy) return;
                    this.cr.busy = 'del'; const r = await this.apiCall('casereport.delete', { id: this.cr.report.id, note: this.cr.delNote }); this.cr.busy = '';
                    if (!r.ok) { this.cr.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'ลบไม่สำเร็จ'); return; }
                    this.cr.delAsk = false; this.cr.delNote = ''; this.cr.msg = 'ลบฉบับร่างแล้ว'; this.cr.report = null; this.cr.base = '';
                    const l = await this.apiCall('casereport.list', { clientId: this.cr.clientId }); if (l.ok) this.cr.drafts = l.data.drafts;
                },
                crClose() { if (this.crDirty && !this.cr.closeAsk) { this.cr.closeAsk = true; return; } this.crReset(); },
                crAddRow(k) { this.crGrowAll(); const blank = { personalTable: { term: '', gpa: '', club: '', clubPa: '', cStudent: '', cParent: '', cTeacher: 'อ. ' }, plan: { issue: '', urgency: '', approach: '', follow: '' }, progress: { date: '', source: '', detail: '' } }[k]; this.cr.doc[k].push(Object.assign({}, blank)); },
                crDelRow(k, row) { const a = this.cr.doc[k], i = a.indexOf(row); if (i >= 0) a.splice(i, 1); },
                crGrow(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; },
                /* ---------- one static rendering for print / PDF ---------- */
                crEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
                crTxt(s) { return this.crEsc(s).replace(/\n/g, '<br>'); },
                crHtml() {
                    const d = this.cr.doc, h = d.header, E = s => this.crTxt(s), out = [];
                    out.push('<div class="hd"><img src="' + this.CR_LOGO + '" alt=""><div class="t1">บันทึกการรับเคส นักสังคมสงเคราะห์</div><div class="t2">โรงเรียนสาธิตแห่งมหาวิทยาลัยธรรมศาสตร์</div></div>');
                    if (this.crHas('header')) out.push('<div class="meta">' + (d.opt.showName ? '<div>ชื่อ–นามสกุล: ' + E(h.name) + (h.nickname ? ' (' + E(h.nickname) + ')' : '') + (h.grade ? ' ชั้น ' + E(h.grade) : '') + '</div>' : '') + '<div>รหัสเคส: ' + E(h.caseId) + '</div><div>ครูประจำชั้น/ครูที่ปรึกษา: ' + E(h.advisor) + '</div></div>');
                    if (this.crHasFact) out.push('<h2><span>1. การแสวงหาข้อเท็จจริง (Fact finding)</span></h2>');
                    [['reason', 'พฤติกรรมสำคัญ/สาเหตุที่รับเข้า'], ['current', 'ประวัติปัจจุบัน (ลักษณะพฤติกรรม)'], ['past', 'ประวัติพฤติกรรมในอดีต'], ['family', 'ประวัติครอบครัว'], ['personal', 'ประวัติส่วนตัว <small>(เช่น การเรียน)</small>']].forEach(([k, l]) => {
                        if (this.crHas(k)) out.push('<h3>' + l + '</h3><div class="tx">' + (E(d[k]) || '&nbsp;') + '</div>');
                    });
                    if (this.crHas('personalTable')) {
                        if (!this.crHas('personal')) out.push('<h3>ประวัติส่วนตัว <small>(เช่น การเรียน)</small></h3>');
                        out.push('<table class="pt"><thead><tr><th>เทอม</th><th>GPA</th><th>Club</th><th>Club PA</th><th>Comment นร.</th><th>Comment ผปค.</th><th>Comment ครู</th></tr></thead><tbody>'
                            + d.personalTable.map(r => '<tr><td>' + E(r.term) + '</td><td>' + E(r.gpa) + '</td><td>' + E(r.club) + '</td><td>' + E(r.clubPa) + '</td><td>' + E(r.cStudent) + '</td><td>' + E(r.cParent) + '</td><td>' + E(r.cTeacher) + '</td></tr>').join('') + '</tbody></table>');
                    }
                    if (this.crHas('p4')) out.push('<h2 class="pb"><span>2. การประเมินสภาวะของผู้ใช้บริการ (Assessment)</span></h2><table class="p4"><thead><tr><th>4P</th><th>กาย</th><th>จิต</th><th>สังคม</th></tr></thead><tbody>'
                        + this.CR_P4.map(([k, en, th]) => '<tr><th><b>' + en + '</b><br>' + th + '</th><td>' + E(d.p4[k].bio) + '</td><td>' + E(d.p4[k].psycho) + '</td><td>' + E(d.p4[k].social) + '</td></tr>').join('') + '</tbody></table>');
                    if (this.crHas('plan')) out.push('<h2 class="pb"><span>3. แผนการให้บริการ (Contract Plan)</span></h2><table class="pl"><thead><tr><th>ประเด็นปัญหา/<br>เป้าหมาย</th><th>ความเร่งด่วน</th><th>แนวทางการดำเนินงาน</th><th>การติดตาม/ประเมินผล</th></tr></thead><tbody>'
                        + d.plan.map(r => '<tr><td>' + E(r.issue) + '</td><td>' + E(r.urgency) + '</td><td>' + E(r.approach) + '</td><td>' + E(r.follow) + '</td></tr>').join('') + '</tbody></table>');
                    if (this.crHas('progress')) out.push('<h2 class="pb"><span>Progress Note</span></h2><table class="pn"><thead><tr><th>วันที่</th><th>รายละเอียด</th></tr></thead><tbody>'
                        + (this.crProgressShown.length ? this.crProgressShown : [{ date: '', detail: '' }]).map(r => '<tr><td>' + E(this.crDate(r.date)) + '</td><td>' + E(r.detail) + '</td></tr>').join('') + '</tbody></table>');
                    return out.join('\n');
                },
                CR_PRINT_CSS: "@page{size:A4 landscape;margin:14mm 16mm}*{box-sizing:border-box}body{margin:0;font-family:'Sarabun',sans-serif;font-size:10.5pt;color:#111;line-height:1.45}"
                    + ".hd{text-align:center}.hd img{width:34mm;height:auto}.t1,.t2{font-weight:700;font-size:11pt}.meta{text-align:right;margin:10px 0 6px}.meta div{margin:3px 0}"
                    + "h2{font-size:10.5pt;margin:16px 0 8px}h2 span{background:#ffd966;padding:1px 3px}h2.pb{break-before:page;page-break-before:always}h3{color:#4a86e8;font-size:10.5pt;font-weight:400;margin:12px 0 4px}h3 small{color:#4a86e8;font-size:9.5pt}"
                    + ".tx{min-height:12mm;white-space:normal;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:6px 0;page-break-inside:auto}tr{page-break-inside:avoid}th,td{border:1px solid #000;padding:5px 7px;vertical-align:top;text-align:left;font-size:10pt}"
                    + "thead th{text-align:center;font-weight:700}.pt thead th,.p4 thead th{background:#d9d9d9}.p4 tbody th{background:#d9d9d9;font-weight:400;width:20%}.p4 td{height:16mm}.pt td{height:12mm}.pt td:nth-child(-n+4){width:7%}"
                    + ".pl td:nth-child(1){width:13%}.pl td:nth-child(2){width:9%}.pl td:nth-child(3){width:42%}.pn td:first-child{width:11%;white-space:nowrap}",
                async crExport() {
                    if (!this.cr.doc || this.cr.busy) return;
                    if (!this.cr.include.length) { this.cr.err = 'เลือกหัวข้ออย่างน้อย 1 หัวข้อ'; return; }
                    this.cr.err = '';
                    const fmt = this.cr.fmt, name = 'CaseReport-' + (this.cr.doc.header.caseId || 'student') + '-' + this.cr.doc.header.date;
                    try {
                        if (fmt === 'pdf') this.crPrint(name); else { this.cr.busy = 'docx'; await this.crDocx(name); }
                    } catch (e) { this.cr.err = 'สร้างไฟล์ไม่สำเร็จ — ลองใหม่อีกครั้ง'; this.cr.busy = ''; return; }
                    this.cr.busy = '';
                    this.apiCall('casereport.exported', { clientId: this.cr.clientId, format: fmt, reportId: this.cr.report ? this.cr.report.id : '', include: this.cr.include });
                },
                crPrint(name) {
                    const f = document.createElement('iframe'); f.setAttribute('title', 'print'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; f.setAttribute('data-cr-print', '');
                    document.body.appendChild(f);
                    const doc = f.contentDocument; doc.open();
                    doc.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><title></title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet"><style>' + this.CR_PRINT_CSS + '</style></head><body></body></html>'); doc.close();
                    doc.title = name; doc.body.innerHTML = this.crHtml();
                    const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); };
                    try { (doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve()).then(() => setTimeout(go, 200)); } catch (e) { setTimeout(go, 400); }
                },
                /* ---------- Word (.docx) built here with JSZip: real paragraphs and tables, editable in Word / Google Docs ---------- */
                async crDocx(name) {
                    const JSZip = await this.phLib(), d = this.cr.doc, h = d.header;
                    const X = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
                    const run = (t, o = {}) => String(t == null ? '' : t).split('\n').map((line, i) => '<w:r><w:rPr>' + (o.b ? '<w:b/><w:bCs/>' : '') + (o.color ? '<w:color w:val="' + o.color + '"/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : '') + (o.hl ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.hl + '"/>' : '') + '</w:rPr>' + (i ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + X(line) + '</w:t></w:r>').join('');
                    const para = (runs, o = {}) => '<w:p><w:pPr>' + (o.pb ? '<w:pageBreakBefore/>' : '') + (o.keep ? '<w:keepNext/>' : '') + '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 80 : o.after) + '"/>' + (o.align ? '<w:jc w:val="' + o.align + '"/>' : '') + '</w:pPr>' + runs + '</w:p>';
                    const W = 14400;   // text width in twips (A4 landscape, 0.85" margins)
                    const table = (widths, head, rows, o = {}) => {
                        const cell = (t, w, c = {}) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (c.fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + c.fill + '"/>' : '') + '</w:tcPr>' + para(c.runs || run(t, { b: c.b }), { align: c.align, after: 40, keep: c.keep }) + '</w:tc>';
                        const hdr = '<w:tr>' + (o.repeat ? '<w:trPr><w:tblHeader/></w:trPr>' : '') + head.map((t, i) => cell(t, widths[i], { b: true, align: 'center', fill: o.headFill, keep: true })).join('') + '</w:tr>';
                        const body = rows.map(r => '<w:tr><w:trPr><w:cantSplit/>' + (o.minH ? '<w:trHeight w:val="' + o.minH + '"/>' : '') + '</w:trPr>' + r.map((t, i) => (t && typeof t === 'object') ? cell('', widths[i], t) : cell(t, widths[i])).join('') + '</w:tr>').join('');
                        const b = '<w:top w:val="single" w:sz="6" w:color="000000"/><w:left w:val="single" w:sz="6" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:color="000000"/><w:right w:val="single" w:sz="6" w:color="000000"/><w:insideH w:val="single" w:sz="6" w:color="000000"/><w:insideV w:val="single" w:sz="6" w:color="000000"/>';
                        return '<w:tbl><w:tblPr><w:tblW w:w="' + W + '" w:type="dxa"/><w:tblBorders>' + b + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'
                            + widths.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' + hdr + body + '</w:tbl>';
                    };
                    const H2 = (t, pb) => para(run(t, { b: true, hl: 'FFD966' }), { pb, keep: true, before: 200, after: 120 });
                    const H3 = (t, sub) => para(run(t, { color: '4A86E8' }) + (sub ? run(' ' + sub, { color: '4A86E8', sz: 19 }) : ''), { keep: true, before: 160, after: 40 });
                    const cx = 1188720, cy = Math.round(cx * 177 / 420);
                    const img = '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="1" name="logo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
                    const B = [];
                    B.push(para(img, { align: 'center', after: 60 }), para(run('บันทึกการรับเคส นักสังคมสงเคราะห์', { b: true }), { align: 'center', after: 0 }), para(run('โรงเรียนสาธิตแห่งมหาวิทยาลัยธรรมศาสตร์', { b: true }), { align: 'center', after: 200 }));
                    if (this.crHas('header')) {
                        if (d.opt.showName) B.push(para(run('ชื่อ–นามสกุล: ' + h.name + (h.nickname ? ' (' + h.nickname + ')' : '') + (h.grade ? ' ชั้น ' + h.grade : '')), { align: 'right' }));
                        B.push(para(run('รหัสเคส: ' + h.caseId), { align: 'right' }), para(run('ครูประจำชั้น/ครูที่ปรึกษา: ' + h.advisor), { align: 'right', after: 160 }));
                    }
                    if (this.crHasFact) B.push(H2('1. การแสวงหาข้อเท็จจริง (Fact finding)'));
                    [['reason', 'พฤติกรรมสำคัญ/สาเหตุที่รับเข้า'], ['current', 'ประวัติปัจจุบัน (ลักษณะพฤติกรรม)'], ['past', 'ประวัติพฤติกรรมในอดีต'], ['family', 'ประวัติครอบครัว'], ['personal', 'ประวัติส่วนตัว', '(เช่น การเรียน)']].forEach(([k, l, sub]) => {
                        if (this.crHas(k)) B.push(H3(l, sub), para(run(d[k] || ''), { after: 120 }));
                    });
                    if (this.crHas('personalTable')) {
                        if (!this.crHas('personal')) B.push(H3('ประวัติส่วนตัว', '(เช่น การเรียน)'));
                        B.push(table([1150, 900, 1300, 1150, 3300, 3300, 3300], ['เทอม', 'GPA', 'Club', 'Club PA', 'Comment นร.', 'Comment ผปค.', 'Comment ครู'], d.personalTable.map(r => [r.term, r.gpa, r.club, r.clubPa, r.cStudent, r.cParent, r.cTeacher]), { headFill: 'D9D9D9', minH: 700 }));
                    }
                    if (this.crHas('p4')) {
                        B.push(H2('2. การประเมินสภาวะของผู้ใช้บริการ (Assessment)', true));
                        B.push(table([2900, 3900, 3800, 3800], ['4P', 'กาย', 'จิต', 'สังคม'], this.CR_P4.map(([k, en, th]) => [{ fill: 'D9D9D9', runs: run(en, { b: true }) + run('\n' + th, { sz: 19 }) }, d.p4[k].bio, d.p4[k].psycho, d.p4[k].social]), { headFill: 'D9D9D9', minH: 900 }));
                    }
                    if (this.crHas('plan')) { B.push(H2('3. แผนการให้บริการ (Contract Plan)', true)); B.push(table([1900, 1300, 6000, 5200], ['ประเด็นปัญหา/\nเป้าหมาย', 'ความเร่งด่วน', 'แนวทางการดำเนินงาน', 'การติดตาม/ประเมินผล'], d.plan.map(r => [r.issue, r.urgency, r.approach, r.follow]), { minH: 700, repeat: true })); }
                    if (this.crHas('progress')) { B.push(H2('Progress Note', true)); B.push(table([1600, 12800], ['วันที่', 'รายละเอียด'], (this.crProgressShown.length ? this.crProgressShown : [{ date: '', detail: '' }]).map(r => [this.crDate(r.date), r.detail]), { minH: 600, repeat: true })); }
                    const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
                    const docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + ns + '><w:body>' + B.join('') + para('', { after: 0 }) + '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1000" w:right="1219" w:bottom="1000" w:left="1219" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>';
                    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:eastAsia="Sarabun" w:cs="Sarabun"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="th-TH" w:bidi="th-TH"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
                    const z = new JSZip();
                    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
                    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
                    z.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>');
                    z.file('word/document.xml', docXml); z.file('word/styles.xml', styles);
                    z.file('word/media/logo.png', this.CR_LOGO.split(',')[1], { base64: true });
                    const blob = await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.docx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
                },
                /* ===== Ease-of-use layer: module switches, role menu, one home, global search, care-plan tab ===== */
                mods: {}, modList: [], modForm: { open: false, off: [], note: '', busy: false, err: '' },
                TAB_MOD: { clubs: 'clubs', bullying: 'bullying', counsel: 'counsel', prevention: 'prevention', analytics: 'analytics', docs: 'docs', doc_history: 'docs' },
                modOn(k) { return this.mods[k] !== false; },
                async modLoad() {
                    const r = await this.apiCall('modules.get', {});
                    if (!r.ok) { this.modsReady = true; return; }
                    const m = {}; r.data.modules.forEach(x => { m[x.key] = x.on; }); this.mods = m; this.modList = r.data.modules;
                    this.curYear = r.data.currentYear || null; this.modsReady = true;
                    if (r.data.appearance) { this.appear = r.data.appearance; this.apApply(!this.apApplied); this.apApplied = true; }
                    if (this.TAB_MOD[this.currentTab] && !this.modOn(this.TAB_MOD[this.currentTab])) this.currentTab = this.tabAllowed('dashboard') ? 'dashboard' : 'today';
                },
                modEdit() { this.modForm = { open: true, off: this.modList.filter(x => !x.on).map(x => x.key), note: '', busy: false, err: '' }; },
                modToggle(k) { const i = this.modForm.off.indexOf(k); if (i >= 0) this.modForm.off.splice(i, 1); else this.modForm.off.push(k); },
                async modSave() {
                    if (this.modForm.busy) return;
                    if (!this.modForm.note.trim()) { this.modForm.err = 'กรุณาระบุเหตุผลของการเปิด/ปิด'; return; }
                    this.modForm.busy = true; this.modForm.err = '';
                    const r = await this.apiCall('modules.save', { off: this.modForm.off.slice(), note: this.modForm.note });
                    this.modForm.busy = false;
                    if (!r.ok) { this.modForm.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    const m = {}; r.data.modules.forEach(x => { m[x.key] = x.on; }); this.mods = m; this.modList = r.data.modules;
                    this.modForm.open = false; this.hm.at = 0; this.ba.sum = null; this.showToast('บันทึกการเปิด–ปิดโมดูลแล้ว');
                },
                /* ---- role menu: a short list for what this account does most; the full menu stays one tap away ---- */
                menuAll: false,
                menuInit() { try { this.menuAll = localStorage.getItem('tss.menuAll') === '1'; } catch (e) { this.menuAll = false; } },
                menuToggleAll() { this.menuAll = !this.menuAll; try { localStorage.setItem('tss.menuAll', this.menuAll ? '1' : '0'); } catch (e) {} },
                get menuRole() {
                    if (this.can('assign_cases') || this.can('view_all_reports')) return 'หัวหน้างาน / ผู้บริหาร';
                    if (this.can('view_assessment')) return 'ผู้เชี่ยวชาญ (นักสังคมสงเคราะห์ / นักจิตวิทยา)';
                    if (this.can('view_case')) return 'ครูแนะแนว / ผู้ดูแลเคส';
                    return 'ครูและบุคลากร';
                },
                get myMenu() {
                    const L = [], tab = (k, label, icon, extra) => { if (this.tabAllowed(k)) L.push(Object.assign({ key: k, label, icon, go: () => { this.currentTab = k; } }, extra || {})); };
                    L.push({ key: 'home', label: 'หน้าหลัก • ต้องทำวันนี้', icon: 'i-house', go: () => { this.currentTab = this.tabAllowed('dashboard') ? 'dashboard' : 'today'; } });
                    L.push({ key: 'record', label: 'บันทึก / แจ้งเหตุ', icon: 'i-plus', go: () => this.openRecordChooser('global') });
                    if (this.can('view_case')) {
                        tab('clients', 'นักเรียนของฉัน', 'i-users-round'); tab('appointments', 'นัดหมาย', 'i-calendar-days'); tab('counsel', 'งานให้คำปรึกษา', 'i-message-square');
                    } else { tab('bullying', 'เรื่องที่ฉันแจ้ง', 'i-shield-check'); tab('prevention', 'ปฏิทินกิจกรรม', 'i-calendar-check'); tab('tools', 'เครื่องมือ', 'i-wrench'); }
                    if (this.can('view_assessment')) {
                        tab('red_alerts', 'Red Alert', 'i-siren'); tab('bh_review', 'คิวตรวจทานบันทึก', 'i-list-checks');
                        if (this.modOn('issp')) L.push({ key: 'issp', label: 'แฟ้ม ISSP', icon: 'i-target', go: () => this.isOpenFolder() });
                    }
                    if (this.can('manage_bullying')) tab('bullying', 'School Bullying', 'i-shield-check');
                    if (this.can('assign_cases') || this.can('view_all_reports')) { tab('analytics', 'Behavioral Analytics', 'i-chart-no-axes-combined'); tab('prevention', 'ป้องกันและส่งเสริม', 'i-trending-up'); tab('care_overview', 'ภาพรวมการดูแล', 'i-layout-grid'); }
                    if (this.can('read_all_cases') && !this.can('view_all_cases')) tab('case_directory', 'แฟ้มนักเรียนทั้งโรงเรียน', 'i-book-open');
                    if (this.tabAllowed('clubs')) tab('clubs', 'คลับ/ชุมนุม', 'i-users-round');
                    if (this.can('manage_users')) tab('admin_users', 'ผู้ใช้และบทบาท', 'i-key-round');
                    if (this.can('manage_settings') || this.can('manage_roles')) tab('sys_settings', 'ตั้งค่าระบบ', 'i-wrench');
                    return L.filter((x, i) => L.findIndex(y => y.key === x.key) === i);
                },
                menuGo(it) { this.sidebarOpen = false; it.go(); },
                /* ---- one home: “ต้องทำวันนี้” on top of the dashboard ---- */
                get hmTop() { return this.hm.data ? this.hm.data.items.slice(0, 5) : []; },
                /* ---- global search: students you may open + every page you may open ---- */
                gs: { open: false, q: '', sel: 0 },
                GS_PAGES: [
                    ['dashboard', 'หน้าหลัก', 'dashboard home'], ['today', 'งานของฉันวันนี้', 'today todo ต้องทำ'], ['clients', 'ข้อมูลผู้รับบริการ / นักเรียน', 'student client แฟ้ม'],
                    ['appointments', 'ปฏิทินนัดหมาย', 'นัด appointment calendar'], ['counsel', 'งานให้คำปรึกษา', 'soap บันทึกการพบ นัดต่อเนื่อง เช็คอิน กลุ่ม'], ['red_alerts', 'Red Alert', 'alert mo7 แจ้งเตือน'],
                    ['bh_review', 'คิวตรวจทานบันทึกพฤติกรรม', 'review ตรวจทาน'], ['bullying', 'School Bullying', 'กลั่นแกล้ง bully คุกคาม'], ['analytics', 'Behavioral Analytics', 'กราฟ วิเคราะห์ analytics'],
                    ['prevention', 'ป้องกันและส่งเสริม', 'cico ตัวบ่งชี้ csv กิจกรรม ปฏิทิน event'], ['care_overview', 'ภาพรวมการดูแล', 'tier ระดับการดูแล'], ['reports', 'รายงานข้อมูล', 'report export'],
                    ['history', 'ประวัติการบันทึกเคส', 'history log'], ['archive', 'คลังข้อมูลผู้ใช้บริการ', 'archive'], ['tools', 'เครื่องมือการให้ความช่วยเหลือ', 'tools แบบประเมิน'],
                    ['docs', 'ออกเอกสาร', 'document หนังสือ'], ['bh_settings', 'ตั้งค่าประเภทพฤติกรรม', 'settings positive abc'], ['care_settings', 'ตั้งค่าความปลอดภัยและข้อมูล', 'settings โมดูล module'],
                    ['admin_users', 'จัดการผู้ใช้และบทบาท', 'users roles'], ['clubs', 'คลับ/ชุมนุม', 'club คลับ ชุมนุม สมาชิก เช็กชื่อ attendance'], ['sys_settings', 'ตั้งค่าระบบ', 'settings ตั้งค่า ฟีเจอร์ สิทธิ์ permission role การแสดงผล ประกาศ ตัวอักษร ปีการศึกษา ทะเบียนนักเรียน นำเข้า import ปฏิทินโรงเรียน ตารางนัด slot สำรองข้อมูล backup คู่มือ'], ['case_directory', 'แฟ้มนักเรียนทั้งโรงเรียน', 'directory ทุกคน ค้นหาแฟ้ม อ่านอย่างเดียว'], ['admin_audit', 'Audit Log', 'audit'], ['my_supervision', 'บันทึกการรับคำปรึกษา (Supervision)', 'supervision']
                ],
                gsOpen() { this.gs = { open: true, q: '', sel: 0 }; this.sidebarOpen = false; this.$nextTick(() => { const el = document.querySelector('[data-gs-input]'); if (el) el.focus(); }); },
                get gsResults() {
                    const q = (this.gs.q || '').trim().toLowerCase(), out = [];
                    if (!q) {
                        this.myMenu.forEach(m => out.push({ kind: 'menu', key: 'm' + m.key, label: m.label, sub: 'เมนูของฉัน', icon: m.icon, run: () => m.go() }));
                        return out;
                    }
                    if (q.length >= 2 && this.can('view_case')) (this.students || []).filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.nickname || '').toLowerCase().includes(q) || String(s.grade || '').toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))).slice(0, 6)
                        .forEach(s => out.push({ kind: 'student', key: 's' + s.id, label: s.name, sub: (s.grade || '') + ' • เปิดแฟ้ม', icon: 'i-user-round', run: () => this.openProfile(s) }));
                    this.GS_PAGES.filter(p => this.tabAllowed(p[0]) && (p[1].toLowerCase().includes(q) || p[2].toLowerCase().includes(q))).slice(0, 8)
                        .forEach(p => out.push({ kind: 'page', key: 'p' + p[0], label: p[1], sub: 'ไปที่หน้า', icon: 'i-arrow-right', run: () => { this.currentTab = p[0]; } }));
                    if ('บันทึก แจ้ง record'.includes(q) || q.includes('บันทึก') || q.includes('แจ้ง')) out.push({ kind: 'action', key: 'arec', label: 'บันทึก / แจ้งเหตุ', sub: 'เปิดหน้าต่างบันทึก', icon: 'i-plus', run: () => this.openRecordChooser('global') });
                    return out;
                },
                gsMove(d) { const n = this.gsResults.length; if (!n) return; this.gs.sel = (this.gs.sel + d + n) % n; },
                gsRun(it) { it = it || this.gsResults[this.gs.sel]; if (!it) return; this.gs.open = false; it.run(); },
                gsKey(e) {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && this.isLoggedIn) { e.preventDefault(); this.gs.open ? (this.gs.open = false) : this.gsOpen(); }
                },
                /* ---- profile tab “แผนการดูแล” ---- */
                cpl: { clientId: '', data: null, loading: false, error: '' },
                async cplEnter() {
                    const id = this.activeStudent && String(this.activeStudent.id); if (!id) return;
                    if (this.cpl.clientId !== id) this.cpl = { clientId: id, data: null, loading: false, error: '' };
                    this.cpl.loading = true; this.cpl.error = '';
                    const r = await this.apiCall('care.plans', { clientId: id });
                    if (this.cpl.clientId !== id) return;
                    this.cpl.loading = false;
                    if (r.ok) this.cpl.data = r.data; else this.cpl.error = r.message || 'โหลดไม่สำเร็จ';
                },
                cplOpen(it) {
                    const o = it.open || {};
                    if (o.type === 'alert') { this.raOpen(o.id); return; }
                    if (o.type === 'issp') { this.isOpenPlan(o.id); return; }
                    if (o.type === 'behavior') { this.openBehaviorTab(); return; }
                    if (o.type === 'care') { this.profileTab = 'care'; this.cpEnter(); return; }
                    if (o.type === 'bully') { this.showProfileModal = false; this.currentTab = 'bullying'; this.$nextTick(() => this.blOpen(o.id)); }
                },
                CPL_ICON: { alert: 'i-siren', alert_plan: 'i-siren', issp: 'i-target', cico: 'i-calendar-check', referral: 'i-arrow-right', bully: 'i-shield-check' },
                /* ===== Behavioral Analytics (ba.*) — every number is computed on the server from the existing behaviour records ===== */
                ba: { sum: null, loading: false, error: '', months: 6, at: 0 },
                bap: { tab: 'individual', q: '', clientId: '', stu: null, sLoading: false, sError: '', sMonths: 12,
                       sch: null, schLoading: false, schError: '', f: { months: 12, from: '', to: '', semester: '', level: '', room: '', domain: '', code: '' } },
                BA_DOM: { BH: 'Behavior & Conduct', LA: 'Learning & Academic', EF: 'Executive Function', MO: 'Motivation & School Connectedness', SI: 'Social Skills & Interpersonal', FM: 'Family & Home', PD: 'Physical Health & Development' },
                BA_KEYS: ['BH', 'LA', 'EF', 'MO', 'SI', 'FM', 'PD'],
                baKeys(rows) { const r = (rows || [])[0] || {}; return this.BA_KEYS.filter(k => k in r); },
                /** domains grouped as the server defines them (BH_DEF.groups) — one source for the form, the quick record and settings */
                bhGroupsOf(meta, domains) {
                    const G = (meta && meta.groups) || [{ id: 'functioning', nameTh: '', nameEn: '' }];
                    return G.map(g => Object.assign({}, g, { domains: (domains || []).filter(d => (d.group || 'functioning') === g.id) })).filter(g => g.domains.length);
                },
                get bfGroups() { const m = this.bm.meta; return m && m.def ? this.bhGroupsOf(m, m.def.domains) : []; },
                /* two big tabs in the behaviour form: BH (risk behaviour under the student charter) and every other code.
                   A search looks in both; with no BH domain the form shows everything as before. */
                get bfHasBH() { return this.bfGroups.some(g => g.domains.some(d => d.code === 'BH')); },
                get bfGroupsCat() {
                    if (!this.bfHasBH || (this.bf.fq || '').trim()) return this.bfGroups;
                    const bh = this.bf.cat === 'bh';
                    return this.bfGroups.map(g => Object.assign({}, g, { domains: g.domains.filter(d => (d.code === 'BH') === bh) })).filter(g => g.domains.length);
                },
                bfCatCount(cat) { return this.bf.codes.filter(c => ((this.bhItem(c) || {}).domain === 'BH') === (cat === 'bh')).length; },
                bfSetCat(cat) { this.bf.cat = cat; this.bf.dom = ''; this.bf.fq = ''; },
                async baLoadSummary(force) {
                    if (!this.isLoggedIn || !this.can('view_case') || !this.modOn('analytics') || this.ba.loading) return;                  // always fresh: edits / cancels show on the next visit
                    this.ba.loading = true; this.ba.error = '';
                    const r = await this.apiCall('ba.summary', { months: Number(this.ba.months) });
                    this.ba.loading = false;
                    if (r.ok) { this.ba.sum = r.data; this.ba.at = Date.now(); } else this.ba.error = r.message || 'โหลดข้อมูลวิเคราะห์ไม่สำเร็จ';
                },
                baSetMonths(m) { this.ba.months = m; this.baLoadSummary(true); },
                baOpenFull(tab) { this.bap.tab = tab || 'school'; this.currentTab = 'analytics'; },
                baMonth(ym) { if (!ym) return ''; const m = Number(ym.slice(5, 7)); return ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1] + ' ' + String(Number(ym.slice(0, 4)) + 543).slice(2); },
                baNum(n) { return n === null || n === undefined ? '—' : (typeof n === 'number' ? n.toLocaleString('th-TH') : n); },
                /** line chart as SVG markup (Alpine templates cannot live inside <svg>) — numbers and month labels only */
                baLineSvg(trend) {
                    if (!trend || !trend.length) return '';
                    const W = 640, H = 220, L = 34, Rr = 26, T = 12, B = 30, keys = this.BA_KEYS.filter(k => trend.some(t => k in t));
                    const max = Math.max(4, ...trend.map(t => Math.max(...keys.map(k => Number(t[k]) || 0))));
                    const step = Math.ceil(max / 4), top = step * 4;
                    const x = i => L + (trend.length === 1 ? (W - L - Rr) / 2 : i * (W - L - Rr) / (trend.length - 1)), y = v => T + (H - T - B) * (1 - v / top);
                    let s = '';
                    for (let g = 0; g <= 4; g++) { const v = step * g, yy = y(v).toFixed(1); s += '<line class="ba-grid" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ba-ax" x="' + (L - 6) + '" y="' + (Number(yy) + 4) + '" text-anchor="end">' + v + '</text>'; }
                    const every = Math.ceil(trend.length / 8);
                    trend.forEach((t, i) => { if (i % every === 0 || i === trend.length - 1) s += '<text class="ba-ax" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + this.baMonth(t.month) + '</text>'; });
                    keys.forEach(k => {
                        s += '<polyline class="ba-line ba-' + k + '" points="' + trend.map((t, i) => x(i).toFixed(1) + ',' + y(t[k]).toFixed(1)).join(' ') + '"/>';
                        trend.forEach((t, i) => { s += '<circle class="ba-dot ba-' + k + '" cx="' + x(i).toFixed(1) + '" cy="' + y(t[k]).toFixed(1) + '" r="3.5"><title>' + k + ' ' + this.baMonth(t.month) + ': ' + Number(t[k]) + ' ครั้ง</title></circle>'; });
                    });
                    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ba-svg" role="img" aria-label="แนวโน้มรายเดือนแยกตามหมวด">' + s + '</svg>';
                },
                baDonutSvg(dist) {
                    const tot = (dist || []).reduce((a, d) => a + d.occurrences, 0), R = 54, C = 2 * Math.PI * R;
                    let off = 0, s = '<circle cx="70" cy="70" r="' + R + '" class="ba-ring"/>';
                    if (tot) (dist || []).forEach(d => { const len = d.occurrences / tot * C; if (len > 0) s += '<circle cx="70" cy="70" r="' + R + '" class="ba-seg ba-' + d.domain + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"><title>' + d.domain + ' ' + d.occurrences + ' ครั้ง (' + d.pct + '%)</title></circle>'; off += len; });
                    return '<svg viewBox="0 0 140 140" class="ba-donut" role="img" aria-label="สัดส่วนแยกตามหมวด"><g transform="rotate(-90 70 70)">' + s + '</g><text x="70" y="66" text-anchor="middle" class="ba-dn-n">' + tot + '</text><text x="70" y="84" text-anchor="middle" class="ba-dn-l">ครั้ง</text></svg>';
                },
                baBarW(n, list, key) { const m = Math.max(1, ...(list || []).map(x => Number(x[key || 'n']) || 0)); return Math.max(2, Math.round((Number(n) || 0) / m * 100)) + '%'; },
                /* ---- full page ---- */
                baEnter() { if (this.bap.tab === 'school' && !this.bap.sch) this.baLoadSchool(); },
                baTab(t) { this.bap.tab = t; if (t === 'school' && !this.bap.sch) this.baLoadSchool(); },
                get baMatches() {
                    const q = (this.bap.q || '').trim().toLowerCase(); if (q.length < 2) return [];
                    return (this.students || []).filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.nickname || '').toLowerCase().includes(q) || String(s.grade || '').toLowerCase().includes(q)).slice(0, 8);
                },
                async baPick(s) { this.bap.clientId = String(s.id); this.bap.q = ''; await this.baLoadStudent(); },
                async baLoadStudent() {
                    const id = this.bap.clientId; if (!id) return;
                    this.bap.sLoading = true; this.bap.sError = '';
                    const r = await this.apiCall('ba.student', { clientId: id, months: Number(this.bap.sMonths) });
                    if (this.bap.clientId !== id) return;
                    this.bap.sLoading = false;
                    if (r.ok) this.bap.stu = r.data; else { this.bap.stu = null; this.bap.sError = r.message || 'โหลดไม่สำเร็จ'; }
                },
                async baOpenProfile() {
                    const s = (this.students || []).find(x => String(x.id) === this.bap.clientId); if (!s) return;
                    await this.openProfile(s); this.openBehaviorTab();
                },
                baSemesters() {
                    const out = [], t = this.todayISO(); let y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7));
                    let sem = m >= 5 && m <= 10 ? 1 : 2, by = sem === 1 ? y : (m >= 11 ? y : y - 1);
                    for (let i = 0; i < 4; i++) {
                        const from = sem === 1 ? by + '-05-16' : by + '-11-01', to = sem === 1 ? by + '-10-31' : (by + 1) + '-03-31';
                        out.push({ key: sem + '/' + (by + 543), label: 'ภาคเรียนที่ ' + sem + '/' + (by + 543), from, to });
                        if (sem === 2) sem = 1; else { sem = 2; by -= 1; }
                    }
                    return out;
                },
                baSemPick() {
                    const s = this.baSemesters().find(x => x.key === this.bap.f.semester);
                    if (s) { this.bap.f.from = s.from; this.bap.f.to = s.to > this.todayISO() ? this.todayISO() : s.to; } else { this.bap.f.from = ''; this.bap.f.to = ''; }
                    this.baLoadSchool();
                },
                baFilterReset() { this.bap.f = { months: 12, from: '', to: '', semester: '', level: '', room: '', domain: '', code: '' }; this.baLoadSchool(); },
                async baLoadSchool() {
                    this.bap.schLoading = true; this.bap.schError = '';
                    const f = this.bap.f, p = { months: Number(f.months) || 12 };
                    if (f.from && f.to) { p.from = f.from; p.to = f.to; }
                    ['level', 'room', 'domain', 'code'].forEach(k => { if (f[k]) p[k] = f[k]; });
                    const r = await this.apiCall('ba.school', p);
                    this.bap.schLoading = false;
                    if (r.ok) this.bap.sch = r.data; else this.bap.schError = r.message || 'โหลดไม่สำเร็จ';
                },
                baObjRows(o) { return Object.keys(o || {}).map(k => ({ label: k, n: o[k] })); },
                /* ===== Prevention & promotion (ew.* / trends.* / act.* / event.*) ===== */
                pv: { tab: 'calendar', meta: null, metaErr: '', trends: null, overview: null, flags: null, suggest: null, lib: null, month: '', events: null, busy: '' },
                pva: { f: null, id: '', version: 0, busy: false, err: '', fe: {}, reqId: '' },
                pve: { f: null, id: '', version: 0, busy: false, err: '', fe: {}, reqId: '', q: '' },
                pvr: { f: null, id: '', version: 0, title: '', busy: false, err: '', fe: {} },
                pvi: { items: null, note: '', busy: false, err: '', fe: {} },
                pvp: { items: null, busy: false, err: '', fe: {} },
                pvc: { kind: 'attendance', period: '', rows: null, fileName: '', parseErr: '', busy: false, err: '', fe: {}, reqId: '', result: null },
                get pvCanView() { return this.can('view_all_reports') || this.can('assign_cases') || this.can('manage_settings'); },
                async pvEnter() {
                    if (!this.pv.month) this.pv.month = this.todayISO().slice(0, 7);
                    if (this.pvCanView && !this.pv.meta) { const r = await this.apiCall('ew.meta', {}); if (r.ok) this.pv.meta = r.data; else this.pv.metaErr = r.message || ''; }
                    this.pvTab(this.pv.tab);
                },
                pvTab(t) {
                    this.pv.tab = t;
                    if (t === 'calendar') this.pvLoadEvents();
                    if (t === 'library' && !this.pv.lib) this.pvLoadLib();
                    if (t === 'overview') { this.pvLoadTrends(); if (!this.pv.lib) this.pvLoadLib(); }
                    if (t === 'flags') this.pvLoadFlags();
                    if (t === 'settings') this.pvSettingsInit();
                },
                async pvLoadLib() { const r = await this.apiCall('act.list', {}); this.pv.lib = r.ok ? r.data : { items: [], tiers: {}, tags: {}, canWrite: false }; },
                pvMonthRange() { const [y, m] = this.pv.month.split('-').map(Number); const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return { from: this.pv.month + '-01', to: this.pv.month + '-' + String(last).padStart(2, '0') }; },
                pvMonthShift(n) { const [y, m] = this.pv.month.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 15)); this.pv.month = d.toISOString().slice(0, 7); this.pvLoadEvents(); },
                pvMonthLabel() { const [y, m] = this.pv.month.split('-').map(Number); return ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][m - 1] + ' ' + (y + 543); },
                async pvLoadEvents() { const rg = this.pvMonthRange(); const r = await this.apiCall('event.list', rg); this.pv.events = r.ok ? r.data : { items: [], periods: [], canWrite: false }; if (!this.pv.lib) this.pvLoadLib(); },
                async pvLoadTrends() {
                    const [a, b, c] = await Promise.all([this.apiCall('trends.monthly', {}), this.apiCall('ew.overview', {}), this.apiCall('act.suggest', {})]);
                    this.pv.trends = a.ok ? a.data : null; this.pv.overview = b.ok ? b.data : null; this.pv.suggest = c.ok ? c.data : null;
                },
                async pvLoadFlags() { const r = await this.apiCall('ew.flags', {}); this.pv.flags = r.ok ? r.data : { items: [], note: r.message || '' }; },
                pvBarH(n, list) { const m = Math.max(1, ...list.map(x => x.n)); return Math.max(2, Math.round(n / m * 100)) + '%'; },
                pvMonthShort(ym) { const m = Number(ym.slice(5, 7)); return ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1]; },
                pvPeriodIn(ym) { return ((this.pv.trends && this.pv.trends.periods) || []).filter(p => p.from.slice(0, 7) <= ym && p.to.slice(0, 7) >= ym).map(p => p.label); },
                /* library */
                pvaOpen(a) {
                    this.pva = { id: a ? a.id : '', version: a ? a.version : 0, busy: false, err: '', fe: {}, reqId: '',
                        f: a ? { title: a.title, goal: a.goal, tier: String(a.tier), tags: a.tags.slice(), steps: a.steps, resources: a.resources, minutes: a.minutes || '', audience: a.audience, evidence: a.evidence, ownerUserId: a.ownerUserId, status: a.status }
                             : { title: '', goal: '', tier: '', tags: [], steps: '', resources: '', minutes: '', audience: '', evidence: '', ownerUserId: this.authUser ? this.authUser.id : '', status: 'active' } };
                    if (!this.cpfStaffList.length) this.cpfLoadStaff();
                },
                pvToggleTag(list, t) { const i = list.indexOf(t); if (i >= 0) list.splice(i, 1); else list.push(t); },
                async pvaSave() {
                    if (this.pva.busy) return;
                    if (!this.pva.reqId) this.pva.reqId = this.awNewRequestId();
                    this.pva.busy = true; this.pva.err = '';
                    const p = { requestId: this.pva.reqId, fields: Object.assign({}, this.pva.f, { tier: Number(this.pva.f.tier), minutes: Number(this.pva.f.minutes) || 0 }) };
                    if (this.pva.id) { p.id = this.pva.id; p.expectedVersion = this.pva.version; }
                    const r = await this.apiCall('act.save', p);
                    this.pva.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.pva.reqId = ''; this.pva.fe = r.fields || {}; this.pva.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.pva.f = null; this.showToast('บันทึกกิจกรรมในคลังแล้ว'); this.pvLoadLib();
                },
                /* events */
                pveOpen(e, act) {
                    this.pve = { id: e ? e.id : '', version: e ? e.version : 0, busy: false, err: '', fe: {}, reqId: '', q: '',
                        f: e ? { activityId: e.activityId, title: e.title, date: e.date, endDate: e.endDate, tier: String(e.tier), ownerUserId: e.ownerUserId, target: e.target, location: e.location, expected: e.expected || '', note: e.note, clientIds: e.participants.map(x => x.id) }
                             : { activityId: act ? act.id : '', title: act ? act.title : '', date: '', endDate: '', tier: act ? String(act.tier) : '', ownerUserId: act ? act.ownerUserId : (this.authUser ? this.authUser.id : ''), target: '', location: '', expected: '', note: '', clientIds: [] } };
                    if (!this.cpfStaffList.length) this.cpfLoadStaff();
                    if (act) this.pv.tab = 'calendar';
                },
                get pveMatches() { const q = (this.pve.q || '').trim().toLowerCase(); if (q.length < 2 || !this.pve.f) return []; return (this.students || []).filter(s => !this.pve.f.clientIds.includes(String(s.id)) && String(s.name).toLowerCase().includes(q)).slice(0, 8); },
                async pveSave() {
                    if (this.pve.busy) return;
                    if (!this.pve.reqId) this.pve.reqId = this.awNewRequestId();
                    this.pve.busy = true; this.pve.err = '';
                    const p = { requestId: this.pve.reqId, fields: Object.assign({}, this.pve.f, { tier: Number(this.pve.f.tier) || 0, expected: Number(this.pve.f.expected) || 0 }) };
                    if (this.pve.id) { p.id = this.pve.id; p.expectedVersion = this.pve.version; }
                    const r = await this.apiCall('event.save', p);
                    this.pve.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.pve.reqId = ''; this.pve.fe = r.fields || {}; this.pve.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    const d = this.pve.f.date; this.pve.f = null; this.showToast('บันทึกกิจกรรมในปฏิทินแล้ว'); if (d) this.pv.month = d.slice(0, 7); this.pvLoadEvents();
                },
                pvrOpen(e) { this.pvr = { id: e.id, version: e.version, title: e.title, busy: false, err: '', fe: {}, f: { status: 'done', attended: e.attended === null ? '' : e.attended, reflection: e.reflection || '', measure: e.eval ? e.eval.measure : '', scaleMin: '', scaleMax: '', pre: '', post: '' } }; },
                async pvrSave() {
                    if (this.pvr.busy) return;
                    this.pvr.busy = true; this.pvr.err = '';
                    const r = await this.apiCall('event.result', { id: this.pvr.id, expectedVersion: this.pvr.version, fields: this.pvr.f });
                    this.pvr.busy = false;
                    if (!r.ok) { this.pvr.fe = r.fields || {}; this.pvr.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.pvr.f = null; this.showToast('บันทึกผลกิจกรรมแล้ว'); this.pvLoadEvents();
                },
                /* settings: indicators, risk periods, CSV import */
                pvSettingsInit() {
                    const m = this.pv.meta; if (!m) return;
                    if (!this.pvi.items) this.pvi = { items: m.indicators.items.filter(x => x.active !== false).map(x => Object.assign({}, x)), note: '', busy: false, err: '', fe: {} };
                    if (!this.pvp.items) this.pvp = { items: m.periods.items.map(x => Object.assign({}, x)), busy: false, err: '', fe: {} };
                },
                async pvRefreshMeta() { const r = await this.apiCall('ew.meta', {}); if (r.ok) this.pv.meta = r.data; this.pvi.items = null; this.pvp.items = null; this.pvSettingsInit(); },
                async pviSave() {
                    if (this.pvi.busy) return;
                    this.pvi.busy = true; this.pvi.err = '';
                    const r = await this.apiCall('ew.indicators.save', { expectedVersion: this.pv.meta.indicators.version, note: this.pvi.note, items: this.pvi.items.map(x => Object.assign({}, x, { threshold: x.threshold === '' ? '' : Number(x.threshold), windowDays: Number(x.windowDays) || 0 })) });
                    this.pvi.busy = false;
                    if (!r.ok) { this.pvi.fe = r.fields || {}; this.pvi.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.showToast('บันทึกตัวบ่งชี้แล้ว (ฉบับที่ ' + r.data.version + ')'); this.pv.overview = null; this.pv.flags = null; this.pvRefreshMeta();
                },
                async pvpSave() {
                    if (this.pvp.busy) return;
                    this.pvp.busy = true; this.pvp.err = '';
                    const r = await this.apiCall('risk.periods.save', { expectedVersion: this.pv.meta.periods.version, items: this.pvp.items });
                    this.pvp.busy = false;
                    if (!r.ok) { this.pvp.fe = r.fields || {}; this.pvp.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.showToast('บันทึกช่วงเฝ้าระวังแล้ว'); this.pvRefreshMeta();
                },
                pvCsvTemplate() {
                    const head = this.pvc.kind === 'attendance' ? 'เลขประจำตัว,ชื่อ,นามสกุล,ชั้น,ขาด,สาย' : 'เลขประจำตัว,ชื่อ,นามสกุล,ชั้น,เกรดเฉลี่ย,ไม่ผ่าน';
                    const blob = new Blob(['﻿' + head + '\n'], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
                    a.href = URL.createObjectURL(blob); a.download = this.pvc.kind === 'attendance' ? 'แม่แบบ-การมาเรียน.csv' : 'แม่แบบ-ผลการเรียน.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                },
                pvParseCsv(text) {
                    const rows = []; let row = [], cell = '', q = false;
                    text = String(text || '').replace(/^﻿/, '');
                    for (let i = 0; i < text.length; i++) {
                        const ch = text[i];
                        if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
                        if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
                    }
                    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
                    return rows.filter(r => r.some(c => String(c).trim() !== ''));
                },
                pvCsvFile(ev) {
                    const file = ev.target.files && ev.target.files[0]; this.pvc.rows = null; this.pvc.parseErr = ''; this.pvc.result = null; this.pvc.err = ''; this.pvc.fe = {}; this.pvc.reqId = '';
                    if (!file) return;
                    this.pvc.fileName = file.name;
                    const rd = new FileReader();
                    rd.onload = () => {
                        const t = this.pvParseCsv(rd.result); if (t.length < 2) { this.pvc.parseErr = 'ไม่พบข้อมูลในไฟล์ (ต้องมีหัวตารางและอย่างน้อย 1 แถว)'; return; }
                        const H = t[0].map(h => String(h).trim().toLowerCase());
                        const col = names => H.findIndex(h => names.includes(h));
                        const map = { studentNo: col(['เลขประจำตัว', 'studentno', 'student_no', 'id']), firstName: col(['ชื่อ', 'firstname', 'first_name']), lastName: col(['นามสกุล', 'lastname', 'last_name']), grade: col(['ชั้น', 'grade', 'class']),
                                      absences: col(['ขาด', 'absences', 'absent']), lates: col(['สาย', 'lates', 'late']), gpa: col(['เกรดเฉลี่ย', 'gpa']), fails: col(['ไม่ผ่าน', 'fails']) };
                        const need = this.pvc.kind === 'attendance' ? ['firstName', 'lastName', 'grade'] : ['firstName', 'lastName', 'grade'];
                        const miss = need.filter(k => map[k] < 0); if (miss.length) { this.pvc.parseErr = 'ไม่พบคอลัมน์: ' + miss.map(k => ({ firstName: 'ชื่อ', lastName: 'นามสกุล', grade: 'ชั้น' })[k]).join(', ') + ' — ดาวน์โหลดแม่แบบเพื่อดูหัวตาราง'; return; }
                        this.pvc.rows = t.slice(1).map(r => { const o = {}; Object.keys(map).forEach(k => { if (map[k] >= 0) o[k] = String(r[map[k]] === undefined ? '' : r[map[k]]).trim(); }); return o; });
                    };
                    rd.readAsText(file, 'utf-8');
                    try { ev.target.value = ''; } catch (e) {}                                // re-selecting the corrected file with the same name works
                },
                async pvcSave() {
                    if (this.pvc.busy || !this.pvc.rows) return;
                    if (!this.pvc.reqId) this.pvc.reqId = this.awNewRequestId();
                    this.pvc.busy = true; this.pvc.err = ''; this.pvc.fe = {};
                    const r = await this.apiCall('ew.import', { requestId: this.pvc.reqId, kind: this.pvc.kind, period: this.pvc.period, rows: this.pvc.rows });
                    this.pvc.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.pvc.reqId = ''; this.pvc.fe = r.fields || {}; this.pvc.err = r.fields ? r.fields.rows || Object.values(r.fields)[0] : (r.message || 'นำเข้าไม่สำเร็จ'); return; }
                    this.pvc.result = r.data; this.pvc.rows = null; this.pvc.reqId = ''; this.pv.overview = null; this.pv.flags = null; this.pvRefreshMeta();
                },
                async pvBatchDelete(b) {
                    if (!b._note || !b._note.trim()) { b._err = 'กรุณาระบุเหตุผล'; return; }
                    const r = await this.apiCall('ew.import.delete', { batchId: b.id, note: b._note });
                    if (!r.ok) { b._err = r.fields ? Object.values(r.fields)[0] : (r.message || 'ลบไม่สำเร็จ'); return; }
                    this.showToast('ลบชุดข้อมูลแล้ว ' + r.data.removed + ' แถว'); this.pvRefreshMeta();
                },
                /* ===== Counselling work page (counsel.* / appointments.series / precheck.* / group.* / note.*) ===== */
                ck: { tab: 'notes', meta: null, loading: false, error: '', upcoming: [], upLoading: false, link: null, linkBusy: '', groups: null, notes: null, noteClient: '' },
                ckSer: { f: null, busy: false, err: '', fe: {}, reqId: '', result: null },
                ckGrp: { f: null, busy: false, err: '', fe: {}, reqId: '', q: '' },
                ckNote: { f: null, busy: false, err: '', fe: {}, reqId: '' },
                ckNs: { count: '', days: '', note: '', busy: false, err: '', open: false },
                pcv: { open: false, loading: false, data: null, error: '' },
                pcPub: { open: false, t: '', meta: null, error: '', f: { mood: 0, safe: '', topic: '', tellFirst: '' }, fe: {}, busy: false, done: false },
                async ckEnter() {
                    if (!this.ck.meta && !this.ck.loading) {
                        this.ck.loading = true; this.ck.error = '';
                        const r = await this.apiCall('counsel.meta', {});
                        this.ck.loading = false;
                        if (r.ok) this.ck.meta = r.data; else { this.ck.error = r.message || 'โหลดไม่สำเร็จ'; return; }
                    }
                    if (!this.ckNote.f) this.ckNoteReset();
                    this.ckTab(this.ck.tab);
                },
                ckTab(t) {
                    this.ck.tab = t;
                    if (t === 'series' && !this.ckSer.f) this.ckSerReset();
                    if (t === 'precheck') this.ckLoadUpcoming();
                    if (t === 'groups') { if (!this.ckGrp.f) this.ckGrpReset(); if (!this.ck.groups) this.ckLoadGroups(); }
                },
                ckStudentName(id) { const s = (this.students || []).find(x => String(x.id) === String(id)); return s ? s.name + (s.grade ? ' • ' + s.grade : '') : ''; },
                /* session notes */
                ckNoteReset() { this.ckNote = { f: { clientId: this.ck.noteClient || '', template: 'soap', date: this.todayISO(), sections: ['', '', '', ''], appointmentId: '' }, busy: false, err: '', fe: {}, reqId: '' }; },
                get ckTpl() { const m = this.ck.meta; return m && this.ckNote.f ? (m.templates.find(t => t.key === this.ckNote.f.template) || null) : null; },
                ckSetTpl(k) { const t = this.ck.meta.templates.find(x => x.key === k); this.ckNote.f.template = k; this.ckNote.f.sections = t.sections.map((_, i) => this.ckNote.f.sections[i] || ''); },
                async ckLoadNotes() {
                    const id = this.ckNote.f && this.ckNote.f.clientId; this.ck.noteClient = id || ''; this.ck.notes = null; if (!id) return;
                    const r = await this.apiCall('note.list', { clientId: id });
                    if (this.ckNote.f.clientId === id) this.ck.notes = r.ok ? r.data.items : [];
                },
                async ckNoteSave() {
                    if (this.ckNote.busy) return;
                    const f = this.ckNote.f, fe = {};
                    if (!f.clientId) fe.clientId = 'เลือกนักเรียน';
                    if (!f.sections.some(x => x.trim())) fe.sections = 'บันทึกอย่างน้อย 1 หัวข้อ';
                    this.ckNote.fe = fe; this.ckNote.err = Object.values(fe)[0] || ''; if (this.ckNote.err) return;
                    if (!this.ckNote.reqId) this.ckNote.reqId = this.awNewRequestId();
                    this.ckNote.busy = true;
                    const r = await this.apiCall('note.save', { requestId: this.ckNote.reqId, clientId: f.clientId, fields: { template: f.template, date: f.date, sections: f.sections, appointmentId: f.appointmentId } });
                    this.ckNote.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.ckNote.reqId = ''; this.ckNote.fe = r.fields || {}; this.ckNote.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    const keep = f.clientId; this.showToast('บันทึกการพบแล้ว'); this.ckNoteReset(); this.ckNote.f.clientId = keep; this.ckLoadNotes();
                },
                /* series */
                ckSerReset() { this.ckSer = { f: { clientId: '', dateISO: '', startTime: '', endTime: '', count: 4, everyWeeks: 1, topic: 'ให้คำปรึกษาต่อเนื่อง', type: 'counseling', location: '' }, busy: false, err: '', fe: {}, reqId: '', result: null }; },
                get ckSerDates() {
                    const f = this.ckSer.f; if (!f || !f.dateISO || !(Number(f.count) >= 2)) return [];
                    const out = [], n = Math.min(12, Number(f.count)); for (let i = 0; i < n; i++) { const d = new Date(f.dateISO + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + i * 7 * Number(f.everyWeeks || 1)); out.push(d.toISOString().slice(0, 10)); } return out;
                },
                async ckSerSave() {
                    if (this.ckSer.busy) return;
                    const f = this.ckSer.f, fe = {};
                    if (!f.clientId) fe.clientId = 'เลือกนักเรียน';
                    if (!f.dateISO) fe.dateISO = 'เลือกวันแรก';
                    if (!f.startTime || !f.endTime || f.endTime <= f.startTime) fe.time = 'ระบุเวลาเริ่ม–สิ้นสุด';
                    if (!f.topic.trim()) fe.topic = 'ระบุหัวข้อ';
                    this.ckSer.fe = fe; this.ckSer.err = Object.values(fe)[0] || ''; if (this.ckSer.err) return;
                    if (!this.ckSer.reqId) this.ckSer.reqId = this.awNewRequestId();
                    this.ckSer.busy = true;
                    const r = await this.apiCall('appointments.series', Object.assign({ requestId: this.ckSer.reqId }, f, { count: Number(f.count), everyWeeks: Number(f.everyWeeks) }));
                    this.ckSer.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.ckSer.reqId = ''; this.ckSer.fe = r.fields || {}; this.ckSer.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ckSer.result = r.data; this.ckSer.reqId = '';
                    if (typeof this.loadAppointments === 'function') try { this.loadAppointments(); } catch (e) {}
                },
                /* pre-session check-in */
                async ckLoadUpcoming() {
                    this.ck.upLoading = true;
                    const t = this.todayISO(), e = new Date(t + 'T12:00:00Z'); e.setUTCDate(e.getUTCDate() + 21);
                    const r = await this.apiCall('appointments.list', { from: t, to: e.toISOString().slice(0, 10) });
                    this.ck.upLoading = false;
                    this.ck.upcoming = r.ok ? r.data.appointments.filter(a => a.status === 'scheduled' && a.responsibleUserId === (this.authUser && this.authUser.id) && a.clientVisible) : [];
                },
                async ckMakeLink(a) {
                    if (this.ck.linkBusy) return;
                    this.ck.linkBusy = a.id;
                    const r = await this.apiCall('precheck.create', { appointmentId: a.id });
                    this.ck.linkBusy = '';
                    if (!r.ok) { this.showToast(r.message || 'สร้างลิงก์ไม่สำเร็จ'); return; }
                    this.ck.link = Object.assign({ apptId: a.id, who: a.clientName, date: a.dateISO, time: a.startTime }, r.data);
                    this.$nextTick(async () => {
                        const box = document.querySelector('[data-ck-qr]'); if (!box || !r.data.url) return; box.innerHTML = '';
                        try { if (!window.QRCode) await this.ilrLoadLib('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'); new window.QRCode(box, { text: r.data.url, width: 150, height: 150 }); } catch (e) { box.textContent = ''; }
                    });
                },
                async ckCopy(text) { try { await navigator.clipboard.writeText(text); this.showToast('คัดลอกแล้ว'); } catch (e) { this.showToast('คัดลอกไม่สำเร็จ — เลือกข้อความแล้วคัดลอกเอง'); } },
                async pcvOpen(id) {
                    this.pcv = { open: true, loading: true, data: null, error: '' };
                    const r = await this.apiCall('precheck.get', { id });
                    this.pcv.loading = false;
                    if (r.ok) { this.pcv.data = r.data; this.hm.at = 0; } else this.pcv.error = r.message || 'เปิดไม่สำเร็จ';
                },
                /* groups */
                ckGrpReset() { this.ckGrp = { f: { date: this.todayISO(), kind: 'group', topic: '', sessionNo: '', minutes: '', clientIds: [], note: '', studentNotes: {}, extraCount: '' }, busy: false, err: '', fe: {}, reqId: '', q: '' }; },
                get ckGrpMatches() { const q = (this.ckGrp.q || '').trim().toLowerCase(); if (q.length < 2) return []; return (this.students || []).filter(s => !this.ckGrp.f.clientIds.includes(String(s.id)) && (String(s.name).toLowerCase().includes(q) || String(s.grade || '').toLowerCase().includes(q))).slice(0, 8); },
                ckGrpAdd(s) { this.ckGrp.f.clientIds.push(String(s.id)); this.ckGrp.q = ''; },
                ckGrpDel(id) { this.ckGrp.f.clientIds = this.ckGrp.f.clientIds.filter(x => x !== id); delete this.ckGrp.f.studentNotes[id]; },
                async ckLoadGroups() { const r = await this.apiCall('group.list', {}); this.ck.groups = r.ok ? r.data.items : []; },
                async ckGrpSave() {
                    if (this.ckGrp.busy) return;
                    const f = this.ckGrp.f, fe = {};
                    if (!f.topic.trim()) fe.topic = 'ระบุหัวข้อ';
                    if (!f.clientIds.length) fe.clientIds = 'เพิ่มนักเรียนที่เข้าร่วมอย่างน้อย 1 คน';
                    this.ckGrp.fe = fe; this.ckGrp.err = Object.values(fe)[0] || ''; if (this.ckGrp.err) return;
                    if (!this.ckGrp.reqId) this.ckGrp.reqId = this.awNewRequestId();
                    this.ckGrp.busy = true;
                    const r = await this.apiCall('group.save', { requestId: this.ckGrp.reqId, fields: Object.assign({}, f, { minutes: Number(f.minutes) || 0, extraCount: Number(f.extraCount) || 0 }) });
                    this.ckGrp.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.ckGrp.reqId = ''; this.ckGrp.fe = r.fields || {}; this.ckGrp.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.showToast('บันทึกกิจกรรมกลุ่มแล้ว'); this.ckGrpReset(); this.ckLoadGroups();
                },
                /* no-show setting (admin) */
                ckNsOpen() { const n = this.ck.meta.noShow; this.ckNs = { count: n.count, days: n.days, note: '', busy: false, err: '', open: true }; },
                async ckNsSave() {
                    if (this.ckNs.busy) return;
                    this.ckNs.busy = true; this.ckNs.err = '';
                    const r = await this.apiCall('counsel.settings.save', { noShowCount: Number(this.ckNs.count), noShowDays: Number(this.ckNs.days), note: this.ckNs.note });
                    this.ckNs.busy = false;
                    if (!r.ok) { this.ckNs.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.ckNs.open = false; this.ck.meta = null; this.ckEnter(); this.showToast('บันทึกการตั้งค่าแล้ว');
                },
                /* student check-in (public, token only) */
                async pcPubInit(t) {
                    this.pcPub = Object.assign(this.pcPub, { open: true, t: t || '', meta: null, error: '' });
                    const r = await this.apiCall('precheck.public.get', { t: this.pcPub.t });
                    if (r.ok) this.pcPub.meta = r.data; else this.pcPub.error = r.message || 'ลิงก์นี้ใช้ไม่ได้';
                },
                async pcPubSave() {
                    if (this.pcPub.busy) return;
                    const f = this.pcPub.f, fe = {};
                    if (!f.mood) fe.mood = 'เลือกความรู้สึกวันนี้';
                    if (!f.safe) fe.safe = 'กรุณาตอบข้อนี้';
                    this.pcPub.fe = fe; if (Object.keys(fe).length) return;
                    this.pcPub.busy = true;
                    const r = await this.apiCall('precheck.public.submit', Object.assign({ t: this.pcPub.t }, f));
                    this.pcPub.busy = false;
                    if (!r.ok) { this.pcPub.fe = r.fields || {}; this.pcPub.error = r.fields ? '' : (r.message || 'ส่งไม่สำเร็จ'); return; }
                    this.pcPub.done = true;
                },
                /* ===== Positive behaviour • ABC context • Check-in/Check-out (pbis.* / cico.*) ===== */
                pm: { meta: null, loading: false, error: '' },
                pb: { clientId: '', data: null, loading: false, error: '', cancel: { id: '', reason: '', busy: false, err: '' } },
                cpf: { open: false, id: '', version: 0, f: null, busy: false, err: '', fe: {}, reqId: '' },
                cdf: { open: false, plan: null, date: '', f: null, version: 0, busy: false, err: '', fe: {}, reqId: '' },
                cst: { id: '', to: '', note: '', busy: false, err: '' },
                pbs: { f: null, note: '', busy: false, err: '', fe: {}, version: 0 },
                async pmEnsure(force) {
                    if ((this.pm.meta && !force) || this.pm.loading) return;
                    this.pm.loading = true; this.pm.error = '';
                    const r = await this.apiCall('pbis.meta', {});
                    this.pm.loading = false;
                    if (r.ok) this.pm.meta = r.data; else this.pm.error = r.message || 'โหลดไม่สำเร็จ';
                },
                pbEnter() {
                    const id = this.activeStudent && String(this.activeStudent.id); if (!id) return;
                    this.pmEnsure();
                    if (this.pb.clientId !== id) this.pb = Object.assign(this.pb, { clientId: id, data: null, error: '' });
                    if (!this.pb.data && !this.pb.loading) this.pbLoad();
                },
                async pbLoad() {
                    const id = this.pb.clientId; if (!id) return;
                    this.pb.loading = true; this.pb.error = '';
                    const r = await this.apiCall('pbis.student', { clientId: id });
                    if (this.pb.clientId !== id) return;
                    this.pb.loading = false;
                    if (r.ok) this.pb.data = r.data; else this.pb.error = r.message || 'โหลดไม่สำเร็จ';
                },
                pbRatioText(w) { return w.behavior ? (w.ratio + ' : 1') : (w.positive ? 'มีแต่เชิงบวก' : '—'); },
                pbRatioCls(w) { return !w.behavior ? (w.positive ? 'is-good' : '') : w.ratio >= 4 ? 'is-good' : w.ratio >= 1 ? 'is-mid' : 'is-low'; },
                pbBarW(n, list) { const m = Math.max(1, ...(list || []).map(x => x.n)); return Math.round(n / m * 100) + '%'; },
                async pbCancel() {
                    const c = this.pb.cancel; if (c.busy) return;
                    if (!c.reason.trim()) { c.err = 'กรุณาระบุเหตุผลการยกเลิก'; return; }
                    c.busy = true; c.err = '';
                    const r = await this.apiCall('pbis.positive.cancel', { id: c.id, reason: c.reason });
                    c.busy = false;
                    if (!r.ok) { c.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'ยกเลิกไม่สำเร็จ'); return; }
                    this.pb.cancel = { id: '', reason: '', busy: false, err: '' }; this.pbLoad(); this.showToast('ยกเลิกรายการแล้ว');
                },
                /* ---- CICO plan ---- */
                cpfOpen(plan) {
                    const st = this.activeStudent; if (!st) return;
                    this.cpf = { open: true, id: plan ? plan.id : '', version: plan ? plan.version : 0, busy: false, err: '', fe: {}, reqId: '',
                        f: plan ? { goals: plan.goals.slice(), periods: plan.periods.slice(), targetPct: plan.targetPct, startDate: plan.startDate, endDate: plan.endDate, mentorUserId: plan.mentorUserId, reason: plan.reason }
                                : { goals: ['', '', ''], periods: ['คาบ 1', 'คาบ 2', 'คาบ 3', 'คาบ 4', 'คาบ 5', 'คาบ 6'], targetPct: '', startDate: this.todayISO(), endDate: '', mentorUserId: this.authUser ? this.authUser.id : '', reason: '' } };
                    if (!this.cpfStaff.length) this.cpfLoadStaff();
                },
                cpfStaffList: [],
                get cpfStaff() { return this.cpfStaffList; },
                async cpfLoadStaff() {
                    const r = await this.apiCall('appointments.list', { from: this.todayISO(), to: this.todayISO() });
                    this.cpfStaffList = r.ok ? (r.data.staff || []) : (this.authUser ? [{ id: this.authUser.id, fullName: this.authUser.fullName }] : []);
                },
                async cpfSave() {
                    if (this.cpf.busy) return;
                    const f = this.cpf.f, fe = {};
                    if (!f.goals.some(g => g.trim())) fe.goals = 'กรุณาระบุพฤติกรรมเป้าหมายอย่างน้อย 1 ข้อ';
                    if (!f.periods.some(g => g.trim())) fe.periods = 'กรุณาระบุช่วงเวลาอย่างน้อย 1 ช่วง';
                    const t = Number(f.targetPct); if (!(t >= 1 && t <= 100 && Number.isInteger(t))) fe.targetPct = 'กำหนดเป้าหมายร้อยละ 1–100 ตามที่ทีมตกลง';
                    if (!f.mentorUserId) fe.mentorUserId = 'เลือกครูพี่เลี้ยง';
                    if (!f.reason.trim()) fe.reason = 'ระบุเหตุผลที่ใช้ CICO';
                    this.cpf.fe = fe; this.cpf.err = Object.values(fe)[0] || ''; if (this.cpf.err) return;
                    if (!this.cpf.reqId) this.cpf.reqId = this.awNewRequestId();
                    this.cpf.busy = true;
                    const p = { requestId: this.cpf.reqId, clientId: this.pb.clientId, fields: Object.assign({}, f, { goals: f.goals.filter(g => g.trim()), periods: f.periods.filter(g => g.trim()), targetPct: t }) };
                    if (this.cpf.id) { p.id = this.cpf.id; p.expectedVersion = this.cpf.version; }
                    const r = await this.apiCall('cico.plan.save', p);
                    this.cpf.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.cpf.reqId = ''; this.cpf.fe = r.fields || {}; this.cpf.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.cpf.open = false; this.showToast(this.cpf.id ? 'บันทึกการแก้ไขแผน CICO แล้ว' : 'สร้างแผน CICO แล้ว'); this.pbLoad();
                },
                async cstSave() {
                    const c = this.cst; if (c.busy) return;
                    if (!c.note.trim()) { c.err = 'กรุณาระบุเหตุผล'; return; }
                    c.busy = true; c.err = '';
                    const r = await this.apiCall('cico.plan.status', { id: c.id, status: c.to, note: c.note });
                    c.busy = false;
                    if (!r.ok) { c.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.cst = { id: '', to: '', note: '', busy: false, err: '' }; this.pbLoad();
                },
                /* ---- CICO daily card ---- */
                cdfOpen(plan, date) {
                    const d = date || this.todayISO(), day = plan.days.find(x => x.date === d);
                    const sc = {}; plan.periods.forEach((_, pi) => { sc[pi] = {}; plan.goals.forEach((_, gi) => { const v = day && day.scores[pi] && day.scores[pi][gi]; sc[pi][gi] = (v === 0 || v === 1 || v === 2) ? v : null; }); });
                    this.cdf = { open: true, plan, date: d, version: day ? day.version : 0, busy: false, err: '', fe: {}, reqId: '',
                        f: { checkIn: day ? day.checkIn : false, checkOut: day ? day.checkOut : false, scores: sc, note: day ? day.note : '' } };
                },
                cdfSetDate(d) { const plan = this.cdf.plan; if (plan && d) this.cdfOpen(plan, d); },
                cdfSet(pi, gi, v) { const cur = this.cdf.f.scores[pi][gi]; this.cdf.f.scores[pi][gi] = cur === v ? null : v; },
                get cdfLive() {
                    const f = this.cdf.f; if (!f) return { pts: 0, cells: 0, pct: null };
                    let pts = 0, cells = 0; Object.values(f.scores).forEach(row => Object.values(row).forEach(v => { if (v === 0 || v === 1 || v === 2) { pts += v; cells++; } }));
                    return { pts, cells, pct: cells ? Math.round(pts / (cells * 2) * 100) : null };
                },
                async cdfSave() {
                    if (this.cdf.busy) return;
                    if (!this.cdf.reqId) this.cdf.reqId = this.awNewRequestId();
                    this.cdf.busy = true; this.cdf.err = '';
                    const p = { requestId: this.cdf.reqId, planId: this.cdf.plan.id, date: this.cdf.date, checkIn: !!this.cdf.f.checkIn, checkOut: !!this.cdf.f.checkOut, scores: this.cdf.f.scores, note: this.cdf.f.note };
                    if (this.cdf.version) p.expectedVersion = this.cdf.version;
                    const r = await this.apiCall('cico.day.save', p);
                    this.cdf.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.cdf.reqId = ''; this.cdf.fe = r.fields || {}; this.cdf.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.cdf.open = false; this.showToast('บันทึกบัตร CICO ของวันที่ ' + this.cdf.date + ' แล้ว'); this.pbLoad();
                },
                /** SVG points for the daily % line (only rated days; a day with no rated cell is not drawn as 0) */
                cicoChart(plan) {
                    const days = plan.days.filter(d => d.pct !== null).slice(-20), W = 560, H = 160, pad = 24;
                    const x = i => pad + (days.length <= 1 ? (W - 2 * pad) / 2 : i * (W - 2 * pad) / (days.length - 1)), y = v => H - pad - v / 100 * (H - 2 * pad);
                    return { W, H, days: days.map((d, i) => ({ x: x(i), y: y(d.pct), pct: d.pct, date: d.date, met: d.met })), line: days.map((d, i) => x(i) + ',' + y(d.pct)).join(' '),
                             ty: y(plan.targetPct), y0: y(0), y100: y(100), pad };
                },
                /** dots as SVG markup (Alpine templates cannot live inside <svg>); numbers and ISO dates only */
                cicoDots(plan) {
                    return this.cicoChart(plan).days.map(p => '<circle cx="' + Number(p.x).toFixed(1) + '" cy="' + Number(p.y).toFixed(1) + '" r="4.5" class="' + (p.met ? 'cico-pt is-met' : 'cico-pt') + '"><title>' + String(p.date).replace(/[^0-9-]/g, '') + ' — ' + Number(p.pct) + '%</title></circle>').join('');
                },
                /* ---- settings (manage_settings) ---- */
                pbsOpen() {
                    const m = this.pm.meta; if (!m) return;
                    this.pbs = { f: { positive: m.allPositive.map(c => Object.assign({}, c)), antecedents: m.antecedents.join('\n'), consequences: m.consequences.join('\n'), places: m.places.join('\n'), periods: m.periods.join('\n'), ratioNote: m.ratioNote },
                                 note: '', busy: false, err: '', fe: {}, version: m.version };
                },
                async pbsSave() {
                    if (this.pbs.busy) return;
                    if (!this.pbs.note.trim()) { this.pbs.fe = { note: 'กรุณาระบุเหตุผลของการแก้ไข' }; this.pbs.err = this.pbs.fe.note; return; }
                    const split = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
                    const f = this.pbs.f, settings = { positive: f.positive.filter(c => c.code || c.label.trim()), antecedents: split(f.antecedents), consequences: split(f.consequences), places: split(f.places), periods: split(f.periods), ratioNote: f.ratioNote };
                    this.pbs.busy = true; this.pbs.err = '';
                    const r = await this.apiCall('pbis.settings.save', { settings, note: this.pbs.note, expectedVersion: this.pbs.version });
                    this.pbs.busy = false;
                    if (!r.ok) { this.pbs.fe = r.fields || {}; this.pbs.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.pbs.f = null; await this.pmEnsure(true); this.showToast('บันทึกการตั้งค่าพฤติกรรมเชิงบวกและ ABC แล้ว (ฉบับที่ ' + r.data.version + ')');
                },
                /* ===== “งานของฉันวันนี้” + quick 3-tap behaviour record + in-page tips ===== */
                hm: { data: null, loading: false, error: '', at: 0, homeFirst: false },
                hq: { open: false, kind: 'behavior', step: 1, who: null, other: false, st: { first: '', last: '', level: '', room: '' }, q: '', codes: [], detail: '', showDetail: false,
                      busy: false, err: '', fe: {}, reqId: '', done: null },
                tipsOff: {},
                HM_KIND_ICON: { appt: 'i-calendar-clock', appt_result: 'i-calendar-clock', alert_new: 'i-siren', alert_safety: 'i-siren', alert_follow: 'i-siren', review: 'i-list-checks',
                                bully: 'i-shield-check', bully_inbox: 'i-shield-check', issp: 'i-target', referral: 'i-arrow-right', cico: 'i-calendar-check', precheck: 'i-message-square', noshow: 'i-calendar-clock' },
                hmInit() {
                    try { this.tipsOff = JSON.parse(localStorage.getItem('tss.tipsOff') || '{}') || {}; } catch (e) { this.tipsOff = {}; }
                    try { this.hm.homeFirst = localStorage.getItem('tss.homeFirst') === '1'; } catch (e) { this.hm.homeFirst = false; }
                },
                tipOn(k) { return !this.tipsOff[k]; },
                tipHide(k) { this.tipsOff = Object.assign({}, this.tipsOff, { [k]: 1 }); try { localStorage.setItem('tss.tipsOff', JSON.stringify(this.tipsOff)); } catch (e) {} },
                tipsReset() { this.tipsOff = {}; try { localStorage.removeItem('tss.tipsOff'); } catch (e) {} this.showToast('เปิดคำแนะนำทุกหน้าอีกครั้งแล้ว'); },
                hmSetHomeFirst(v) { this.hm.homeFirst = !!v; try { v ? localStorage.setItem('tss.homeFirst', '1') : localStorage.removeItem('tss.homeFirst'); } catch (e) {} },
                async hmLoad(force) {
                    if (this.hm.loading) { if (force) this.__hmAgain = true; return; }
                    if (!force && this.hm.data && Date.now() - this.hm.at < 30000) return;
                    this.hm.loading = true; this.hm.error = '';
                    const r = await this.apiCall('home.today', {});
                    this.hm.loading = false;
                    if (r.ok) { this.hm.data = r.data; this.hm.at = Date.now(); } else this.hm.error = r.message || 'โหลดรายการไม่สำเร็จ';
                    if (this.__hmAgain) { this.__hmAgain = false; return this.hmLoad(true); }
                },
                hmGreeting() { const h = Number(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false })); return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'; },
                hmTodayLabel() { return this.formatThaiDateDisplay ? this.formatThaiDateDisplay(this.todayISO()) : this.todayISO(); },
                async hmGo(it) {
                    const t = it.target || {};
                    if (t.tab === 'precheck') { this.pcvOpen(t.id); return; }
                    if (t.tab === 'red_alerts') { this.currentTab = 'red_alerts'; if (t.id) this.raOpen(t.id); return; }
                    if (t.tab === 'bullying') {
                        this.currentTab = 'bullying';
                        if (t.sub === 'inbox') { await this.$nextTick(); this.blTab('inbox'); }
                        if (t.id) this.blOpen(t.id);
                        return;
                    }
                    if (t.tab === 'clients' && t.clientId) {
                        const s = this.students.find(x => String(x.id) === String(t.clientId));
                        if (!s) { this.showToast('ไม่พบแฟ้มของนักเรียนรายนี้ในรายการของคุณ'); return; }
                        await this.openProfile(s);
                        if (t.sub === 'issp') { this.profileTab = 'issp'; this.isProfileEnter(); if (t.id) this.isOpenPlan(t.id); }
                        else if (t.sub === 'care') { this.profileTab = 'care'; this.cpEnter(); }
                        else if (t.sub === 'behavior') { this.openBehaviorTab(); }
                        return;
                    }
                    if (t.tab && this.tabAllowed(t.tab)) this.currentTab = t.tab;
                },
                hmAction(k) {
                    if (k === 'quick') return this.hqOpen();
                    if (k === 'bully') return this.blReportOpen();
                    if (k === 'counsel') { this.rtc.source = 'global'; return this.rtcPick('counseling'); }
                    if (k === 'requests') { this.currentTab = 'dashboard'; this.$nextTick(() => { const el = document.querySelector('.rq-panel'); if (el) el.scrollIntoView({ block: 'start' }); }); return; }
                    if (this.tabAllowed(k)) this.currentTab = k;
                },
                /* ---- quick record: 1 student → 2 behaviour(s) → 3 save ---- */
                async hqOpen() {
                    this.spReset('hq');
                    this.hq = { open: true, kind: 'behavior', step: 1, who: null, other: false, st: { first: '', last: '', level: '', room: '' }, q: '', codes: [], detail: '', showDetail: false, busy: false, err: '', fe: {}, reqId: '', done: null };
                    this.bmEnsure(); this.pmEnsure(); if (!this.hm.data) this.hmLoad();
                },
                hqClose() { this.hq.open = false; },
                get hqRecent() { return (this.hm.data && this.hm.data.recent) || []; },
                get hqMatches() {
                    const q = (this.hq.q || '').trim().toLowerCase(); if (q.length < 2 || !this.can('view_case')) return [];
                    return (this.students || []).filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.nickname || '').toLowerCase().includes(q)).slice(0, 6)
                        .map(s => ({ key: s.id, clientId: s.id, name: s.name, grade: s.grade || '' }));
                },
                hqPick(s) { this.hq.who = s; this.hq.other = false; this.hq.fe = {}; this.hq.err = ''; this.hq.step = 2; },
                hqOtherDone() {
                    const s = this.hq.st, fe = {};
                    if (!s.first.trim()) fe.firstName = 'กรุณากรอกชื่อ';
                    if (!s.last.trim()) fe.lastName = 'กรุณากรอกนามสกุล';
                    if (!s.level) fe.level = 'เลือกชั้น';
                    if (!this.roomOk(s.level, s.room)) fe.room = 'เลือกห้อง';
                    this.hq.fe = fe; if (Object.keys(fe).length) return;
                    this.hqPick({ key: 'new', clientId: '', name: s.first.trim() + ' ' + s.last.trim(), grade: 'ม.' + s.level + '/' + s.room,
                                  student: { firstName: s.first.trim(), lastName: s.last.trim(), level: Number(s.level), room: String(s.room).toUpperCase() } });
                },
                get hqItems() { const m = this.bm.meta; return m && m.def ? m.def.items : []; },
                get hqDomains() { const m = this.bm.meta; return m && m.def ? m.def.domains : []; },
                hqKind(k) { if (this.hq.kind !== k) { this.hq.kind = k; this.hq.codes = []; this.hq.fe = {}; this.hq.err = ''; } },
                hqToggle(code) { const i = this.hq.codes.indexOf(code); if (i >= 0) this.hq.codes.splice(i, 1); else this.hq.codes.push(code); this.hq.fe = {}; if (this.hqNeedsDetail) this.hq.showDetail = true; },
                get hqNeedsDetail() { return this.hq.kind === 'behavior' && this.hq.codes.includes('MO7'); },
                get hqPositive() { return (this.pm.meta && this.pm.meta.positive) || []; },
                async hqSave() {
                    if (this.hq.busy) return;
                    const fe = {};
                    if (!this.hq.who) fe.who = 'เลือกนักเรียนก่อน';
                    if (!this.hq.codes.length) fe.codes = 'เลือกพฤติกรรมอย่างน้อย 1 รายการ';
                    if (this.hqNeedsDetail && !this.hq.detail.trim()) fe.detail = 'เมื่อเลือก MO7 ต้องบันทึกบริบทและรายละเอียดที่จำเป็น';
                    this.hq.fe = fe; this.hq.err = Object.values(fe)[0] || ''; if (this.hq.err) { if (fe.detail) this.hq.showDetail = true; return; }
                    if (!this.hq.reqId) this.hq.reqId = this.awNewRequestId();
                    const pos = this.hq.kind === 'positive';
                    const p = pos ? { codes: this.hq.codes.slice(), note: this.hq.detail, requestId: this.hq.reqId } : { codes: this.hq.codes.slice(), detail: this.hq.detail, handling: '', sources: [], sourceOther: '', requestId: this.hq.reqId };
                    if (this.hq.who.clientId) p.clientId = this.hq.who.clientId; else if (this.hq.who.studentId) p.studentId = this.hq.who.studentId; else p.student = Object.assign({ nickname: '' }, this.hq.who.student);
                    this.hq.busy = true;
                    const r = await this.apiCall(pos ? 'pbis.positive.save' : 'behavior.save', p);
                    this.hq.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') this.hq.reqId = ''; this.hq.fe = r.fields || {}; this.hq.err = r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); return; }
                    this.hq.done = { positive: pos, codes: this.hq.codes.slice(), name: this.hq.who.name, alerts: (r.data.alerts || []).length, duplicate: !!r.data.duplicate };
                    this.hq.reqId = ''; this.hq.step = 3;
                    this.hm.at = 0;
                    if (((r.data.student && r.data.student.created) || p.studentId) && this.can('view_case')) this.loadData();
                    if (this.can('view_assessment')) this.rlLoad();
                    const cid = r.data.item && r.data.item.clientId;
                    if (cid && this.bp && this.bp.clientId === String(cid)) this.bpLoad();
                    if (cid && this.pb && this.pb.clientId === String(cid)) this.pbLoad();
                },
                hqAgainSame() { const w = this.hq.who, k = this.hq.kind; this.hq.kind = k; this.hq.codes = []; this.hq.detail = ''; this.hq.showDetail = false; this.hq.done = null; this.hq.err = ''; this.hq.fe = {}; this.hq.step = 2; this.hq.who = w; },
                hqAgainOther() { this.hqOpen(); },
                /* ===== School Bullying (bully.*) — every status comes from the server; nothing is shown as saved before it confirms ===== */
                bl: { tab: 'cases', data: null, loading: false, error: '', q: '', status: 'open', type: '', reports: null, rLoading: false, dash: null, dLoading: false,
                      pol: null, pLoading: false, link: null },
                blr: { open: false, f: null, busy: false, err: '', fe: {}, reqId: '', done: null, q: '' },
                bld: { open: false, id: '', loading: false, error: '', data: null, step: '', f: {}, busy: false, err: '', fe: {}, reqId: '' },
                blt: { id: '', item: null, decision: '', note: '', f: null, incidentId: '', busy: false, err: '', fe: {}, reqId: '' },
                blpe: { f: null, note: '', busy: false, err: '', fe: {}, reqId: '', approveNote: '' },
                blPub: { open: false, meta: null, f: { firstName: '', lastName: '', level: '', room: '', studentNo: '', contact: '', reporterRole: '', affectedText: '', allegedText: '', types: [], location: '', period: '', occurredDate: '', description: '', wantsTalk: true, ongoing: false }, busy: false, err: '', fe: {}, done: null, reqId: '' },
                BL_ROLE: { affected: 'ผู้ได้รับผลกระทบ', alleged: 'ผู้ถูกกล่าวหา', witness: 'ผู้เห็นเหตุการณ์' },
                blErr(r) { return r.fields ? Object.values(r.fields)[0] : (r.message || 'บันทึกไม่สำเร็จ'); },
                blSevCls(n) { return n >= 3 ? 'bl-sev3' : n === 2 ? 'bl-sev2' : 'bl-sev1'; },
                async blEnter() { this.blLoad(); if (!this.bl.pol) this.blPolLoad(); },
                async blLoad() {
                    this.bl.loading = true; this.bl.error = '';
                    const r = await this.apiCall('bully.list', {});
                    this.bl.loading = false;
                    if (r.ok) { this.bl.data = r.data; if (!r.data.handler && this.bl.tab !== 'policy') this.bl.tab = 'mine'; } else this.bl.error = r.message || 'โหลดไม่สำเร็จ';
                },
                async blPolLoad() { this.bl.pLoading = true; const r = await this.apiCall('bully.policy.get', {}); this.bl.pLoading = false; if (r.ok) this.bl.pol = r.data; },
                blTab(t) {
                    this.bl.tab = t;
                    if (t === 'inbox') this.blReportsLoad();
                    if (t === 'dash') this.blDashLoad();
                    if (t === 'policy') this.blPolLoad();
                },
                async blReportsLoad() { this.bl.rLoading = true; const r = await this.apiCall('bully.reports', {}); this.bl.rLoading = false; if (r.ok) this.bl.reports = r.data; else this.showToast(r.message || 'โหลดไม่สำเร็จ'); },
                async blDashLoad() { this.bl.dLoading = true; const r = await this.apiCall('bully.dashboard', {}); this.bl.dLoading = false; if (r.ok) this.bl.dash = r.data; else this.showToast(r.message || 'โหลดไม่สำเร็จ'); },
                blShown() {
                    const d = this.bl.data; if (!d) return [];
                    const q = this.bl.q.trim().toLowerCase();
                    return d.items.filter(i => (this.bl.status === 'all' || (this.bl.status === 'open' ? i.status !== 'closed' : this.bl.status === 'overdue' ? (i.state.firstResponseOverdue || i.state.investigationOverdue || i.state.followUpOverdue) : i.status === this.bl.status))
                        && (!this.bl.type || i.types.includes(this.bl.type))
                        && (!q || (i.caseNo + ' ' + i.parties.map(p => p.name + ' ' + p.grade).join(' ') + ' ' + i.location).toLowerCase().includes(q)));
                },
                blFiltered() { return !!(this.bl.q || this.bl.type || this.bl.status !== 'open'); },
                blDue(i) {
                    const s = i.state, out = [];
                    if (s.firstResponseOverdue) out.push('เกินเวลาตอบสนองครั้งแรก');
                    if (s.investigationOverdue) out.push('เกินกำหนดตรวจสอบ');
                    if (s.followUpOverdue) out.push('ถึงกำหนดติดตาม ' + this.formatThaiDateDisplay(s.nextFollowUp));
                    else if (s.nextFollowUp) out.push('ติดตามครั้งถัดไป ' + this.formatThaiDateDisplay(s.nextFollowUp));
                    return out;
                },
                async blCopyLink() {
                    const r = await this.apiCall('bully.public.link', {});
                    if (!r.ok) { this.showToast(r.message || 'ไม่สามารถดึงลิงก์'); return; }
                    this.bl.link = r.data;
                    if (r.data.url) {
                        try { await navigator.clipboard.writeText(r.data.url); this.showToast('คัดลอกลิงก์แบบฟอร์มนักเรียนแล้ว'); } catch (e) {}
                        this.$nextTick(async () => {
                            const box = document.querySelector('[data-bl-qr]'); if (!box) return; box.innerHTML = '';
                            try { await this.ilrLoadLib('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', () => !!window.QRCode); new window.QRCode(box, { text: r.data.url, width: 168, height: 168 }); }
                            catch (e) { box.textContent = 'สร้าง QR Code ไม่ได้ในขณะนี้ — ใช้ลิงก์ด้านบนแทน'; }
                        });
                    }
                },

                /* ---- staff report (every signed-in role) ---- */
                async blReportOpen(prefill) {
                    if (!this.bl.pol) await this.blPolLoad();
                    if (!this.bl.pol) { this.showToast('โหลดแบบฟอร์มไม่สำเร็จ'); return; }
                    this.blr = { open: true, busy: false, err: '', fe: {}, reqId: '', done: null, q: '',
                                 f: Object.assign({ source: 'staff', occurredDate: this.todayISO(), location: '', period: '', types: [], severity: 0, description: '', evidence: '', ongoing: false,
                                                    parties: [{ role: 'affected', name: '', grade: '', clientId: '' }] }, prefill || {}) };
                },
                blToggleType(f, code) { const i = f.types.indexOf(code); if (i >= 0) f.types.splice(i, 1); else f.types.push(code); if (code === 'sexual' && f.types.includes('sexual')) f.severity = 3; },
                blAddParty(f, role) { f.parties.push({ role: role || 'alleged', name: '', grade: '', clientId: '' }); },
                blPickStudent(p, s) { p.clientId = s.id; p.name = s.name; p.grade = s.grade || ''; p.q = ''; },
                blStudentMatches(p) {
                    const q = String(p.name || '').trim().toLowerCase();
                    if (!this.can('view_case') || p.clientId || q.length < 2) return [];
                    return (this.students || []).filter(s => String(s.name).toLowerCase().includes(q)).slice(0, 5);
                },
                blValidate(f) {
                    const e = {};
                    if (!f.occurredDate) e.occurredDate = 'กรุณาระบุวันที่เกิดเหตุ'; else if (f.occurredDate > this.todayISO()) e.occurredDate = 'วันที่ต้องไม่อยู่ในอนาคต';
                    if (!f.types.length) e.types = 'กรุณาเลือกรูปแบบอย่างน้อย 1 รูปแบบ';
                    if (!(f.severity >= 1)) e.severity = 'กรุณาเลือกระดับความรุนแรงเบื้องต้น';
                    if (!String(f.description).trim()) e.description = 'กรุณาบันทึกสิ่งที่เกิดขึ้น';
                    f.parties.forEach((p, i) => { if (!String(p.name).trim()) e['party_' + i] = 'กรุณาระบุชื่อ'; });
                    if (!f.parties.some(p => p.role === 'affected')) e.parties = 'กรุณาระบุผู้ได้รับผลกระทบอย่างน้อย 1 คน';
                    return e;
                },
                async blReportSave() {
                    const b = this.blr; if (b.busy) return;
                    b.fe = this.blValidate(b.f); if (Object.keys(b.fe).length) { b.err = Object.values(b.fe)[0]; return; }
                    if (!b.reqId) b.reqId = this.awNewRequestId();
                    b.busy = true; b.err = '';
                    const f = b.f, fields = Object.assign({}, f, { parties: f.parties.map(p => ({ role: p.role, name: p.name, grade: p.grade, clientId: p.clientId })) });
                    const r = await this.apiCall('bully.create', { source: f.source, fields, requestId: b.reqId });
                    b.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') b.reqId = ''; b.fe = r.fields || {}; b.err = this.blErr(r); return; }
                    b.done = r.data; b.reqId = '';
                    if (this.currentTab === 'bullying') this.blLoad();
                },

                /* ---- case detail ---- */
                async blOpen(id) { this.bld = { open: true, id, loading: true, error: '', data: null, step: '', f: {}, busy: false, err: '', fe: {}, reqId: '' }; await this.blReload(); },
                async blReload() {
                    const id = this.bld.id; this.bld.loading = true;
                    const r = await this.apiCall('bully.get', { id });
                    if (this.bld.id !== id) return;
                    this.bld.loading = false;
                    if (r.ok) this.bld.data = r.data; else { this.bld.error = r.message || 'เปิดไม่ได้'; this.bld.data = null; }
                },
                blParty(id) { return ((this.bld.data && this.bld.data.item.parties) || []).find(p => p.id === id) || null; },
                blStepOpen(step) {
                    const t = this.todayISO(), it = this.bld.data.item;
                    const F = { safety: { done: false, note: '' }, assign: { userIds: it.assignedUserIds.slice() }, interview: { partyId: '', other: '', date: t, note: '' },
                                determine: { result: '', criteria: {}, note: '' }, action: { code: '', partyId: '', date: t, note: '' }, parent: { partyId: '', status: '', date: t, method: '', note: '' },
                                followup: { stopped: '', note: '' }, severity: { severity: it.severity, note: '' }, party: { role: 'witness', name: '', grade: '', clientId: '' }, close: { note: '' }, reopen: { note: '' } };
                    this.bld.step = step; this.bld.f = F[step]; this.bld.err = ''; this.bld.fe = {}; this.bld.reqId = '';
                },
                async blStepSave() {
                    const b = this.bld; if (b.busy || !b.step) return;
                    if (!b.reqId) b.reqId = this.awNewRequestId();
                    b.busy = true; b.err = '';
                    const r = await this.apiCall('bully.step', { id: b.id, step: b.step, fields: b.f, requestId: b.reqId });
                    b.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') b.reqId = ''; b.fe = r.fields || {}; b.err = this.blErr(r); return; }
                    b.step = ''; b.reqId = ''; this.showToast('บันทึกแล้ว');
                    await this.blReload(); if (this.currentTab === 'bullying') this.blLoad();
                },
                blCanRestorative() { const it = this.bld.data && this.bld.data.item; const pol = this.bld.data && this.bld.data.policy; return !(it && pol && (pol.noMediationTypes || []).some(t => it.types.includes(t))); },

                /* ---- student-report inbox ---- */
                blTriage(item) {
                    const pol = this.bl.pol ? this.bl.pol.policy : null;
                    const lv = /ม\.(\d)\/(\d+)/.exec(item.reporterGrade || '') || [];
                    this.blt = { id: item.id, item, decision: 'accept', note: '', incidentId: '', busy: false, err: '', fe: {}, reqId: '',
                                 f: { occurredDate: item.occurredDate || this.todayISO(), location: item.location, period: item.period, types: item.types.slice(), severity: item.types.includes('sexual') ? 3 : 0,
                                      description: item.description, parties: item.reporterRole === 'self' ? [{ role: 'affected', name: item.reporterName, grade: item.reporterGrade, clientId: '' }]
                                                                                                     : [{ role: 'affected', name: '', grade: '', clientId: '' }, { role: 'witness', name: item.reporterName, grade: item.reporterGrade, clientId: '' }] } };
                    if (!pol) this.blPolLoad();
                },
                async blTriageSave() {
                    const t = this.blt; if (t.busy) return;
                    if (t.decision === 'accept') { t.fe = this.blValidate(t.f); if (Object.keys(t.fe).length) { t.err = Object.values(t.fe)[0]; return; } }
                    if (!t.reqId) t.reqId = this.awNewRequestId();
                    t.busy = true; t.err = '';
                    const p = { id: t.id, decision: t.decision, note: t.note, requestId: t.reqId };
                    if (t.decision === 'accept') p.fields = Object.assign({}, t.f, { parties: t.f.parties.map(x => ({ role: x.role, name: x.name, grade: x.grade, clientId: x.clientId })) });
                    if (t.decision === 'link') p.incidentId = t.incidentId;
                    const r = await this.apiCall('bully.report.decide', p);
                    t.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') t.reqId = ''; t.fe = r.fields || {}; t.err = this.blErr(r); return; }
                    this.blt.id = ''; this.showToast(t.decision === 'reject' ? 'บันทึกการไม่รับเรื่องแล้ว' : 'รับเรื่องแล้ว');
                    this.blReportsLoad(); this.blLoad();
                    if (r.data.incidentId && t.decision === 'accept') this.blOpen(r.data.incidentId);
                },

                /* ---- policy editor (manage_settings) ---- */
                blPolEdit() {
                    const P = JSON.parse(JSON.stringify(this.bl.pol.policy));
                    P.followUpWeeksText = P.timelines.followUpWeeks.join(',');
                    P.locationsText = P.locations.join('\n'); P.periodsText = P.periods.join('\n');
                    this.blpe = { f: P, note: '', busy: false, err: '', fe: {}, reqId: '', approveNote: '' };
                },
                async blPolSave() {
                    const e = this.blpe; if (e.busy) return;
                    if (!e.note.trim()) { e.fe = { note: 'กรุณาระบุสิ่งที่แก้ไข' }; e.err = e.fe.note; return; }
                    if (!e.reqId) e.reqId = this.awNewRequestId();
                    const P = Object.assign({}, e.f, { locations: e.f.locationsText.split('\n').map(s => s.trim()).filter(Boolean), periods: e.f.periodsText.split('\n').map(s => s.trim()).filter(Boolean),
                                                       timelines: { firstResponseHours: Number(e.f.timelines.firstResponseHours), investigationDays: Number(e.f.timelines.investigationDays), followUpWeeks: e.f.followUpWeeksText } });
                    e.busy = true; e.err = '';
                    const r = await this.apiCall('bully.policy.save', { expectedVersion: this.bl.pol.status.version, policy: P, note: e.note, requestId: e.reqId });
                    e.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') e.reqId = ''; e.fe = r.fields || {}; e.err = this.blErr(r); return; }
                    this.blpe.f = null; this.showToast('บันทึกนโยบายฉบับที่ ' + r.data.version + ' (ร่าง) แล้ว'); this.blPolLoad();
                },
                async blPolApprove() {
                    const e = this.blpe; if (e.busy) return;
                    e.busy = true; e.err = '';
                    const r = await this.apiCall('bully.policy.approve', { expectedVersion: this.bl.pol.status.version, note: e.approveNote });
                    e.busy = false;
                    if (!r.ok) { e.fe = r.fields || {}; e.err = this.blErr(r); return; }
                    e.approveNote = ''; this.showToast('รับรองนโยบายแล้ว'); this.blPolLoad();
                },

                /* ---- public student form (no login) ---- */
                async blPubInit() {
                    this.blPub.open = true;
                    this.blPub.f = { firstName: '', lastName: '', level: '', room: '', studentNo: '', contact: '', reporterRole: '', affectedText: '', allegedText: '', types: [], location: '', period: '', occurredDate: '', description: '', wantsTalk: true, ongoing: false };
                    const r = await TssApi.call('bully.public.meta', {});
                    if (r.ok) this.blPub.meta = r.data; else this.blPub.err = 'เปิดแบบฟอร์มไม่ได้ในขณะนี้ — กรุณาบอกครูโดยตรง';
                },
                async blPubSave() {
                    const b = this.blPub, f = b.f; if (b.busy) return;
                    const e = {};
                    if (!f.firstName.trim()) e.firstName = 'กรุณากรอกชื่อ'; if (!f.lastName.trim()) e.lastName = 'กรุณากรอกนามสกุล';
                    if (!f.level) e.level = 'กรุณาเลือกชั้น'; if (!this.roomOk(f.level, f.room)) e.room = 'กรุณาเลือกห้อง';
                    if (!f.reporterRole) e.reporterRole = 'กรุณาเลือก';
                    if (f.reporterRole === 'witness' && !f.affectedText.trim()) e.affectedText = 'กรุณาบอกว่าใครถูกกระทำ';
                    if (f.description.trim().length < 10) e.description = 'กรุณาเล่าเหตุการณ์ (อย่างน้อย 10 ตัวอักษร)';
                    b.fe = e; if (Object.keys(e).length) { b.err = 'ยังส่งไม่ได้ — ' + Object.values(e)[0]; return; }
                    if (!b.reqId) b.reqId = this.awNewRequestId();
                    b.busy = true; b.err = '';
                    const r = await TssApi.call('bully.public.submit', Object.assign({}, f, { level: Number(f.level), room: String(f.room).toUpperCase(), requestId: b.reqId }));
                    b.busy = false;
                    if (!r.ok) { if (r.code !== 'NETWORK') b.reqId = ''; b.fe = r.fields || {}; b.err = r.code === 'NETWORK' ? 'ส่งไม่สำเร็จ (อินเทอร์เน็ต) — กดส่งอีกครั้งได้ ระบบจะไม่บันทึกซ้ำ' : this.blErr(r); return; }
                    b.done = r.data;
                },
                /* ===== Tab 5 “เครื่องมือการประเมินเพิ่มเติม”: S.D.M.A. / F.A. / S.S.A. / M.S.C.A. + family map & ecomap =====
                   Definitions, drafts and results live on the server (tools.* API). Nothing sensitive is kept in browser storage.
                   The live score below mirrors the server's scoring for display only; the stored result is always the server's. */
                aw: {
                    defs: null, defsLoading: false, defsError: '',
                    clientId: '', list: [], listLoading: false, listError: '', listFor: '',
                    open: false, code: '', def: null, item: null, readOnly: false, isDiagram: false,
                    answers: {}, assessedDate: '', linkedAssessmentId: '', supersedesId: '',
                    step: 0, dirty: false, saving: false, savedAt: '', error: '', errors: {}, confirmClose: false, requestId: '',
                    expectedVersion: null, loadingItem: false, histOpen: '', sel: null, connect: null, zoomPct: 100, dgNotes: '', exportMsg: '',
                    ssaOpen: {}, faDefsOpen: {}, problemSearch: '', openGroups: {}, confirmDiscard: false,
                    selData: null, commonNotes: [], today: '', dgRev: 0
                },
                // the diagram editor instance is kept outside Alpine's reactive proxy (it manages its own SVG state)
                get awDg() { this.aw.dgRev; return window.__tssAwDg || null; },
                canRecordSpecialist() { return this.can('view_assessment') && this.can('create_assessment'); },
                async awEnsureDefs() {
                    if (this.aw.defs || this.aw.defsLoading || !this.canAccessSpecialistData()) return;
                    this.aw.defsLoading = true; this.aw.defsError = '';
                    const r = await this.apiCall('tools.defs');
                    this.aw.defsLoading = false;
                    if (!r.ok) { this.aw.defsError = r.message; this.awHandleDenied(r); return; }
                    this.aw.defs = r.data.defs;
                    this.aw.commonNotes = r.data.commonNotes;
                },
                async awLoadList(clientId, force) {
                    if (!clientId || !this.canAccessSpecialistData()) { this.aw.list = []; this.aw.listFor = ''; return; }
                    if (!force && this.aw.listFor === clientId && !this.aw.listError) return;
                    const defsP = this.awEnsureDefs();                             // definitions and list side by side
                    this.aw.clientId = clientId; this.aw.listLoading = true; this.aw.listError = '';
                    const r = await this.apiCall('tools.list', { clientId });
                    await defsP;
                    if (this.aw.clientId !== clientId) return;                     // another file's list was asked for meanwhile
                    this.aw.listLoading = false;
                    if (!r.ok) { this.aw.listError = r.message; this.aw.list = []; this.awHandleDenied(r); return; }
                    this.aw.list = r.data.items; this.aw.listFor = clientId; this.aw.today = r.data.today;
                },
                awHandleDenied(r) {
                    // permissions may have changed during the session (e.g. role removed): re-read them from the server
                    if (r && r.status === 403 && r.code === 'FORBIDDEN') this.refreshPermissions();
                },
                async refreshPermissions() {
                    if (this.__permBusy) return; this.__permBusy = true;
                    const r = await this.apiCall('auth.me');
                    this.__permBusy = false;
                    if (r.ok && Array.isArray(r.data.permissions)) {
                        this.permissions = r.data.permissions;
                        if (!this.canAccessSpecialistData()) {
                            if (['s360', 'biopsychosocial', 'care_plan', 'specialist', 'history360'].includes(this.intakeActiveTab)) this.intakeActiveTab = 'presenting_issue';
                            this.a3ResetCase(); this.a3.meta = null;
                            if (this.aw.open) { this.aw.open = false; this.awDestroyDiagram(); }
                            if (this.il.open) this.ilClose();
                            this.il.catalog = null;
                            if (['assessments', 'family', 'ecosystem', 'careplan', 'tools'].includes(this.profileTab)) this.profileTab = 'timeline';
                            this.tl.data = null; this.tl.clientId = ''; if (this.profileTab === 'svc_timeline' && this.activeStudent) this.tlEnter();
                            this.ra.open = false; this.ra.data = null; this.rl.items = []; this.rl.open = 0; this.bp.data = null; this.bp.clientId = ''; if (this.profileTab === 'behavior' && this.activeStudent) this.bpEnter();
                            this.is.meta = null; this.is.pf = { clientId: '', loading: false, error: '', data: null }; if (this.profileTab === 'issp' && this.activeStudent) this.isProfileEnter(); if (this.is.pl.open) this.isReloadPlan(); if (this.is.fo.open) this.isLoadFolder();
                            this.showToast('สิทธิ์ของบัญชีมีการเปลี่ยนแปลง — แถบที่ 3–5 ไม่สามารถเข้าถึงได้แล้ว');
                        }
                    }
                },
                get awToolDefs() { return this.aw.defs ? this.aw.defs.tools : []; },
                get awDiagramDefs() { return this.aw.defs ? this.aw.defs.diagrams : []; },
                awDefOf(code) { const d = this.aw.defs; if (!d) return null; return d.tools.concat(d.diagrams).find(t => t.code === code) || null; },
                awItemsOf(code) { return this.aw.list.filter(x => x.toolCode === code); },
                awCard(code) {
                    const items = this.awItemsOf(code);
                    const finals = items.filter(x => x.status === 'final').sort((a, b) => String(b.assessedDate + b.finalizedAt).localeCompare(String(a.assessedDate + a.finalizedAt)));
                    const drafts = items.filter(x => x.status === 'draft').sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
                    const latest = items[0] || null;    // list is newest-first by updatedAt
                    let status = 'none', label = 'ยังไม่เริ่ม';
                    if (latest && latest.status === 'draft') { status = 'draft'; label = 'ฉบับร่าง'; }
                    else if (finals.length) { status = 'final'; label = 'บันทึกแล้ว'; }
                    return { items, finals, drafts, status, label, lastFinal: finals[0] || null, lastDraft: drafts[0] || null, lastDate: (finals[0] || drafts[0] || {}).assessedDate || '' };
                },
                awFmtDate(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? this.formatThaiDateDisplay(iso) : '-'; },
                awFmtTime(iso) { try { return iso ? new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) : '-'; } catch (e) { return '-'; } },
                awResultText(it) {
                    if (it && String(it.toolCode).indexOf('I:') === 0) return this.ilResultText(it);
                    const r = it && it.result;
                    if (!r) return it && it.counts && it.counts.nodes !== undefined ? (it.counts.nodes + ' โหนด • ' + it.counts.edges + ' เส้น') : '';
                    if (!r.complete) return 'ตอบแล้ว ' + r.answered + '/' + r.total + ' ข้อ';
                    if (it.toolCode === 'SDMA') return 'ระบุปัญหาทางสังคม ' + r.problemCount + ' หมวด';
                    if (it.toolCode === 'SSA') return 'ค่าเฉลี่ยรวม ' + Number(r.score).toFixed(2) + (r.band ? ' • ' + r.band.label.replace('มีทักษะทางสังคมและทักษะพื้นฐานการทำงานอยู่ใน', '') : '');
                    return r.score + ' คะแนน' + (r.band ? ' • ' + r.band.label : '');
                },
                awNewRequestId() { const a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256 | 0); return 'rq_' + Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); },

                /* ---- blank answers shaped for x-model ---- */
                awBlankField(f) {
                    if (f.type === 'single') return { v: '', detail: '' };
                    if (f.type === 'multi') return { values: [], details: {} };
                    if (f.type === 'grouped') return { selected: [], subs: {}, notes: {} };
                    return '';
                },
                awBlankAnswers(def, src) {
                    src = src ? JSON.parse(JSON.stringify(src)) : {};
                    const fill = (fields, obj) => {
                        fields.forEach(f => {
                            const b = this.awBlankField(f), v = obj[f.id];
                            if (v === undefined || v === null) obj[f.id] = b;
                            else if (typeof b === 'object') { obj[f.id] = Object.assign(b, v); if (f.type === 'grouped') { obj[f.id].subs = obj[f.id].subs || {}; obj[f.id].notes = obj[f.id].notes || {}; } if (f.type === 'multi') obj[f.id].details = obj[f.id].details || {}; }
                        });
                        return obj;
                    };
                    if (def.code === 'SDMA') { def.sections.forEach(s => fill(s.fields, src)); return src; }
                    src.extra = fill(def.extraFields || [], src.extra || {});
                    src.notes = fill(this.aw.commonNotes || [], src.notes || {});
                    if (def.code === 'FA') { src.items = src.items || {}; def.items.forEach(it => { const k = String(it.no); if (!src.items[k]) src.items[k] = it.mode === 'single' ? { v: null } : { values: [] }; }); }
                    else { src.scores = src.scores || {}; def.domains.forEach(d => d.items.forEach(it => { if (src.scores[it.id] === undefined) src.scores[it.id] = null; })); if (def.code === 'SSA' && src.comment === undefined) src.comment = ''; }
                    return src;
                },
                awSteps(def) {
                    def = def || this.aw.def; if (!def) return [];
                    if (def.code === 'SDMA') return def.sections.map(s => ({ id: s.id, title: s.title, system: s.source === 'system' })).concat([{ id: 'summary', title: 'สรุปและบันทึก' }]);
                    if (def.code === 'FA') return [{ id: 'info', title: 'ข้อมูลผู้ให้ข้อมูล' }, { id: 'items', title: 'ข้อคำถาม 10 ข้อ' }, { id: 'summary', title: 'ผลการประเมินและแผน' }];
                    if (def.code === 'SSA') return [{ id: 'info', title: 'ข้อมูลการประเมิน' }, { id: 'p1', title: '1. ทักษะพื้นฐานในการทำงาน' }, { id: 'p2', title: '2. ทักษะการปรับตัวทางสังคม' }, { id: 'summary', title: 'ผลการประเมินและข้อเสนอแนะ' }];
                    if (def.code === 'MSCA') return [{ id: 'info', title: 'ข้อมูลการประเมิน' }, { id: 'items', title: 'ข้อคำถาม 15 ข้อ' }, { id: 'summary', title: 'ผลการประเมินและแผน' }];
                    return [{ id: 'diagram', title: 'แผนภาพ' }];
                },
                get awStepId() { const s = this.awSteps()[this.aw.step]; return s ? s.id : ''; },
                awGo(i) { const n = this.awSteps().length; this.aw.step = Math.max(0, Math.min(n - 1, i)); this.$nextTick(() => { const b = this.$refs.awBody; if (b) b.scrollTo({ top: 0, behavior: 'smooth' }); }); },

                /* ---- open / start ---- */
                async awStart(code, opts) {
                    opts = opts || {};
                    if (!this.canRecordSpecialist()) { this.showToast('บัญชีของคุณดูผลได้ แต่ไม่มีสิทธิ์บันทึกการประเมิน'); return; }
                    await this.awEnsureDefs(); const def = this.awDefOf(code); if (!def) return;
                    const base = opts.from ? (opts.from.answers || null) : null;
                    this.awReset(def, null, false);
                    this.aw.supersedesId = opts.from ? opts.from.id : '';
                    this.aw.linkedAssessmentId = opts.linkedAssessmentId || '';
                    if (this.aw.isDiagram) this.aw.answers = { diagram: opts.from ? opts.from.diagram : this.awSeedDiagram(code) };
                    else this.aw.answers = this.awBlankAnswers(def, base);
                    this.aw.open = true;
                    if (this.aw.isDiagram) this.$nextTick(() => this.awMountDiagram());
                },
                awSeedDiagram(code) {
                    const st = this.students.find(s => s.id === this.aw.clientId);
                    if (code === 'ECOMAP') return { nodes: [{ id: 'client', label: st ? st.name : 'ผู้รับบริการ', category: 'client', isClient: true }], edges: [] };
                    return { nodes: [], edges: [] };
                },
                awReset(def, item, readOnly) {
                    Object.assign(this.aw, {
                        code: def.code, def, item, readOnly: !!readOnly, isDiagram: ['GENOGRAM', 'ECOMAP'].includes(def.code), step: 0, dirty: false, saving: false,
                        savedAt: '', error: '', errors: {}, confirmClose: false, confirmDiscard: false, requestId: '', expectedVersion: item ? item.version : null,
                        assessedDate: item ? item.assessedDate : (this.aw.today || this.todayISO()), linkedAssessmentId: item ? item.linkedAssessmentId : '', supersedesId: item ? item.supersedesId : '',
                        sel: null, connect: null, exportMsg: '', ssaOpen: { d1: true }, problemSearch: '', openGroups: {}
                    });
                },
                async awOpenItem(id, wantEdit) {
                    if (this.aw.loadingItem) return;
                    this.aw.loadingItem = true;
                    const r = await this.apiCall('tools.get', { id });
                    this.aw.loadingItem = false;
                    if (!r.ok) { this.showToast(r.message); this.awHandleDenied(r); return; }
                    await this.awEnsureDefs();
                    const it = r.data.item, def = this.awDefOf(it.toolCode); if (!def) return;
                    const ro = it.status === 'final' || !wantEdit || !this.can('edit_assessment');
                    this.awReset(def, it, ro);
                    this.aw.answers = this.aw.isDiagram ? { diagram: it.diagram } : this.awBlankAnswers(def, it.answers || {});
                    if (ro && !this.aw.isDiagram) this.aw.step = this.awSteps(def).length - 1;   // results first when only viewing
                    this.aw.open = true;
                    if (this.aw.isDiagram) this.$nextTick(() => this.awMountDiagram());
                },
                awRevise() { const it = this.aw.item; if (!it) return; const from = { id: it.id, answers: it.answers, diagram: it.diagram }; this.awDestroyDiagram(); this.awStart(it.toolCode, { from, linkedAssessmentId: it.linkedAssessmentId }); },
                awRequestClose() {
                    if (this.aw.dirty && !this.aw.readOnly) { this.aw.confirmClose = true; return; }
                    this.awClose();
                },
                awClose() { this.aw.open = false; this.aw.confirmClose = false; this.aw.dirty = false; this.awDestroyDiagram(); },

                /* ---- field helpers ---- */
                awShow(f) { if (!f.showIf) return true; const dep = this.aw.answers[f.showIf[0]]; return !!dep && dep.v === f.showIf[1]; },
                awErr(path) { return this.aw.errors[path] || ''; },
                awToggleMulti(obj, v, exclusive) {
                    v = String(v); const i = obj.values.indexOf(v);
                    if (i >= 0) obj.values.splice(i, 1);
                    else { if ((exclusive || []).includes(v)) obj.values.splice(0); else (exclusive || []).forEach(x => { const j = obj.values.indexOf(String(x)); if (j >= 0) obj.values.splice(j, 1); }); obj.values.push(v); }
                    this.aw.dirty = true;
                },
                awToggleGroup(obj, f, code) {
                    const i = obj.selected.indexOf(code);
                    if (i >= 0) obj.selected.splice(i, 1);
                    else { if ((f.exclusive || []).includes(code)) obj.selected.splice(0); else (f.exclusive || []).forEach(x => { const j = obj.selected.indexOf(x); if (j >= 0) obj.selected.splice(j, 1); }); obj.selected.push(code); this.aw.openGroups[f.id + code] = true; }
                    this.aw.dirty = true;
                },
                awToggleSub(obj, code, sub) {
                    const list = obj.subs[code] = obj.subs[code] || [];
                    const i = list.indexOf(sub); if (i >= 0) list.splice(i, 1); else list.push(sub);
                    if (!obj.selected.includes(code)) obj.selected.push(code);
                    this.aw.dirty = true;
                },
                awGroupsFiltered(f) {
                    const q = (this.aw.problemSearch || '').trim().toLowerCase();
                    if (!f.searchable || !q) return f.groups;
                    return f.groups.filter(g => (g.code + ' ' + g.label + ' ' + (g.definition || '') + ' ' + (g.subs || []).map(s => s.code + ' ' + s.label).join(' ')).toLowerCase().includes(q));
                },
                awFaToggle(no, v) {
                    const it = this.aw.def.items.find(x => x.no === no), a = this.aw.answers.items[String(no)];
                    if (it.mode === 'single') { a.v = a.v === v ? null : v; }
                    else { const i = a.values.indexOf(v); if (i >= 0) a.values.splice(i, 1); else { if (v === 0) a.values.splice(0); else { const z = a.values.indexOf(0); if (z >= 0) a.values.splice(z, 1); } a.values.push(v); } }
                    this.aw.dirty = true; delete this.aw.errors['items.' + no];
                },
                awFaChecked(no, v) { const a = this.aw.answers.items && this.aw.answers.items[String(no)]; if (!a) return false; return a.values ? a.values.includes(v) : a.v === v; },
                awSetScore(id, v) { if (this.aw.readOnly) return; this.aw.answers.scores[id] = v; this.aw.dirty = true; delete this.aw.errors['scores.' + id]; },
                awDomainItems(partNo) { const d = this.aw.def; if (!d || !d.domains) return []; return d.code === 'SSA' ? d.domains.filter(x => x.part === (partNo === 1 ? 'ทักษะพื้นฐานในการทำงาน' : 'ทักษะการปรับตัวทางสังคม')) : d.domains; },
                awAnsweredIn(domain) { return domain.items.filter(it => this.aw.answers.scores && this.aw.answers.scores[it.id]).length; },

                /* ---- live score (display mirror of Tools.gs scoreTool_) ---- */
                get awLive() {
                    const def = this.aw.def, a = this.aw.answers;
                    if (!def || this.aw.isDiagram || !a) return null;
                    const band = (bands, v) => bands.find(b => v >= b.min && v <= b.max) || null;
                    const r2 = x => Math.round(x * 100 + 1e-9) / 100;
                    if (def.code === 'FA') {
                        let total = 0, answered = 0; const per = def.items.map(it => { const x = a.items[String(it.no)]; let sc = null; if (it.mode === 'single' ? (x && x.v !== null && x.v !== undefined) : (x && x.values.length)) { answered++; sc = it.mode === 'single' ? x.v : x.values.filter(v => v !== 0).length; total += sc; } return { no: it.no, label: it.label, score: sc, max: it.max }; });
                        const res = { complete: answered === def.items.length, answered, total: def.items.length, items: per, sum: total };
                        if (res.complete) { let b = band(def.bands, total); res.aboveDocumentedRange = !b && total > def.bands[def.bands.length - 1].max; if (res.aboveDocumentedRange) b = def.bands[def.bands.length - 1]; res.score = total; res.band = b; res.ready = total >= def.readiness.cut; const min = Math.min(...per.map(p => p.score)); res.lowestItems = per.filter(p => p.score === min).map(p => p.no); res.itemsAscending = per.slice().sort((x, y) => (x.score / x.max) - (y.score / y.max) || x.no - y.no).map(p => p.no); }
                        return res;
                    }
                    if (def.code === 'SSA' || def.code === 'MSCA') {
                        let n = 0, all = 0, t = 0; const low = [];
                        const domains = def.domains.map(d => { let s = 0, c = 0; d.items.forEach(it => { const v = a.scores[it.id]; if (v) { s += v; c++; low.push({ id: it.id, score: v, label: it.label, domain: d.title }); } }); n += c; all += d.items.length; t += s; return { id: d.id, title: d.title, answered: c, total: d.items.length, sum: s, mean: c === d.items.length ? r2(s / c) : null, max: d.items.length * 5 }; });
                        const res = { complete: n === all, answered: n, total: all, domains };
                        if (res.complete) {
                            if (def.code === 'SSA') { res.score = r2(domains.reduce((s, d) => s + d.mean, 0) / domains.length); res.band = band(def.bands, res.score); res.passForWork = res.score >= 3.5; }
                            else { res.score = t; res.band = band(def.bands, t); res.followUp = t <= def.followRule.max ? def.followRule.text : ''; }
                            const minS = Math.min(...low.map(x => x.score)); res.lowest = low.filter(x => x.score === minS);
                        }
                        return res;
                    }
                    if (def.code === 'SDMA') { const p = a.problems; return { complete: !!(p && p.selected.length), problemCount: p ? p.selected.length : 0 }; }
                    return null;
                },
                awLabelOfItem(id) { const d = this.aw.def; for (const dm of (d.domains || [])) for (const it of dm.items) if (it.id === id) return dm.title + ' ข้อ ' + it.no + ': ' + it.label; return id; },

                /* ---- save ---- */
                awPayloadAnswers() {
                    const a = JSON.parse(JSON.stringify(this.aw.answers));
                    return a;
                },
                awClientValidate(status) {
                    const e = {}, def = this.aw.def;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.aw.assessedDate || '')) e.assessedDate = 'กรุณาระบุวันที่ประเมิน';
                    else if (this.aw.today && this.aw.assessedDate > this.aw.today) e.assessedDate = 'วันที่ประเมินต้องไม่อยู่ในอนาคต';
                    if (this.aw.isDiagram) {
                        const d = this.awDg ? this.awDg.getData() : { nodes: [], edges: [] };
                        d.edges.forEach((x, i) => { if (this.aw.code === 'ECOMAP' && x.type === 'strong' && !(x.note || '').trim()) e['edges.' + i] = 'เส้นความสัมพันธ์ที่เข้มแข็งต้องระบุข้อมูลยืนยัน'; });
                        if (status === 'final' && !d.nodes.filter(n => n.id !== 'client').length && this.aw.code === 'ECOMAP') e.nodes = 'ยังไม่มีระบบแวดล้อมในแผนภาพ';
                        if (status === 'final' && !d.nodes.length) e.nodes = 'ยังไม่มีข้อมูลในแผนภาพ';
                    } else if (status === 'final') {
                        const live = this.awLive;
                        if (def.code === 'SDMA' && !live.complete) e.problems = 'กรุณาระบุปัญหาทางสังคมอย่างน้อย 1 หมวด (หรือ 00 ไม่มีปัญหาสังคม) ก่อนบันทึกผล';
                        if (def.code !== 'SDMA' && !live.complete) {
                            e._form = 'ตอบยังไม่ครบ (' + live.answered + '/' + live.total + ' ข้อ) — บันทึกเป็นฉบับร่างได้ แต่บันทึกผลการประเมินต้องตอบครบทุกข้อ';
                            if (def.code === 'FA') def.items.forEach(it => { if (live.items[it.no - 1].score === null) e['items.' + it.no] = 'ยังไม่ได้ตอบ'; });
                            else def.domains.forEach(d => d.items.forEach(it => { if (!this.aw.answers.scores[it.id]) e['scores.' + it.id] = 'ยังไม่ได้ตอบ'; }));
                        }
                    }
                    if (def.code === 'FA') def.items.forEach(it => { const v = this.aw.answers.items[String(it.no)]; if (v && v.values && v.values.includes(0) && v.values.length > 1) e['items.' + it.no] = 'ตัวเลือก 0 เลือกร่วมกับตัวเลือกอื่นไม่ได้'; });
                    return e;
                },
                awFirstErrorStep(errors) {
                    const def = this.aw.def, steps = this.awSteps(), keys = Object.keys(errors);
                    if (!keys.length) return -1;
                    const k = keys[0];
                    if (k === 'assessedDate') return 0;
                    if (def.code === 'SDMA') { const fid = k.split('.')[0]; const si = def.sections.findIndex(s => s.fields.some(f => f.id === fid)); return si >= 0 ? si : steps.length - 1; }
                    if (k.startsWith('items.')) return 1;
                    if (k.startsWith('scores.')) { if (def.code === 'SSA') { const id = k.slice(7); return id.match(/^d[12]_/) ? 1 : 2; } return 1; }
                    if (k.startsWith('extra.')) return 0;
                    return this.aw.step;
                },
                async awSave(status) {
                    if (this.aw.saving || this.aw.readOnly) return;           // one request at a time — protects against double clicks
                    if (!this.canRecordSpecialist()) { this.aw.error = 'บัญชีของคุณไม่มีสิทธิ์บันทึกการประเมิน'; return; }
                    this.aw.error = '';
                    const ce = this.awClientValidate(status);
                    this.aw.errors = ce;
                    if (Object.keys(ce).length) {
                        this.aw.error = ce._form || 'กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือน';
                        const i = this.awFirstErrorStep(ce); if (i >= 0 && i !== this.aw.step && !this.aw.isDiagram) this.awGo(i);
                        return;
                    }
                    this.aw.saving = true;
                    if (!this.aw.requestId) this.aw.requestId = this.awNewRequestId();
                    const p = { clientId: this.aw.clientId, toolCode: this.aw.code, status, assessedDate: this.aw.assessedDate, requestId: this.aw.requestId,
                                linkedAssessmentId: this.aw.linkedAssessmentId || '', supersedesId: this.aw.supersedesId || '' };
                    if (this.aw.item) { p.id = this.aw.item.id; p.expectedVersion = this.aw.expectedVersion; }
                    if (this.aw.isDiagram) { const d = this.awDg.getData(); d.notes = this.aw.dgNotes || ''; p.diagram = d; }
                    else p.answers = this.awPayloadAnswers();
                    let r;
                    try { r = await this.apiCall('tools.save', p); }
                    finally { this.aw.saving = false; }
                    if (!r.ok) {
                        // the form keeps everything the user typed; only the error is shown
                        if (r.code !== 'NETWORK') this.aw.requestId = '';
                        this.aw.errors = r.fields || {};
                        this.aw.error = 'บันทึกไม่สำเร็จ: ' + r.message;
                        const i = this.awFirstErrorStep(this.aw.errors); if (i >= 0 && i !== this.aw.step && !this.aw.isDiagram) this.awGo(i);
                        this.awHandleDenied(r);
                        return;
                    }
                    const it = r.data.item;
                    this.aw.requestId = '';
                    this.aw.item = it; this.aw.expectedVersion = it.version; this.aw.dirty = false; this.aw.errors = {};
                    this.aw.supersedesId = it.supersedesId; this.aw.linkedAssessmentId = it.linkedAssessmentId;
                    this.aw.savedAt = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
                    if (!this.aw.isDiagram) this.aw.answers = this.awBlankAnswers(this.aw.def, it.answers || {});
                    const i = this.aw.list.findIndex(x => x.id === it.id);
                    const summary = Object.assign({}, it); delete summary.answers; delete summary.diagram;
                    if (i >= 0) this.aw.list.splice(i, 1);
                    this.aw.list.unshift(summary);
                    if (this.awDg) this.awDg.fit();
                    if (status === 'final') { this.aw.readOnly = true; if (this.awDg) this.awDg.setReadOnly(true); if (!this.aw.isDiagram) this.aw.step = this.awSteps().length - 1; }
                    this.showToast(status === 'final' ? '✅ บันทึกผลการประเมินแล้ว (แก้ไขภายหลังได้โดยสร้างฉบับใหม่)' : '💾 บันทึกฉบับร่างบนเซิร์ฟเวอร์แล้ว');
                },
                async awDiscard() {
                    const it = this.aw.item; if (!it || it.status !== 'draft') return;
                    if (!this.aw.confirmDiscard) { this.aw.confirmDiscard = true; return; }
                    const r = await this.apiCall('tools.discard', { id: it.id });
                    this.aw.confirmDiscard = false;
                    if (!r.ok) { this.aw.error = r.message; return; }
                    this.aw.list = this.aw.list.filter(x => x.id !== it.id);
                    this.aw.dirty = false; this.awClose();
                    this.showToast('ลบฉบับร่างแล้ว');
                },

                /* ---- diagrams ---- */
                awMountDiagram(tries) {
                    this.awDestroyDiagram();
                    const host = this.$refs.awDgHost;
                    if (!host || !window.TssDiagram) { if ((tries || 0) < 20 && this.aw.open) setTimeout(() => this.awMountDiagram((tries || 0) + 1), 40); return; }
                    const def = this.aw.def, d = this.aw.answers.diagram || { nodes: [], edges: [] };
                    const st = this.students.find(s => s.id === this.aw.clientId);
                    this.aw.dgNotes = d.notes || '';
                    window.__tssAwDg = TssDiagram.mount(host, {
                        kind: def.code, defs: def, data: d, readOnly: this.aw.readOnly, clientLabel: st ? st.name : 'ผู้รับบริการ', idSuffix: 'W',
                        onChange: () => { if (!this.aw.readOnly) this.aw.dirty = true; this.aw.dgRev++; this.awSyncSel(); },
                        onSelect: s => { this.aw.sel = s; this.awSyncSel(); },
                        onConnect: c => { this.aw.connect = c ? Object.assign({}, c) : null; },
                        onView: k => { this.aw.zoomPct = Math.round(k * 100); }
                    });
                    this.aw.dgRev++;
                },
                awDestroyDiagram() { if (window.__tssAwDg) { window.__tssAwDg.destroy(); window.__tssAwDg = null; } this.aw.sel = null; this.aw.selData = null; this.aw.connect = null; this.aw.dgRev++; },
                awSyncSel() {
                    const s = this.aw.sel; if (!s || !this.awDg) { this.aw.selData = null; return; }
                    const st = this.awDg.state, src = s.kind === 'node' ? st.nodes.find(n => n.id === s.id) : st.edges.find(e => e.id === s.id);
                    this.aw.selData = src ? JSON.parse(JSON.stringify(src)) : null;
                },
                awDgNodes() { this.aw.dgRev; return this.awDg ? this.awDg.state.nodes.slice() : []; },
                awDgEdges() { this.aw.dgRev; return this.awDg ? this.awDg.state.edges.slice() : []; },
                awDgLabel(id) { const n = this.awDg && this.awDg.state.nodes.find(x => x.id === id); return n ? n.label : '?'; },
                awDgEdgeLabel(t) { const d = this.aw.def; if (!d) return t; const all = (d.emotional || []).concat(d.structural || [], d.lines || []); const x = all.find(y => y.v === t); return x ? x.label : t; },
                awDgAdd() {
                    if (this.aw.readOnly) return;
                    if (this.aw.code === 'GENOGRAM') this.awDg.addNode({ label: 'สมาชิกใหม่', sex: 'unknown', generation: 0, household: null, relation: '' });
                    else this.awDg.addNode({ label: 'ระบบ/บุคคลใหม่', category: 'family' });
                },
                awDgUpdate(field, value) {
                    const s = this.aw.sel; if (!s || this.aw.readOnly) return;
                    const patch = {}; patch[field] = value;
                    if (s.kind === 'node') this.awDg.updateNode(s.id, patch); else this.awDg.updateEdge(s.id, patch);
                    this.awSyncSel();
                },
                awDgRemove() { const s = this.aw.sel; if (!s || this.aw.readOnly) return; if (s.kind === 'node') this.awDg.removeNode(s.id); else this.awDg.removeEdge(s.id); this.aw.sel = null; this.aw.selData = null; },
                awDgImportLegacy() {
                    // copy members recorded in the older list-based form as nodes only — relationships are NOT inferred
                    const id = this.aw.clientId; if (this.aw.readOnly || !this.awDg) return;
                    const isG = this.aw.code === 'GENOGRAM';
                    const src = isG ? (this.studentFamilyRecords[id] || []) : (this.studentEcomapRecords[id] || []);
                    if (!src.length) { this.showToast('ไม่พบข้อมูลรายการเดิมของผู้รับบริการรายนี้'); return; }
                    src.forEach(m => {
                        if (isG) this.awDg.addNode({ label: m.name || 'สมาชิก', relation: m.relation || '', ageInfo: m.ageInfo || '', sex: 'unknown', generation: 0, household: m.cohabiting === 'อยู่ร่วมบ้าน' ? true : (m.cohabiting ? false : null), note: [m.relationshipQuality ? 'ลักษณะความสัมพันธ์ (บันทึกเดิม): ' + m.relationshipQuality : '', m.note || ''].filter(Boolean).join(' • ') });
                        else this.awDg.addNode({ label: m.name || 'ระบบ', category: 'other', note: [m.systemType, m.strength, m.supportOrBarrier, m.note].filter(Boolean).join(' • ') });
                    });
                    this.showToast('นำเข้า ' + src.length + ' รายการเป็นโหนดแล้ว — กรุณาระบุเพศ/รุ่น/หมวด และเส้นความสัมพันธ์ด้วยตนเอง');
                },
                awDgMeta() {
                    const st = this.students.find(s => s.id === this.aw.clientId), it = this.aw.item, def = this.aw.def;
                    return { title: def.nameTh + (st ? ' — ' + st.name : ''), subtitle: 'วันที่ประเมิน ' + this.awFmtDate(this.aw.assessedDate) + ' • ผู้ประเมิน ' + (it ? it.assessorName : (this.authUser && this.authUser.fullName) || '') + ' • สถานะ ' + (it && it.status === 'final' ? 'บันทึกแล้ว' : 'ฉบับร่าง'),
                             footer: 'Case ID ' + this.aw.clientId + (it ? ' • Assessment ID ' + it.id : '') + ' • ข้อมูลลับ ใช้เพื่อการดูแลช่วยเหลือเท่านั้น • ' + (def.pages || '') };
                },
                async awDgExport(kind) {
                    if (!this.awDg) return;
                    this.aw.exportMsg = '';
                    try {
                        if (kind === 'png') { await this.awDg.exportPng(this.awDgMeta(), (this.aw.code === 'GENOGRAM' ? 'family-map' : 'ecomap') + '-' + this.aw.assessedDate + '.png'); this.aw.exportMsg = 'ดาวน์โหลด PNG แล้ว'; }
                        else { this.awDg.printPdf(this.awDgMeta()); this.aw.exportMsg = 'เปิดหน้าพิมพ์แล้ว — เลือก “บันทึกเป็น PDF” ในหน้าต่างพิมพ์'; }
                    } catch (e) { this.aw.exportMsg = 'ส่งออกไม่สำเร็จ กรุณาลองใหม่'; }
                },

                /* ---- profile: latest diagrams shown read-only ---- */
                // read-only diagram viewers in the client profile (also kept outside the reactive proxy)
                awLatest(code, finalOnly) { const items = this.awItemsOf(code).filter(x => !finalOnly || x.status === 'final'); return items[0] || null; },
                async awMountProfileDiagram(code, hostRef) {
                    const host = this.$refs[hostRef]; if (!host) return;
                    const P = window.__tssProfDg = window.__tssProfDg || {};
                    if (P[code]) { P[code].destroy(); delete P[code]; }
                    const latest = this.awLatest(code); if (!latest) { host.innerHTML = ''; return; }
                    const r = await this.apiCall('tools.get', { id: latest.id });
                    if (!r.ok || !window.TssDiagram) return;
                    P[code] = TssDiagram.mount(host, { kind: code, defs: this.awDefOf(code), data: r.data.item.diagram, readOnly: true, idSuffix: 'P' + code, clientLabel: this.activeStudent ? this.activeStudent.name : '' });
                    P[code].__item = r.data.item;
                    this.aw.profItem = Object.assign({}, this.aw.profItem || {}, { [code]: r.data.item });
                },
                async awProfileExport(code, kind) {
                    const g = (window.__tssProfDg || {})[code]; if (!g) return;
                    const it = g.__item, def = this.awDefOf(code);
                    const meta = { title: def.nameTh + (this.activeStudent ? ' — ' + this.activeStudent.name : ''), subtitle: 'วันที่ประเมิน ' + this.awFmtDate(it.assessedDate) + ' • ผู้ประเมิน ' + it.assessorName + ' • สถานะ ' + (it.status === 'final' ? 'บันทึกแล้ว' : 'ฉบับร่าง'), footer: 'Case ID ' + it.clientId + ' • Assessment ID ' + it.id + ' • ข้อมูลลับ ใช้เพื่อการดูแลช่วยเหลือเท่านั้น' };
                    try { if (kind === 'png') await g.exportPng(meta, (code === 'GENOGRAM' ? 'family-map' : 'ecomap') + '-' + it.assessedDate + '.png'); else g.printPdf(meta); } catch (e) { this.showToast('ส่งออกไม่สำเร็จ'); }
                },
                async awProfileEnter(tab) {
                    if (!this.activeStudent || !this.canAccessSpecialistData()) return;
                    await this.awLoadList(this.activeStudent.id);
                    if (tab === 'family') this.$nextTick(() => this.awMountProfileDiagram('GENOGRAM', 'profGeno'));
                    if (tab === 'ecosystem') this.$nextTick(() => this.awMountProfileDiagram('ECOMAP', 'profEco'));
                },
                async awOpenFromProfile(code, item, edit) {
                    this.aw.clientId = this.activeStudent.id;
                    if (item) await this.awOpenItem(item.id, edit); else await this.awStart(code);
                },
                // Role-Based Access Control (RBAC) for Specialist Mental Health Data
                canAccessSpecialistData() {
                    return this.can('view_assessment');   // decided by server-issued permissions, re-checked by the server
                },


                /* ===== profile log cards: sections, pins, risk badge ===== */
                profilePins: [],
                pinEdit: { logId: '', section: '', title: '', id: '', busy: false, error: '' },
                LOG_SECTIONS: [
                    { key: 'presenting', label: 'ปัญหาแรกรับ', icon: 'i-message-square', tone: 'background:#eef2f7;color:#1e3a5f', wide: false },
                    { key: 'bio', label: 'ชีวภาพ', icon: 'i-dna', tone: 'background:#e0f2fe;color:#075985' },
                    { key: 'psycho', label: 'จิตวิทยา', icon: 'i-brain', tone: 'background:#f3e8ff;color:#6b21a8' },
                    { key: 'social', label: 'สังคม', icon: 'i-users-round', tone: 'background:#fef3c7;color:#92400e' },
                    { key: 'plan', label: 'แผนช่วยเหลือ', icon: 'i-clipboard-list', tone: 'background:#dcfce7;color:#166534' },
                    { key: 'extra', label: 'เพิ่มเติม', icon: 'i-file-text', tone: 'background:#f1f5f9;color:#475569' }
                ],
                LOG_LABELS: { 'ปัญหาแรกรับ': 'presenting', 'ประเด็นปัญหาอื่นๆ': 'other', 'ชีวภาพ': 'bio', 'จิตวิทยา': 'psycho', 'สังคม': 'social', 'เครื่องมือ': 'tools', 'แผนช่วยเหลือ': 'plan', 'เพิ่มเติม': 'extra' },
                riskBadge(r) {
                    if (r === 'green') return { key: 'green', label: 'ปกติ (สีเขียว)', icon: 'i-circle-check' };
                    if (r === 'yellow') return { key: 'yellow', label: 'เฝ้าระวัง (สีเหลือง)', icon: 'i-triangle-alert' };
                    if (r === 'red') return { key: 'red', label: 'เร่งด่วน (สีแดง)', icon: 'i-siren' };
                    return { key: 'none', label: 'ไม่ได้ประเมินความเสี่ยง', icon: 'i-info' };
                },
                /** Split the stored summary note by its own “[label]: ” markers. Returns null when it cannot be split with confidence. */
                parseLogNote(note) {
                    note = String(note || '');
                    if (!note) return {};
                    const names = Object.keys(this.LOG_LABELS).join('|');
                    const segs = note.split(new RegExp(' \\| (?=\\[(?:' + names + ')\\]: )'));
                    const out = {};
                    for (const seg of segs) {
                        const m = new RegExp('^\\[(' + names + ')\\]: ([\\s\\S]*)$').exec(seg);
                        if (!m) return null;
                        const k = this.LOG_LABELS[m[1]];
                        if (out[k] !== undefined) return null;        // the same label twice: not a format we wrote
                        out[k] = m[2];
                    }
                    return out;
                },
                logSections(log) {
                    const parsed = this.parseLogNote(log.note);
                    const p = parsed || {};
                    const field = (k, alt) => typeof log[k] === 'string' && log[k].trim() ? log[k].trim() : (alt || '').trim();
                    const vals = {
                        presenting: field('presentingProblem', p.presenting),
                        bio: field('bioNote', p.bio), psycho: field('psychoNote', p.psycho), social: field('socialNote', p.social),
                        plan: field('carePlan', p.plan), extra: (p.extra || '').trim()
                    };
                    const out = [];
                    this.LOG_SECTIONS.forEach(d => {
                        let text = vals[d.key], unparsed = false;
                        if (d.key === 'extra' && !parsed && log.note) { text = String(log.note); unparsed = true; }   // shown as-is, never changed
                        if (!text) return;
                        const sec = Object.assign({}, d, { text, unparsed });
                        if (d.key === 'plan' && (log.followUpTopic || '').trim()) { sec.sub = log.followUpTopic.trim(); sec.subLabel = 'ประเด็นที่ต้องติดตาม'; }
                        out.push(sec);
                    });
                    const filled = out.filter(x => x.key !== 'extra').length;
                    out.forEach(x => { x.wide = x.unparsed || (x.key === 'presenting' && filled <= 2) || x.key === 'extra'; });
                    return out;
                },
                logSectionLabel(k) { const d = this.LOG_SECTIONS.find(x => x.key === k); return d ? d.label : k; },
                logTools(log) {
                    if (Array.isArray(log.tools) && log.tools.length) return log.tools;
                    const p = this.parseLogNote(log.note); return p && p.tools ? p.tools.split(', ').filter(Boolean) : [];
                },
                logOtherIssue(log) {
                    if ((log.otherIssueText || '').trim()) return log.otherIssueText.trim();
                    const p = this.parseLogNote(log.note); return p && p.other ? p.other : '';
                },
                pinsOfLog(logId) { return (this.profilePins || []).filter(x => x.logId === logId); },
                pinOf(logId, section) { return (this.profilePins || []).find(x => x.logId === logId && x.section === section) || null; },
                canPinSection(section) {
                    if (!this.can('edit_case')) return false;
                    return ['bio', 'psycho', 'social', 'plan'].includes(section) ? this.canRecordSpecialist() : true;
                },
                startPin(log, section) {
                    const ex = this.pinOf(log.id, section);
                    this.pinEdit = { logId: log.id, section, title: ex ? ex.title : '', id: ex ? ex.id : '', busy: false, error: '' };
                },
                async savePin() {
                    const e = this.pinEdit; if (e.busy) return;
                    if (!e.title.trim()) { e.error = 'กรุณาตั้งชื่อประเด็นที่ต้องการปักหมุด'; return; }
                    e.busy = true; e.error = '';
                    const r = await this.apiCall('pins.save', { clientId: this.activeStudent.id, logId: e.logId, section: e.section, title: e.title.trim(), id: e.id || '' });
                    e.busy = false;
                    if (!r.ok) { e.error = 'บันทึกหมุดไม่สำเร็จ: ' + r.message; this.awHandleDenied(r); return; }
                    this.profilePins = r.data.pins; this.pinEdit = { logId: '', section: '', title: '', id: '', busy: false, error: '' };
                    this.showToast('ปักหมุดประเด็นแล้ว');
                },
                async removePin() {
                    const e = this.pinEdit; if (e.busy || !e.id) return;
                    e.busy = true;
                    const r = await this.apiCall('pins.remove', { id: e.id });
                    e.busy = false;
                    if (!r.ok) { e.error = 'ยกเลิกหมุดไม่สำเร็จ: ' + r.message; return; }
                    this.profilePins = r.data.pins; this.pinEdit = { logId: '', section: '', title: '', id: '', busy: false, error: '' };
                    this.showToast('ยกเลิกการปักหมุดแล้ว');
                },
                flashLogSection(logId, section) {
                    const el = document.getElementById('log-' + logId + '-' + section); if (!el) return;
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 1600);
                },
                get profileToolCount() {
                    if (!this.activeStudent || this.aw.listFor !== this.activeStudent.id) return null;
                    return this.aw.list.filter(x => ['SDMA', 'FA', 'SSA', 'MSCA'].includes(x.toolCode)).length;
                },
                get radarLatest() {
                    return (this.activeStudentLogs || []).find(l => typeof l.bioScore === 'number' && typeof l.psychoScore === 'number' && typeof l.socialScore === 'number') || null;
                },
                get currentSelectedStudentLabel() {
                    if (this.isCreatingNewStudentInCase) {
                        return this.newStudentIntake.name ? `• ผู้รับบริการใหม่: ${this.newStudentIntake.name}` : '• กำลังเพิ่มผู้รับบริการใหม่';
                    }
                    const s = this.students.find(item => item.id == this.formStudentId);
                    return s ? `• [ID-${s.id}] ${s.name} (ชั้น ${s.grade})` : '• ยังไม่ได้เลือกผู้รับบริการ';
                },

                // 3.1 ST-5 Scoring Engine
                get st5Evaluation() {
                    const ans = this.specialistForm.st5Answers || [];
                    const answered = ans.filter(v => v !== null && v !== undefined);
                    if (answered.length < 5) {
                        return { answeredCount: answered.length, isComplete: false, totalScore: null, interpretation: 'ยังประเมินไม่ครบ', severityLevel: 'pending' };
                    }
                    const total = answered.reduce((a, b) => a + Number(b), 0);
                    let interp = 'ความเครียดน้อย (0–4 คะแนน)';
                    let sev = 'green';
                    if (total >= 10) {
                        interp = 'ความเครียดมากที่สุด (10–15 คะแนน) — ควรได้รับการดูแลช่วยเหลือจากผู้เชี่ยวชาญ';
                        sev = 'red';
                    } else if (total >= 8) {
                        interp = 'ความเครียดมาก (8–9 คะแนน) — ควรได้รับคำปรึกษาเพื่อคลายความเครียด';
                        sev = 'yellow';
                    } else if (total >= 5) {
                        interp = 'ความเครียดปานกลาง (5–7 คะแนน) — ควรจัดการความเครียดและผ่อนคลาย';
                        sev = 'yellow';
                    }
                    return { answeredCount: 5, isComplete: true, totalScore: total, interpretation: interp, severityLevel: sev };
                },

                // 3.2 GAD-7 Scoring Engine
                get gad7Evaluation() {
                    const ans = this.specialistForm.gad7Answers || [];
                    const answered = ans.filter(v => v !== null && v !== undefined);
                    if (answered.length < 7) {
                        return { answeredCount: answered.length, isComplete: false, totalScore: null, interpretation: 'ยังประเมินไม่ครบ', severityLevel: 'pending' };
                    }
                    const total = answered.reduce((a, b) => a + Number(b), 0);
                    let interp = 'ความวิตกกังวลอยู่ในเกณฑ์น้อย/ปกติ (0–4 คะแนน)';
                    let sev = 'green';
                    if (total >= 15) {
                        interp = 'ภาวะวิตกกังวลระดับรุนแรง (15–21 คะแนน) — ผลคัดกรองเบื้องต้น ควรได้รับการประเมินโดยผู้เชี่ยวชาญ';
                        sev = 'red';
                    } else if (total >= 10) {
                        interp = 'ภาวะวิตกกังวลระดับปานกลาง (10–14 คะแนน) — ผลคัดกรองเบื้องต้น ควรพิจารณาประเมินเพิ่มเติม';
                        sev = 'yellow';
                    } else if (total >= 5) {
                        interp = 'ภาวะวิตกกังวลระดับเล็กน้อย (5–9 คะแนน) — ติดตามเฝ้าระวัง';
                        sev = 'yellow';
                    }
                    return { answeredCount: 7, isComplete: true, totalScore: total, interpretation: interp, severityLevel: sev };
                },

                // 3.3 SDQ Scoring Engine (Separate Cutoffs for Student Self-Report vs Parent/Teacher)
                get sdqEvaluation() {
                    const ans = this.specialistForm.sdqAnswers || [];
                    const answered = ans.filter(v => v !== null && v !== undefined);
                    if (answered.length < 25) {
                        return { answeredCount: answered.length, isComplete: false, totalDifficulties: null, totalInterpretation: 'ยังประเมินไม่ครบ', subscales: [] };
                    }
                    const domainScores = { emotional: 0, conduct: 0, hyperactivity: 0, peer: 0, prosocial: 0 };
                    this.sdqItems.forEach((item, idx) => {
                        const rawVal = Number(ans[idx]);
                        const scoredVal = item.reverse ? (2 - rawVal) : rawVal;
                        domainScores[item.domain] += scoredVal;
                    });
                    const totalDiff = domainScores.emotional + domainScores.conduct + domainScores.hyperactivity + domainScores.peer;
                    const informant = this.specialistForm.sdqInformantVersion || 'student';

                    // Thai Department of Mental Health Cut-off Norms by Informant
                    const evalDomain = (domain, score) => {
                        if (domain === 'prosocial') {
                            return score >= 6 ? 'ปกติ (จุดแข็ง)' : (score === 5 ? 'คาบเส้น' : 'ควรส่งเสริมเพิ่มเติม');
                        }
                        if (informant === 'student') {
                            if (domain === 'emotional') return score <= 5 ? 'ปกติ' : (score === 6 ? 'เสี่ยง' : 'มีปัญหา');
                            if (domain === 'conduct') return score <= 4 ? 'ปกติ' : (score === 5 ? 'เสี่ยง' : 'มีปัญหา');
                            if (domain === 'hyperactivity') return score <= 5 ? 'ปกติ' : (score === 6 ? 'เสี่ยง' : 'มีปัญหา');
                            if (domain === 'peer') return score <= 3 ? 'ปกติ' : (score <= 5 ? 'เสี่ยง' : 'มีปัญหา');
                        } else {
                            if (domain === 'emotional') return score <= 3 ? 'ปกติ' : (score === 4 ? 'เสี่ยง' : 'มีปัญหา');
                            if (domain === 'conduct') return score <= 3 ? 'ปกติ' : (score === 4 ? 'เสี่ยง' : 'มีปัญหา');
                            if (domain === 'hyperactivity') return score <= 5 ? 'ปกติ' : (score === 6 ? 'เสี่ยง' : 'มีปัญหา');
                            if (domain === 'peer') return score <= 5 ? 'ปกติ' : (score === 6 ? 'เสี่ยง' : 'มีปัญหา');
                        }
                        return 'ปกติ';
                    };

                    let totalInterp = 'ปกติ';
                    let sev = 'green';
                    if (informant === 'student') {
                        if (totalDiff >= 19) { totalInterp = 'มีปัญหา (19–40 คะแนน)'; sev = 'red'; }
                        else if (totalDiff >= 17) { totalInterp = 'เสี่ยง (17–18 คะแนน)'; sev = 'yellow'; }
                        else { totalInterp = 'ปกติ (0–16 คะแนน)'; sev = 'green'; }
                    } else {
                        if (totalDiff >= 17) { totalInterp = 'มีปัญหา (17–40 คะแนน)'; sev = 'red'; }
                        else if (totalDiff >= 15) { totalInterp = 'เสี่ยง (15–16 คะแนน)'; sev = 'yellow'; }
                        else { totalInterp = 'ปกติ (0–14 คะแนน)'; sev = 'green'; }
                    }

                    const subscales = [
                        { label: '1. ด้านอารมณ์', score: domainScores.emotional, result: evalDomain('emotional', domainScores.emotional) },
                        { label: '2. ด้านความประพฤติ', score: domainScores.conduct, result: evalDomain('conduct', domainScores.conduct) },
                        { label: '3. อยู่ไม่นิ่ง/สมาธิสั้น', score: domainScores.hyperactivity, result: evalDomain('hyperactivity', domainScores.hyperactivity) },
                        { label: '4. ความสัมพันธ์กับเพื่อน', score: domainScores.peer, result: evalDomain('peer', domainScores.peer) },
                        { label: '5. สัมพันธภาพทางสังคม (จุดแข็ง)', score: domainScores.prosocial, result: evalDomain('prosocial', domainScores.prosocial) }
                    ];

                    return { answeredCount: 25, isComplete: true, totalDifficulties: totalDiff, totalInterpretation: totalInterp, severityLevel: sev, subscales };
                },

                addFamilyMemberToIntake() {
                    if (!this.newFamilyMemberDraft.name.trim() || !this.newFamilyMemberDraft.relation.trim()) return;
                    this.specialistForm.familyMembers.push({ ...this.newFamilyMemberDraft });
                    this.newFamilyMemberDraft = { name: '', relation: '', ageInfo: '', cohabiting: 'อยู่ร่วมบ้าน', relationshipQuality: '' };
                    this.isCaseFormDirty = true;
                },

                addEcomapNodeToIntake() {
                    if (!this.newEcomapDraft.name.trim()) return;
                    this.specialistForm.ecomapNodes.push({ ...this.newEcomapDraft, note: this.newEcomapDraft.supportOrBarrier });
                    this.newEcomapDraft = { systemType: 'ครอบครัว', name: '', strength: '', supportOrBarrier: '', recordType: 'fact' };
                    this.isCaseFormDirty = true;
                },

                caseDraftSafeFields() {
                    const f = this.caseForm, keep = ['grade', 'advisor', 'serviceDateISO', 'presentingProblem', 'issueCategories', 'otherIssueText', 'selectedTools', 'customToolsText'];
                    const out = {}; keep.forEach(k => { out[k] = Array.isArray(f[k]) ? [...f[k]] : f[k]; }); return out;
                },
                saveCaseDraft() {
                    try {
                        const payload = {
                            savedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                            formStudentId: this.formStudentId,
                            selectedClientType: this.selectedClientType,
                            caseForm: this.caseDraftSafeFields(),
                            formNote: this.formNote,
                            isCreatingNewStudentInCase: this.isCreatingNewStudentInCase,
                            newStudentIntake: this.newStudentIntake
                        };
                        sessionStorage.setItem(this.caseDraftKey(), JSON.stringify(payload));
                        this.caseDraftSavedAt = payload.savedAt + ' น.';
                        this.isCaseFormDirty = false;
                        this.showToast('💾 บันทึกร่างแถบที่ 1–2 ไว้ในแท็บนี้แล้ว (ข้อมูลแถบที่ 3–5 ไม่ถูกเก็บในเบราว์เซอร์ • ร่างจะถูกลบเมื่อออกจากระบบหรือปิดแท็บ)');
                    } catch (e) {
                        this.showToast('⚠️ ไม่สามารถบันทึกร่างได้');
                    }
                },

                /* ================= UX layer: welcome window, expandable toolbar, case-form helpers ================= */
                welcome: { open: false, greeting: '', name: '', roles: [], tips: [] },

                uxInit() {
                    // legacy: an earlier version kept case drafts in localStorage (shared, never cleared) — remove them
                    try { localStorage.removeItem('tss_case_intake_draft'); } catch (e) {}
                    // Alpine rejects an internal promise when a show/hide transition is interrupted (e.g. a banner inside a
                    // dialog that is closing). It is expected and harmless, so keep it out of the console as an "uncaught" error.
                    window.addEventListener('unhandledrejection', (e) => { if (e.reason && e.reason.isFromCancelledTransition) e.preventDefault(); });
                    this.stickyInit();
                    window.addEventListener('resize', () => { if (this.currentTab === 'docs' || this.dh.detail.open) this.dwFit(); });
                    this.$watch(() => JSON.stringify([this.fb.f, this.fb.donutCol, this.fb.distCol]), () => { this.fb.page = 1; this.$nextTick(() => this.fbRenderCharts()); });
                    this.$watch('currentTab', tab => { if (tab === 'feedback' && this.fb.loaded) this.$nextTick(() => this.fbRenderCharts()); });
                    // other staff may approve requests or change appointments: re-read when the page is shown again after a while
                    this.$watch('currentTab', tab => { if (tab === 'dashboard' || tab === 'appointments') this.rqStaleRefresh(); });
                    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.rqStaleRefresh(); });
                    window.addEventListener('beforeunload', (e) => {
                        if (this.__leaving || !this.isLoggedIn || !((this.bf.open && this.bf.dirty && !this.bf.result) || (this.showNewLogModal && this.isCaseFormDirty) || (this.aw.open && this.aw.dirty && !this.aw.readOnly) || (this.dw.dirty && this.dw.data && !this.dw.readOnly) || (this.showNewLogModal && this.a3Dirty()))) return;
                        e.preventDefault(); e.returnValue = '';
                    });
                },

                /* ---- sticky elements: one capture-phase scroll listener + one ResizeObserver, bound once ---- */
                stickyInit() {
                    if (window.__tssSticky) return;
                    window.__tssSticky = true;
                    const pending = new Set();
                    let frame = 0;
                    const scrollParent = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n; } return document.scrollingElement; };
                    const update = (root) => {
                        const isDoc = root === document.scrollingElement;
                        const rootTop = isDoc ? 0 : root.getBoundingClientRect().top;
                        if (root.hasAttribute && root.hasAttribute('data-scroll-shadow')) root.classList.toggle('is-scrolled', root.scrollTop > 2);
                        (isDoc ? document : root).querySelectorAll('[data-sticky]').forEach(el => {
                            if (!el.offsetParent || scrollParent(el) !== root) return;
                            const top = parseFloat(getComputedStyle(el).top) || 0;
                            el.classList.toggle('is-stuck', root.scrollTop > 2 && el.getBoundingClientRect().top - rootTop <= top + 1);
                        });
                    };
                    document.addEventListener('scroll', (e) => {
                        pending.add(e.target === document ? document.scrollingElement : e.target);
                        if (!frame) frame = requestAnimationFrame(() => { frame = 0; pending.forEach(r => r && update(r)); pending.clear(); });
                    }, { capture: true, passive: true });
                    // keep each page's own scroll position when switching pages
                    const tabScroll = {};
                    // the new page may still be laying out, so retry briefly until the saved position can be reached
                    const restore = (y, tries) => { window.scrollTo({ top: y }); if (Math.abs(window.scrollY - y) > 2 && tries > 0) setTimeout(() => restore(y, tries - 1), 80); };
                    this.$watch('currentTab', (n, o) => { tabScroll[o] = window.scrollY; this.$nextTick(() => restore(tabScroll[n] || 0, 8)); });
                },
                /* ---- welcome window ---- */
                openWelcome() {
                    const u = this.authUser || {};
                    let h = new Date().getHours();
                    try { h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Bangkok' }).format(new Date())); } catch (e) {}
                    const greeting = h < 12 ? 'สวัสดีตอนเช้า' : (h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น');
                    const tips = [];
                    if (this.can('create_case')) tips.push({ icon: 'i-plus', text: 'บันทึกเคสใหม่ได้จากปุ่ม + ที่มุมขวาล่างของหน้าจอ' });
                    if (this.can('view_case')) tips.push({ icon: 'i-users-round', text: this.can('view_all_cases') ? 'คุณดูแฟ้มผู้รับบริการได้ทุกรายตามสิทธิ์หัวหน้างาน' : this.can('read_all_cases') ? 'บันทึกได้ในเคสที่ได้รับมอบหมาย และเปิดอ่านแฟ้มนักเรียนคนอื่นได้แบบอ่านอย่างเดียว' : 'คุณจะเห็นเฉพาะผู้รับบริการที่ได้รับมอบหมายให้ดูแล' });
                    if (this.can('manage_users')) tips.push({ icon: 'i-shield-check', text: 'จัดการบัญชีผู้ใช้ สิทธิ์ และดู Audit Log ได้จากเมนู “บัญชีและการดูแลระบบ”' });
                    if (this.can('create_assessment')) tips.push({ icon: 'i-clipboard-check', text: 'แถบที่ 5 “เครื่องมือการประเมินเพิ่มเติม”: S.D.M.A., F.A., S.S.A., M.S.C.A. แผนผังครอบครัว และ Ecomap' });
                    if (this.can('view_reports')) tips.push({ icon: 'i-clipboard-list', text: 'ดูรายงานสรุปได้จากเมนูรายงานข้อมูล' });
                    this.welcome = { open: true, greeting, name: u.fullName || this.username || 'ผู้ใช้งาน', roles: (u.roleLabels || []).slice(0, 4), tips: tips.slice(0, 3) };
                    this.$nextTick(() => setTimeout(() => { if (this.welcome.open && this.$refs.welcomeStart) this.$refs.welcomeStart.focus({ preventScroll: true }); }, 50));
                },
                closeWelcome() {
                    if (!this.welcome.open) return;
                    this.welcome.open = false;
                    this.$nextTick(() => { const m = this.$refs.mainContent; if (m) m.focus({ preventScroll: true }); });
                },
                welcomeTrap(e) {
                    const items = [...this.$refs.welcomeCard.querySelectorAll('button')];
                    if (!items.length) return;
                    const first = items[0], last = items[items.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                },

                /* ---- expandable toolbar ---- */

                /* ---- case form: steps, progress, validation feedback (rules themselves are unchanged in submitNewLogCore) ---- */
                get caseSteps() {
                    const f = this.caseForm || {};
                    const who = this.isCreatingNewStudentInCase ? !!(this.newStudentIntake.name || '').trim() : !!this.students.find(x => x.id == this.formStudentId);
                    const otherOk = !(f.issueCategories || []).includes(this.otherIssueCategory) || !!(f.otherIssueText || '').trim();
                    const steps = [
                        { key: 'client_info', label: 'ข้อมูลผู้รับบริการ', icon: 'i-user-round', done: who && !!f.grade && !!f.advisor && !!f.serviceDateISO },
                        { key: 'presenting_issue', label: 'การให้บริการและประเด็นปัญหา', icon: 'i-message-square', done: !!(f.presentingProblem || '').trim() && (f.issueCategories || []).length > 0 && otherOk }
                    ];
                    // tabs 3–5 exist only for the four professions (server permissions); the server enforces the same rule
                    if (this.canAccessSpecialistData()) steps.push(
                        { key: 's360', label: 'การประเมินนักเรียน 360°', icon: 'i-radar', done: false, optional: true, status: this.a3TabStatus('s360') },
                        { key: 'biopsychosocial', label: 'ชีวจิตสังคมและความเสี่ยง', icon: 'i-brain', done: !!this.isRiskAssessmentComplete, status: this.a3TabStatus('biopsychosocial') },
                        { key: 'care_plan', label: 'แผนช่วยเหลือและติดตาม', icon: 'i-clipboard-list', done: !!(f.carePlan || '').trim(), status: this.a3TabStatus('care_plan') },
                        { key: 'specialist', label: 'เครื่องมือการประเมินเพิ่มเติม', done: false, optional: true, icon: 'i-clipboard-check' },
                        { key: 'history360', label: 'ประวัติการประเมินและติดตามผล', icon: 'i-history', done: false, optional: true }
                    );
                    return steps;
                },
                get caseRequiredTotal() { return this.caseSteps.filter(x => !x.optional).length; },
                get caseStepIndex() { return Math.max(0, this.caseSteps.findIndex(x => x.key === this.intakeActiveTab)); },
                get caseRequiredDone() { return this.caseSteps.filter(x => !x.optional && x.done).length; },
                caseGo(delta) {
                    const i = Math.min(this.caseSteps.length - 1, Math.max(0, this.caseStepIndex + delta));
                    this.caseTabGo(this.caseSteps[i].key);
                },
                async submitNewLog() {
                    if (this.isSubmittingCase) return;
                    if (this.a3Dirty()) {     // saving the case log closes the form: separately-saved sections must be saved (or cleared) first
                        const sec = this.a3.s360.dirty ? 's360' : this.a3.bps.dirty ? 'biopsychosocial' : 'care_plan';
                        this.caseFormValidationError = '⚠️ ส่วนที่บันทึกแยก (การประเมิน 360° / ประเด็นชีวจิตสังคมรายหัวข้อ / แผนช่วยเหลือ) ยังไม่ได้บันทึก — กดบันทึกในส่วนนั้นก่อน หรือล้างการแก้ไข แล้วจึงบันทึกเคส';
                        this.intakeActiveTab = sec;
                        this.$nextTick(() => { const b = this.$refs.caseScroll; if (b) b.scrollTo({ top: 0, behavior: this.a3Motion() }); });
                        return;
                    }
                    await this.submitNewLogCore();
                    if (this.caseFormValidationError && this.showNewLogModal) {
                        this.caseShowErrors = true;
                        this.$nextTick(() => {
                            const b = this.$refs.caseScroll; if (b) b.scrollTo({ top: 0, behavior: 'smooth' });
                            const panel = b && [...b.querySelectorAll('[data-step]')].find(el => el.dataset.step === this.intakeActiveTab);
                            const bad = panel && panel.querySelector('[required]:invalid');
                            if (bad) setTimeout(() => bad.focus({ preventScroll: true }), 250);
                        });
                    } else if (!this.showNewLogModal) {
                        this.caseShowErrors = false;
                        this.clearCaseDrafts();       // saved on the server — the local draft is no longer needed
                    }
                },

                /* ---- drafts: kept per user, in this browser tab only (sessionStorage), cleared on sign-out ---- */
                caseDraftKey() { return 'tss_case_intake_draft::' + ((this.authUser && this.authUser.id) || 'anon'); },
                clearCaseDrafts() {
                    try { Object.keys(sessionStorage).filter(k => k.indexOf('tss_case_intake_draft') === 0).forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
                    this.caseDraftOffer = null;
                },
                checkCaseDraft() {
                    this.caseDraftOffer = null;
                    try {
                        const d = JSON.parse(sessionStorage.getItem(this.caseDraftKey()) || 'null');
                        if (!d || !d.caseForm) return;
                        if (this.formStudentId && d.formStudentId && String(d.formStudentId) !== String(this.formStudentId)) return;
                        const st = this.students.find(x => x.id == d.formStudentId);
                        d.who = d.isCreatingNewStudentInCase ? ((d.newStudentIntake && d.newStudentIntake.name) || 'นักเรียนใหม่') : (st ? st.name : 'ยังไม่ได้เลือกผู้รับบริการ');
                        this.caseDraftOffer = d;
                    } catch (e) {}
                },
                restoreCaseDraft() {
                    const d = this.caseDraftOffer; if (!d) return;
                    this.formStudentId = d.formStudentId || '';
                    if (d.selectedClientType) this.selectedClientType = d.selectedClientType;
                    this.caseForm = Object.assign({}, this.caseForm, d.caseForm);
                    if (typeof d.formNote === 'string') this.formNote = d.formNote;
                    if (d.newStudentIntake) this.newStudentIntake = Object.assign({}, this.newStudentIntake, d.newStudentIntake);
                    this.isCreatingNewStudentInCase = !!d.isCreatingNewStudentInCase;
                    this.caseDraftSavedAt = d.savedAt ? d.savedAt + ' น.' : '';
                    this.caseDraftOffer = null;
                    this.isCaseFormDirty = false;
                    this.showToast('กู้คืนร่างที่บันทึกไว้แล้ว');
                },
                discardCaseDraft() {
                    try { sessionStorage.removeItem(this.caseDraftKey()); } catch (e) {}
                    this.caseDraftOffer = null;
                },

                attemptCloseFullScreenIntake() {
                    if (this.a3Dirty()) { this.a3.leaveAsk = '__close'; return; }
                    if (this.isCaseFormDirty) {
                        this.showUnsavedExitConfirm = true;
                    } else {
                        this.showNewLogModal = false;
                    }
                },

                get activeStudentAssessments() {
                    if (!this.activeStudent || !this.canAccessSpecialistData()) return [];
                    return this.mentalHealthAssessments[this.activeStudent.id] || [];
                },

                get filteredActiveStudentAssessments() {
                    const list = this.activeStudentAssessments;
                    if (this.profileAssessmentFilterTool === 'all') return list;
                    return list.filter(a => a.toolCode === this.profileAssessmentFilterTool);
                },

                get activeStudentFamilyMembers() {
                    if (!this.activeStudent) return [];
                    return this.studentFamilyRecords[this.activeStudent.id] || [];
                },

                get activeStudentEcomapItems() {
                    if (!this.activeStudent) return [];
                    return this.studentEcomapRecords[this.activeStudent.id] || [];
                },

                get activeStudentAppointmentsHistory() {
                    if (!this.activeStudent) return [];
                    return this.appointments.filter(a => a.clientId === this.activeStudent.id);
                },

                newStudentIntake: {
                    name: '',
                    nickname: '',
                    gender: 'ไม่ระบุ',
                    birthDateISO: '',
                    phone: '',
                    parentName: ''
                },

                caseForm: {
                    grade: '',
                    advisor: '',
                    serviceDateISO: '2026-10-26',
                    presentingProblem: '',
                    issueCategories: [],
                    bioNote: '',
                    psychoNote: '',
                    socialNote: '',
                    selectedTools: [],
                    customToolsText: '',
                    bioScore: null,
                    psychoScore: null,
                    socialScore: null,
                    carePlan: '',
                    followUpTopic: '',
                    scheduleNextAppointment: false,
                    nextApptDateISO: '',
                    nextApptStartTime: '10:00',
                    nextApptEndTime: '11:00',
                    nextApptCounselor: '',
                    nextApptNote: ''
                },

                get filteredStudentsForIntake() {
                    const q = (this.caseStudentSearchQuery || '').trim().toLowerCase();
                    if (!q) return this.students;
                    return this.students.filter(s =>
                        s.name.toLowerCase().includes(q) ||
                        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
                        s.grade.toLowerCase().includes(q)
                    );
                },

                get filteredIssueCategoriesList() {
                    const q = (this.issueCategorySearch || '').trim().toLowerCase();
                    if (!q) return this.officialIssueCategories;
                    return this.officialIssueCategories.filter(c => c.toLowerCase().includes(q));
                },

                onSelectStudentForCase() {
                    const found = this.students.find(s => s.id == this.formStudentId);
                    if (found) {
                        this.caseForm.grade = found.grade || '';
                        this.caseForm.advisor = found.advisor || this.advisorTeachersList[0];
                    }
                },

                get isRiskAssessmentComplete() {
                    return (
                        typeof this.caseForm.bioScore === 'number' && this.caseForm.bioScore >= 1 &&
                        typeof this.caseForm.psychoScore === 'number' && this.caseForm.psychoScore >= 1 &&
                        typeof this.caseForm.socialScore === 'number' && this.caseForm.socialScore >= 1
                    );
                },

                // Requirement 4.5: Use unrounded average to determine risk level at boundaries
                get calculatedRiskResult() {
                    if (!this.isRiskAssessmentComplete) {
                        return { rawAvg: null, formattedAvg: '-', level: 'pending', label: 'รอประเมินครบ' };
                    }
                    const rawAvg = (this.caseForm.bioScore + this.caseForm.psychoScore + this.caseForm.socialScore) / 3;
                    const formattedAvg = (Math.round(rawAvg * 10) / 10).toFixed(1);
                    let level = 'green';
                    let label = 'ปกติ — สีเขียว (0–4 คะแนน)';
                    if (rawAvg > 7) {
                        level = 'red';
                        label = 'เร่งด่วน — สีแดง (>7–10 คะแนน)';
                    } else if (rawAvg > 4) {
                        level = 'yellow';
                        label = 'เฝ้าระวัง — สีเหลือง (>4–7 คะแนน)';
                    }
                    return { rawAvg, formattedAvg, level, label };
                },

                getSingleScoreLabel(score) {
                    if (!score) return 'รอประเมิน';
                    if (score <= 4) return 'ปกติ';
                    if (score <= 7) return 'เฝ้าระวัง';
                    return 'เร่งด่วน';
                },

                getDimensionCardStyle(score) {
                    if (!score) return 'bg-slate-50/70 border-slate-200';
                    if (score <= 4) return 'bg-emerald-50/60 border-emerald-200';
                    if (score <= 7) return 'bg-amber-50/60 border-amber-200';
                    return 'bg-rose-50/70 border-rose-300';
                },

                // Helper to return background color class based on student risk level (Green, Yellow, Red)
                getRiskCardStyle(studentName) {
                    const student = this.students.find(s => s.name === studentName);
                    if (!student) return 'bg-white/95 border-l-slate-400 text-slate-800';
                    if (student.riskLevel === 'red') {
                        return 'bg-gradient-to-r from-red-50/95 to-rose-100/80 border-l-red-600 text-red-950'; // Red risk
                    } else if (student.riskLevel === 'yellow') {
                        return 'bg-gradient-to-r from-amber-50/95 to-yellow-100/80 border-l-amber-500 text-amber-950'; // Yellow risk
                    } else {
                        return 'bg-gradient-to-r from-emerald-50/95 to-teal-100/80 border-l-emerald-500 text-emerald-950'; // Green risk
                    }
                },

                /* ================= Feedback Analytics (real responses from Google Sheets via feedback.data) ================= */
                fb: { loading: false, loaded: false, error: '', errorCode: '', meta: null, columns: [], rows: [], all: [], prof: [],
                      timeCol: -1, scoreMax: 5, questionCount: 0, dupRemoved: 0, maskedCount: 0, minDate: '', maxDate: '',
                      f: { from: '', to: '', choiceCol: -1, choiceVal: '', scoreMin: '', scoreMax: '', search: '' },
                      donutCol: -1, distCol: -1, tableCol: -1, onlyAnswered: false, sort: { key: 'time', dir: 'desc' }, page: 1, pageSize: 15, detail: null },
                async fbLoad(refresh) {
                    if (this.fb.loading) return;
                    this.fb.loading = true; this.fb.error = ''; this.fb.errorCode = '';
                    const r = await this.apiCall('feedback.data', { refresh: !!refresh });
                    this.fb.loading = false;
                    if (!r.ok) { this.fb.error = r.message; this.fb.errorCode = r.code; this.fb.loaded = true; this.fb.all = []; this.fbDestroyCharts(); return; }
                    this.fbIngest(r.data);
                    this.fb.loaded = true;
                    if (refresh) this.showToast('ดึงข้อมูลล่าสุดจาก Google Sheets แล้ว (' + r.data.rows.length + ' คำตอบ)');
                    this.$nextTick(() => this.fbRenderCharts());
                },
                fbShort(h, n) { h = String(h || '').replace(/\s+/g, ' ').trim(); return h.length > (n || 46) ? h.slice(0, (n || 46) - 1) + '…' : h; },
                fbParseTime(v) {
                    if (!v) return 0;
                    let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(v);
                    if (m) return Date.UTC(+m[1], m[2] - 1, +m[3], (+m[4] || 0) - 7, +m[5] || 0, +m[6] || 0);   // sheet values are Asia/Bangkok
                    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(v);
                    if (m) { let y = +m[3]; if (y > 2400) y -= 543; return Date.UTC(y, m[2] - 1, +m[1], (+m[4] || 0) - 7, +m[5] || 0, +m[6] || 0); }
                    return 0;
                },
                fbScaleValue(v) {
                    const s = String(v || '').trim(); if (!s) return null;
                    const n = /^(\d+(?:\.\d+)?)(?:\s*[-–(:.]|\s|$)/.exec(s); if (n) return Number(n[1]);
                    const t = s.replace(/พึงพอใจ|ระดับ|\s/g, '');
                    return ({ 'มากที่สุด': 5, 'มาก': 4, 'ปานกลาง': 3, 'น้อย': 2, 'น้อยที่สุด': 1 })[t] || null;
                },
                /** Work out what each column holds from its header and values (nothing is assumed about the sheet layout). */
                fbProfile(col, values) {
                    const vals = values.filter(v => v !== '' && v !== '•••');
                    const base = { index: col.index, header: col.header, short: this.fbShort(col.header), pii: col.pii, masked: col.masked, kind: 'text' };
                    if (col.pii) return Object.assign(base, { kind: 'pii' });
                    if (!vals.length) return Object.assign(base, { kind: 'empty' });
                    const timeHeader = /ประทับเวลา|timestamp|เวลาที่ส่ง|submitted|วันที่ส่ง/i.test(col.header);
                    const timeHits = vals.filter(v => this.fbParseTime(v) > 0).length;
                    if (timeHeader && timeHits / vals.length >= 0.8) return Object.assign(base, { kind: 'time' });
                    const nums = vals.map(v => this.fbScaleValue(v));
                    const okNums = nums.filter(x => x !== null && Number.isInteger(x));
                    if (okNums.length / vals.length >= 0.8) {
                        const mx = Math.max(...okNums), mn = Math.min(...okNums);
                        if (mn >= 0 && mx <= 10 && new Set(okNums).size <= 11) {
                            const max = mx <= 4 ? 4 : mx <= 5 ? 5 : mx <= 7 ? 7 : 10;
                            return Object.assign(base, { kind: 'scale', max, min: mn === 0 ? 0 : 1 });
                        }
                    }
                    if (vals.every(v => !isNaN(Number(v)))) return Object.assign(base, { kind: 'number' });
                    const multiHits = vals.filter(v => /,\s/.test(v)).length;
                    const distinct = new Set(vals).size;
                    if (multiHits / vals.length >= 0.3) {
                        const tokens = new Set(); vals.forEach(v => v.split(/,\s*/).forEach(t => t && tokens.add(t)));
                        if (tokens.size <= 25) return Object.assign(base, { kind: 'multi' });
                    }
                    const avgLen = vals.reduce((a, v) => a + v.length, 0) / vals.length;
                    if (/ข้อเสนอแนะ|ความคิดเห็น|เพิ่มเติม|อธิบาย|เหตุผล|comment|suggest|feedback|remark/i.test(col.header)) return base;   // open-ended question
                    if (distinct <= 15 && avgLen <= 60 && (distinct <= Math.max(2, vals.length * 0.6))) return Object.assign(base, { kind: 'choice' });
                    if (timeHits / vals.length >= 0.9) return Object.assign(base, { kind: 'date' });
                    return base;
                },
                fbIngest(data) {
                    const fb = this.fb;
                    fb.meta = data.meta; fb.columns = data.columns;
                    fb.maskedCount = data.columns.filter(c => c.masked).length;
                    fb.prof = data.columns.map(c => this.fbProfile(c, data.rows.map(r => r[c.index] || '')));
                    fb.timeCol = (fb.prof.find(p => p.kind === 'time') || { index: -1 }).index;
                    const scales = fb.prof.filter(p => p.kind === 'scale');
                    fb.scoreMax = scales.length && scales.every(p => p.max === scales[0].max) ? scales[0].max : 5;   // mixed scales are normalised to 5
                    fb.questionCount = fb.prof.filter(p => ['scale', 'choice', 'multi', 'text', 'number', 'date'].indexOf(p.kind) >= 0).length;
                    // drop exact duplicate submissions (same values in every column)
                    const seen = new Set(); let dups = 0; const out = [];
                    data.rows.forEach((cells, i) => {
                        const key = JSON.stringify(cells);
                        if (seen.has(key)) { dups++; return; } seen.add(key);
                        const ms = fb.timeCol >= 0 ? this.fbParseTime(cells[fb.timeCol]) : 0;
                        const sc = scales.map(p => { const v = this.fbScaleValue(cells[p.index]); return v === null ? null : (fb.scoreMax === p.max ? v : v / p.max * 5); });
                        const answered = sc.filter(v => v !== null);
                        out.push({ key: 'r' + i, n: i + 1, cells, ms, day: ms ? new Date(ms + 7 * 3600e3).toISOString().slice(0, 10) : '',
                                   score: answered.length ? answered.reduce((a, b) => a + b, 0) / answered.length : null,
                                   complete: scales.length > 0 && answered.length === scales.length, text: cells.join(' ').toLowerCase() });
                    });
                    fb.all = out; fb.dupRemoved = dups;
                    const days = out.map(r => r.day).filter(Boolean).sort();
                    fb.minDate = days[0] || ''; fb.maxDate = days[days.length - 1] || '';
                    const choice = fb.prof.filter(p => p.kind === 'choice' || p.kind === 'multi');
                    if (!fb.prof[fb.f.choiceCol] || ['choice', 'multi'].indexOf(fb.prof[fb.f.choiceCol].kind) < 0) { fb.f.choiceCol = choice.length ? choice[0].index : -1; fb.f.choiceVal = ''; }
                    if (!fb.prof[fb.donutCol] || ['choice', 'multi'].indexOf(fb.prof[fb.donutCol].kind) < 0) fb.donutCol = choice.length ? choice[0].index : -1;
                    if (fb.distCol >= 0 && (!fb.prof[fb.distCol] || fb.prof[fb.distCol].kind !== 'scale')) fb.distCol = -1;
                    const qs = this.fbQuestionCols;
                    if (!qs.find(q => q.index === fb.tableCol)) fb.tableCol = (qs.find(q => q.kind === 'text') || qs[0] || { index: -1 }).index;
                    fb.page = 1;
                },
                get fbScaleCols() { return this.fb.prof.filter(p => p.kind === 'scale'); },
                get fbChoiceCols() { return this.fb.prof.filter(p => p.kind === 'choice' || p.kind === 'multi'); },
                get fbTextCols() { return this.fb.prof.filter(p => p.kind === 'text'); },
                get fbQuestionCols() { return this.fb.prof.filter(p => ['scale', 'choice', 'multi', 'text', 'number', 'date'].indexOf(p.kind) >= 0 || (p.kind === 'pii' && !p.masked)); },
                fbChoiceValues(colIndex) {
                    const p = this.fb.prof[colIndex]; if (!p) return [];
                    const counts = {};
                    this.fb.all.forEach(r => { const v = r.cells[colIndex]; if (!v) return; (p.kind === 'multi' ? v.split(/,\s*/) : [v]).forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1; }); });
                    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
                },
                get fbFilterActive() { const f = this.fb.f; return !!(f.from || f.to || f.choiceVal || f.scoreMin !== '' || f.scoreMax !== '' || f.search); },
                fbResetFilters() { Object.assign(this.fb.f, { from: '', to: '', choiceVal: '', scoreMin: '', scoreMax: '', search: '' }); this.fb.page = 1; },
                fbMatch(r, ignoreDates) {
                    const f = this.fb.f;
                    if (!ignoreDates && f.from && (!r.day || r.day < f.from)) return false;
                    if (!ignoreDates && f.to && (!r.day || r.day > f.to)) return false;
                    if (f.choiceVal && f.choiceCol >= 0) {
                        const v = r.cells[f.choiceCol] || '', p = this.fb.prof[f.choiceCol];
                        if (p && p.kind === 'multi' ? v.split(/,\s*/).indexOf(f.choiceVal) < 0 : v !== f.choiceVal) return false;
                    }
                    if (f.scoreMin !== '' && (r.score === null || r.score < Number(f.scoreMin))) return false;
                    if (f.scoreMax !== '' && (r.score === null || r.score > Number(f.scoreMax))) return false;
                    return true;
                },
                /** rows after date/category/score filters — every chart, card and the table use this same set */
                get fbRows() { return this.fb.all.filter(r => this.fbMatch(r)); },
                fbAvg(rows, colIndex) {
                    const p = this.fb.prof[colIndex]; let s = 0, n = 0;
                    rows.forEach(r => { const v = this.fbScaleValue(r.cells[colIndex]); if (v !== null) { s += (this.fb.scoreMax === p.max ? v : v / p.max * 5); n++; } });
                    return { avg: n ? s / n : null, n };
                },
                get fbStats() {
                    const rows = this.fbRows, scored = rows.filter(r => r.score !== null);
                    const avg = scored.length ? scored.reduce((a, r) => a + r.score, 0) / scored.length : null;
                    const cmp = this.fbCompare;
                    const latest = rows.reduce((m, r) => Math.max(m, r.ms || 0), 0);
                    const weekAgo = latest - 7 * 86400e3;
                    const delta = cmp.ok && cmp.prevAll !== null && avg !== null ? cmp.curAll - cmp.prevAll : 0;
                    return { avg, complete: rows.length ? rows.filter(r => r.complete).length / rows.length : 0, completeN: rows.filter(r => r.complete).length,
                             latest, last7: latest ? rows.filter(r => r.ms > weekAgo).length : 0, delta,
                             deltaText: cmp.ok && cmp.prevAll !== null ? ((delta >= 0 ? '▲ ' : '▼ ') + this.fbFmt(Math.abs(delta), 2) + ' จากช่วงก่อนหน้า') : 'จาก ' + scored.length + ' คำตอบที่มีคะแนน' };
                },
                get fbGrain() {
                    const days = this.fbRows.map(r => r.day).filter(Boolean).sort();
                    if (days.length < 2) return 'day';
                    const span = (Date.parse(days[days.length - 1]) - Date.parse(days[0])) / 86400e3;
                    const perDay = days.length / Math.max(1, span);
                    return span > 400 ? 'month' : (span > 70 || (span > 21 && perDay < 1.5) ? 'week' : 'day');   // sparse data reads better weekly
                },
                fbBucket(day, grain) {
                    if (grain === 'month') return day.slice(0, 7);
                    if (grain === 'week') return this.mondayOf(day);
                    return day;
                },
                get fbTrend() {
                    const grain = this.fbGrain, groups = {};
                    this.fbRows.forEach(r => { if (!r.day) return; const k = this.fbBucket(r.day, grain); const g = (groups[k] = groups[k] || { n: 0, s: 0, sn: 0 }); g.n++; if (r.score !== null) { g.s += r.score; g.sn++; } });
                    const keys = Object.keys(groups).sort();
                    return { labels: keys, count: keys.map(k => groups[k].n), avg: keys.map(k => groups[k].sn ? Math.round(groups[k].s / groups[k].sn * 100) / 100 : null) };
                },
                /** current period vs the same-length period just before it (date filter if set, otherwise the latest 30 days) */
                get fbCompare() {
                    const fb = this.fb, scales = this.fbScaleCols;
                    if (fb.timeCol < 0) return { ok: false, reason: 'ไม่พบคอลัมน์วันเวลา จึงเปรียบเทียบตามช่วงเวลาไม่ได้', caption: '' };
                    if (!scales.length) return { ok: false, reason: 'ไม่พบคำถามแบบให้คะแนน', caption: '' };
                    const base = fb.all.filter(r => this.fbMatch(r, true) && r.day);
                    if (!base.length) return { ok: false, reason: 'ไม่มีข้อมูลในช่วงที่เลือก', caption: '' };
                    let to = fb.f.to || base.map(r => r.day).sort().pop();
                    let from = fb.f.from || this.addDaysISO(to, -29);
                    const len = Math.round((Date.parse(to) - Date.parse(from)) / 86400e3) + 1;
                    const pTo = this.addDaysISO(from, -1), pFrom = this.addDaysISO(from, -len);
                    const cur = base.filter(r => r.day >= from && r.day <= to), prev = base.filter(r => r.day >= pFrom && r.day <= pTo);
                    const caption = 'ช่วงนี้ ' + this.fbFmtDate(from) + '–' + this.fbFmtDate(to) + ' (' + cur.length + ' คำตอบ) เทียบกับ ' + this.fbFmtDate(pFrom) + '–' + this.fbFmtDate(pTo) + ' (' + prev.length + ' คำตอบ)';
                    if (!cur.length || !prev.length) return { ok: false, reason: 'ต้องมีคำตอบทั้งในช่วงปัจจุบันและช่วงก่อนหน้าจึงจะเปรียบเทียบได้ — ' + caption, caption, curAll: null, prevAll: null };
                    const mean = rows => { const sc = rows.filter(r => r.score !== null); return sc.length ? sc.reduce((a, r) => a + r.score, 0) / sc.length : null; };
                    return { ok: true, caption, labels: scales.map(p => p.short), cur: scales.map(p => this.fbAvg(cur, p.index).avg), prev: scales.map(p => this.fbAvg(prev, p.index).avg), curAll: mean(cur), prevAll: mean(prev) };
                },
                get fbTableRows() {
                    const q = (this.fb.f.search || '').trim().toLowerCase(), col = this.fb.tableCol;
                    let rows = this.fbRows.filter(r => (!q || r.text.indexOf(q) >= 0) && (!this.fb.onlyAnswered || (r.cells[col] || '') !== ''));
                    const { key, dir } = this.fb.sort, sign = dir === 'asc' ? 1 : -1;
                    const val = r => key === 'time' ? (r.ms || 0) : key === 'score' ? (r.score === null ? -1 : r.score) : String(r.cells[col] || '');
                    return rows.slice().sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * sign; });
                },
                get fbPageCount() { return Math.max(1, Math.ceil(this.fbTableRows.length / this.fb.pageSize)); },
                get fbPageRows() { const p = Math.min(this.fb.page, this.fbPageCount); return this.fbTableRows.slice((p - 1) * this.fb.pageSize, p * this.fb.pageSize); },
                fbSort(key) { const s = this.fb.sort; if (s.key === key) s.dir = s.dir === 'asc' ? 'desc' : 'asc'; else { s.key = key; s.dir = key === 'answer' ? 'asc' : 'desc'; } this.fb.page = 1; },
                fbSortMark(key) { return this.fb.sort.key === key ? (this.fb.sort.dir === 'asc' ? '↑' : '↓') : ''; },
                fbFmt(v, d) { return v === null || v === undefined || isNaN(v) ? '—' : Number(v).toFixed(d === undefined ? 2 : d); },
                fbFmtInt(v) { return Number(v || 0).toLocaleString('th-TH'); },
                fbFmtDate(v) { if (!v) return '—'; const iso = typeof v === 'number' ? new Date(v + 7 * 3600e3).toISOString().slice(0, 10) : String(v).slice(0, 10); return this.formatThaiDateDisplay(iso); },
                fbFmtDateTime(v) { if (!v) return '—'; const ms = typeof v === 'number' ? v : Date.parse(v); if (!ms) return '—'; const d = new Date(ms + 7 * 3600e3).toISOString(); return this.formatThaiDateDisplay(d.slice(0, 10)) + ' ' + d.slice(11, 16) + ' น.'; },
                fbDestroyCharts() { const c = window.__fbCharts || {}; Object.keys(c).forEach(k => { try { c[k].destroy(); } catch (e) {} }); window.__fbCharts = {}; },
                fbRenderCharts() {
                    if (!this.fb.loaded || !this.fb.all.length) return;
                    if (typeof Chart === 'undefined') { window.TssLib.load('chart').then(() => this.fbRenderCharts(), () => {}); return; }
                    const charts = window.__fbCharts = window.__fbCharts || {};
                    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    const C = { navy: '#1e3a5f', teal: '#0d9488', tealSoft: 'rgba(13,148,136,.16)', slate: '#94a3b8', amber: '#f59e0b', grid: 'rgba(148,163,184,.18)', ink: '#334155' };
                    const palette = ['#1e3a5f', '#0d9488', '#f59e0b', '#6366f1', '#e11d48', '#0ea5e9', '#84cc16', '#a855f7', '#64748b', '#f97316'];
                    const common = { responsive: true, maintainAspectRatio: false, animation: reduce ? false : { duration: 500, easing: 'easeOutCubic' },
                        plugins: { legend: { labels: { color: C.ink, boxWidth: 12, usePointStyle: true, font: { family: 'Sarabun' } } },
                                   tooltip: { backgroundColor: '#0f172a', padding: 10, titleFont: { family: 'Sarabun', weight: '700' }, bodyFont: { family: 'Sarabun' }, cornerRadius: 10 } },
                        scales: {} };
                    const upsert = (id, cfg) => {
                        const el = document.getElementById(id); if (!el) return;
                        if (charts[id] && charts[id].canvas === el && charts[id].config.type === cfg.type) { charts[id].data = cfg.data; charts[id].options = cfg.options; charts[id].update(); return; }
                        if (charts[id]) { try { charts[id].destroy(); } catch (e) {} }
                        charts[id] = new Chart(el, cfg);
                    };
                    const axis = (extra) => Object.assign({ grid: { color: C.grid, drawTicks: false }, border: { display: false }, ticks: { color: '#64748b', font: { family: 'Sarabun' }, padding: 6 } }, extra || {});
                    const tr = this.fbTrend;
                    if (tr.labels.length >= 2) {
                        const el = document.getElementById('fbTrendChart');
                        const g = el && el.getContext('2d').createLinearGradient(0, 0, 0, 300);
                        if (g) { g.addColorStop(0, 'rgba(13,148,136,.28)'); g.addColorStop(1, 'rgba(13,148,136,0)'); }
                        const labels = tr.labels.map(k => k.length === 7 ? k : this.fbFmtDate(k));
                        upsert('fbTrendChart', { type: 'line', data: { labels, datasets: [
                            { type: 'line', label: 'คะแนนเฉลี่ย', data: tr.avg, borderColor: C.teal, backgroundColor: g || C.tealSoft, fill: true, tension: .35, spanGaps: true, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#fff', pointBorderWidth: 2, yAxisID: 'y' },
                            { type: 'bar', label: 'จำนวนคำตอบ', data: tr.count, backgroundColor: 'rgba(30,58,95,.18)', hoverBackgroundColor: 'rgba(30,58,95,.35)', borderRadius: 6, yAxisID: 'y1', maxBarThickness: 28 } ] },
                            options: Object.assign({}, common, { interaction: { mode: 'index', intersect: false },
                                scales: { x: axis({ grid: { display: false } }), y: axis({ min: 0, max: this.fb.scoreMax, title: { display: true, text: 'คะแนนเฉลี่ย', color: '#64748b' } }), y1: axis({ position: 'right', beginAtZero: true, grid: { display: false }, ticks: { precision: 0, color: '#64748b' }, title: { display: true, text: 'คำตอบ', color: '#64748b' } }) } }) });
                    }
                    const sc = this.fbScaleCols;
                    if (sc.length) {
                        const items = sc.map(p => Object.assign({ p }, this.fbAvg(this.fbRows, p.index))).sort((a, b) => (b.avg || 0) - (a.avg || 0));
                        upsert('fbBarChart', { type: 'bar', data: { labels: items.map(x => this.fbShort(x.p.header, 38)), datasets: [{ label: 'คะแนนเฉลี่ย', data: items.map(x => x.avg === null ? null : Math.round(x.avg * 100) / 100), backgroundColor: items.map(x => x.avg >= this.fb.scoreMax * .8 ? C.teal : x.avg >= this.fb.scoreMax * .6 ? '#38bdf8' : C.amber), borderRadius: 8, maxBarThickness: 22 }] },
                            options: Object.assign({}, common, { indexAxis: 'y', plugins: Object.assign({}, common.plugins, { legend: { display: false }, tooltip: Object.assign({}, common.plugins.tooltip, { callbacks: { title: c => items[c[0].dataIndex].p.header, afterLabel: c => 'ผู้ตอบ ' + items[c.dataIndex].n + ' คน' } }) }),
                                scales: { x: axis({ min: 0, max: this.fb.scoreMax }), y: axis({ grid: { display: false } }) } }) });
                        const cmp = this.fbCompare;
                        if (cmp.ok) upsert('fbCompareChart', { type: 'bar', data: { labels: cmp.labels.map(l => this.fbShort(l, 34)), datasets: [
                                { label: 'ช่วงก่อนหน้า', data: cmp.prev.map(v => v === null ? null : Math.round(v * 100) / 100), backgroundColor: 'rgba(148,163,184,.55)', borderRadius: 6, maxBarThickness: 16 },
                                { label: 'ช่วงปัจจุบัน', data: cmp.cur.map(v => v === null ? null : Math.round(v * 100) / 100), backgroundColor: C.navy, borderRadius: 6, maxBarThickness: 16 } ] },
                            options: Object.assign({}, common, { indexAxis: 'y', scales: { x: axis({ min: 0, max: this.fb.scoreMax }), y: axis({ grid: { display: false } }) } }) });
                        const dc = this.fb.distCol;
                        let labels, data;
                        if (dc >= 0) {
                            const p = this.fb.prof[dc], counts = {}; const lo = p.min === 0 ? 0 : 1;
                            for (let k = lo; k <= p.max; k++) counts[k] = 0;
                            this.fbRows.forEach(r => { const v = this.fbScaleValue(r.cells[dc]); if (v !== null && counts[v] !== undefined) counts[v]++; });
                            labels = Object.keys(counts).map(k => k + ' คะแนน'); data = Object.values(counts);
                        } else {
                            const step = this.fb.scoreMax <= 5 ? 0.5 : 1, bins = [];
                            for (let b = 1; b < this.fb.scoreMax; b += step) bins.push(b);
                            labels = bins.map(b => b.toFixed(1) + '–' + (b + step).toFixed(1));
                            data = bins.map((b, i) => this.fbRows.filter(r => r.score !== null && r.score >= b && (i === bins.length - 1 ? r.score <= b + step : r.score < b + step)).length);
                        }
                        upsert('fbDistChart', { type: 'bar', data: { labels, datasets: [{ label: 'จำนวนผู้ตอบ', data, backgroundColor: 'rgba(13,148,136,.75)', hoverBackgroundColor: C.teal, borderRadius: 6, categoryPercentage: .9, barPercentage: .95 }] },
                            options: Object.assign({}, common, { plugins: Object.assign({}, common.plugins, { legend: { display: false } }), scales: { x: axis({ grid: { display: false } }), y: axis({ beginAtZero: true, ticks: { precision: 0, color: '#64748b' } }) } }) });
                    }
                    if (this.fb.donutCol >= 0) {
                        const p = this.fb.prof[this.fb.donutCol], counts = {};
                        this.fbRows.forEach(r => { const v = r.cells[p.index]; if (!v) return; (p.kind === 'multi' ? v.split(/,\s*/) : [v]).forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1; }); });
                        let keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
                        if (keys.length > 8) { const other = keys.slice(7).reduce((a, k) => a + counts[k], 0); keys = keys.slice(0, 7); counts['อื่น ๆ'] = other; keys.push('อื่น ๆ'); }
                        upsert('fbDonutChart', { type: 'doughnut', data: { labels: keys.map(k => this.fbShort(k, 30)), datasets: [{ data: keys.map(k => counts[k]), backgroundColor: keys.map((k, i) => palette[i % palette.length]), borderColor: '#fff', borderWidth: 2, hoverOffset: 8 }] },
                            options: Object.assign({}, common, { cutout: '62%', plugins: Object.assign({}, common.plugins, { legend: { position: 'right', labels: common.plugins.legend.labels },
                                tooltip: Object.assign({}, common.plugins.tooltip, { callbacks: { label: c => { const t = c.dataset.data.reduce((a, b) => a + b, 0); return ' ' + c.label + ': ' + c.parsed + ' (' + Math.round(c.parsed / t * 100) + '%)'; } } }) }) }) });
                    }
                },

                /* ================= appointments (server-backed) ================= */
                todayISO() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } },
                addDaysISO(iso, n) { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); },
                mondayOf(iso) { const [y, m, d] = iso.split('-').map(Number); const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return this.addDaysISO(iso, wd === 0 ? -6 : 1 - wd); },
                normalizeAppt(a) {
                    return Object.assign({}, a, {
                        time: a.startTime + ' - ' + a.endTime, counselor: a.responsibleName, studentName: a.clientName,
                        weekLabel: 'สัปดาห์ที่ ' + Math.ceil(Number(String(a.dateISO).slice(8, 10)) / 7),
                        date: this.formatThaiDateDisplay(a.dateISO)
                    });
                },
                /** Fetch the window around the month/week on screen; the server filters by the caller's access. */
                async loadAppointments() {
                    if (!this.isLoggedIn || !this.tabAllowed('appointments')) return;
                    if (!this.scheduleWeekStart) this.scheduleWeekStart = this.mondayOf(this.todayISO());
                    const first = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-01`;
                    const from = [this.addDaysISO(first, -14), this.addDaysISO(this.scheduleWeekStart, -7), this.addDaysISO(this.todayISO(), -1)].sort()[0];
                    const to = [this.addDaysISO(first, 45), this.addDaysISO(this.scheduleWeekStart, 14), this.addDaysISO(this.todayISO(), 1)].sort().reverse()[0];
                    const seq = (this.__apptSeq = (this.__apptSeq || 0) + 1);
                    this.__apptTriedAt = Date.now();
                    this.apptLoading = true; this.apptError = '';
                    const r = await this.apiCall('appointments.list', { from, to });
                    if (seq !== this.__apptSeq) return;                // a newer request is on its way
                    this.apptLoading = false;
                    if (!r.ok) { this.apptError = 'โหลดนัดหมายไม่สำเร็จ: ' + r.message; return; }
                    this.appointments = r.data.appointments.map(a => this.normalizeAppt(a));
                    this.__apptLoadedAt = Date.now();
                    Object.assign(this.apptMeta, { staff: r.data.staff || [], types: r.data.types || this.apptMeta.types, statuses: r.data.statuses || this.apptMeta.statuses, canManage: !!r.data.canManage, canAssign: !!r.data.canAssign });
                },
                async saveAppointment(a) {
                    const r = await this.apiCall('appointments.save', { id: a.id || undefined, clientId: a.clientId, dateISO: a.dateISO, startTime: a.startTime, endTime: a.endTime, type: a.type, status: a.status, topic: a.topic, location: a.location === undefined ? undefined : a.location, responsibleUserId: a.responsibleUserId });
                    if (!r.ok) { this.showToast('⚠️ ' + r.message); return { ok: false, message: r.message }; }
                    const saved = this.apptUpsert(r.data.appointment);
                    this.rqs.key = ''; this.calAv.key = '';
                    if (r.data.scheduleWarning) setTimeout(() => this.showToast('⚠️ ' + r.data.scheduleWarning), 1600);
                    if (saved.requestId) this.loadRequests();             // the request shows the appointment's latest state
                    return { ok: true, appointment: saved };
                },
                async deleteAppointment(a) {
                    if (!a || !a.canEdit) return;
                    if (this.apptConfirmDelete !== a.id) { this.apptConfirmDelete = a.id; return; }   // second click confirms
                    this.apptConfirmDelete = null;
                    const r = await this.apiCall('appointments.delete', { id: a.id });
                    if (!r.ok) { this.showToast('⚠️ ' + r.message); return; }
                    this.appointments = this.appointments.filter(x => x.id !== a.id);
                    if (a.requestId) this.loadRequests();
                    this.showAppointmentModal = false;
                    this.showToast('🗑️ ลบนัดหมายเรียบร้อยแล้ว');
                },
                editAppointment(a) {
                    this.showAppointmentModal = false;
                    this.scheduleError = '';
                    this.newScheduleForm = { id: a.id, clientId: a.clientId, dateISO: a.dateISO, startTime: a.startTime, endTime: a.endTime, type: a.type, responsibleUserId: a.responsibleUserId, status: a.status, topic: a.topic, location: a.location || '' };
                    this.showScheduleModal = true;
                },
                openAppointmentProfile(a) {
                    this.showAppointmentModal = false;
                    const found = this.students.find(s => s.id === a.clientId);
                    if (!found) { this.showToast('ไม่พบแฟ้มผู้รับบริการ หรือคุณไม่มีสิทธิ์เข้าถึง'); return; }
                    this.openProfile(found);
                },
                apptStatusLabel(st) { return ({ completed: '✓ รับบริการแล้ว', postponed: '⏳ เลื่อนนัด', cancelled: '✕ ยกเลิก', scheduled: '• นัดหมายแล้ว', no_show: '! ไม่มาตามนัด' })[st] || (this.apptMeta.statuses[st] || st); },
                apptTypeClass(t) { return ({ counseling: 'bg-sky-100 text-sky-800', follow_up: 'bg-emerald-100 text-emerald-800', assessment: 'bg-violet-100 text-violet-800', crisis: 'bg-rose-100 text-rose-800', meeting: 'bg-amber-100 text-amber-900' })[t] || 'bg-slate-100 text-slate-700'; },
                apptStatusClass(st) { return ({ scheduled: 'bg-sky-50 text-sky-700', completed: 'bg-emerald-50 text-emerald-700', postponed: 'bg-amber-50 text-amber-800', cancelled: 'bg-slate-100 text-slate-500 line-through', no_show: 'bg-rose-50 text-rose-700' })[st] || 'bg-slate-100 text-slate-600'; },
                get allowedProviders() {
                    const names = new Set(this.apptMeta.staff.map(u => u.fullName));
                    this.appointments.forEach(a => a.responsibleName && names.add(a.responsibleName));
                    return [...names];
                },
                get weekDays() {
                    const start = this.scheduleWeekStart || this.mondayOf(this.todayISO()), today = this.todayISO();
                    const labels = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์'];
                    return ['mon', 'tue', 'wed', 'thu', 'fri'].map((key, i) => { const iso = this.addDaysISO(start, i); return { key, label: labels[i], num: String(Number(iso.slice(8))), dateISO: iso, isToday: iso === today }; });
                },
                get weekRangeLabel() { const d = this.weekDays; return this.formatThaiDateDisplay(d[0].dateISO) + ' – ' + this.formatThaiDateDisplay(d[4].dateISO); },
                slotIndexOf(startTime) {
                    let idx = 0;
                    this.timeSlots.forEach((sl, i) => { if (sl.time.slice(0, 5) <= startTime) idx = i; });
                    return idx;
                },
                /** { mon: { 0: [...], 1: [...] }, … } for the week on screen — built from the server data, not stored separately */
                get weeklySchedule() {
                    const out = { mon: {}, tue: {}, wed: {}, thu: {}, fri: {} };
                    const byDate = {}; this.weekDays.forEach(d => { byDate[d.dateISO] = d.key; });
                    this.appointments.forEach(a => {
                        const day = byDate[a.dateISO]; if (!day) return;
                        const si = this.slotIndexOf(a.startTime);
                        (out[day][si] = out[day][si] || []).push(a);
                    });
                    return out;
                },
                get todayAppointments() { const t = this.todayISO(); return this.appointments.filter(a => a.dateISO === t); },

                // Returns filtered array of appointments for a given day and slotIndex
                getScheduleItems(day, slotIndex) {
                    const rawSlot = this.weeklySchedule[day] ? this.weeklySchedule[day][slotIndex] : [];
                    const list = Array.isArray(rawSlot) ? rawSlot : (rawSlot ? [rawSlot] : []);
                    return list.filter(item => {
                        const matchProvider = (this.scheduleProviderFilter === 'all' || item.counselor === this.scheduleProviderFilter);
                        const matchStatus = (this.scheduleStatusFilter === 'all' || item.status === this.scheduleStatusFilter);
                        return matchProvider && matchStatus;
                    });
                },

                // Returns total raw count of appointments in a slot (ignoring filters) to enforce max 3 limit
                getRawSlotCount(day, slotIndex) {
                    const rawSlot = this.weeklySchedule[day] ? this.weeklySchedule[day][slotIndex] : [];
                    return (Array.isArray(rawSlot) ? rawSlot : []).filter(a => a.status !== 'cancelled').length;
                },

                canAddMoreInSlot(day, slotIndex) {
                    return this.getRawSlotCount(day, slotIndex) < 3;
                },

                removeScheduleItem(day, slotIndex, itemId) {
                    const a = this.appointments.find(x => x.id === itemId);
                    if (a) { this.openAppointmentDetail(a); this.apptConfirmDelete = a.id; }
                },

                openScheduleModal(preset) {
                    if (!this.apptMeta.canManage) { this.showToast('บัญชีของคุณไม่มีสิทธิ์จัดการนัดหมาย'); return; }
                    const d = this.weekDays[0].dateISO >= this.todayISO() ? this.weekDays[0].dateISO : this.todayISO();
                    this.scheduleError = '';
                    this.newScheduleForm = Object.assign({ id: '', clientId: '', location: '', dateISO: d, startTime: '09:30', endTime: '10:30', type: 'counseling', responsibleUserId: (this.authUser && this.authUser.id) || '', status: 'scheduled', topic: '' }, preset || {});
                    this.showScheduleModal = true;
                },

                openScheduleModalForSlot(day, slotIndex) {
                    if (!this.canAddMoreInSlot(day, slotIndex)) {
                        this.showToast('⚠️ ช่วงเวลานี้มีนัดหมายครบ 3 เคสแล้ว');
                        return;
                    }
                    const slot = (this.timeSlots[slotIndex] || this.timeSlots[0]).time.split(' - ');
                    const dayObj = this.weekDays.find(x => x.key === day) || this.weekDays[0];
                    this.openScheduleModal({ dateISO: dayObj.dateISO, startTime: slot[0], endTime: slot[1] });
                },

                async submitNewSchedule() {
                    const f = this.newScheduleForm;
                    this.scheduleError = '';
                    if (!f.clientId) { this.scheduleError = 'กรุณาเลือกผู้รับบริการ'; return; }
                    if (!f.dateISO || !f.startTime || !f.endTime) { this.scheduleError = 'กรุณาระบุวันและเวลาให้ครบ'; return; }
                    if (f.endTime <= f.startTime) { this.scheduleError = 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม'; return; }
                    if (!f.topic.trim()) { this.scheduleError = 'กรุณาระบุประเด็นนัดหมาย'; return; }
                    this.scheduleSaving = true;
                    const r = await this.saveAppointment(Object.assign({}, f, { topic: f.topic.trim() }));
                    this.scheduleSaving = false;
                    if (!r.ok) { this.scheduleError = r.message; return; }
                    this.showScheduleModal = false;
                    this.showToast(f.id ? '✅ บันทึกการแก้ไขนัดหมายแล้ว' : '✅ เพิ่มนัดหมายสำเร็จ (บันทึกบนเซิร์ฟเวอร์)');
                },

                /* ================= appointment requests (Google Form → approval → appointment → e-mail) =================
                   The form answers are read on the server (requests.list); this page keeps no copy beyond the list on screen.
                   Every action is checked again on the server — the buttons below only mirror what the server allows. */
                rq: { loading: false, loaded: false, error: '', errorCode: '', errorFields: null, items: [], counts: {}, meta: null, loadedAt: 0,
                      filter: 'open', search: '', canApprove: false, canCreateClient: false, canSeeIssue: false, busy: '', actionError: '', notice: '', noticeWarn: false, confirmResend: false,
                      matches: [], mode: 'view', note: '', emailDraft: '',
                      form: { clientMode: 'existing', clientId: '', grade: '', dateISO: '', startTime: '', endTime: '', location: '', responsibleUserId: '', type: 'counseling', topic: '', sendEmail: true },
                      formErrors: {} },
                get rqx() { return this.activeFormRequest || {}; },
                rqStatusLabel(s) { return ({ pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธคำร้อง', reschedule: 'ต้องกำหนดวันหรือเวลาใหม่' })[s] || s; },
                rqStatusClass(s) { return ({ pending: 'is-pending', approved: 'is-approved', rejected: 'is-rejected', reschedule: 'is-reschedule' })[s] || ''; },
                rqEmailLabel(s) { return ({ none: 'ยังไม่ส่งอีเมล', pending: 'รอส่งอีเมล', sending: 'กำลังส่งอีเมล', sent: 'ส่งอีเมลยืนยันแล้ว', failed: 'ส่งอีเมลไม่สำเร็จ', missing: 'ไม่มีอีเมลที่ใช้ได้' })[s] || s; },
                rqEmailClass(s) { return ({ sent: 'is-ok', failed: 'is-bad', missing: 'is-bad', sending: 'is-wait', pending: 'is-wait' })[s] || 'is-none'; },
                /** open = still needs a decision (shown in the header badge and the dashboard by default) */
                get formRequests() { return this.rq.items.filter(x => x.status === 'pending' || x.status === 'reschedule'); },
                get rqFiltered() {
                    const f = this.rq.filter, q = this.rq.search.trim().toLowerCase();
                    return this.rq.items.filter(x => (f === 'all' || (f === 'open' ? (x.status === 'pending' || x.status === 'reschedule') : x.status === f)) &&
                        (!q || [x.fullName, x.nickname, x.email, x.phone].join(' ').toLowerCase().includes(q)));
                },
                get rqEmailProblems() { return this.rq.items.filter(x => x.status === 'approved' && (x.emailStatus === 'failed' || x.emailStatus === 'missing')).length; },
                rqFmtSubmitted(s) {
                    // a server time (UTC "…Z") is shown in Asia/Bangkok; a sheet timestamp is already local wall-clock time
                    if (/(Z|[+-]\d\d:\d\d)$/.test(s || '')) {
                        try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(s)).map(x => [x.type, x.value]));
                              s = p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute; } catch (e) {}
                    }
                    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(s || '');
                    return m ? this.formatThaiDateDisplay(m[1]) + ' • ' + m[2] + ':' + m[3] + ' น.' : (s || '—');
                },
                rqReqWhen(x) {
                    const d = x.reqDateISO ? this.formatThaiDateDisplay(x.reqDateISO) : (x.reqDate || 'ไม่ระบุวัน');
                    const t = x.reqStart ? (x.reqStart + (x.reqEnd ? '–' + x.reqEnd : '') + ' น.') : (x.reqTime || 'ไม่ระบุเวลา');
                    return d + ' • ' + t;
                },
                async loadRequests(force) {
                    if (!this.isLoggedIn || !this.can('review_requests')) return;
                    if (this.__rqInFlight) return this.__rqInFlight;
                    const who = this.authUser && this.authUser.id;
                    this.rq.loading = true;
                    this.__rqTriedAt = Date.now();                                 // a failed read is not retried on every page switch
                    this.__rqInFlight = (async () => {
                        let r;
                        try { r = await this.apiCall('requests.list', force ? { refresh: true } : {}); }
                        finally { this.__rqInFlight = null; }
                        if (!this.isLoggedIn || (this.authUser && this.authUser.id) !== who) return;
                        this.rq.loading = false;
                        if (!r.ok) { this.rq.error = r.message; this.rq.errorCode = r.code; this.rq.errorFields = r.fields || null; this.rq.loaded = true; return; }
                        Object.assign(this.rq, { error: '', errorCode: '', errorFields: null, items: r.data.requests, counts: r.data.counts, meta: r.data.meta, loaded: true, loadedAt: Date.now(),
                            canApprove: !!r.data.canApprove, canCreateClient: !!r.data.canCreateClient, canSeeIssue: !!r.data.canSeeIssue });
                        if (this.activeFormRequest) { const cur = r.data.requests.find(x => x.id === this.activeFormRequest.id); if (cur) this.activeFormRequest = cur; }
                    })();
                    return this.__rqInFlight;
                },
                /** a request changed on the server: replace it in the list (one entry per Request ID) */
                rqPut(req) {
                    if (!req) return;
                    const i = this.rq.items.findIndex(x => x.id === req.id);
                    if (i >= 0) this.rq.items.splice(i, 1, req); else this.rq.items.unshift(req);
                    if (this.activeFormRequest && this.activeFormRequest.id === req.id) this.activeFormRequest = req;
                    const counts = {}; ['pending', 'approved', 'rejected', 'reschedule'].forEach(s => { counts[s] = this.rq.items.filter(x => x.status === s).length; });
                    this.rq.counts = counts;
                },
                /** one appointment record: insert or replace by ID in the shared store every view reads */
                apptUpsert(a) {
                    if (!a) return;
                    const saved = this.normalizeAppt(a);
                    const i = this.appointments.findIndex(x => x.id === saved.id);
                    if (i >= 0) this.appointments.splice(i, 1, saved); else this.appointments.push(saved);
                    this.appointments.sort((x, y) => (x.dateISO + x.startTime).localeCompare(y.dateISO + y.startTime));
                    return saved;
                },
                async openFormRequestDetail(req) {
                    this.activeFormRequest = req;
                    Object.assign(this.rq, { mode: 'view', actionError: '', notice: '', noticeWarn: false, confirmResend: false, note: '', matches: [], formErrors: {}, emailDraft: req.emailOverride || '' });
                    this.showFormRequestModal = true;
                    const r = await this.apiCall('requests.get', { requestId: req.id });
                    if (r.ok && this.activeFormRequest && this.activeFormRequest.id === req.id) {
                        this.rqPut(r.data.request); this.rq.matches = r.data.clientMatches || [];
                        // a case file with exactly the same name is suggested (the staff member still confirms it)
                        if (this.rq.mode === 'approve' && !this.rq.form.clientId && this.rq.matches[0] && this.students.some(s => s.id === this.rq.matches[0].id)) { this.rq.form.clientMode = 'existing'; this.rq.form.clientId = this.rq.matches[0].id; }
                    }
                },
                approveFormRequest(req) {
                    if (this.activeFormRequest !== req || !this.showFormRequestModal) this.openFormRequestDetail(req);
                    this.rqStartApprove();
                },
                rqStartApprove() {
                    const x = this.activeFormRequest; if (!x) return;
                    if (!this.rq.canApprove) { this.rq.actionError = 'บัญชีของคุณไม่มีสิทธิ์อนุมัติและสร้างนัดหมาย'; return; }
                    // date / time start empty on purpose: the staff member decides them (the requested slot can be copied with one click)
                    this.rq.form = { clientMode: 'existing', clientId: (this.rq.matches[0] && this.rq.matches[0].id) || '', grade: '', dateISO: '', startTime: '', endTime: '', location: '',
                        responsibleUserId: (this.authUser && this.authUser.id) || '', type: 'counseling', topic: 'นัดหมายจากคำร้องขอรับบริการ (Google Form)', sendEmail: true };
                    if (!this.rq.form.clientId && this.rq.canCreateClient) this.rq.form.clientMode = 'new';
                    this.rq.formErrors = {}; this.rq.actionError = ''; this.rq.mode = 'approve';
                    this.$nextTick(() => { const el = document.getElementById('rq-date'); el && el.focus({ preventScroll: false }); });
                },
                rqUseRequested() {
                    const x = this.activeFormRequest; if (!x) return;
                    if (x.reqDateISO) this.rq.form.dateISO = x.reqDateISO;
                    if (x.reqStart) { this.rq.form.startTime = x.reqStart; this.rq.form.endTime = x.reqEnd || this.addMinutes(x.reqStart, 60); }
                },
                addMinutes(hhmm, n) { const [h, m] = hhmm.split(':').map(Number); const t = Math.min(23 * 60 + 59, h * 60 + m + n); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); },
                /** same-day appointments already in the calendar for the chosen responsible person (to spot clashes before saving) */
                get rqDayAppointments() {
                    const f = this.rq.form; if (!f.dateISO) return [];
                    return this.appointments.filter(a => a.dateISO === f.dateISO && a.responsibleUserId === f.responsibleUserId && ['cancelled', 'postponed'].indexOf(a.status) < 0);
                },
                get rqClash() {
                    const f = this.rq.form; if (!f.startTime || !f.endTime) return null;
                    return this.rqDayAppointments.find(a => a.startTime < f.endTime && f.startTime < a.endTime) || null;
                },
                rqValidate() {
                    const f = this.rq.form, e = {};
                    if (f.clientMode === 'existing' && !f.clientId) e.client = 'กรุณาเลือกแฟ้มผู้รับบริการ';
                    if (f.clientMode === 'new' && !this.rq.canCreateClient) e.client = 'บัญชีของคุณเปิดแฟ้มใหม่ไม่ได้ — กรุณาเลือกแฟ้มที่มีอยู่';
                    if (!f.dateISO) e.date = 'กรุณาเลือกวันที่นัดหมาย';
                    if (!f.startTime || !f.endTime) e.time = 'กรุณาระบุเวลาเริ่มต้นและสิ้นสุด';
                    else if (f.endTime <= f.startTime) e.time = 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม';
                    if (!f.location.trim()) e.location = 'กรุณาระบุสถานที่นัดหมาย';
                    if (!f.topic.trim()) e.topic = 'กรุณาระบุหัวข้อนัดหมาย';
                    this.rq.formErrors = e;
                    return !Object.keys(e).length;
                },
                async rqApprove() {
                    const x = this.activeFormRequest;
                    if (!x || this.rq.busy) return;                      // no second request while one is on its way
                    if (!this.rqValidate()) { this.$nextTick(() => { const el = document.querySelector('#rq-approve-form [aria-invalid="true"]'); el && el.focus(); }); return; }
                    const f = this.rq.form;
                    this.rq.busy = 'approve'; this.rq.actionError = '';
                    const r = await this.apiCall('requests.approve', {
                        requestId: x.id, clientId: f.clientMode === 'existing' ? f.clientId : '', createClient: f.clientMode === 'new', grade: f.grade.trim(),
                        dateISO: f.dateISO, startTime: f.startTime, endTime: f.endTime, location: f.location.trim(), responsibleUserId: f.responsibleUserId,
                        type: f.type, topic: f.topic.trim(), sendEmail: !!f.sendEmail
                    });
                    this.rq.busy = '';
                    if (!r.ok) { this.rq.actionError = (r.fields && r.fields.slot) || r.message; if (r.fields && r.fields.slot) { this.rqs.key = ''; this.rqSlotsLoad(f.responsibleUserId); } return; }
                    this.rqs.key = ''; this.calAv.key = '';
                    this.rqPut(r.data.request);
                    if (r.data.appointment) this.apptUpsert(r.data.appointment);      // every view reads this one store → shows at once
                    if (f.clientMode === 'new' && !r.data.alreadyApproved) this.loadData();   // the new case file appears in the client lists
                    this.loadAppointments();                                               // and re-read from the server (no duplicates: keyed by ID)
                    this.rq.mode = 'view';
                    const em = r.data.email;
                    this.rq.notice = r.data.alreadyApproved ? 'คำร้องนี้อนุมัติไปแล้ว — ใช้นัดหมายเดิม (ไม่สร้างซ้ำ)' :
                        ('สร้างนัดหมายแล้ว' + (em ? (em.status === 'sent' ? ' • ส่งอีเมลยืนยันแล้ว' : ' • ' + em.message) : ' • ไม่ได้ส่งอีเมล (เลือกไม่ส่ง)'));
                    this.rq.noticeWarn = !!(em && em.status !== 'sent');
                    this.showToast((this.rq.noticeWarn ? '⚠️ ' : '✅ ') + this.rq.notice);
                },
                async rqAction(action, payload, okMsg) {
                    const x = this.activeFormRequest;
                    if (!x || this.rq.busy) return null;
                    this.rq.busy = action; this.rq.actionError = '';
                    const r = await this.apiCall('requests.' + action, Object.assign({ requestId: x.id }, payload || {}));
                    this.rq.busy = '';
                    if (!r.ok) { this.rq.actionError = r.message; return null; }
                    this.rqPut(r.data.request);
                    if (okMsg) { this.rq.notice = okMsg; this.rq.noticeWarn = false; this.showToast(okMsg); }
                    return r.data;
                },
                async rqReject() { if (await this.rqAction('reject', { note: this.rq.note.trim() }, 'ปฏิเสธคำร้องแล้ว (ไม่สร้างนัดหมายและไม่ส่งอีเมล)')) { this.rq.mode = 'view'; this.rq.note = ''; } },
                async rqReschedule() { if (await this.rqAction('reschedule', { note: this.rq.note.trim() }, 'บันทึกสถานะ “ต้องกำหนดวันหรือเวลาใหม่” แล้ว')) { this.rq.mode = 'view'; this.rq.note = ''; } },
                async rqReopen() { await this.rqAction('reopen', {}, 'เปิดคำร้องกลับเป็น “รออนุมัติ” แล้ว'); },
                async rqSaveEmail() {
                    const v = this.rq.emailDraft.trim();
                    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { this.rq.actionError = 'รูปแบบอีเมลไม่ถูกต้อง'; return; }
                    await this.rqAction('setEmail', { email: v }, v ? 'บันทึกอีเมลที่แก้ไขแล้ว (คำตอบในฟอร์มไม่ถูกเปลี่ยน)' : 'ล้างอีเมลที่แก้ไขแล้ว');
                },
                /** resend after a successful send: needs a second, explicit click (no accidental duplicate e-mail) */
                async rqResendEmail() {
                    if (!this.rq.confirmResend) { this.rq.confirmResend = true; return; }
                    this.rq.confirmResend = false;
                    const d = await this.rqAction('retryEmail', { resend: true });
                    if (d && d.email) { this.rq.notice = d.email.message; this.rq.noticeWarn = d.email.status !== 'sent'; this.showToast((d.email.status === 'sent' ? '✉️ ' : '⚠️ ') + d.email.message); }
                },
                rqCanResend(x) {
                    return !!x && this.rq.canApprove && x.status === 'approved' && x.emailStatus === 'sent' && !x.appointmentChangedSinceEmail && x.appointmentCreated && !x.appointmentDeleted &&
                        !(x.appointment && x.appointment.status === 'cancelled');
                },
                async rqRetryEmail() {
                    const d = await this.rqAction('retryEmail', {});
                    if (d && d.email) { this.rq.notice = d.email.message; this.rq.noticeWarn = d.email.status !== 'sent'; this.showToast((d.email.status === 'sent' ? '✉️ ' : '⚠️ ') + d.email.message); }
                },
                rqCanRetry(x) {
                    return !!x && this.rq.canApprove && x.status === 'approved' && x.appointmentCreated && !x.appointmentDeleted &&
                        !(x.appointment && x.appointment.status === 'cancelled') && x.emailStatus !== 'sending' && (x.emailStatus !== 'sent' || x.appointmentChangedSinceEmail);
                },
                rqOpenAppointment(x) {
                    const a = this.appointments.find(y => y.id === x.appointmentId);
                    if (!a) { this.showToast('นัดหมายนี้อยู่นอกช่วงวันที่ที่แสดง หรือคุณไม่มีสิทธิ์ดู'); return; }
                    this.showFormRequestModal = false;
                    this.openAppointmentDetail(a);
                },
                /** re-read requests and appointments when the page comes back into view after a while (other staff may have acted) */
                rqStaleRefresh() {
                    if (!this.isLoggedIn) return;
                    const old = (at) => Date.now() - (at || 0) > 60000 || Math.max(this.__wAt || 0, window.__tssWriteAt || 0) > (at || 0);   // over a minute, or something saved since
                    if (this.can('review_requests') && old(Math.max(this.rq.loadedAt || 0, this.__rqTriedAt || 0))) this.loadRequests();
                    if (old(Math.max(this.__apptLoadedAt || 0, this.__apptTriedAt || 0))) this.loadAppointments();
                },

                handleScroll() {
                    this.scrollY = window.scrollY;
                },

                get isRestrictedRole() {
                    return !this.can('view_case');
                },

                get myTodayAppointments() {
                    return this.todayAppointments;   // already limited by the server to what this account may see
                },

                showToast(msg) {
                    this.toastMessage = msg;
                    setTimeout(() => { this.toastMessage = ''; }, 4000);
                },

                openAppointmentDetail(appt) {
                    this.apptConfirmDelete = null;
                    this.activeAppointment = appt;
                    const found = this.students.find(s => s.id === appt.clientId);
                    this.appointmentStudentInfo = found || null;
                    this.appointmentStudentLogs = found ? (this.logs[found.id] || []) : [];
                    if (found && !this.logs[found.id] && !this.logsLoaded) this.ensureLogs().then(() => { if (this.showAppointmentModal && this.appointmentStudentInfo && this.appointmentStudentInfo.id === found.id) this.appointmentStudentLogs = this.logs[found.id] || []; });
                    this.showAppointmentModal = true;
                },

                openProfileByStudentName(name) {
                    const found = this.students.find(s => s.name === name);
                    if (found) {
                        this.openProfile(found);
                    } else {
                        this.showToast('ไม่พบข้อมูลนักเรียน: ' + name);
                    }
                },

                openProfileByStudentId(studentId) {
                    if (!this.can('view_case')) return;
                    const found = this.students.find(s => s.id == studentId);
                    if (found) {
                        this.openProfile(found);
                    }
                },

                get hasActiveRedAlert() {
                    return this.students.some(s => s.riskLevel === 'red') || (this.can('view_assessment') && this.rl.open > 0);
                },

                countByRisk(level) {
                    return this.students.filter(s => s.riskLevel === level).length;
                },

                get allHistoryLogs() {
                    if (this.currentTab !== 'history') return [];          // the page is not on screen: nothing to build
                    let list = [];
                    this.students.forEach(student => {
                        const sLogs = this.logs[student.id] || [];
                        sLogs.forEach(log => {
                            list.push({ ...log, studentId: student.id, studentName: student.name, grade: student.grade });
                        });
                    });
                    return list.sort((a, b) => b.id - a.id);
                },

                get filteredHistoryLogs() {
                    if (this.historyFilter === 'mine') {
                        return this.allHistoryLogs.filter(item => this.username.includes(item.author) || item.author.includes(this.username));
                    }
                    return this.allHistoryLogs;
                },

                getStudentSymptomsSummary(studentId) {
                    if (!this.logs[studentId] && !this.logsLoaded) return this.logsLoading ? 'กำลังโหลดบันทึกอาการ…' : (this.logsError ? 'โหลดบันทึกอาการไม่สำเร็จ' : '');
                    const sLogs = this.logs[studentId] || [];
                    if (sLogs.length === 0) return 'ยังไม่มีบันทึกอาการ';
                    const allBehaviors = sLogs.flatMap(l => l.behaviors);
                    return 'อาการ/พฤติกรรม: ' + [...new Set(allBehaviors)].join(', ');
                },

                get filteredStudents() {
                    if (this.currentTab !== 'clients') return [];          // the page is not on screen: nothing to build
                    const q = this.searchQuery.trim().toLowerCase();
                    return this.students.filter(s => {
                        const matchRisk = this.filterRisk === 'all' || s.riskLevel === this.filterRisk;
                        if (!q) return matchRisk;
                        const matchBasic = s.name.toLowerCase().includes(q) || s.grade.toLowerCase().includes(q);
                        const studentLogs = this.logs[s.id] || [];
                        const matchSymptoms = studentLogs.some(log => (log.behaviors || []).some(b => b.toLowerCase().includes(q)) || (log.note || '').toLowerCase().includes(q));
                        return matchRisk && (matchBasic || matchSymptoms);
                    });
                },

                logout() { this.authLogout(); },

                async openProfile(student) {
                    if (!student || !this.can('view_case')) { this.showToast('บัญชีของคุณไม่มีสิทธิ์เปิดแฟ้มผู้รับบริการ'); return; }
                    if (this.profileLoading && !this.profilePrefetched) return;
                    // open straight away with a skeleton; only name/grade from the list are shown until the server answers
                    this.profileLoading = true;
                    this.activeStudent = student; this.phProfile(String(student.id)); this.rgProfile(String(student.id)); this.crReset(); this.activeStudentLogs = []; this.profilePins = []; this.profileTab = 'timeline';
                    this.tl.clientId = ''; this.tl.data = null; this.tl.error = ''; this.tl.detail.open = false;
                    this.bp.clientId = ''; this.bp.data = null; this.bp.error = ''; this.bp.rec = null;
                    this.is.pf = { clientId: '', loading: false, error: '', data: null };
                    this.cp.clientId = ''; this.cp.data = null; this.cp.form = null;
                    this.showProfileModal = true;
                    const opSeq = this.__opSeq = (this.__opSeq || 0) + 1, pre = this.lpGet(student.id);
                    if (pre) {                                                   // general part loaded earlier: shown now, replaced below
                        const c0 = this.normalizeClient(pre.client); c0.readOnly = !!pre.client.readOnly; c0.studentId = pre.client.studentId || '';
                        const base = this.students.find(s => s.id === c0.id);
                        this.activeStudent = Object.assign({}, base || {}, c0);
                        this.activeStudentLogs = pre.logs || [];
                        this.profilePins = Array.isArray(pre.pins) ? pre.pins : [];
                        this.profileLoading = false; this.profilePrefetched = true;
                    }
                    // the assessment list of a file already in my list is asked at the same time (the server checks it on its own)
                    const awEarly = this.canAccessSpecialistData() && this.students.some(s => s.id === student.id) ? this.awLoadList(student.id, true) : null;
                    const r = await this.apiCall('client.detail', { clientId: student.id });   // server checks permission + assignment, and audits
                    if (opSeq !== this.__opSeq) return;                          // another file was opened meanwhile
                    this.profileLoading = false; this.profilePrefetched = false;
                    this.lpDrop(student.id);                                     // the copy has done its job: the fresh answer is used from now on
                    if (!r.ok) { this.showProfileModal = false; if (r.code !== 'UNAUTHENTICATED') this.showToast(r.message); return; }
                    if (!this.showProfileModal) return;                          // closed meanwhile
                    const d = r.data;
                    const fresh = this.normalizeClient(d.client);
                    fresh.readOnly = !!d.client.readOnly;
                    fresh.studentId = d.client.studentId || '';
                    let local = this.students.find(s => s.id === fresh.id);
                    if (local) Object.assign(local, fresh); else { local = fresh; if (!fresh.readOnly) this.students.unshift(local); }
                    if (d.extras) {
                        local.familyTree = d.extras.familyTree || local.familyTree;
                        local.genogramFacts = d.extras.genogramFacts || '';
                        local.genogramObservations = d.extras.genogramObservations || '';
                        this.studentFamilyRecords[fresh.id] = d.extras.familyMembers || [];
                        this.studentEcomapRecords[fresh.id] = d.extras.ecomapNodes || [];
                    }
                    if (d.assessments) this.mentalHealthAssessments[fresh.id] = d.assessments.map(a => Object.assign({}, a, { showRawItems: false }));
                    this.logs[fresh.id] = d.logs; this.pfLogsFull(fresh.id);
                    this.activeStudent = local;
                    this.activeStudentLogs = d.logs;
                    if (!pre) { this.profileTab = 'timeline'; this.profileAssessmentFilterTool = 'all'; }   // keep the tab the user already moved to
                    if (this.aw.listFor !== fresh.id) { this.aw.list = []; this.aw.listFor = ''; }
                    this.profilePins = Array.isArray(d.pins) ? d.pins : [];
                    this.pinEdit = { logId: '', section: '', title: '', id: '', busy: false, error: '' };
                    if (this.canAccessSpecialistData() && !awEarly) this.awLoadList(fresh.id, true);   // real counts for the tab badge
                    this.showProfileModal = true;
                },

                openClientTypeModal() {
                    if (!this.can('create_case')) { this.showToast('บัญชีของคุณไม่มีสิทธิ์บันทึกเคส'); return; }
                    this.showClientTypeModal = true;
                },

                selectClientType(type) {
                    this.selectedClientType = type;
                    this.showClientTypeModal = false;
                    this.openNewLogModal();
                },

                resetCaseForm() {
                    this.intakeActiveTab = 'client_info';
                    this.a3ResetCase();
                    this.specialistSubTab = 'st5';
                    this.isCaseFormDirty = false;
                    this.showUnsavedExitConfirm = false;
                    this.isCreatingNewStudentInCase = false;
                    this.caseStudentSearchQuery = '';
                    this.issueCategorySearch = '';
                    this.caseFormValidationError = '';
                    this.caseShowErrors = false;
                    this.caseDraftSavedAt = '';
                    this.isSubmittingCase = false;
                    this.newStudentIntake = {
                        name: '',
                        nickname: '',
                        gender: 'ไม่ระบุ',
                        birthDateISO: '',
                        phone: '',
                        parentName: ''
                    };
                    this.caseForm = {
                        grade: '',
                        advisor: '',
                        serviceDateISO: '2026-10-26',
                        presentingProblem: '',
                        issueCategories: [],
                        otherIssueText: '',
                        bioNote: '',
                        psychoNote: '',
                        socialNote: '',
                        selectedTools: [],
                        customToolsText: '',
                        bioScore: null,
                        psychoScore: null,
                        socialScore: null,
                        carePlan: '',
                        followUpTopic: '',
                        scheduleNextAppointment: false,
                        nextApptDateISO: this.addDaysISO(this.todayISO(), 7),
                        nextApptStartTime: '10:00',
                        nextApptEndTime: '11:00',
                        nextApptCounselor: (this.authUser && this.authUser.id) || '',
                        nextApptNote: ''
                    };
                    this.specialistForm = {
                        assessedAtISO: '2026-10-26T11:00',
                        purpose: '',
                        clinicalNote: '',
                        st5Answers: [null, null, null, null, null],
                        gad7Answers: [null, null, null, null, null, null, null],
                        sdqInformantVersion: 'student',
                        sdqAnswers: Array(25).fill(null),
                        familyMembers: [],
                        genogramFacts: '',
                        genogramObservations: '',
                        ecomapNodes: []
                    };
                },

                openNewLogModal() {
                    this.formStudentId = '';
                    this.formBehaviors = [];
                    this.formNote = '';
                    this.resetCaseForm();
                    this.checkCaseDraft();
                    this.showNewLogModal = true;
                },

                openNewLogModalFromProfile() {
                    this.resetCaseForm();
                    if (this.activeStudent) {
                        this.formStudentId = this.activeStudent.id;
                        this.onSelectStudentForCase();
                    }
                    this.formBehaviors = [];
                    this.formNote = '';
                    this.checkCaseDraft();
                    this.showProfileModal = false;
                    this.showNewLogModal = true;
                },

                async submitNewLogCore() {
                    if (this.isSubmittingCase) return;
                    this.caseFormValidationError = '';

                    // 1. Validate Student Selection or New Student Creation
                    let targetStudent = null;
                    if (this.isCreatingNewStudentInCase) {
                        if (!this.newStudentIntake.name.trim()) {
                            this.caseFormValidationError = '⚠️ กรุณาระบุชื่อ-นามสกุลนักเรียนใหม่';
                            this.intakeActiveTab = 'client_info';
                            return;
                        }
                    } else {
                        targetStudent = this.students.find(s => s.id == this.formStudentId);
                        if (!targetStudent) {
                            this.caseFormValidationError = '⚠️ กรุณาเลือกผู้รับบริการจากรายชื่อในระบบ หรือสลับเป็นโหมดเพิ่มนักเรียนใหม่';
                            this.intakeActiveTab = 'client_info';
                            return;
                        }
                    }

                    if (!this.caseForm.grade || !this.caseForm.advisor) {
                        this.caseFormValidationError = '⚠️ กรุณาระบุระดับชั้นและครูที่ปรึกษาให้ครบถ้วน';
                        this.intakeActiveTab = 'client_info';
                        return;
                    }

                    if (!this.caseForm.presentingProblem.trim() || this.caseForm.issueCategories.length === 0) {
                        this.caseFormValidationError = '⚠️ กรุณากรอกประเด็นปัญหาแรกรับและเลือกประเภทของประเด็นปัญหาอย่างน้อย 1 ประเภท';
                        this.intakeActiveTab = 'presenting_issue';
                        return;
                    }
                    const wantsOther = this.caseForm.issueCategories.includes(this.otherIssueCategory);
                    if (wantsOther && !(this.caseForm.otherIssueText || '').trim()) {
                        this.caseFormValidationError = '⚠️ กรุณาระบุรายละเอียดของ “ระบุประเด็นปัญหาอื่นๆ”';
                        this.intakeActiveTab = 'presenting_issue';
                        return;
                    }
                    const specialist = this.canRecordSpecialist();   // tabs 3–4 are required only for the four professions

                    if (specialist && !this.isRiskAssessmentComplete) {
                        this.caseFormValidationError = '⚠️ กรุณาประเมินคะแนนความเสี่ยงทั้ง 3 ด้าน (ชีวภาพ, จิตวิทยา, สังคม) ให้ครบถ้วนก่อนบันทึก';
                        this.intakeActiveTab = 'biopsychosocial';
                        return;
                    }

                    if (specialist && !this.caseForm.carePlan.trim()) {
                        this.caseFormValidationError = '⚠️ กรุณาระบุแผนการให้ความช่วยเหลือ (Intervention Plan)';
                        this.intakeActiveTab = 'care_plan';
                        return;
                    }

                    if (!this.can('create_case')) { this.caseFormValidationError = 'บัญชีของคุณไม่มีสิทธิ์บันทึกเคส'; return; }
                    this.isSubmittingCase = true;

                    try {
                        const allToolsUsed = [
                            ...this.caseForm.selectedTools,
                            ...(this.caseForm.customToolsText.trim() ? [this.caseForm.customToolsText.trim()] : [])
                        ];
                        // tabs 3–4 are sent only by the four professions; the summary note is composed on the server
                        const restricted = specialist ? {
                            bioScore: this.caseForm.bioScore, psychoScore: this.caseForm.psychoScore, socialScore: this.caseForm.socialScore,
                            bioNote: this.caseForm.bioNote.trim(), psychoNote: this.caseForm.psychoNote.trim(), socialNote: this.caseForm.socialNote.trim(),
                            carePlan: this.caseForm.carePlan.trim(), followUpTopic: this.caseForm.followUpTopic.trim()
                        } : {};

                        // Everything below is validated, re-scored and permission-checked again on the server.
                        const payload = {
                            clientId: this.isCreatingNewStudentInCase ? null : targetStudent.id,
                            newClient: this.isCreatingNewStudentInCase ? {
                                name: this.newStudentIntake.name.trim(), nickname: this.newStudentIntake.nickname.trim(), studentId: this.newStudentIntake.studentId || '',
                                gender: this.newStudentIntake.gender || 'ไม่ระบุ', birthDateISO: this.newStudentIntake.birthDateISO || '',
                                dob: this.newStudentIntake.birthDateISO ? this.formatThaiDateDisplay(this.newStudentIntake.birthDateISO) : 'ไม่ระบุ',
                                phone: this.newStudentIntake.phone || '', parentName: this.newStudentIntake.parentName || '',
                                grade: this.caseForm.grade, advisor: this.caseForm.advisor
                            } : null,
                            clientUpdates: { grade: this.caseForm.grade, advisor: this.caseForm.advisor },
                            log: Object.assign({
                                serviceDateISO: this.caseForm.serviceDateISO, date: this.formatThaiDateDisplay(this.caseForm.serviceDateISO),
                                clientCategory: this.selectedClientType, behaviors: [...this.caseForm.issueCategories],
                                otherIssueText: wantsOther ? this.caseForm.otherIssueText.trim() : '',
                                presentingProblem: this.caseForm.presentingProblem.trim(), tools: allToolsUsed, extraNote: this.formNote.trim()
                            }, restricted),
                            assessments: [],
                            extras: null
                        };

                        if (specialist) {
                            const assessedDisplay = this.formatThaiDateDisplay((this.specialistForm.assessedAtISO || '').slice(0, 10)) + ' • ' + ((this.specialistForm.assessedAtISO || '').slice(11, 16) || '-') + ' น.';
                            const common = { assessedAtISO: this.specialistForm.assessedAtISO, assessedAtDisplay: assessedDisplay, clinicalNote: this.specialistForm.clinicalNote || '-' };
                            if (this.st5Evaluation.isComplete) payload.assessments.push(Object.assign({}, common, {
                                toolCode: 'ST-5', toolName: 'แบบประเมินความเครียด (ST-5)', version: 'กรมสุขภาพจิต กระทรวงสาธารณสุข (2-4 สัปดาห์)',
                                purpose: this.specialistForm.purpose || 'ประเมินร่วมกับการบันทึกเคส', totalScore: this.st5Evaluation.totalScore,
                                scoreText: `${this.st5Evaluation.totalScore} / 15 คะแนน`, completenessStatus: 'ตอบครบ 5/5 ข้อ',
                                rawAnswers: this.st5Questions.map((q, idx) => { const sc = this.specialistForm.st5Answers[idx]; const opt = this.st5Options.find(o => o.val === sc); return { question: q, score: sc, choiceLabel: opt ? opt.label : '' }; })
                            }));
                            if (this.gad7Evaluation.isComplete) payload.assessments.push(Object.assign({}, common, {
                                toolCode: 'GAD-7', toolName: 'แบบประเมินความวิตกกังวลทั่วไป (GAD-7)', version: 'GAD-7 Thai Standard (2 สัปดาห์)',
                                purpose: this.specialistForm.purpose || 'คัดกรองความวิตกกังวล', totalScore: this.gad7Evaluation.totalScore,
                                scoreText: `${this.gad7Evaluation.totalScore} / 21 คะแนน`, completenessStatus: 'ตอบครบ 7/7 ข้อ',
                                rawAnswers: this.gad7Questions.map((q, idx) => { const sc = this.specialistForm.gad7Answers[idx]; const opt = this.gad7Options.find(o => o.val === sc); return { question: q, score: sc, choiceLabel: opt ? opt.label : '' }; })
                            }));
                            if (this.sdqEvaluation.isComplete) {
                                const informantLabel = this.specialistForm.sdqInformantVersion === 'student' ? 'ฉบับนักเรียนประเมินตนเอง' : (this.specialistForm.sdqInformantVersion === 'teacher' ? 'ฉบับครูประเมิน' : 'ฉบับผู้ปกครองประเมิน');
                                payload.assessments.push(Object.assign({}, common, {
                                    toolCode: 'SDQ', informant: this.specialistForm.sdqInformantVersion, toolName: `แบบประเมินจุดแข็งและจุดอ่อน (SDQ - ${informantLabel})`,
                                    version: 'กรมสุขภาพจิต กระทรวงสาธารณสุข (25 ข้อ)', purpose: this.specialistForm.purpose || 'ประเมินพฤติกรรมและจุดแข็ง-จุดอ่อน',
                                    totalScore: this.sdqEvaluation.totalDifficulties, scoreText: `คะแนนรวมปัญหา ${this.sdqEvaluation.totalDifficulties} / 40 คะแนน`,
                                    completenessStatus: 'ตอบครบ 25/25 ข้อ', subscales: this.sdqEvaluation.subscales,
                                    rawAnswers: this.sdqItems.map((item, idx) => { const rawVal = this.specialistForm.sdqAnswers[idx]; const opt = this.sdqOptions.find(o => o.val === rawVal); return { question: item.text, score: rawVal, choiceLabel: opt ? opt.label : '' }; })
                                }));
                            }
                            const extras = {};
                            if (this.specialistForm.familyMembers.length) extras.familyMembers = [...this.specialistForm.familyMembers];
                            if (this.specialistForm.ecomapNodes.length) extras.ecomapNodes = [...this.specialistForm.ecomapNodes];
                            if (this.specialistForm.genogramFacts.trim()) extras.genogramFacts = this.specialistForm.genogramFacts.trim();
                            if (this.specialistForm.genogramObservations.trim()) extras.genogramObservations = this.specialistForm.genogramObservations.trim();
                            if (Object.keys(extras).length) payload.extras = extras;
                        }

                        const r = await this.apiCall('case.save', payload);
                        if (!r.ok) {
                            this.caseFormValidationError = 'บันทึกไม่สำเร็จ: ' + r.message + ' — ข้อมูลในฟอร์มยังอยู่ กรุณาแก้ไขแล้วลองใหม่';
                            this.awHandleDenied(r);
                            return;
                        }

                        // Apply exactly what the server stored.
                        const d = r.data;
                        const saved = this.normalizeClient(d.client);
                        let local = this.students.find(s => s.id === saved.id);
                        if (local) Object.assign(local, saved); else { this.students.unshift(saved); local = saved; }
                        if (!this.logsLoaded && !this.__logsFull[saved.id] && this.logCounts) this.logCounts[saved.id] = (this.logCounts[saved.id] || 0) + 1;
                        this.logs[saved.id] = [d.log, ...(this.logs[saved.id] || [])];
                        if (d.assessments && d.assessments.length) this.mentalHealthAssessments[saved.id] = [...d.assessments, ...(this.mentalHealthAssessments[saved.id] || [])];
                        if (d.extras) {
                            if (d.extras.familyMembers) this.studentFamilyRecords[saved.id] = d.extras.familyMembers;
                            if (d.extras.ecomapNodes) this.studentEcomapRecords[saved.id] = d.extras.ecomapNodes;
                        }
                        if (Array.isArray(d.reportRows)) { this.serverReportRows = d.reportRows; this.reportsLoaded = true; }
                        const targetName = saved.name;

                        // Next appointment: saved as a real appointment on the server (same store as the calendar)
                        let apptNote = '';
                        if (specialist && this.caseForm.scheduleNextAppointment && this.caseForm.nextApptDateISO && this.can('manage_appointments')) {
                            const ar = await this.saveAppointment({
                                clientId: saved.id, dateISO: this.caseForm.nextApptDateISO,
                                startTime: this.caseForm.nextApptStartTime || '10:00', endTime: this.caseForm.nextApptEndTime || '11:00',
                                type: 'follow_up', status: 'scheduled', responsibleUserId: this.caseForm.nextApptCounselor || (this.authUser && this.authUser.id),
                                topic: (this.caseForm.followUpTopic.trim() || this.caseForm.nextApptNote.trim() || 'นัดติดตามผลการให้คำปรึกษา').slice(0, 300)
                            });
                            apptNote = ar.ok ? ' • ลงนัดติดตามผลแล้ว' : ' • แต่ลงนัดหมายไม่สำเร็จ: ' + ar.message;
                        }

                        this.showNewLogModal = false;
                        this.isCaseFormDirty = false;
                        await this.openProfile(local);
                        this.showToast('✅ บันทึกข้อมูลผู้รับบริการบนเซิร์ฟเวอร์สำเร็จ' + (typeof d.log.avgScore === 'number' ? ` • คะแนนความเสี่ยงเฉลี่ย ${d.log.avgScore}/10` : ' (แถบที่ 1–2)') + apptNote);
                    } finally {
                        this.isSubmittingCase = false;
                    }
                },

                openA4ReferralPrint(student) {
                    const studentLogs = this.logs[student.id] || [];
                    const lastLog = studentLogs[0] || { behaviors: ['ประเมินทั่วไป'], note: 'ไม่มีบันทึก' };
                    this.printData.studentName = student.name;
                    this.printData.grade = student.grade;
                    this.printData.riskText = student.riskLevel === 'red' ? 'สีแดง (High Risk)' : (student.riskLevel === 'yellow' ? 'สีเหลือง (Moderate Risk)' : (student.riskLevel === 'green' ? 'สีเขียว (ปกติ)' : 'ยังไม่ได้ประเมิน'));
                    this.printData.behaviors = lastLog.behaviors.join(', ');
                    this.printData.note = lastLog.note;
                    this.printData.counselorName = this.username;
                    this.showProfileModal = false;
                    setTimeout(() => { window.print(); }, 200);
                }
            }
        }
    