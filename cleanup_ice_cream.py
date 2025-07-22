#!/usr/bin/env python3
"""
Script to clean up duplicate ice cream transactions from the database
"""
import sqlite3
import os

def cleanup_ice_cream_transactions():
    """Remove all ice cream transactions from the database"""
    db_paths = ['backend/finance_app.db', 'finance_app.db']
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f'Found database at: {db_path}')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Count ice cream transactions before deletion
            cursor.execute('SELECT COUNT(*) FROM transactions WHERE description = "ice cream"')
            ice_cream_count = cursor.fetchone()[0]
            print(f'Found {ice_cream_count} ice cream transactions to delete')
            
            if ice_cream_count > 0:
                # Delete all ice cream transactions
                cursor.execute('DELETE FROM transactions WHERE description = "ice cream"')
                conn.commit()
                print(f'✅ Deleted {ice_cream_count} ice cream transactions')
                
                # Verify deletion
                cursor.execute('SELECT COUNT(*) FROM transactions WHERE description = "ice cream"')
                remaining = cursor.fetchone()[0]
                print(f'Remaining ice cream transactions: {remaining}')
                
                # Show total transactions remaining
                cursor.execute('SELECT COUNT(*) FROM transactions')
                total = cursor.fetchone()[0]
                print(f'Total transactions remaining: {total}')
            else:
                print('No ice cream transactions found')
            
            conn.close()
            break
    else:
        print('No database found')

if __name__ == "__main__":
    cleanup_ice_cream_transactions()