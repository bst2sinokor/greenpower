// ================================================
// 대시보드 로직
// ================================================

let allData = [];       // 조회된 일별 데이터
let phaseConfigs = [];  // phase_config 테이블
let charts = {};        // Chart.js 인스턴스 저장
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await Auth.requireRole(['viewer']);
    if (!session) return;
    Auth.setHeaderUser(session.profile.name, session.profile.role);

    // 기본값: 시작 2026-01-01 ~ 어제
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    document.getElementById('sel-start').value = '2026-01-01';
    document.getElementById('sel-end').value = yesterday.toISOString().split('T')[0];

    // phase_config 로드
    await loadPhaseConfigs();

    // 기본 조회
    await loadData();

    // 이벤트
    document.getElementById('btn-load').addEventListener('click', loadData);
});

// ---- Phase Config 로드 ----
async function loadPhaseConfigs() {
    const { data, error } = await supabase.from('phase_config').select('*').order('phase_num');
    if (!error && data) phaseConfigs = data;
}

// ---- 데이터 조회 ----
async function loadData() {
    const start = document.getElementById('sel-start').value;
    const end = document.getElementById('sel-end').value;

    let query = supabase.from('daily_operations').select('*').order('entry_date');
    if (start) query = query.gte('entry_date', start);
    if (end) query = query.lte('entry_date', end);

    const { data, error } = await query;
    if (error) { showToast('데이터 조회 실패: ' + error.message, 'error'); return; }

    // 개별 필드에서 합계 파생값 계산 (parseFloat으로 타입 강제 변환)
    const pf = v => parseFloat(v) || 0;
    currentPage = 1;
    allData = (data || []).map(d => {
        const intakeFromParts = pf(d.intake_mixed) + pf(d.intake_organic) + pf(d.intake_inorganic) + pf(d.intake_construction) + pf(d.intake_special);
        return {
            ...d,
            intake_total:   intakeFromParts > 0 ? intakeFromParts : pf(d.intake_total),
            landfill_daily: pf(d.phase1_used_m3) + pf(d.phase2_used_m3) + pf(d.phase3_used_m3) + pf(d.phase4_used_m3),
            revenue_total:  pf(d.revenue_processing) + pf(d.revenue_loading) + pf(d.revenue_transport),
            cost_total:     pf(d.cost_labor) + pf(d.cost_equipment) + pf(d.cost_cover_soil) + pf(d.cost_leachate) + pf(d.cost_other),
        };
    });
    renderAll();
}

// ---- 전체 렌더링 ----
async function renderAll() {
    renderKPI();
    await renderIsometric();
    renderCharts();
    renderDetailTable();
}

// ---- KPI ----
function renderKPI() {
    if (allData.length === 0) {
        ['kpi-intake','kpi-profit','kpi-margin','kpi-trucks','kpi-landfill','kpi-days']
            .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '-<span class="kpi-unit"></span>'; });
        return;
    }

    const totalIntake = sum('intake_total');
    const totalTrucks = sum('truck_count');
    const avgTrucks = allData.length > 0 ? totalTrucks / allData.length : 0;
    const totalLandfill = sum('landfill_daily');
    const totalRevenue = sum('revenue_total');

    setKPI('kpi-intake', fmt(totalIntake, 1), '톤');
    setKPI('kpi-trucks', fmt(totalTrucks, 0), '대');
    const avgEl = document.getElementById('kpi-trucks-avg');
    if (avgEl) avgEl.textContent = fmt(avgTrucks, 1);
    setKPI('kpi-landfill', fmt(totalLandfill, 0), '톤');
    setKPI('kpi-days', allData.length, '일');
    setKPI('kpi-revenue', fmt(totalRevenue, 0), '원');
}

function setKPI(id, value, unit, isPositive) {
    const el = document.getElementById(id);
    if (!el) return;
    const color = isPositive === undefined ? '' : (isPositive ? 'color:var(--accent-dark)' : 'color:var(--danger)');
    el.innerHTML = `<span style="${color}">${value}</span><span class="kpi-unit">${unit}</span>`;
}

// ---- 아이소메트릭 ----
async function renderIsometric() {
    // 전체 기간 누적 SUM (날짜 필터 무관)
    const { data: allRows } = await supabase
        .from('daily_operations')
        .select('phase1_used_m3, phase2_used_m3, phase3_used_m3, phase4_used_m3');

    const cumulative = [1,2,3,4].map(n =>
        (allRows || []).reduce((s, d) => s + (d[`phase${n}_used_m3`] || 0), 0)
    );

    const phases = phaseConfigs.map((cfg, i) => ({
        num: cfg.phase_num,
        label: `${cfg.phase_num}공구`,
        used: cumulative[i] || 0,
        total: cfg.total_capacity || 1,
        permitExpiry: cfg.permit_expiry
    }));

    if (phases.length === 0) {
        for (let i = 1; i <= 4; i++) phases.push({ num: i, label: `${i}공구`, used: 0, total: 100000, permitExpiry: null });
    }

    ISO.render('iso-container', phases);
    renderPhaseCards(phases);
}

