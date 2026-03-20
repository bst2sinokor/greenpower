// ================================================
// 일일 데이터 입력 로직
// ================================================

let currentUser = null;
let currentRecord = null; // 기존 데이터 (수정 시)

// ---- 초기화 ----
document.addEventListener('DOMContentLoaded', async () => {
    const session = await Auth.requireRole(['entry', 'viewer']);
    if (!session) return;
    currentUser = session.user;
    Auth.setHeaderUser(session.profile.name, session.profile.role);

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
    updateCalculations();
}

// ---- 폼 채우기 ----
const FIELDS = [
    'intake_mixed', 'intake_organic', 'intake_inorganic', 'intake_construction', 'intake_special',
    'truck_count', 'landfill_volume_m3',
    'phase1_used_m3', 'phase2_used_m3', 'phase3_used_m3', 'phase4_used_m3',
    'revenue_mixed', 'revenue_organic', 'revenue_inorganic', 'revenue_construction', 'revenue_special',
    'cost_labor', 'cost_equipment', 'cost_cover_soil', 'cost_leachate', 'cost_other',
    'leachate_generated_m3', 'leachate_treated_m3', 'gas_methane_ppm', 'gas_h2s_ppm',
    'memo'
];

function fillForm(data) {
    FIELDS.forEach(f => {
        const el = document.getElementById(f);
        if (el && data[f] != null) el.value = data[f];
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
    const revenueFields = ['revenue_mixed', 'revenue_organic', 'revenue_inorganic', 'revenue_construction', 'revenue_special'];
    const costFields = ['cost_labor', 'cost_equipment', 'cost_cover_soil', 'cost_leachate', 'cost_other'];
    const allFields = [...intakeFields, ...revenueFields, ...costFields];

    allFields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.addEventListener('input', updateCalculations);
    });
}

function getVal(id) { return parseFloat(document.getElementById(id)?.value) || 0; }

function updateCalculations() {
    const intakeTotal = getVal('intake_mixed') + getVal('intake_organic') + getVal('intake_inorganic')
        + getVal('intake_construction') + getVal('intake_special');
    const revenueTotal = getVal('revenue_mixed') + getVal('revenue_organic') + getVal('revenue_inorganic')
        + getVal('revenue_construction') + getVal('revenue_special');
    const costTotal = getVal('cost_labor') + getVal('cost_equipment') + getVal('cost_cover_soil')
        + getVal('cost_leachate') + getVal('cost_other');
    const profit = revenueTotal - costTotal;

    document.getElementById('total-intake').textContent = intakeTotal.toLocaleString('ko', {maximumFractionDigits: 1});
    document.getElementById('total-revenue').textContent = revenueTotal.toLocaleString('ko');
    document.getElementById('total-cost').textContent = costTotal.toLocaleString('ko');

    const profitEl = document.getElementById('profit-preview');
    profitEl.textContent = (profit >= 0 ? '+' : '') + profit.toLocaleString('ko') + ' 원';
    profitEl.style.color = profit >= 0 ? 'var(--accent-dark)' : 'var(--danger)';
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
