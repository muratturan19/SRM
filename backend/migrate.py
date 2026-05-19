"""Migration: fix dealstage enum (uppercase→lowercase), add deals columns, create activities"""
import asyncio
import asyncpg

DSN = "postgresql://postgres:Mm3471891298@localhost:5432/kolektif360_crm"

async def main():
    conn = await asyncpg.connect(DSN)
    try:
        # 1. Drop old uppercase enum and recreate lowercase
        await conn.execute("DROP TYPE IF EXISTS dealstage CASCADE")
        await conn.execute("CREATE TYPE dealstage AS ENUM ('new','qualified','proposal','negotiation','won','lost')")
        print("Recreated dealstage enum with lowercase values")

        # 2. deals.stage column
        stage_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='stage')"
        )
        if not stage_exists:
            await conn.execute("ALTER TABLE deals ADD COLUMN stage dealstage NOT NULL DEFAULT 'new'")
            print("Added deals.stage")
        else:
            print("deals.stage already exists")

        # 3. deals.probability column
        prob_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='probability')"
        )
        if not prob_exists:
            await conn.execute("ALTER TABLE deals ADD COLUMN probability INTEGER")
            print("Added deals.probability")
        else:
            print("deals.probability already exists")

        # 4. activities table
        act_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='activities')"
        )
        if not act_exists:
            await conn.execute("""
                CREATE TYPE activitytype AS ENUM ('call','meeting','email','note','task');
                CREATE TABLE activities (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                    type activitytype NOT NULL DEFAULT 'note',
                    content TEXT NOT NULL,
                    outcome TEXT,
                    due_at TIMESTAMP,
                    is_done BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP NOT NULL DEFAULT now()
                );
                CREATE INDEX idx_activities_contact_id ON activities(contact_id);
            """)
            print("Created activities table")
        else:
            print("activities table already exists")

        # Verify
        cols = await conn.fetch(
            "SELECT column_name FROM information_schema.columns WHERE table_name='deals' ORDER BY ordinal_position"
        )
        print("deals columns:", [r['column_name'] for r in cols])

    finally:
        await conn.close()

asyncio.run(main())
