-- ================================================
-- 부산그린파워 운영관리 시스템 - Supabase DB 설정
-- Supabase 대시보드 > SQL Editor 에서 이 스크립트 전체 실행
-- ================================================

-- 1. 사용자 프로필 테이블 (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('entry', 'viewer')),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 매립 단계별 허가 용량 설정 테이블
CREATE TABLE IF NOT EXISTS phase_config (
    phase_num       INTEGER PRIMARY KEY CHECK (phase_num BETWEEN 1 AND 4),
    total_capacity  NUMERIC NOT NULL,       -- 총 허가 용량 (m³)
    start_date      DATE,                   -- 매립 시작일
    permit_expiry   DATE,                   -- 허가 만료일
    memo            TEXT DEFAULT ''
);

-- 3. 일일 운영 실적 테이블 (핵심 - 날짜별 1건씩 누적)
CREATE TABLE IF NOT EXISTS daily_operations (
    id              BIGSERIAL PRIMARY KEY,
    entry_date      DATE NOT NULL UNIQUE,   -- 날짜별 1건 (중복 불가)

    -- 반입량 (톤)
    intake_mixed        NUMERIC DEFAULT 0,  -- 혼합폐기물
    intake_organic      NUMERIC DEFAULT 0,  -- 유기성
    intake_inorganic    NUMERIC DEFAULT 0,  -- 무기성
    intake_construction NUMERIC DEFAULT 0,  -- 건설폐기물
    intake_special      NUMERIC DEFAULT 0,  -- 특수/지정폐기물

    -- 차량 / 매립
    truck_count         INTEGER DEFAULT 0,  -- 당일 차량 대수
    landfill_volume_m3  NUMERIC DEFAULT 0,  -- 당일 매립 투입량 (m³)

    -- 1~4단계별 누적 매립량 (m³) - 해당 날짜 기준 각 단계 누적 총량
    phase1_used_m3  NUMERIC DEFAULT 0,
    phase2_used_m3  NUMERIC DEFAULT 0,
    phase3_used_m3  NUMERIC DEFAULT 0,
    phase4_used_m3  NUMERIC DEFAULT 0,

    -- 수익 (원): 폐기물 유형별 처리 수수료
    revenue_mixed           NUMERIC DEFAULT 0,
    revenue_organic         NUMERIC DEFAULT 0,
    revenue_inorganic       NUMERIC DEFAULT 0,
    revenue_construction    NUMERIC DEFAULT 0,
    revenue_special         NUMERIC DEFAULT 0,

    -- 비용 (원)
    cost_labor          NUMERIC DEFAULT 0,  -- 인건비
    cost_equipment      NUMERIC DEFAULT 0,  -- 장비 운영비
    cost_cover_soil     NUMERIC DEFAULT 0,  -- 복토재 비용
    cost_leachate       NUMERIC DEFAULT 0,  -- 침출수 처리비
    cost_other          NUMERIC DEFAULT 0,  -- 기타

    -- 환경 모니터링
    leachate_generated_m3   NUMERIC DEFAULT 0,  -- 침출수 발생량
    leachate_treated_m3     NUMERIC DEFAULT 0,  -- 침출수 처리량
    gas_methane_ppm         NUMERIC DEFAULT 0,  -- 메탄 농도 (ppm)
    gas_h2s_ppm             NUMERIC DEFAULT 0,  -- 황화수소 농도 (ppm)

    -- 메타
    memo        TEXT DEFAULT '',
    entered_by  UUID REFERENCES auth.users(id),
    entered_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 자동 계산 컬럼: 총 반입량
ALTER TABLE daily_operations
    ADD COLUMN IF NOT EXISTS intake_total NUMERIC
    GENERATED ALWAYS AS (
        intake_mixed + intake_organic + intake_inorganic +
        intake_construction + intake_special
    ) STORED;

-- 자동 계산 컬럼: 총 수익
ALTER TABLE daily_operations
    ADD COLUMN IF NOT EXISTS revenue_total NUMERIC
    GENERATED ALWAYS AS (
        revenue_mixed + revenue_organic + revenue_inorganic +
        revenue_construction + revenue_special
    ) STORED;

-- 자동 계산 컬럼: 총 비용
ALTER TABLE daily_operations
    ADD COLUMN IF NOT EXISTS cost_total NUMERIC
    GENERATED ALWAYS AS (
        cost_labor + cost_equipment + cost_cover_soil +
        cost_leachate + cost_other
    ) STORED;

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON daily_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 인덱스: 날짜 범위 조회 최적화
CREATE INDEX IF NOT EXISTS idx_daily_ops_date ON daily_operations(entry_date DESC);

-- ================================================
-- Row Level Security (역할별 접근 제어)
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_operations ENABLE ROW LEVEL SECURITY;

-- profiles: 본인 것만 읽기 가능
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- phase_config: 로그인한 누구나 읽기, 수정 불가 (관리자가 대시보드에서 직접 수정)
CREATE POLICY "phase_config_select" ON phase_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- daily_operations: 로그인한 누구나 읽기
CREATE POLICY "daily_ops_select" ON daily_operations
    FOR SELECT USING (auth.role() = 'authenticated');

-- daily_operations: 입력자(entry role)만 INSERT 가능
CREATE POLICY "daily_ops_insert" ON daily_operations
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'entry'
        )
    );

-- daily_operations: 입력자(entry role)만 UPDATE 가능
CREATE POLICY "daily_ops_update" ON daily_operations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'entry'
        )
    );

-- ================================================
-- 초기 데이터: phase_config (각 단계 허가 용량 설정)
-- ※ 실제 허가 용량으로 수정 후 실행하세요
-- ================================================

INSERT INTO phase_config (phase_num, total_capacity, start_date, permit_expiry, memo)
VALUES
    (1, 100000, '2010-01-01', '2020-12-31', '1단계 매립 (완료)'),
    (2, 150000, '2018-01-01', '2025-12-31', '2단계 매립'),
    (3, 200000, '2023-01-01', '2030-12-31', '3단계 매립'),
    (4, 250000, '2028-01-01', '2038-12-31', '4단계 매립 (예정)')
ON CONFLICT (phase_num) DO NOTHING;

-- ================================================
-- 완료! 다음 단계:
-- 1. Supabase Authentication > Users 에서 사용자 계정 생성
-- 2. 생성된 사용자 UUID를 아래 INSERT로 profiles 테이블에 추가
-- ================================================

-- 사용자 프로필 추가 예시 (실제 UUID로 교체):
-- INSERT INTO profiles (id, role, name) VALUES
--     ('실제-UUID-여기에', 'entry', '홍길동 주임'),
--     ('실제-UUID-여기에', 'viewer', '김철수 부장');