function renderPhaseCards(phases) {
    const container = document.getElementById('phase-cards');
    container.innerHTML = '';

    // 전체 합계 카드 (맨 위)
    const totalPermit  = phases.reduce((s, p) => s + p.total, 0);
    const totalUsed    = phases.reduce((s, p) => s + p.used,  0);
    const totalRemain  = Math.max(0, totalPermit - totalUsed);
    const totalRatio   = totalPermit > 0 ? totalUsed / totalPermit : 0;
    const totalPct1    = (totalRatio * 100).toFixed(1);
    const totalRemPct1 = totalPermit > 0 ? ((totalRemain / totalPermit) * 100).toFixed(1) : '0.0';
    const totalBarClass = totalRatio < 0.5 ? 'green' : totalRatio < 0.75 ? 'yellow' : totalRatio < 0.9 ? 'orange' : 'red';

    container.innerHTML = `
    <div class="phase-info-card" style="background:linear-gradient(135deg,#1a3a5c,#1e4d7b);color:white;border-color:#1a3a5c;">
        <div class="phase-name" style="color:white;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:6px;margin-bottom:8px;">
            <span style="font-size:13px;">전체 합계</span>
            <span style="font-size:12px;font-weight:800;color:#fde047;">${totalPct1}% 사용</span>
        </div>
        <div class="phase-stat" style="color:rgba(255,255,255,0.8);">
            <span>총 허가량</span>
            <span style="font-weight:700;color:white;">${fmt(totalPermit, 1)} <small style="font-weight:400;opacity:0.7">톤</small></span>
        </div>
        <div class="phase-stat" style="color:rgba(255,255,255,0.8);">
            <span>총 기 매립량</span>
            <span style="font-weight:700;color:#fde047;">${fmt(totalUsed, 1)} <small style="font-weight:400">톤</small>
                <span style="font-size:12px;font-weight:800;color:#fff176;"> (${totalPct1}%)</span>
            </span>
        </div>
        <div class="phase-stat" style="color:rgba(255,255,255,0.8);">
            <span>총 잔여량</span>
            <span style="font-weight:700;color:#4ade80;">${fmt(totalRemain, 1)} <small style="font-weight:400">톤</small>
                <span style="font-size:12px;font-weight:800;color:#86efac;"> (${totalRemPct1}%)</span>
            </span>
        </div>
        <div class="progress-wrap" style="margin-top:10px;background:rgba(255,255,255,0.2);">
            <div class="progress-fill ${totalBarClass}" style="width:${totalPct1}%"></div>
        </div>
    </div>`;

    // 공구별 카드
    phases.forEach(p => {
        const ratio = p.total > 0 ? p.used / p.total : 0;
        const pct1 = (ratio * 100).toFixed(1);           // 소수점 1자리
        const remaining = Math.max(0, p.total - p.used);
        const remRatio = p.total > 0 ? remaining / p.total : 0;
        const remPct1 = (remRatio * 100).toFixed(1);
        const barClass = ratio < 0.5 ? 'green' : ratio < 0.75 ? 'yellow' : ratio < 0.9 ? 'orange' : 'red';
        const pctColor = ratio < 0.5 ? '#16a34a' : ratio < 0.75 ? '#d97706' : ratio < 0.9 ? '#ea580c' : '#dc2626';

        container.innerHTML += `
        <div class="phase-info-card" id="phase-card-${p.num}">
            <div class="phase-name">
                <span style="font-size:13px;">${p.label}</span>
                <span style="font-size:12px;font-weight:800;color:${pctColor}">${pct1}% 사용</span>
            </div>
            <div class="phase-stat">
                <span>허가량</span>
                <span style="font-weight:600;">${fmt(p.total, 1)} <small style="font-weight:400;color:var(--text-muted)">톤</small></span>
            </div>
            <div class="phase-stat">
                <span>기 매립량</span>
                <span style="font-weight:700;color:${pctColor}">${fmt(p.used, 1)} <small style="font-weight:400">톤</small>
                    <span style="font-size:10px;color:${pctColor};">(${pct1}%)</span>
                </span>
            </div>
            <div class="phase-stat">
                <span>잔여량</span>
                <span style="font-weight:700;color:var(--accent-dark)">${fmt(remaining, 1)} <small style="font-weight:400">톤</small>
                    <span style="font-size:10px;color:var(--accent-dark);">(${remPct1}%)</span>
                </span>
            </div>
            <div class="progress-wrap" style="margin-top:8px;">
                <div class="progress-fill ${barClass}" style="width:${pct1}%"></div>
            </div>
        </div>`;
    });
}

