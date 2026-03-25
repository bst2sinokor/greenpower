// ================================================
// 일일 데이터 입력 로직
// ================================================

let currentUser = null;
let currentRecord = null; // 기존 데이터 (수정 시)
let prevCumulative = [0, 0, 0, 0]; // 선택 날짜 이전까지의 공구별 누적 (당일 제외)
let prevLeachateRemaining = 0; // 전날 침출수 잔량

// ---- 초기화 ----
document.addEventListener('DOMContentLoaded', async () => {
    const session = await Auth.requireRole(['entry', 'viewer']);
    if (!session) return;
    currentUser = session.user;
    Auth.setHeaderUser(session.profile.name, session.profile.role);
    if (session.profile.role === 'viewer') {
        document.getElementById('btn-dashboard').style.display = '';
    }

    // 기본값: 어제
    const dateInput = document.getElementById('entry-date');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split('T')[0];
    dateInput.value = yd;
    dateInput.max = getTodayStr(); // 미래 날짜 입력 불가

    await loadDateData(dateInput.value);

    // 날짜 변경 이벤트
    dateInput.addEventListener('change', () => loadDateData(dateInput.value));
    document.getElementById('btn-prev-day').addEventListener('click', () => moveDay(-1));
    document.getElementById('btn-next-day').addEventListener('click', () => moveDay(1));

    // 콤마 포맷 (합계 계산보다 먼저 등록해야 getVal이 정상 동작)
    setupCommaFormat();

    // 공구별 입력 시 누적 실시간 반영
    [1,2,3,4].forEach(n => {
        const el = document.getElementById(`phase${n}_used_m3`);
        if (el) el.addEventListener('input', updateCalculations);
    });

    // 합계 실시간 계산
    setupAutoCalc();

    // 저장/초기화
    document.getElementById('btn-save').addEventListener('click', saveData);
    document.getElementById('btn-clear').addEventListener('click', clearForm);
});

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function moveDay(delta) {
    const dateInput = document.getElementById('entry-date');
    const d = new Date(dateInput.value);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split('T')[0];
    if (newDate > getTodayStr()) return; // 미래 이동 불가
    dateInput.value = newDate;
    loadDateData(newDate);
}

// ---- 날짜별 기존 데이터 로드 ----
async function loadDateData(dateStr) {
    clearFormFields();
    currentRecord = null;

    const { data, error } = await supabase
        .from('daily_operations')
        .select('*')
        .eq('entry_date', dateStr)
        .single();

    const statusBadge = document.getElementById('entry-status');
    if (data && !error) {
        // 기존 데이터 → 수정 모드
        currentRecord = data;
        fillForm(data);
        statusBadge.textContent = '✎ 수정 모드';
        statusBadge.className = 'status-badge edit';
    } else {
        statusBadge.textContent = '● 신규 입력';
        statusBadge.className = 'status-badge new';
    }

    // 선택 날짜 이전까지의 누적 로드 (당일 제외)
    const { data: prevRows } = await supabase
        .from('daily_operations')
        .select('phase1_used_m3, phase2_used_m3, phase3_used_m3, phase4_used_m3')
        .lt('entry_date', dateStr);
    prevCumulative = [1,2,3,4].map(n =>
        (prevRows || []).reduce((s, d) => s + (d[`phase${n}_used_m3`] || 0), 0)
    );

    // 전날 침출수 잔량 로드
    const prevDate = new Date(dateStr); // UTC 기준 파싱 (로컬타임 변환 방지)
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const { data: prevDay } = await supabase
        .from('daily_operations')
        .select('gas_methane_ppm')
        .eq('entry_date', prevDateStr)
        .single();
    prevLeachateRemaining = prevDay?.gas_methane_ppm || 0;

    updateCalculations();
}

// ---- 폼 채우기 ----
const FIELDS = [
    'intake_mixed', 'intake_organic', 'intake_inorganic', 'intake_construction', 'intake_special',
    'truck_count',
    'phase1_used_m3', 'phase2_used_m3', 'phase3_used_m3', 'phase4_used_m3',
    'revenue_processing', 'revenue_loading', 'revenue_transport',
    'cost_labor', 'cost_equipment', 'cost_cover_soil', 'cost_leachate', 'cost_other',
    'leachate_generated_m3', 'leachate_treated_m3', 'gas_methane_ppm',
    'memo'
];

function fillForm(data) {
    FIELDS.forEach(f => {
        const el = document.getElementById(f);
        if (el && data[f] != null) {
            el.value = data[f];
            if (f !== 'memo') applyCommaFormat(el);
        }
    });
}

function clearFormFields() {
    FIELDS.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = f === 'memo' ? '' : '';
    });
}

function clearForm() {
    if (!confirm('입력한 내용을 모두 초기화하시겠습니까?')) return;
    clearFormFields();
    currentRecord = null;
    updateCalculations();
}

