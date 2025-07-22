#!/usr/bin/env python3
import sqlite3
import os

# Check both possible database locations
db_paths = ['backend/finance_app.db', 'finance_app.db']

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f'Found database at: {db_path}')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Count ice cream transactions
        cursor.execute('SELECT COUNT(*) FROM transactions WHERE description = "ice cream"')
        ice_cream_count = cursor.fetchone()[0]
        
        # Count total transactions
        cursor.execute('SELECT COUNT(*) FROM transactions')
        total_count = cursor.fetchone()[0]
        
        print(f'Ice cream transactions: {ice_cream_count}')
        print(f'Total transactions: {total_count}')
        print(f'Percentage: {(ice_cream_count/total_count)*100:.1f}%')
        
        # Get the most recent ice cream transactions
        cursor.execute('SELECT * FROM transactions WHERE description = "ice cream" ORDER BY created_at DESC LIMIT 5')
        recent = cursor.fetchall()
        
        print('\nMost recent ice cream transactions:')
        for row in recent:
            print(f'ID: {row[0]}, Amount: {row[2]}, Date: {row[4]}, Created: {row[6]}')
        
        conn.close()
        break
else:
    print('No database found')