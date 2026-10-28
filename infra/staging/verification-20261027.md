# MedIT QA - despliegue del 27 de octubre de 2026

- Backend: commit `8a3339c`.
- Frontend: commit `adb0c94`.
- Cloud Build: `5d34904c-6ee7-4226-938d-583e5505dfe2`, SUCCESS.
- Backend activo: `medit-be-staging-00004-xl6`, 100% de trafico en la URL habitual.
- Frontend: https://sicmh-441423.web.app, build `c4f1ab319d9044bb`, runtime `runtime.9cbd7837d951699a.js` confirmado por HTTP.
- Backend: 72 pruebas aprobadas, 2 integraciones omitidas, ninguna fallida; compilacion correcta.
- Frontend: 32 pruebas aprobadas, build de staging correcto.
- Smoke en QA: ping, login, token, renovacion y token renovado, dashboard, pacientes, inventario y ruta SPA correctos.
- Despliegue con `-SkipDatabaseSetup`: no se ejecutaron migraciones, semillas ni scripts de limpieza. Las bases activas siguen siendo `medit_qa_global` y `medit`.
- Produccion no se modifico.

Cloud Run conservaba el trafico fijado a la revision anterior. Se activo explicitamente la revision nueva y se ajusto `deploy.ps1` para dirigir el trafico a la revision creada en futuros despliegues. Se valido la sintaxis PowerShell y `git diff --check`. La etiqueta historica `qa-preview` sigue apuntando a la revision anterior; las pruebas de este despliegue se hicieron sobre la URL habitual.

No se realizo una revision visual exhaustiva ni se ejecutaron las integraciones omitidas. Los cambios al script de despliegue y este informe quedan locales, pendientes de commit; la solicitud fue publicar en QA, no hacer push a Git.
