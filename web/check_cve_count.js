const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
    const conn = await mysql.createConnection(config.database);
    
    const [[total]] = await conn.query('SELECT COUNT(*) as count FROM CVE_Info');
    const [[before2020]] = await conn.query("SELECT COUNT(*) as count FROM CVE_Info WHERE CVE_Code < 'CVE-2020-'");
    const [[after2020]] = await conn.query("SELECT COUNT(*) as count FROM CVE_Info WHERE CVE_Code >= 'CVE-2020-'");
    
    console.log('==========================================');
    console.log('📊 CVE_Info 테이블 현황');
    console.log('==========================================');
    console.log('전체 CVE:', total.count.toLocaleString(), '개');
    console.log('2020년 이전:', before2020.count.toLocaleString(), '개');
    console.log('2020년 이후:', after2020.count.toLocaleString(), '개');
    console.log('==========================================');
    
    await conn.end();
})();

