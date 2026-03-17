/**
 * 대시보드 API 테스트 스크립트
 * 서버가 실행 중일 때 별도 터미널에서 실행
 */
const axios = require('axios');

const API_URL = 'https://www.ai-platform.store:32578/api';

async function testDashboardAPI() {
    console.log('='*80);
    console.log('대시보드 API 테스트 시작');
    console.log('='*80);
    console.log(`API URL: ${API_URL}`);
    console.log('');

    try {
        console.log('[테스트 1] 기본 통계 조회...');
        const startTime1 = Date.now();
        const response1 = await axios.get(`${API_URL}/dashboard/stats`, {
            httpsAgent: new (require('https')).Agent({
                rejectUnauthorized: false
            })
        });
        const elapsed1 = Date.now() - startTime1;
        
        console.log(`✅ 성공! (${elapsed1}ms)`);
        console.log(`응답 데이터:`, {
            total_cves: response1.data.total_cves,
            total_pocs: response1.data.total_pocs,
            analyzed_pocs: response1.data.analyzed_pocs,
            recentCVEs_count: response1.data.recentCVEs?.length || 0,
            cvssDistribution_count: response1.data.cvssDistribution?.length || 0
        });
        console.log('');

        console.log('[테스트 2] 상세 통계 조회...');
        const startTime2 = Date.now();
        const response2 = await axios.get(`${API_URL}/dashboard/detailed-stats`, {
            httpsAgent: new (require('https')).Agent({
                rejectUnauthorized: false
            })
        });
        const elapsed2 = Date.now() - startTime2;
        
        console.log(`✅ 성공! (${elapsed2}ms)`);
        console.log(`응답 데이터:`, {
            attackStageStats_count: response2.data.attackStageStats?.length || 0,
            cweTypeStats_count: response2.data.cweTypeStats?.length || 0,
            attackTypeStats_count: response2.data.attackTypeStats?.length || 0,
            productStats_count: response2.data.productStats?.length || 0
        });
        console.log('');

        console.log('='*80);
        console.log('✅ 모든 테스트 성공!');
        console.log(`총 소요 시간: ${elapsed1 + elapsed2}ms`);
        console.log('='*80);

    } catch (error) {
        console.error('❌ 테스트 실패!');
        console.error('에러:', error.message);
        if (error.response) {
            console.error('상태 코드:', error.response.status);
            console.error('응답 데이터:', error.response.data);
        }
    }
}

testDashboardAPI();

