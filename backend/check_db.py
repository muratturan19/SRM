import asyncio, asyncpg

async def main():
    conn = await asyncpg.connect("postgresql://postgres:Mm3471891298@localhost:5432/kolektif360_crm")
    rows = await conn.fetch("SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='dealstage'")
    print("dealstage values:", [r["enumlabel"] for r in rows])
    cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='deals' ORDER BY ordinal_position")
    print("deals cols:", [r["column_name"] for r in cols])
    await conn.close()

asyncio.run(main())
