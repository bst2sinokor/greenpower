<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>부산그린파워 - 일일 데이터 입력</title>
<link rel="stylesheet" href="css/style.css">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<style>
.entry-header-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    box-shadow: var(--shadow);
}
.entry-header-bar h2 {
    font-size: 15px;
    font-weight: 700;
    color: var(--primary);
    margin-right: auto;
}
.date-nav { display: flex; align-items: center; gap: 8px; }
.date-nav button {
    background: #f1f5f9;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
}
.date-nav button:hover { background: #e2e8f0; }
.date-nav input[type="date"] {
    padding: 7px 12px;
    border: 1.5px solid var(--accent);
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--primary);
}
.status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
}
.status-badge.new { background: #ffedd5; color: #c2410c; }
.status-badge.edit { background: #fef9c3; color: #854d0e; }

.sections-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
}
@media (max-width: 900px) { .sections-grid { grid-template-columns: 1fr; } }

.section-full { grid-column: 1 / -1; }

.submit-bar {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 0;
}

/* ---- 데이터입력 페이지 주황 테마 오버라이드 ---- */
body {
    --accent: #f97316;
    --accent-dark: #ea580c;
}

@media (max-width: 480px) {
    .form-grid-2col { grid-template-columns: 1fr 1fr !important; }
}

@media (max-width: 600px) {
    .entry-header-bar { gap: 10px; padding: 10px 14px; }
    .entry-header-bar h2 { font-size: 13px; width: 100%; }
    .date-nav button { padding: 5px 8px; font-size: 12px; }
    .date-nav input[type="date"] { font-size: 12px; padding: 5px 8px; }
    .sections-grid { grid-template-columns: 1fr; gap: 12px; }
    .submit-bar { padding: 12px 0; }
    .submit-bar .btn-primary { flex: 1; justify-content: center; }
}

.btn-primary {
    background: linear-gradient(135deg, #f97316, #ea580c);
    box-shadow: 0 2px 8px rgba(249,115,22,0.35);
}
.btn-primary:hover {
    box-shadow: 0 4px 12px rgba(249,115,22,0.45);
}

.total-row {
    background: linear-gradient(135deg, #fff7ed, #ffedd5);
    border-color: #fdba74;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    border-color: #f97316;
    box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
}

@media (min-width: 901px) {
    .push-bottom { margin-top: auto !important; }
}
</style>
</head>
<body>

<header class="app-header">
    <div class="logo">
        <span>🌿 부산그린파워</span>
        <span class="badge" style="background:#f97316;color:white;">데이터 입력</span>
    </div>
    <div class="header-right">
        <span id="user-name">-</span>
        <button id="btn-dashboard" class="btn-logout" onclick="window.location.href='dashboard.html'" style="background:#10b981;display:none;">📊 <span class="pc-only">경영 </span>대시보드</button>
        <button class="btn-logout" id="btn-logout">로그아웃</button>
    </div>
</header>

<main class="main-container">

    <!-- 날짜 선택 바 -->
    <div class="entry-header-bar">
        <h2>일일 운영 실적 입력</h2>
        <div class="date-nav">
            <button id="btn-prev-day">◀ 전날</button>
            <input type="date" id="entry-date">
            <button id="btn-next-day">다음날 ▶</button>
        </div>
        <div class="status-badge new" id="entry-status">● 신규 입력</div>
    </div>

    <!-- 섹션 2열 그리드 -->
    <div class="sections-grid">

        <!-- 섹션 1: 반입량 -->
        <div class="card">
            <div class="card-header">
                <div class="icon">♻</div>
                반입량 현황(당일)
            </div>
            <div class="card-body">
                <div class="form-grid form-grid-2col" style="grid-template-columns:1fr 1fr;">
                    <div class="form-group">
                        <label>폐수처리오니 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="intake_mixed" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>폐토사 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="intake_organic" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>분진 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="intake_inorganic" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>소각재 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="intake_construction" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>기타 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="intake_special" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>차량 대수 <span class="unit">(대)</span></label>
                        <input type="text" inputmode="numeric" id="truck_count" min="0" step="1" placeholder="0">
                    </div>
                </div>
                <div class="total-row" style="margin-top:20px;">
                    <span class="label">총 반입량</span>
                    <span class="value"><span id="total-intake">0.0</span> 톤 &nbsp;(<span id="total-trucks">0</span> 대)</span>
                </div>
            </div>
        </div>

        <!-- 섹션 2: 구역별 매립 현황 -->
        <div class="card">
            <div class="card-header">
                <div class="icon">🏗</div>
                공구별 당일 매립량
            </div>
            <div class="card-body">
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">
                    각 공구에 <strong>오늘 매립된 양</strong>을 입력하세요. 누적은 자동 계산됩니다.
                </p>
                <div class="form-grid form-grid-2col" style="grid-template-columns:1fr 1fr;">
                    <div class="form-group">
                        <label>1공구 당일 매립량 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="phase1_used_m3" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>2공구 당일 매립량 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="phase2_used_m3" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>3공구 당일 매립량 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="phase3_used_m3" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>4공구 당일 매립량 <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="phase4_used_m3" min="0" step="0.1" placeholder="0.0">
                    </div>
                </div>
                <!-- 공구별 누적 매립량 -->
                <div style="margin-top:12px;border:1px solid #fdba74;border-radius:8px;overflow:hidden;">
                    <div style="background:#fff7ed;padding:7px 14px;font-size:11px;font-weight:700;color:#c2410c;border-bottom:1px solid #fdba74;">
                        공구별 누적 매립량 (이전 누적 + 당일 입력)
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;text-align:center;">
                        <div style="padding:10px 6px;border-right:1px solid #fed7aa;">
                            <div style="font-size:10px;color:#64748b;margin-bottom:4px;">1공구</div>
                            <div style="font-size:14px;font-weight:700;color:#ea580c;" id="cum-phase1">-</div>
                            <div style="font-size:9px;color:#94a3b8;">톤</div>
                        </div>
                        <div style="padding:10px 6px;border-right:1px solid #fed7aa;">
                            <div style="font-size:10px;color:#64748b;margin-bottom:4px;">2공구</div>
                            <div style="font-size:14px;font-weight:700;color:#ea580c;" id="cum-phase2">-</div>
                            <div style="font-size:9px;color:#94a3b8;">톤</div>
                        </div>
                        <div style="padding:10px 6px;border-right:1px solid #fed7aa;">
                            <div style="font-size:10px;color:#64748b;margin-bottom:4px;">3공구</div>
                            <div style="font-size:14px;font-weight:700;color:#ea580c;" id="cum-phase3">-</div>
                            <div style="font-size:9px;color:#94a3b8;">톤</div>
                        </div>
                        <div style="padding:10px 6px;">
                            <div style="font-size:10px;color:#64748b;margin-bottom:4px;">4공구</div>
                            <div style="font-size:14px;font-weight:700;color:#ea580c;" id="cum-phase4">-</div>
                            <div style="font-size:9px;color:#94a3b8;">톤</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 섹션 3: 환경 모니터링 -->
        <div class="card" style="display:flex;flex-direction:column;">
            <div class="card-header">
                <div class="icon">🌡</div>
                환경 모니터링(당일)
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;flex:1;min-height:200px;">
                <div class="form-grid" style="grid-template-columns:1fr 1fr;">
                    <div class="form-group">
                        <label>침출수 유입량(매립장->처리장) <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="leachate_generated_m3" min="0" step="0.1" placeholder="0.0">
                    </div>
                    <div class="form-group">
                        <label>침출수 처리량(처리장->외부) <span class="unit">(톤)</span></label>
                        <input type="text" inputmode="numeric" id="leachate_treated_m3" min="0" step="0.1" placeholder="0.0">
                    </div>
                </div>
                <input type="hidden" id="gas_methane_ppm">
                <div class="total-row push-bottom" style="margin-top:20px;">
                    <span class="label">침출수 잔량</span>
                    <span class="value"><span id="leachate-remaining">0.0</span> 톤</span>
                </div>
            </div>
        </div>

        <!-- 섹션 4: 일간 매출액 -->
        <div class="card" style="display:flex;flex-direction:column;">
            <div class="card-header">
                <div class="icon">💰</div>
                일간 매출액
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;flex:1;min-height:260px;">
                <div class="form-grid" style="grid-template-columns:1fr 1fr;">
                    <div class="form-group">
                        <label>처리비 <span class="unit">(원, VAT별도)</span></label>
                        <input type="text" inputmode="numeric" id="revenue_processing" min="0" step="1" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>상차비 <span class="unit">(원, VAT별도)</span></label>
                        <input type="text" inputmode="numeric" id="revenue_loading" min="0" step="1" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>운반비 <span class="unit">(원, VAT별도)</span></label>
                        <input type="text" inputmode="numeric" id="revenue_transport" min="0" step="1" placeholder="0">
                    </div>
                </div>
                <div class="total-row push-bottom" style="margin-top:20px;">
                    <span class="label">당일 매출총액</span>
                    <span class="value"><span id="total-revenue">0</span> 원 <span style="font-size:11px;font-weight:400;color:#92400e;">(VAT별도)</span></span>
                </div>
            </div>
        </div>

        <!-- 섹션 5: 특이사항 (full-width) -->
        <div class="card">
            <div class="card-header">
                <div class="icon">📝</div>
                특이사항 메모
            </div>
            <div class="card-body">
                <textarea id="memo" rows="4" placeholder="당일 특이사항, 민원, 장비 고장, 점검 사항 등을 자유롭게 기입하세요."
                    style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px;resize:vertical;line-height:1.7;"></textarea>
            </div>
        </div>

    </div><!-- /.sections-grid -->

    <!-- 저장 버튼 -->
    <div class="submit-bar">
        <button class="btn btn-secondary" id="btn-clear">초기화</button>
        <button class="btn btn-primary" id="btn-save" style="padding:12px 40px;font-size:15px;">
            💾 저장하기
        </button>
    </div>

</main>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script src="js/supabase.js"></script>
<script src="js/auth.js"></script>
<script src="js/entry.js"></script>
</body>
</html>
