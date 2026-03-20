// ================================================
// 대시보드 로직
// ================================================

let allData = [];       // 조회된 일별 데이터
let phaseConfigs = [];  // phase_config 테이블
let charts = {};        // Chart.js 인스턴스 저장

document.addEventListener('DOMContentLoaded', async () => {
    const session = await Auth.requireRole(['viewer']);
    if (!session) return;
    Auth.setHeaderUser(session.profile.name, session.profile.role);

    // 기본값: 어제
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split('T')[0];
    document.getElementById('sel-start').value = yd;
    document.getElementById('sel-end').value = yd;

    // phase_config 로드
    await loadPhaseConfigs();

    // 기본 조회
    await loadData();

    // 이벤트
    document.getElementById('btn-load').addEventListener('click', loadData);
    document.getElementById('btn-ai').addEventListener('click', generateAI);
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

    allData = data || [];
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
    const avgTrucks = allData.length > 0 ? (sum('truck_count') / allData.length) : 0;
    const totalLandfill = sum('landfill_volume_m3');

    setKPI('kpi-intake', fmt(totalIntake, 1), '톤');
    setKPI('kpi-trucks', fmt(avgTrucks, 1), '대');
    setKPI('kpi-landfill', fmt(totalLandfill, 0), '톤');
    setKPI('kpi-days', allData.length, '일');
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
                <span style="font-size:10px;">(${totalPct1}%)</span>
            </span>
        </div>
        <div class="phase-stat" style="color:rgba(255,255,255,0.8);">
            <span>총 잔여량</span>
            <span style="font-weight:700;color:#4ade80;">${fmt(totalRemain, 1)} <small style="font-weight:400">톤</small>
                <span style="font-size:10px;">(${totalRemPct1}%)</span>
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
    const typeLabels = ['혼합', '유기성', '무기성', '건설', '특수'];
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

    // 3. 수익/비용 (스택 바)
    charts.pnl = new Chart(document.getElementById('chart-pnl'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: '수입', data: allData.map(d => Math.round((d.revenue_total||0)/10000)), backgroundColor: 'rgba(16,185,129,0.7)', stack: 'a' },
                { label: '비용', data: allData.map(d => -Math.round((d.cost_total||0)/10000)), backgroundColor: 'rgba(239,68,68,0.7)', stack: 'b' }
            ]
        },
        options: chartOpts('만원')
    });

    // 4. 침출수 환경 (라인)
    charts.env = new Chart(document.getElementById('chart-env'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: '발생량', data: allData.map(d => d.leachate_generated_m3||0), borderColor: '#f59e0b', tension: 0.3, pointRadius: 3 },
                { label: '처리량', data: allData.map(d => d.leachate_treated_m3||0), borderColor: '#3b82f6', tension: 0.3, pointRadius: 3 }
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

// ---- 일별 상세 테이블 ----
function renderDetailTable() {
    const tbody = document.getElementById('detail-tbody');
    if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">조회된 데이터가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = [...allData].reverse().map(d => {
        const rev = d.revenue_total || 0;
        const cost = d.cost_total || 0;
        const profit = rev - cost;
        return `<tr>
            <td>${d.entry_date}</td>
            <td class="num">${fmt(d.intake_total||0, 1)}</td>
            <td class="num">${fmt(d.landfill_volume_m3||0, 1)}</td>
            <td class="num">${fmt(rev/10000, 0)}</td>
            <td class="num">${fmt(cost/10000, 0)}</td>
            <td class="num ${profit >= 0 ? 'positive' : 'negative'}">${fmt(profit/10000, 0)}</td>
            <td class="num">${d.truck_count||0}</td>
            <td style="font-size:11px;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${d.memo||''}">${d.memo||'-'}</td>
        </tr>`;
    }).join('');
}

// ---- AI 분석 ----
async function generateAI() {
    if (allData.length === 0) { showToast('데이터를 먼저 조회하세요.', 'error'); return; }

    const btn = document.getElementById('btn-ai');
    btn.disabled = true;
    btn.textContent = '분석 중...';

    // api_key.txt 로드
    let apiKey = '';
    try {
        const resp = await fetch('api_key.txt');
        apiKey = (await resp.text()).trim();
    } catch { showToast('api_key.txt 파일을 찾을 수 없습니다.', 'error'); btn.disabled = false; btn.innerHTML = '✨ AI 분석 생성'; return; }

    const totalIntake = sum('intake_total');
    const totalRevenue = sum('revenue_total');
    const totalCost = sum('cost_total');
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(1) : 0;

    const prompt = `다음은 부산그린파워(산업폐기물매립업) 운영 실적 데이터입니다. 한국어로 경영진을 위한 간결한 분석을 제공하세요.

기간: ${allData[0]?.entry_date} ~ ${allData[allData.length-1]?.entry_date} (${allData.length}일)
총 반입량: ${fmt(totalIntake, 1)} 톤
총 수입: ${fmt(totalRevenue/10000, 0)} 만원
총 비용: ${fmt(totalCost/10000, 0)} 만원
영업이익: ${fmt(profit/10000, 0)} 만원
영업이익률: ${margin}%
일평균 차량: ${fmt(sum('truck_count')/allData.length, 1)} 대
총 매립량: ${fmt(sum('landfill_volume_m3'), 1)} 톤
침출수 발생 합계: ${fmt(sum('leachate_generated_m3'), 1)} 톤

다음 JSON 형식으로만 응답하세요:
{
  "conclusion": "핵심 결론 2~3줄",
  "drivers": "주요 동인 2~3줄",
  "watch": "주의 포인트 2~3줄"
}`;

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-iab': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 600,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const result = await res.json();
        const text = result.content?.[0]?.text || '{}';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        document.getElementById('ai-conclusion').textContent = parsed.conclusion || '-';
        document.getElementById('ai-drivers').textContent = parsed.drivers || '-';
        document.getElementById('ai-watch').textContent = parsed.watch || '-';
        showToast('AI 분석이 완료되었습니다.', 'success');
    } catch (e) {
        showToast('AI 분석 실패: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '✨ AI 분석 생성';
    }
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