// ---- 차트 ----
function renderCharts() {
    destroyCharts();

    if (allData.length === 0) return;

    const labels = allData.map(d => d.entry_date.slice(5)); // MM-DD

    // 1. 반입량 추이 (라인)
    charts.intake = new Chart(document.getElementById('chart-intake'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '총 반입량 (톤)',
                data: allData.map(d => d.intake_total || 0),
                borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
                tension: 0.3, fill: true, pointRadius: 3
            }]
        },
        options: chartOpts('톤')
    });

    // 2. 폐기물 유형별 비율 (도넛)
    const typeLabels = ['폐수처리오니', '폐토사', '분진', '소각재', '기타'];
    const typeFields = ['intake_mixed', 'intake_organic', 'intake_inorganic', 'intake_construction', 'intake_special'];
    const typeData = typeFields.map(f => sum(f));
    charts.type = new Chart(document.getElementById('chart-type'), {
        type: 'doughnut',
        data: {
            labels: typeLabels,
            datasets: [{
                data: typeData,
                backgroundColor: ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444'],
                borderWidth: 2, borderColor: '#fff'
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right', labels: { font: { family: 'Noto Sans KR', size: 11 } } } } }
    });

    // 3. 월간 매출 추이 (월별 집계 라인)
    const monthlyMap = {};
    allData.forEach(d => {
        const ym = d.entry_date.slice(0, 7); // YYYY-MM
        monthlyMap[ym] = (monthlyMap[ym] || 0) + (d.revenue_total || 0);
    });
    const monthLabels = Object.keys(monthlyMap).sort();
    const monthValues = monthLabels.map(k => monthlyMap[k]);

    charts.pnl = new Chart(document.getElementById('chart-pnl'), {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: '월 매출 (원)',
                data: monthValues,
                backgroundColor: 'rgba(249,115,22,0.7)',
                borderColor: '#ea580c',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: chartOpts('원')
    });

    // 4. 원수 유입/처리량 (라인)
    charts.env = new Chart(document.getElementById('chart-env'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: '원수 유입량', data: allData.map(d => d.leachate_generated_m3||0), borderColor: '#f59e0b', tension: 0.3, pointRadius: 3 },
                { label: '원수 처리량', data: allData.map(d => d.leachate_treated_m3||0), borderColor: '#3b82f6', tension: 0.3, pointRadius: 3 }
            ]
        },
        options: chartOpts('톤')
    });
}

function chartOpts(unit) {
    return {
        responsive: true,
        plugins: { legend: { labels: { font: { family: 'Noto Sans KR', size: 11 } } } },
        scales: {
            x: { ticks: { font: { family: 'Noto Sans KR', size: 10 }, maxTicksLimit: 15 } },
            y: { ticks: { font: { family: 'Noto Sans KR', size: 10 }, callback: v => v.toLocaleString('ko') + ' ' + unit } }
        }
    };
}

function destroyCharts() {
    Object.values(charts).forEach(c => c.destroy());
    charts = {};
}

// ---- 일별 상세 테이블 (페이지네이션) ----
function renderDetailTable(page) {
    if (page !== undefined) currentPage = page;
    const tbody = document.getElementById('detail-tbody');
    const pagination = document.getElementById('pagination');

    if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">조회된 데이터가 없습니다.</td></tr>';
        pagination.innerHTML = '';
        return;
    }

    const rows = [...allData].reverse();
    const totalPages = Math.ceil(rows.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = pageRows.map(d => {
        const rev = d.revenue_total || 0;
        return `<tr>
            <td>${d.entry_date}</td>
            <td class="num">${fmt(d.intake_total||0, 1)}</td>
            <td class="num">${fmt(rev, 0)}</td>
            <td class="num">${d.truck_count||0}</td>
            <td style="font-size:12px;color:var(--text-muted);" title="${d.memo||''}">${d.memo||'-'}</td>
        </tr>`;
    }).join('');

    // 페이지네이션 버튼
    const btnStyle = (active) =>
        `style="padding:6px 12px;border-radius:6px;border:1px solid var(--border);cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;background:${active ? 'var(--accent)' : 'white'};color:${active ? 'white' : 'var(--text)'};"`;

    let html = `<span style="font-size:12px;color:var(--text-muted);margin-right:8px;">${rows.length}건 / ${totalPages}페이지</span>`;
    html += `<button ${btnStyle(false)} onclick="renderDetailTable(1)" ${currentPage===1?'disabled':''}>«</button>`;
    html += `<button ${btnStyle(false)} onclick="renderDetailTable(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;

    const range = 2;
    for (let i = Math.max(1, currentPage - range); i <= Math.min(totalPages, currentPage + range); i++) {
        html += `<button ${btnStyle(i===currentPage)} onclick="renderDetailTable(${i})">${i}</button>`;
    }

    html += `<button ${btnStyle(false)} onclick="renderDetailTable(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>`;
    html += `<button ${btnStyle(false)} onclick="renderDetailTable(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>`;
    pagination.innerHTML = html;
}

// ---- 유틸 ----
function sum(field) { return allData.reduce((acc, d) => acc + (d[field] || 0), 0); }
function fmt(v, decimals) { return Number(v).toLocaleString('ko', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }); }

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}
