# 부산그린파워 운영관리 시스템

산업폐기물매립 일일 데이터 입력 + 경영 대시보드

---

## 파일 구조

```
14-busan_greenpower/
├── login.html              ← 로그인 (공통)
├── entry.html              ← 일일 데이터 입력 (현장 직원용)
├── dashboard.html          ← 경영 대시보드 (경영진 열람용)
├── supabase_setup.sql      ← DB 초기 설정 SQL
├── js/
│   ├── supabase.js         ← Supabase URL/Key 설정 (수정 필요)
│   ├── auth.js             ← 인증 유틸
│   ├── entry.js            ← 입력 폼 로직
│   ├── dashboard.js        ← 대시보드 로직
│   └── isometric.js        ← 아이소메트릭 SVG 렌더러
├── css/style.css           ← 공통 스타일
└── api_key.txt             ← Claude API 키
```

---

## 설정 순서 (최초 1회)

### Step 1: Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 → 무료 계정 생성
2. **New Project** 클릭 → 프로젝트명: `busan-greenpower`, 비밀번호 설정
3. 프로젝트 생성 완료까지 1~2분 대기

### Step 2: DB 테이블 생성

1. Supabase 대시보드 → **SQL Editor** 클릭
2. `supabase_setup.sql` 파일 전체 내용 복사 후 붙여넣기
3. **Run** 실행
4. `phase_config` 테이블의 각 공구 허가 용량을 실제 값으로 수정:

```sql
-- 실제 허가 용량으로 수정
UPDATE phase_config SET total_capacity = 실제용량 WHERE phase_num = 1;  -- 1공구
UPDATE phase_config SET total_capacity = 실제용량 WHERE phase_num = 2;  -- 2공구
UPDATE phase_config SET total_capacity = 실제용량 WHERE phase_num = 3;  -- 3공구
UPDATE phase_config SET total_capacity = 실제용량 WHERE phase_num = 4;  -- 4공구
```

### Step 3: Supabase 연결 키 설정

1. Supabase 대시보드 → **Settings** → **API**
2. **Project URL** 복사
3. **anon / public** 키 복사
4. `js/supabase.js` 파일 열어서 수정:

```javascript
const SUPABASE_URL = 'https://여기에PROJECT_URL입력.supabase.co';
const SUPABASE_ANON_KEY = '여기에ANON_KEY입력';
```

### Step 4: 사용자 계정 생성

1. Supabase 대시보드 → **Authentication** → **Users** → **Invite user**
2. 이메일 입력 후 초대 발송 (입력자/열람자 각각)
3. SQL Editor에서 각 사용자 UUID 확인 후 프로필 추가:

```sql
-- Authentication > Users 탭에서 UUID 확인 후 입력
INSERT INTO profiles (id, role, name) VALUES
    ('UUID-입력자', 'entry', '홍길동 주임'),   -- 데이터 입력 담당
    ('UUID-열람자', 'viewer', '김철수 부장');  -- 경영진 열람 전용
```

### Step 5: 배포

**GitHub Pages 사용 시 (무료)**
1. GitHub 계정 생성 → New Repository
2. 이 폴더 파일 전체 업로드
3. Settings → Pages → Deploy from branch: main
4. 자동 URL 생성: `https://계정명.github.io/저장소명/login.html`

**Netlify 사용 시 (무료, 더 간편)**
1. [netlify.com](https://netlify.com) 접속
2. **Deploy manually** → 이 폴더 드래그앤드롭
3. 자동 URL 생성 완료

---

## 사용 방법

### 현장 직원 (데이터 입력)
1. `login.html` 접속 → 이메일/비밀번호 로그인
2. `entry.html` 자동 이동
3. 날짜 확인 (기본: 오늘) → 6개 섹션 입력
4. **저장하기** 클릭

### 경영진 (대시보드 조회)
1. `login.html` 접속 → 이메일/비밀번호 로그인
2. `dashboard.html` 자동 이동
3. 연도/월 선택 → **조회** 클릭
4. KPI · 아이소메트릭 · 차트 · 일별 테이블 확인
5. **AI 분석 생성** 클릭 → Claude AI 월간 요약

---

## 아이소메트릭 매립 현황 보는 법

- **색상**: 녹색(0~50%) → 노랑(50~75%) → 주황(75~90%) → 빨강(90~100%)
- **황색 테두리**: 현재 매립 진행 중인 공구
- **퍼센트**: 각 셀 측면에 표시된 사용률
- **1공구**: 하단 가로로 넓은 셀 (실제 부지 배치 반영)
- **2·3·4공구**: 상단에 3개 나란히 배치

---

## 문의

시스템 관련 문의: 시노코르 본사 IT 담당
