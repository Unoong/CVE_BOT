const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    try {
        console.log('==========================================');
        console.log('⚡ CVE_Info 테이블 인덱스 최적화 시작...');
        console.log('==========================================\n');
        
        const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
        const conn = await mysql.createConnection({
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database
        });
        
        const indexes = [
            {
                name: 'idx_cve_code',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_cve_code (CVE_Code)',
                desc: 'CVE 코드 검색용'
            },
            {
                name: 'idx_date_reserved',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_date_reserved (dateReserved(50))',
                desc: '예약일 정렬용 (최신순)'
            },
            {
                name: 'idx_date_published',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_date_published (datePublished(50))',
                desc: '공개일 정렬용'
            },
            {
                name: 'idx_cvss_severity',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_cvss_severity (CVSS_Serverity(20))',
                desc: 'CVSS 위험도 필터용'
            },
            {
                name: 'idx_state',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_state (state(20))',
                desc: '상태 필터용'
            },
            {
                name: 'idx_cwe_id',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_cwe_id (cweId(50))',
                desc: 'CWE 유형 필터용'
            },
            {
                name: 'idx_attack_type',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_attack_type (Attak_Type(100))',
                desc: '공격 유형 필터용'
            },
            {
                name: 'idx_product',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_product (product(100))',
                desc: '제품명 필터용 (앞 100자)'
            },
            {
                name: 'idx_cve_year',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_cve_year (CVE_Code(8))',
                desc: 'CVE 연도별 검색용 (CVE-2025)'
            },
            {
                name: 'idx_collect_time',
                query: 'ALTER TABLE CVE_Info ADD INDEX idx_collect_time (collect_time(50))',
                desc: '수집시간 정렬용'
            }
        ];
        
        console.log('📊 총 ' + indexes.length + '개 인덱스 추가 중...\n');
        
        let added = 0;
        let skipped = 0;
        
        for (const idx of indexes) {
            try {
                console.log('🔨 ' + idx.desc + '...');
                await conn.query(idx.query);
                console.log('   ✅ ' + idx.name + ' 추가 완료\n');
                added++;
            } catch (e) {
                if (e.message.includes('Duplicate')) {
                    console.log('   ⏭️  이미 존재함 (스킵)\n');
                    skipped++;
                } else {
                    console.log('   ❌ 오류: ' + e.message.substring(0, 100) + '\n');
                }
            }
        }
        
        console.log('==========================================');
        console.log('✅ 인덱스 최적화 완료!');
        console.log('==========================================');
        console.log('📊 결과:');
        console.log('   추가: ' + added + '개');
        console.log('   스킵: ' + skipped + '개');
        console.log('==========================================\n');
        
        // 인덱스 목록 확인
        console.log('📋 현재 CVE_Info 테이블 인덱스:\n');
        const [indexes_list] = await conn.query('SHOW INDEXES FROM CVE_Info');
        
        const uniqueIndexes = [...new Set(indexes_list.map(i => i.Key_name))];
        uniqueIndexes.forEach((idxName, i) => {
            console.log(`   ${i + 1}. ${idxName}`);
        });
        
        console.log('\n==========================================');
        console.log('⚡ 예상 성능 향상:');
        console.log('   - CVE 목록 조회: 30초 → 0.5초');
        console.log('   - 공격유형 필터: 타임아웃 → 0.3초');
        console.log('   - CWE 필터: 타임아웃 → 0.3초');
        console.log('   - 제품 필터: 타임아웃 → 0.5초');
        console.log('==========================================\n');
        
        await conn.end();
    } catch (error) {
        console.error('\n❌ 오류:', error.message);
        process.exit(1);
    }
})();

