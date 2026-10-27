# MedIT staging / QA

Proyecto: `sicmh-441423` (MedIT-Testing). Region: `us-central1`. El ID tecnico heredado se conserva para mantener las referencias de GCP/Firebase.

## Recursos de MedIT

- Frontend: https://sicmh-441423.web.app (sin dominio personalizado).
- Backend: servicio Cloud Run `medit-be-staging`.
- MySQL: VM `medit-staging-db`, `us-central1-c`, e2-small, disco de arranque persistente de 20 GB con borrado automatico deshabilitado.
- Contenedor: `medit-staging-mysql`, MySQL 8.0.46, volumen `medit-staging-mysql-data`.
- Red/subred: `medit-staging`, `10.24.0.0/24`. MySQL escucha en `10.24.0.10:3306`.
- Cloud Run usa Direct VPC y la etiqueta `medit-staging-api`; solo esa etiqueta puede conectar a MySQL. SSH solo por IAP.
- Bases activas desde el despliegue del 25 de octubre: `medit_qa_global` y `medit`. Empresa: `MEDITQA`. Las bases anteriores `medit_global` y `sicmh` se conservan para recuperacion; no son el destino de nuevas importaciones.
- Buckets: `sicmh-441423-medit-clinical` (privado), `sicmh-441423-medit-public` (lectura publica) y `sicmh-441423-medit-builds`.
- Imagenes: Artifact Registry `us-central1/medit-staging`.
- Servicio preexistente `gc-connection`: conservar.

El ambiente genera cargos de VM, disco, IP externa, builds, almacenamiento y Cloud Run. El backend escala a cero y tiene un maximo de una instancia; la VM permanece encendida. El disco/volumen sobrevive a reinicios, pero no reemplaza un respaldo.

## Acceso QA

### Backend local con base QA

Ejecutar `./scripts/qa-db-tunnel.ps1` y mantener el proceso activo. Requiere acceso de Google Cloud por IAP a la VM de QA. El tunel expone MySQL solo en `127.0.0.1:13306`; no abre el puerto de la VM a Internet.

La configuracion local usa `DB_HOST=127.0.0.1`, `DB_PORT=13306`, `DB_USER=medit_staging`, `DB_GLOBAL_SCHEMA=medit_qa_global`, `DB_TENANT_SCHEMA=medit` y empresa `MEDITQA`. La contrasena se obtiene de Secret Manager y se guarda solo en `.env` ignorado. Reiniciar el backend y volver a iniciar sesion con la empresa QA despues de cambiar la conexion. Las escrituras desde este backend afectan la base compartida de QA.

La configuracion local anterior se conserva en `.env.local-emergency`, tambien ignorado. Para volver a ella, guardar primero la configuracion QA en un lugar privado, copiar `.env.local-emergency` sobre `.env` y reiniciar el backend. No ejecutar `db:setup` como parte del cambio de conexion.

- Empresa: `MEDITQA`.
- Usuario inicial: `qa.admin@example.com` (cuenta local, correo ficticio).
- Contrasena: Secret Manager, secreto `medit-staging-qa-password`, version `1`. No guardarla en Git ni compartirla en reportes de errores.
- Crear desde administracion cuentas individuales para las pruebas de permisos.
- SMTP no esta configurado: la recuperacion de contrasena por correo no se entrega en este ambiente.
- Usar datos ficticios. Este ambiente se inicializa desde migraciones y catalogos; no contiene una copia de pacientes de produccion.

## Desplegar cambios

Desde la raiz de `sicmh-be`, con la sesion de gcloud autorizada:

```powershell
npm run type-check
./infra/staging/deploy.ps1
```

El script usa explicitamente el proyecto de pruebas: construye dos imagenes con el mismo BUILD_ID, espera SUCCESS, aplica migraciones y semillas con un job, y solo entonces despliega el backend. Si falla cualquier paso, se detiene. Las semillas conservan la contrasena de una cuenta QA existente. Las migraciones ya aplicadas no se repiten.

Para reanudar un build existente y exitoso:

```powershell
./infra/staging/deploy.ps1 -BuildId '<BUILD_ID>'
```

Para un cambio de codigo que no contiene migraciones ni cambios de catalogos, agregar `-SkipDatabaseSetup` evita ejecutar el job de migracion/semillas. No usar esta opcion cuando cambie el esquema requerido por la aplicacion.

Desde la raiz de `sicmh-fe`:

```powershell
npm run deploy:staging
```

Este comando combina optimizaciones de produccion con configuracion de staging, genera `dist/medit-staging` y usa `firebase.staging.json` con proyecto/sitio explicitos. No cambiar el alias por defecto de Firebase. El build de produccion sigue usando su configuracion habitual.

`provision.ps1` es un script de creacion inicial, no una herramienta para actualizar recursos ni rotar secretos. No volver a ejecutarlo sobre este ambiente ya creado. Los cambios de esquema se hacen con nuevas migraciones; no editar migraciones aplicadas. Los secretos estan fijados a version 1; una rotacion requiere coordinar MySQL y las referencias de Cloud Run.

## Verificacion y diagnostico

```powershell
./infra/staging/smoke.ps1
gcloud run jobs executions list --job medit-staging-db-setup --region us-central1 --project sicmh-441423
gcloud run services logs read medit-be-staging --region us-central1 --project sicmh-441423 --limit 30
gcloud compute ssh medit-staging-db --zone us-central1-c --project sicmh-441423 --tunnel-through-iap --command 'sudo docker ps'
```

Un ping HTTP por si solo no valida MySQL. La prueba smoke inicia sesion, valida el token y consulta modulos protegidos. Iniciar sesion renueva la sesion de esta cuenta QA; evitar ejecutar smoke mientras alguien la utiliza.

Con `./infra/staging/smoke.ps1 -WriteProbe` tambien se crea (si no existe) y se lee el paciente ficticio con pasaporte `QASTAGING001`. Se conserva en QA para que pueda identificarse y reutilizarse.

## Aprobacion y produccion

Registrar el BUILD_ID, version del frontend, resultados QA y errores pendientes. Probar acceso y permisos, pacientes, ficha clinica, consultas, citas, inventario por ubicacion, cobros/facturas y documentos/adjuntos. Para cada error guardar pasos, resultado esperado, resultado observado y captura sin datos sensibles.

El 25 de octubre se preparo una copia con conservacion de los datos QA al esquema canonico en bases MedIT nuevas; ver `migration-20261025/`. Esto no sustituye un ensayo de migracion con los datos historicos de produccion. Para ese ensayo se necesita una copia anonimizada y comparaciones de cantidades, relaciones y totales.

Antes de produccion: respaldo verificable de DB/archivos, ensayo de migracion, aprobacion QA y plan de recuperacion de datos. Volver a una revision anterior del backend no revierte migraciones de DB. El frontend necesita su build de produccion para apuntar al backend correcto. No copiar registros QA a produccion.

No eliminar VM, volumen, disco o secretos como parte de un despliegue. La eliminacion del contenedor temporal y la conservacion del ambiente QA se coordinan por separado despues de la migracion.
