#!/usr/bin/env python3
"""
Script to inspect ADK session data that might contain the ice cream issue
"""
import sqlite3
import os

def inspect_adk_tables():
    """Check ADK session tables for stored conversation history"""
    db_paths = ['backend/finance_app.db', 'finance_app.db']
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f'Found database at: {db_path}')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Get all table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            print(f'\nAll tables in database:')
            for table in tables:
                print(f'  - {table[0]}')
            
            # Look for ADK session tables
            adk_tables = [table[0] for table in tables if 'session' in table[0].lower() or 'adk' in table[0].lower()]
            
            if adk_tables:
                print(f'\nADK/Session related tables found:')
                for table_name in adk_tables:
                    print(f'\n--- Table: {table_name} ---')
                    cursor.execute(f"SELECT * FROM {table_name}")
                    rows = cursor.fetchall()
                    
                    # Get column names
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    columns = [col[1] for col in cursor.fetchall()]
                    print(f'Columns: {columns}')
                    
                    print(f'Row count: {len(rows)}')
                    
                    # Show first few rows
                    for i, row in enumerate(rows[:3]):
                        print(f'Row {i+1}: {row}')
                        
                    # Look for ice cream mentions in text fields
                    for row in rows:
                        for field in row:
                            if field and isinstance(field, str) and 'ice cream' in field.lower():
                                print(f'🍦 FOUND ICE CREAM REFERENCE: {field[:200]}...')
            else:
                print('\nNo ADK/Session tables found')
            
            conn.close()
            break
    else:
        print('No database found')

if __name__ == "__main__":
    inspect_adk_tables()