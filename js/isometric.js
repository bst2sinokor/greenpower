// ================================================
// 부산그린파워 - 아이소메트릭 매립 부지 시각화
//
// 실제 부지 배치 (항공사진 기준):
//   +---------------------------------+
//   |  [2공구]  [3공구]  [  4공구  ]  |  <- 상단 (안쪽)
//   |                                 |
//   |         [      1공구      ]     |  <- 하단 전체 폭 (가장 큰 구역)
//   +---------------------------------+
//
// 순수 SVG (외부 라이브러리 없음)
// ================================================

const ISO = {
    W: 900,
    H: 620,

    project(x, y, z) {
        return { sx: (x - z) * 50, sy: (x + z) * 29 - y * 58 };
    },

    fillColor(ratio) {
        if (ratio < 0.5)  return { top: '#4ade80', left: '#16a34a', right: '#15803d' };
        if (ratio < 0.75) return { top: '#fde047', left: '#ca8a04', right: '#a16207' };
        if (ratio < 0.9)  return { top: '#fb923c', left: '#c2410c', right: '#9a3412' };
        return               { top: '#f87171', left: '#dc2626', right: '#991b1b' };
    },

    emptyColor: { top: '#d1fae5', left: '#a7f3d0', right: '#6ee7b7' },

    getOffset() { return { x: this.W * 0.5, y: this.H * 0.74 }; },

    createEl(tag, attrs, text) {
        const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        if (text !== undefined) e.textContent = text;
        return e;
    },

    makePoly(pts, fill, stroke, strokeW, opacity) {
        const off = this.getOffset();
        const coords = pts.map(p => `${p.sx + off.x},${p.sy + off.y}`).join(' ');
        return this.createEl('polygon', {
            points: coords, fill,
            stroke: stroke || 'rgba(255,255,255,0.5)',
            'stroke-width': strokeW || '0.8',
            opacity: opacity || '1'
        });
    },

    makeLine(a, b, color, w, opacity) {
        const off = this.getOffset();
        return this.createEl('line', {
            x1: a.sx+off.x, y1: a.sy+off.y,
            x2: b.sx+off.x, y2: b.sy+off.y,
            stroke: color||'#475569', 'stroke-width': w||'1', opacity: opacity||'0.6'
        });
    },

    makeText(pt, content, size, weight, color, anchor) {
        const off = this.getOffset();
        return this.createEl('text', {
            x: pt.sx+off.x, y: pt.sy+off.y,
            'font-size': size||'12', 'font-weight': weight||'600',
            fill: color||'#1e293b', 'text-anchor': anchor||'middle',
            'font-family': 'Noto Sans KR, sans-serif'
        }, content);
    },

    // 단일 셀(직육면체) 그리기
    // ox, oz: 좌하단 기준점 / w: 폭 / d: 깊이 / hMax: 최대높이
    // ratio: 채움 비율(0~1)
    drawCell(svg, ox, oz, w, d, hMax, ratio) {
        ratio = Math.max(0, Math.min(1, ratio));
        const hFill = hMax * ratio;
        const fc = ratio > 0.02 ? this.fillColor(ratio) : { top: '#e0f2fe', left: '#bae6fd', right: '#7dd3fc' };

        const v = (dx, dy, dz) => this.project(ox+dx, dy, oz+dz);
        const B = [v(0,0,0), v(w,0,0), v(w,0,d), v(0,0,d)];
        const F = [v(0,hFill,0), v(w,hFill,0), v(w,hFill,d), v(0,hFill,d)];
        const T = [v(0,hMax,0), v(w,hMax,0), v(w,hMax,d), v(0,hMax,d)];

        // 아랫면 (y=0) — 항상 바닥
        svg.appendChild(this.makePoly([B[0],B[1],B[2],B[3]], fc.right, null, null, '0.5'));

        // 채움 영역 — 6면 전체
        if (ratio > 0.02) {
            svg.appendChild(this.makePoly([B[2],B[3],F[3],F[2]], fc.right, null, null, '0.7')); // 뒷면 (z=oz+d)
            svg.appendChild(this.makePoly([B[1],B[2],F[2],F[1]], fc.left,  null, null, '0.8')); // 오른쪽면 (x=ox+w)
            svg.appendChild(this.makePoly([B[3],B[0],F[0],F[3]], fc.right));                    // 왼쪽면 (x=ox)
            svg.appendChild(this.makePoly([B[0],B[1],F[1],F[0]], fc.left));                     // 앞면 (z=oz)
            svg.appendChild(this.makePoly([F[0],F[1],F[2],F[3]], fc.top));                      // 윗면
        }
        // 빈 영역 — 6면 투명하게
        if (ratio < 0.98) {
            svg.appendChild(this.makePoly([F[2],F[3],T[3],T[2]], fc.right, null, null, '0.18')); // 뒷면 빈 부분
            svg.appendChild(this.makePoly([F[1],F[2],T[2],T[1]], fc.left,  null, null, '0.18')); // 오른쪽면 빈 부분
            svg.appendChild(this.makePoly([F[3],F[0],T[0],T[3]], fc.right, null, null, '0.28')); // 왼쪽 빈 부분
            svg.appendChild(this.makePoly([F[0],F[1],T[1],T[0]], fc.left,  null, null, '0.28')); // 앞면 빈 부분
            svg.appendChild(this.makePoly([T[0],T[1],T[2],T[3]], fc.top,   null, null, '0.18')); // 윗면 빈 부분
        } else {
            svg.appendChild(this.makePoly([T[0],T[1],T[2],T[3]], fc.top));
        }

        // 테두리 (모든 공구 동일)
        [[B[0],B[1]],[B[1],B[2]],[B[2],B[3]],[B[3],B[0]],
         [T[0],T[1]],[T[1],T[2]],[T[2],T[3]],[T[3],T[0]],
         [B[0],T[0]],[B[1],T[1]],[B[2],T[2]],[B[3],T[3]]
        ].forEach(([a,b]) => svg.appendChild(this.makeLine(a, b, '#475569', '1', '0.7')));
    },

    // % 뱃지를 모든 블록 위에 마지막으로 그림 — 1공구에 가려지지 않도록
    drawFloatingLabel(svg, ox, oz, w, d, hMax, ratio, label) {
        const off = this.getOffset();
        const pct = Math.round(ratio * 100);
        const bgColor = ratio < 0.5 ? '#16a34a' : ratio < 0.75 ? '#ca8a04' : ratio < 0.9 ? '#c2410c' : '#dc2626';

        // 공구명 라벨
        const lp = this.project(ox+w/2, hMax+0.22, oz+d/2);
        svg.appendChild(this.makeText(lp, label, '13', '800', '#1e293b'));

        // % 뱃지 (pill 형태)
        if (ratio > 0.02) {
            const pp = this.project(ox+w/2, hMax+0.58, oz+d/2);
            const bx = pp.sx + off.x;
            const by = pp.sy + off.y;
            svg.appendChild(this.createEl('rect', {
                x: bx-22, y: by-12, width: 44, height: 20, rx: 10,
                fill: bgColor, opacity: '0.93',
                stroke: 'white', 'stroke-width': '1.5'
            }));
            svg.appendChild(this.createEl('text', {
                x: bx, y: by+1,
                'text-anchor': 'middle', 'dominant-baseline': 'middle',
                'font-size': '12', 'font-weight': '800', fill: 'white',
                'font-family': 'Noto Sans KR, sans-serif'
            }, pct + '%'));
        }
    },

    // 메인 렌더 함수
    // phases: [{ num, label, used, total, permitExpiry }]
    render(containerId, phases) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const svg = this.createEl('svg', {
            width: this.W, height: this.H,
            viewBox: '0 0 ' + this.W + ' ' + this.H,
            style: 'max-width:100%;height:auto;display:block;'
        });

        // 글로우 필터
        const defs = this.createEl('defs');
        const filt = this.createEl('filter', { id:'glow', x:'-30%', y:'-30%', width:'160%', height:'160%' });
        const blur = this.createEl('feGaussianBlur', { stdDeviation:'3', result:'coloredBlur' });
        const merge = this.createEl('feMerge');
        merge.appendChild(this.createEl('feMergeNode', { in:'coloredBlur' }));
        merge.appendChild(this.createEl('feMergeNode', { in:'SourceGraphic' }));
        filt.appendChild(blur); filt.appendChild(merge);
        defs.appendChild(filt);
        svg.appendChild(defs);

        this.drawGrid(svg);

        // 실제 부지 배치 — 2,3,4공구(뒤)와 1공구(앞) 간격을 충분히 확보
        // 렌더 순서: 뒤(z 작음)에서 앞(z 큼)으로 - 화가 알고리즘
        const layout = [
            { n:2,  ox:-4.8, oz:-3.8, w:2.0, d:2.1, h:2.0 }, // 2공구: 상단 좌
            { n:3,  ox:-2.6, oz:-3.8, w:2.0, d:2.1, h:2.0 }, // 3공구: 상단 중
            { n:4,  ox:-0.4, oz:-3.8, w:2.6, d:2.1, h:2.2 }, // 4공구: 상단 우
            { n:1,  ox:-4.8, oz: 0.7, w:7.0, d:2.4, h:2.5 }, // 1공구: 하단 전체
        ];

        // 1단계: 모든 블록 몸체 렌더링
        layout.forEach(cell => {
            const p = phases.find(p => p.num === cell.n) ||
                      { num: cell.n, label: cell.n+'공구', used: 0, total: 1 };
            const ratio = p.total > 0 ? p.used / p.total : 0;
            this.drawCell(svg, cell.ox, cell.oz, cell.w, cell.d, cell.h, ratio);
        });

        // 2단계: 모든 % 뱃지를 마지막에 렌더링 → 1공구에 가려지지 않음
        layout.forEach(cell => {
            const p = phases.find(p => p.num === cell.n) ||
                      { num: cell.n, label: cell.n+'공구', used: 0, total: 1 };
            const ratio = p.total > 0 ? p.used / p.total : 0;
            this.drawFloatingLabel(svg, cell.ox, cell.oz, cell.w, cell.d, cell.h,
                ratio, p.label || (cell.n+'공구'));
        });

        this.drawLegend(svg);

        svg.appendChild(this.createEl('text', {
            x: this.W/2, y: 22, 'text-anchor':'middle',
            'font-size':'13', 'font-weight':'700', fill:'#374151',
            'font-family':'Noto Sans KR, sans-serif'
        }, '부산그린파워 매립 부지 현황'));

        container.appendChild(svg);
    },

    drawGrid(svg) {
        const off = this.getOffset();
        for (let x = -6; x <= 4; x++) {
            for (let z = -4; z <= 4; z++) {
                const pts = [
                    this.project(x,0,z), this.project(x+1,0,z),
                    this.project(x+1,0,z+1), this.project(x,0,z+1)
                ];
                svg.appendChild(this.createEl('polygon', {
                    points: pts.map(p=>p.sx+off.x+','+( p.sy+off.y)).join(' '),
                    fill:'#f0fdf4', stroke:'#bbf7d0', 'stroke-width':'0.5'
                }));
            }
        }
    },

    drawLegend(svg) {
        const items = [
            { color:'#4ade80', label:'0~50% (여유)' },
            { color:'#fde047', label:'50~75% (주의)' },
            { color:'#fb923c', label:'75~90% (경고)' },
            { color:'#f87171', label:'90%+ (포화)' },
        ];
        const x0=14, y0=this.H-128;
        const gap=22;

        // 배경 박스
        svg.appendChild(this.createEl('rect', {
            x:x0-6, y:y0-20, width:'120', height: String(items.length*gap+22),
            fill:'rgba(255,255,255,0.85)', rx:'6', stroke:'#e2e8f0', 'stroke-width':'1'
        }));

        svg.appendChild(this.createEl('text', {
            x:x0, y:y0-6, 'font-size':'10', 'font-weight':'700',
            fill:'#94a3b8', 'font-family':'Noto Sans KR, sans-serif'
        }, '사용률 범례'));

        items.forEach((item, i) => {
            const y = y0 + i*gap + 12;
            if (item.dot) {
                svg.appendChild(this.createEl('circle', { cx:x0+6, cy:y-4, r:'5', fill:item.color }));
            } else {
                svg.appendChild(this.createEl('rect', { x:x0, y:y-10, width:'13', height:'11', fill:item.color, rx:'2' }));
            }
            svg.appendChild(this.createEl('text', {
                x:x0+20, y:y, 'font-size':'11', fill:'#374151',
                'font-family':'Noto Sans KR, sans-serif'
            }, item.label));
        });
    },

};
