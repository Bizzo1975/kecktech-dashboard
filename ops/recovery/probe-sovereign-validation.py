"""Read-only SQL diagnosis; never prints connection values or data rows."""
import asyncio
import json
import asyncpg
from dotenv import dotenv_values

async def main():
    values = dotenv_values('/opt/sovereign/.env')
    dsn = values.get('KB_DATABASE_URL')
    if not dsn:
        raise RuntimeError('KB_DATABASE_URL missing')
    conn = await asyncpg.connect(dsn, timeout=10, command_timeout=10)
    result = {}
    try:
        async with conn.transaction(readonly=True):
            columns = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='validation_runs' AND table_schema=current_schema()")
            names = {row['column_name'] for row in columns}
            result['schema'] = {name: name in names for name in ('ts', 'ran_at', 'verdict')}
        for label, query in [
            ('original', "SELECT COUNT(*) AS runs, COUNT(*) FILTER (WHERE verdict='pass') AS passed FROM validation_runs WHERE ran_at >= NOW() - make_interval(days => $days)"),
            ('parameter_only', "SELECT COUNT(*) AS runs, COUNT(*) FILTER (WHERE verdict='pass') AS passed FROM validation_runs WHERE ran_at >= NOW() - make_interval(days => $1)"),
            ('corrected', "SELECT COUNT(*) AS runs, COUNT(*) FILTER (WHERE verdict='pass') AS passed FROM validation_runs WHERE ts >= NOW() - make_interval(days => $1)")]:
            try:
                async with conn.transaction(readonly=True):
                    row = await conn.fetchrow(query, 7)
                    result[label] = {'success': True, 'runs': int(row['runs']), 'passed': int(row['passed'])}
            except asyncpg.PostgresError as error:
                result[label] = {'success': False, 'errorClass': type(error).__name__, 'sqlstate': error.sqlstate}
    finally:
        await conn.close()
    print(json.dumps(result))

asyncio.run(main())
