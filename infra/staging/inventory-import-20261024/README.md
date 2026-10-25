# Importacion de inventario QA - 24 de octubre de 2026

Destino: proyecto `sicmh-441423`, VM `medit-staging-db`, base `sicmh`, ubicacion `main` / Inventario General.

Fuente: `C:\Users\joser\Downloads\Shared\inventario.csv`. SHA-256: `40a5c796f9ade9c51ada850f6f2170990fde74f8ed18df87aa36e84c3c287216`.

Resultado: 87 productos, 26 proveedores ficticios identificados como QA, 1 categoria `QA - Sin categoria`, 87 filas de existencias y 2139 unidades. Todas las filas tienen proveedor y categoria. Los productos con el mismo nombre mantienen sus IDs originales separados mediante el mapeo UUID.

El precio NULL del producto fuente 49 (Nexium 40 mg IV, frasco) se sustituyo por `0.00`, requerido por el esquema. Campos opcionales NULL se conservaron como NULL; minimo de stock ausente se establecio en 0. Filas sin proveedor utilizan el proveedor ficticio `sin-proveedor`. No se inventaron compras, pagos, movimientos ni fechas de caducidad.

Se valido una simulacion completa con ROLLBACK, comprobando que la base permaneciera vacia, antes de ejecutar el COMMIT. Se verificaron luego los totales persistidos y cada UUID, nombre, cantidad, precio y minimo de stock a traves de la API de QA. Produccion no fue modificada.

`mapping.json` conserva fuente, hash, decisiones de valores y correspondencia de IDs. `import.sql` usa transaccion y validaciones; `dry-run.sql` ejecuta ROLLBACK. Los IDs son deterministas: una repeticion identica no duplica ni suma existencias. Si los productos importados fueron modificados en QA, las validaciones abortan en lugar de sobrescribirlos. No volver a importar para reponer stock consumido durante pruebas.

Preparacion reproducible desde la raiz del backend: `node scripts/prepare-staging-inventory.cjs <ruta-del-csv>`. El script prepara archivos locales; no se conecta a ninguna DB. El SQL rechaza un destino que no contenga la empresa activa `MEDITQA` y la ubicacion `main`.
