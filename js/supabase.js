// ================================================
// Supabase 클라이언트 설정
// ※ 아래 두 값을 Supabase 대시보드 > Settings > API 에서 복사하세요
// ================================================

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

// Supabase JS SDK v2 (CDN)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// 위 스크립트 로드 후 window.supabase 로 접근 가능

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
