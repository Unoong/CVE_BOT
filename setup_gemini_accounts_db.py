"""
Gemini 계정을 DB(gemini_accounts)에 등록하는 스크립트
실행: python setup_gemini_accounts_db.py
"""
import json
import mysql.connector

def main():
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    db = config['database']
    conn = mysql.connector.connect(
        host=db['host'],
        port=db['port'],
        user=db['user'],
        password=db['password'],
        database=db['database']
    )
    
    accounts = [
        ('.gemini_shinhands.gpt', 'shinhands.gpt@gmail.com', r'C:\aiserver\CVE_BOT\gemini_account\.gemini_shinhands.gpt', 1),
        ('.gemini_shinhands.gemini', 'shinhands.gemini@gmail.com', r'C:\aiserver\CVE_BOT\gemini_account\.gemini_shinhands.gemini', 2),
        ('.gemini_shinhands.credit1', 'shinhands.credit1@gmail.com', r'C:\aiserver\CVE_BOT\gemini_account\.gemini_shinhands.credit1', 3),
    ]
    
    cursor = conn.cursor()
    for name, email, path, order in accounts:
        cursor.execute('''
            INSERT INTO gemini_accounts (account_name, account_email, folder_path, display_order)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                account_email = VALUES(account_email),
                folder_path = VALUES(folder_path),
                display_order = VALUES(display_order)
        ''', (name, email, path, order))
        print(f"  등록: {email} ({name})")
    
    conn.commit()
    cursor.close()
    conn.close()
    print("✅ gemini_accounts 테이블에 3개 계정 등록 완료")

if __name__ == '__main__':
    main()
