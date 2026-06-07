"""
Run this once to create demo users in the database.
Usage: python seed.py
"""
import asyncio
import sys
sys.path.insert(0, ".")

from db.database import init_db, AsyncSessionLocal, User
from utils.auth import get_password_hash
import uuid
from datetime import datetime


DEMO_USERS = [
    {"name": "Admin", "email": "admin@company.com", "password": "admin123", "role": "admin"},
    {"name": "user", "email": "user@company.com", "password": "user123", "role": "user"},
    {"name": "Agent", "email": "agent@company.com", "password": "agent123", "role": "agent"},
]


async def seed():
    print("Initializing database...")
    await init_db()

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        for u in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  ✓ User already exists: {u['email']}")
                continue

            user = User(
                id=str(uuid.uuid4()),
                email=u["email"],
                name=u["name"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"],
                created_at=datetime.utcnow(),
            )
            db.add(user)
            print(f"  + Created user: {u['email']} ({u['role']})")

        await db.commit()
    print("\n Seed complete!")
    print("\nDemo credentials:")
    for u in DEMO_USERS:
        print(f"  {u['role']:6s}: {u['email']} / {u['password']}")


if __name__ == "__main__":
    asyncio.run(seed())
