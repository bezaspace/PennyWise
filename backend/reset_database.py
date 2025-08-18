"""
Reset and reseed the database with fresh realistic data
Use this script when you want to start with clean, realistic seed data
"""

import os
from database import create_tables
from seed_realistic import create_realistic_seed_data

def reset_and_seed():
    """Remove existing database and create fresh realistic seed data"""
    
    # Remove existing database file
    db_path = "finance_app.db"
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"🗑️  Removed existing database: {db_path}")
    
    # Create fresh tables
    create_tables()
    print("📋 Created fresh database tables")
    
    # Seed with realistic data
    create_realistic_seed_data()
    print("🌱 Seeded database with realistic data")
    
    print("\n✅ Database reset and seeded successfully!")
    print("🚀 Ready to start the backend server")

if __name__ == "__main__":
    reset_and_seed()