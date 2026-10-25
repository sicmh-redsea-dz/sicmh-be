const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const input = process.argv[2]
if (!input) throw new Error('Pass the source CSV path.')
const bytes = fs.readFileSync(input)
const sourceHash = crypto.createHash('sha256').update(bytes).digest('hex')
const csv = bytes.toString('utf8').replace(/^\uFEFF/, '')
function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++ }
      else if (quoted || value === '') quoted = !quoted
      else throw new Error('Unexpected quote in CSV.')
    } else if (char === ',' && !quoted) { row.push(value); value = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(value); if (row.some(v => v !== '')) rows.push(row)
      row = []; value = ''
    } else value += char
  }
  if (quoted) throw new Error('Unterminated CSV quote.')
  if (value || row.length) { row.push(value); rows.push(row) }
  return rows
}
const parsed = parseCsv(csv)
const header = parsed.shift()
const expectedHeader = ['ProductoID','NombreProducto','Descripcion','Categoria','PrecioUnidad','ProveedorID','NivelMinimoStock','Codigo_Barra','Cantidad']
if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) throw new Error('Unexpected CSV header.')
const nullable = value => !value?.trim() || value.trim().toUpperCase() === 'NULL' ? null : value.trim()
const uuid = key => {
  const value = crypto.createHash('sha256').update('medit:staging:inventario.csv:v1:' + key).digest().subarray(0, 16)
  value[6] = (value[6] & 15) | 80; value[8] = (value[8] & 63) | 128
  const hex = value.toString('hex')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}
const integer = (value, label) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) throw new Error('Invalid integer: ' + label)
  return Number(value)
}
const suppliers = new Map(), categories = new Map(), ids = new Set(), barcodes = new Set(), defaults = []
const rows = parsed.map((cells, index) => {
  if (cells.length !== header.length) throw new Error('Invalid columns at row ' + (index + 2))
  const item = Object.fromEntries(header.map((key, i) => [key, cells[i]]))
  const legacyId = String(integer(item.ProductoID, 'ProductoID'))
  if (ids.has(legacyId)) throw new Error('Duplicate product ID: ' + legacyId)
  ids.add(legacyId)
  const supplierKey = nullable(item.ProveedorID) ?? 'sin-proveedor'
  if (supplierKey !== 'sin-proveedor') integer(supplierKey, 'ProveedorID')
  const supplierId = uuid('supplier:' + supplierKey)
  suppliers.set(supplierKey, {legacyId: supplierKey, id: supplierId, name: `Proveedor QA ${supplierKey} (FICTICIO)`})
  const categoryName = nullable(item.Categoria) ?? 'QA - Sin categoria'
  if (categoryName.length > 100) throw new Error('Category too long.')
  const categoryId = uuid('category:' + categoryName)
  categories.set(categoryName, {id: categoryId, name: categoryName})
  const price = nullable(item.PrecioUnidad)
  if (price !== null && !/^\d{1,10}(\.\d{1,2})?$/.test(price)) throw new Error('Invalid price at product ' + legacyId)
  if (price === null) defaults.push({legacyId, field: 'unit_price', value: '0.00', reason: 'NULL in source; required by schema'})
  const name = nullable(item.NombreProducto)
  if (!name || name.length > 150) throw new Error('Invalid product name.')
  const barcode = nullable(item.Codigo_Barra)
  if (barcode && (barcode.length > 100 || barcodes.has(barcode))) throw new Error('Invalid or duplicate barcode.')
  if (barcode) barcodes.add(barcode)
  return {legacyId, id: uuid('product:' + legacyId), supplierId, categoryId, name,
    description: nullable(item.Descripcion), barcode, unitPrice: Number(price ?? 0).toFixed(2),
    minimumStock: integer(nullable(item.NivelMinimoStock) ?? '0', 'minimumStock'),
    quantity: integer(item.Cantidad.trim(), 'Cantidad'), stockId: uuid('stock:main:' + legacyId)}
})
if (!rows.length) throw new Error('Empty source.')
const units = rows.reduce((sum, row) => sum + row.quantity, 0)
const literal = value => value === null ? 'NULL' : `CONVERT(0x${Buffer.from(String(value), 'utf8').toString('hex')} USING utf8mb4)`
const sql = ['SET NAMES utf8mb4;', 'USE sicmh;',
  "SELECT GET_LOCK('medit_qa_inventory_csv_import', 15) INTO @import_lock;",
  'CREATE TEMPORARY TABLE import_guard (ok TINYINT NOT NULL CHECK (ok = 1));',
  'INSERT INTO import_guard VALUES (@import_lock);',
  "SELECT COUNT(*) INTO @qa FROM medit_global.companies WHERE code='MEDITQA' AND database_name=DATABASE() AND is_active=1 AND deleted_at IS NULL;",
  'INSERT INTO import_guard VALUES (@qa = 1);',
  "SELECT COUNT(*), MIN(id) INTO @locations, @location_id FROM inventory_locations WHERE code='main' AND deleted_at IS NULL;",
  'INSERT INTO import_guard VALUES (@locations = 1);',
  'CREATE TEMPORARY TABLE import_source (id VARCHAR(36) PRIMARY KEY, supplier_id VARCHAR(36), category_id VARCHAR(36), name VARCHAR(150), description TEXT, barcode VARCHAR(100), unit_price DECIMAL(12,2), minimum_stock INT, quantity INT, stock_id VARCHAR(36));',
  'INSERT INTO import_source VALUES\n' + rows.map(r => '(' + [r.id,r.supplierId,r.categoryId,r.name,r.description,r.barcode,r.unitPrice,r.minimumStock,r.quantity,r.stockId].map(literal).join(',') + ')').join(',\n') + ';',
  'START TRANSACTION;']
