"""Run on the QA VM as root. Prepare guarded SQL; never modify the source DB."""
import json
import shlex
import subprocess
from pathlib import Path

def query(sql):
    return subprocess.check_output(['docker', 'exec', 'medit-staging-mysql', 'sh', '-c',
        'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --skip-column-names -e ' + shlex.quote(sql)], text=True).strip()

renames = {
    'consent_templates': {'current_version_number': 'current_version'},
    'consent_template_versions': {'consent_template_id': 'template_id', 'version_number': 'version'},
}
tables = {}
empty_tables = []
for table in query('SHOW TABLES FROM sicmh').splitlines():
    if table == '__drizzle_migrations':
        continue
    count = int(query(f'SELECT COUNT(*) FROM sicmh.`{table}`'))
    if not count:
        empty_tables.append(table)
        continue
    old = query(f"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='sicmh' AND TABLE_NAME='{table}' ORDER BY ORDINAL_POSITION").splitlines()
    new = query(f"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='medit' AND TABLE_NAME='{table}' AND GENERATION_EXPRESSION='' ORDER BY ORDINAL_POSITION").splitlines()
    mapping = [(column, renames.get(table, {}).get(column, column)) for column in old]
    assert all(target in new for _, target in mapping), f'Unmapped source columns: {table}'
    assert int(query(f'SELECT COUNT(*) FROM medit.`{table}`')) == 0, f'Target already populated: {table}'
    parents = query(f"SELECT DISTINCT REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='medit' AND TABLE_NAME='{table}' AND REFERENCED_TABLE_SCHEMA='medit'").splitlines()
    tables[table] = dict(rows=count, mapping=mapping, parents=parents)

order = []
pending = set(tables)
while pending:
    available = sorted(t for t in pending if not (set(tables[t]['parents']) & pending - {t}))
    assert available, 'Cyclic populated table dependency; explicit migration required.'
    order.extend(available)
    pending.difference_update(available)

sql = ['USE medit;', 'CREATE TEMPORARY TABLE copy_guard(ok TINYINT NOT NULL CHECK(ok=1));',
       "INSERT INTO copy_guard SELECT COUNT(*)=1 FROM medit_qa_global.companies WHERE code='MEDITQA' AND database_name='medit';",
       'START TRANSACTION;']
for table in empty_tables:
    sql.append(f'INSERT INTO copy_guard SELECT COUNT(*)=0 FROM sicmh.`{table}`;')
for table in order:
    item = tables[table]
    sources = ','.join('`'+source+'`' for source, _ in item['mapping'])
    targets = ','.join('`'+target+'`' for _, target in item['mapping'])
    sql.append(f'INSERT INTO medit.`{table}` ({targets}) SELECT {sources} FROM sicmh.`{table}`;')
    comparison = ' AND '.join(f'(BINARY s.`{source}` <=> BINARY d.`{target}`)' for source, target in item['mapping'])
    sql.append(f'SELECT COUNT(*) INTO @matched FROM sicmh.`{table}` s JOIN medit.`{table}` d ON BINARY s.id=BINARY d.id WHERE {comparison};')
    sql.append(f'INSERT INTO copy_guard VALUES (@matched={item["rows"]});')
sql.extend(['COMMIT;', 'SELECT COUNT(*) AS products FROM medit.products;',
            'SELECT SUM(quantity) AS units FROM medit.inventory_stock;'])
folder = Path('/var/backups/medit')
folder.mkdir(mode=0o700, exist_ok=True)
text = '\n'.join(sql)+'\n'
(folder/'20261025-copy.sql').write_text(text)
(folder/'20261025-copy-dry-run.sql').write_text(text.replace('\nCOMMIT;\n','\nROLLBACK;\n'))
(folder/'20261025-copy-manifest.json').write_text(json.dumps(tables, indent=2))
print(json.dumps({'tables':len(tables), 'rows':sum(t['rows'] for t in tables.values()), 'order':order}))
