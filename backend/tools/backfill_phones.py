import asyncio
import asyncpg
import sys
sys.path.insert(0, '.')
from app.core.phone_utils import normalize_phone


async def fix():
    conn = await asyncpg.connect(
        'postgresql://postgres:Mm3471891298@localhost:5432/kolektif360_crm'
    )
    rows = await conn.fetch(
        'SELECT id, phone, phone2 FROM contacts WHERE phone IS NOT NULL OR phone2 IS NOT NULL'
    )
    updated = 0
    for row in rows:
        new_phone = normalize_phone(row['phone'])
        new_phone2 = normalize_phone(row['phone2'])
        if new_phone != row['phone'] or new_phone2 != row['phone2']:
            await conn.execute(
                'UPDATE contacts SET phone=$1, phone2=$2 WHERE id=$3',
                new_phone, new_phone2, row['id']
            )
            updated += 1
            print(f"  {row['phone']!r} → {new_phone!r}  |  {row['phone2']!r} → {new_phone2!r}")
    await conn.close()
    print(f'Güncellendi: {updated} kayıt')


asyncio.run(fix())