for (const s of suppliers.values()) sql.push(`INSERT INTO suppliers (id,name,contact_name,email,address) VALUES (${[s.id,s.name,'Contacto ficticio QA',`proveedor-${s.legacyId}@example.com`,'DATOS FICTICIOS - importacion QA de inventario.csv'].map(literal).join(',')}) ON DUPLICATE KEY UPDATE id=suppliers.id;`)
for (const c of categories.values()) sql.push(`INSERT INTO inventory_categories (id,name,description) VALUES (${[c.id,c.name,'Categoria para datos de prueba importados desde inventario.csv'].map(literal).join(',')}) ON DUPLICATE KEY UPDATE id=inventory_categories.id;`)
sql.push('INSERT INTO products (id,supplier_id,category_id,name,description,barcode,unit_price,minimum_stock) SELECT id,supplier_id,category_id,name,description,barcode,unit_price,minimum_stock FROM import_source WHERE TRUE ON DUPLICATE KEY UPDATE id=products.id;',
  'INSERT INTO inventory_stock (id,product_id,location_id,quantity) SELECT stock_id,id,@location_id,quantity FROM import_source WHERE TRUE ON DUPLICATE KEY UPDATE id=inventory_stock.id;',
  'SELECT COUNT(*) INTO @matched FROM import_source s JOIN products p ON p.id=s.id JOIN suppliers v ON v.id=p.supplier_id JOIN inventory_categories c ON c.id=p.category_id JOIN inventory_stock i ON i.product_id=p.id AND i.location_id=@location_id WHERE p.supplier_id=s.supplier_id AND p.category_id=s.category_id AND BINARY p.name=BINARY s.name AND (p.description <=> s.description) AND (p.barcode <=> s.barcode) AND p.unit_price=s.unit_price AND p.minimum_stock=s.minimum_stock AND i.id=s.stock_id AND i.quantity=s.quantity AND p.deleted_at IS NULL AND i.deleted_at IS NULL AND v.deleted_at IS NULL AND c.deleted_at IS NULL;',
  `INSERT INTO import_guard VALUES (@matched = ${rows.length});`,
  'SELECT SUM(i.quantity) INTO @units FROM inventory_stock i JOIN import_source s ON s.id=i.product_id WHERE i.location_id=@location_id;',
  `INSERT INTO import_guard VALUES (@units = ${units});`, 'COMMIT;',
  `SELECT @matched AS matched_products, @units AS imported_units, ${suppliers.size} AS mapped_suppliers, ${categories.size} AS mapped_categories;`,
  "SELECT RELEASE_LOCK('medit_qa_inventory_csv_import');")
const output = path.resolve('infra/staging/inventory-import-20261024')
fs.mkdirSync(output, {recursive:true})
fs.writeFileSync(path.join(output, 'import.sql'), sql.join('\n') + '\n')
fs.writeFileSync(path.join(output, 'dry-run.sql'), (sql.join('\n') + '\n').replace('\nCOMMIT;\n', '\nROLLBACK;\n'))
const manifest = {source: path.resolve(input), sourceHash, sourceBytes: bytes.length, targetProject:'sicmh-441423', database:'sicmh', location:'main', rowCount:rows.length, totalUnits:units, defaults, suppliers:[...suppliers.values()], categories:[...categories.values()], products:rows}
fs.writeFileSync(path.join(output, 'mapping.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({rows:rows.length,units,suppliers:suppliers.size,categories:categories.size,defaults,sourceHash,output},null,2))