// ---- 자동 합계 계산 ----
function setupAutoCalc() {
    const intakeFields = ['intake_mixed', 'intake_organic', 'intake_inorganic', 'intake_construction', 'intake_special'];
    const revenueFields = ['revenue_mixed', 'revenue_organic', 'revenue_inorganic', 'revenue_construction', 'revenue_special',
        'revenue_processing', 'revenue_loading', 'revenue_transport'];
    const costFields = ['cost_labor', 'cost_equipment', 'cost_cover_soil', 'cost_leachate', 'cost_other'];
    const leachateFields = ['leachate_generated_m3', 'leachate_treated_m3'];
    const allFields = [...intakeFields, ...revenueFields, ...costFields, ...leachateFields, 'truck_count'];

    allFields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.addEventListener('input', updateCalculations);
    });
}

// ---- 콤마 포맷 ----
function toComma(val) {
    const s = String(val).replace(/[^0-9.]/g, '');
    const [int, dec] = s.split('.');
    const formatted = (int || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? formatted + '.' + dec : formatted;
}

function applyCommaFormat(el) {
    const cursorPos = el.selectionStart;
    const oldValue = el.value;
    const rawBeforeCursor = oldValue.slice(0, cursorPos).replace(/,/g, '').length;
    const raw = oldValue.replace(/,/g, '');
    if (!raw) return;
    const formatted = toComma(raw);
    if (oldValue === formatted) return;
    el.value = formatted;
    let count = 0, newPos = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] !== ',') count++;
        if (count === rawBeforeCursor) { newPos = i + 1; break; }
    }
    el.setSelectionRange(newPos, newPos);
}

function setupCommaFormat() {
    FIELDS.filter(f => f !== 'memo').forEach(f => {
        const el = document.getElementById(f);
        if (el) el.addEventListener('input', () => applyCommaFormat(el));
    });
}

function getVal(id) {
    const raw = (document.getElementById(id)?.value || '').replace(/,/g, '');
    return parseFloat(raw) || 0;
}

function updateCalculations() {
    const intakeTotal = getVal('intake_mixed') + getVal('intake_organic') + getVal('intake_inorganic')
        + getVal('intake_construction') + getVal('intake_special');

    const intakeEl = document.getElementById('total-intake');
    if (intakeEl) intakeEl.textContent = intakeTotal.toLocaleString('ko', {maximumFractionDigits: 1});

    const trucksEl = document.getElementById('total-trucks');
    if (trucksEl) trucksEl.textContent = Math.round(getVal('truck_count'));

    // 공구별 누적 = 이전 누적 + 당일 입력값
    [1,2,3,4].forEach((n, i) => {
        const el = document.getElementById(`cum-phase${n}`);
        if (el) {
            const total = prevCumulative[i] + getVal(`phase${n}_used_m3`);
            el.textContent = total.toLocaleString('ko', {maximumFractionDigits: 1});
        }
    });

    // 일간 매출총액 자동합산
    const revenueTotal = getVal('revenue_processing') + getVal('revenue_loading') + getVal('revenue_transport');
    const revenueEl = document.getElementById('total-revenue');
    if (revenueEl) revenueEl.textContent = revenueTotal.toLocaleString('ko');

    // 침출수 잔량 자동계산 (전날 잔량 + 유입량 - 처리량)
    const leachateRemaining = prevLeachateRemaining + getVal('leachate_generated_m3') - getVal('leachate_treated_m3');
    const leachateEl = document.getElementById('leachate-remaining');
    if (leachateEl) leachateEl.textContent = leachateRemaining.toLocaleString('ko', {maximumFractionDigits: 1});
    const hiddenEl = document.getElementById('gas_methane_ppm');
    if (hiddenEl) hiddenEl.value = leachateRemaining;
}

// ---- 저장 ----
async function saveData() {
    const dateStr = document.getElementById('entry-date').value;
    if (!dateStr) { showToast('날짜를 선택해 주세요.', 'error'); return; }

    const saveBtn = document.getElementById('btn-save');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    const payload = {};
    FIELDS.filter(f => f !== 'memo').forEach(f => {
        payload[f] = getVal(f);
    });
    payload.memo = document.getElementById('memo')?.value || '';
    payload.entry_date = dateStr;
    payload.entered_by = currentUser.id;

    try {
        let error;
        if (currentRecord) {
            // 수정 (UPDATE)
            ({ error } = await supabase
                .from('daily_operations')
                .update(payload)
                .eq('id', currentRecord.id));
        } else {
            // 신규 (INSERT)
            ({ error } = await supabase
                .from('daily_operations')
                .insert(payload));
        }

        if (error) throw error;

        showToast(`${dateStr} 데이터가 저장되었습니다.`, 'success');
        await loadDateData(dateStr); // 저장 후 재로드 (수정 모드로 전환)
    } catch (e) {
        showToast('저장 실패: ' + e.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 저장하기';
    }
}

// ---- Toast ----
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
    t.className = `toast ${type} show`;
    setTimeout(() => { t.classList.remove('show'); }, 3500);
}
