// ================================================
// 인증 유틸리티 (로그인/로그아웃/역할 체크)
// ================================================

const Auth = {
    // 현재 세션 사용자 반환
    async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // profiles 테이블에서 역할 조회
    async getProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('role, name')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },

    // 로그인 (이메일/비밀번호)
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    // 로그아웃
    async logout() {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    },

    // 현재 페이지 접근 권한 확인 (allowedRoles: ['entry'] 등)
    // 권한 없으면 login.html로 리디렉션
    async requireRole(allowedRoles) {
        const user = await Auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        try {
            const profile = await Auth.getProfile(user.id);
            if (!allowedRoles.includes(profile.role)) {
                // 역할은 있지만 이 페이지에 권한 없음 → 대시보드로
                window.location.href = profile.role === 'viewer' ? 'dashboard.html' : 'entry.html';
                return null;
            }
            return { user, profile };
        } catch {
            window.location.href = 'login.html';
            return null;
        }
    },

    // 헤더 사용자 이름 업데이트
    setHeaderUser(name, role) {
        const el = document.getElementById('user-name');
        if (el) el.textContent = `${name} (${role === 'entry' ? '입력자' : '열람자'})`;
    }
};

// 로그아웃 버튼 공통 처리
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());
});
