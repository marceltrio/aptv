# AmigaOS Kernel Studio (simulador avanzado)

Simulador web del kernel con interfaz gráfica estilo AmigaOS, ahora con más módulos de sistema operativo para práctica realista en PC 64 bits.

## Mejoras nuevas del sistema operativo

- Escritorio gráfico completo con menubar, dock y ventanas especializadas.
- Scheduler Round Robin con prioridad, bloqueo por I/O y telemetría de CPU/memoria.
- Red simulada con paquetes enviados, perdidos, carga y tasa de pérdida.
- Perfiles del sistema: `eco`, `balanced`, `performance` (ajustan quantum + memoria).
- Gestión de sesión y usuarios (`login/logout`, `whoami`).
- App Manager con instalación/listado de aplicaciones virtuales.
- Virtual FileSystem con creación, lectura, borrado y listado de archivos.
- Shell integrada con comandos administrativos y operativos.
- Snapshot completo del sistema (`save/load`) y exportación de diagnóstico JSON.
- Mejoras visuales estilo AmigaOS: temas (`Ocean`, `Purple`, `Graphite`), CRT scanlines, glow retro y cascade de ventanas.
- **NUEVO** panel de **Insights** con top procesos por uso de CPU y resumen de benchmark.
- **NUEVO** sistema de notificaciones del kernel y comando para limpiar alertas.
- **NUEVO** benchmark de carga (`bench`) y atajos de teclado (`Alt+T`, `Alt+B`).
- **NUEVO** Service Manager con servicios virtuales (`startsvc`, `stopsvc`, `services`) y health score.
- **NUEVO** Automation & Security: templates de procesos, firewall virtual y trail de auditoría.
- **NUEVO** selector de scheduler (`hybrid`, `rr`, `priority`) y maintenance mode para bloquear cambios operativos.
- **NUEVO** cuotas por usuario, jobs programados y modo PowerSave para simulación energética.
- **NUEVO** manejo de memoria virtual con páginas, protección y detección de fallos (`vmalloc`, `vmprotect`, `vmaccess`, `vmstat`).
- **NUEVO** control de drivers para hardware moderno simulado (USB, NVMe, GPU, WiFi/Ethernet, audio) con `drv-*`.
- **NUEVO** system calls internas mediante `syscall <name> ...args` para automatización de procesos/FS/red.
- **NUEVO** ArkrFS (filesystem inventado) con carpetas, journaling, compresión, encriptación y permisos por archivo.
- **NUEVO** layout base de ArkrFS al boot: `/system`, `/users/marcel`, `/apps`, `/temp`, `/logs`.
- **NUEVO** herramientas de integridad para filesystem: `fs-root`, `fs-tree`, `fsck [repair]`.
- **NUEVO** seguridad avanzada: secure boot, encriptación de disco simulada, malware scan y sandbox por aplicación.
- **NUEVO** sistema de aplicaciones con repositorio + tienda (`store`, `install-store`).
- **NUEVO** mini sistema de actualizaciones internas (`updates`, `update <name|all>`).
- **NUEVO** escritorios virtuales modernos (`desktop-add`, `desktop-switch`, `desktops`).
- **NUEVO** sistema modular de plugins (`plugin-add`, `plugin`, `plugins`).
- **NUEVO** control por voz simulado (`voice <texto>`) para acciones rápidas del kernel.
- **NUEVO** asistente de IA del sistema (`ai <consulta>`) con recomendaciones operativas.
- **NUEVO** restore points del sistema (`rp-create`, `rp-list`, `rp-load`) para recuperación rápida.
- **NUEVO** capa de compatibilidad de aplicaciones x64 (`app-reg`, `app-compat`, `app-run`) con validación de drivers/servicios.
- **NUEVO** gestor de bundles compatibles (`app-installc`, `app-info`, `uninstall`, `store-compatible`) con perfil de ejecución.

## Comandos de Shell

- Núcleo/CPU: `help`, `status`, `tick`, `bench <n>`, `ps`, `top`, `kill <pid>`, `suspend <pid>`, `resume <pid>`, `scheduler <hybrid|rr|priority>`, `cores <n>`, `profile <eco|balanced|performance>`, `governor <manual|auto>`
- Interrupciones/dispositivos: `io`, `irq <type> <source> <prio>`, `irq-list`, `dev <name> <on|off>`, `dev-list`
- Estabilidad: `panic <reason>`, `recover`, `maintenance`, `aging <on|off>`, `compact`, `watchdog <on|off>`, `svcfail <rate>`
- Red/seguridad: `netstat`, `netpolicy <low|normal|high>`, `net-circuit`, `firewall <on|off>`, `audit`, `events`, `events-clear`
- Servicios: `services`, `startsvc <name>`, `stopsvc <name>`
- Automatización: `templates`, `template-add <n> <cpu> <mem> <prio>`, `template-run <n>`, `jobs`, `job-add <delay> <cmd>`, `job-addp <delay> <prio> <cmd>`, `history`, `policies`, `policy-add <metric> <op> <value> <action>`, `policy-clear`, `prog-list`, `prog-run <name>`, `prog-rm <name>`
- Usuarios/energía: `whoami`, `login <usuario>`, `logout`, `role <user> <admin|operator|user>`, `quota <usuario> <mem>`, `namespaces`, `powersave`
- Apps/FS: `apps`, `install <app>`, `store`, `install-store <app>`, `ls`, `cat <file> [key]`, `write <file> <texto>`, `writec <file> <texto>`, `writee <file> <key> <texto>`, `rm <file>`, `mkdir <path>`, `chmod <file> <owner> <others>`, `share <file> <on|off>`, `fs-journal`, `fs-root`, `fs-tree`, `fsck [repair]`
- Productividad moderna: `desktop-add <name>`, `desktop-switch <id|name>`, `desktops`, `plugin-add <name> [ver]`, `plugin <name> <on|off>`, `plugins`, `voice <texto>`, `ai <consulta>`, `rp-create <name>`, `rp-list`, `rp-load <id|name>`, `app-reg <name> <minKernel> <arch> <driversCSV> <servicesCSV>`, `app-compat <app>`, `app-run <app>`, `app-installc <app> [profile]`, `app-info <app>`, `uninstall <app>`, `store-compatible`
- Drivers/hardware: `dev-list`, `dev <name> <on|off>`, `drv-list`, `drv-load <name>`, `drv-unload <name>`
- Memoria virtual/system calls: `vmalloc <mb> <flags>`, `vmprotect <id> <flags>`, `vmaccess <id> <mode>`, `vmstat`, `syscall <name> [...args]`
- Seguridad: `secureboot <on|off>`, `diskenc <on|off>`, `malware-scan`, `sandbox <app> <on|off>`
- Utilidades: `uptime`, `alerts-clear`, `updates`, `update <name|all>`, `save`, `load`

## Requisitos para PC real 64 bits

- Node.js 18+ (x64)
- Navegador moderno (Chrome, Edge, Firefox)

## Ejecutar en una PC de 64 bits

```bash
npm start
```

Abre:

```text
http://localhost:8000
```

## Compilación / chequeo de sintaxis

```bash
npm run compile
```

## Pruebas

```bash
npm test
```

## Archivos principales

- `index.html`: interfaz gráfica del sistema operativo.
- `styles.css`: tema visual AmigaOS y layout responsive.
- `kernel.js`: núcleo del simulador (scheduler + red + shell + FS + usuarios + apps + snapshot + benchmark + notificaciones).
  - incluye ArkrFS, memory manager virtual, system calls y control de drivers.
- `server.js`: servidor HTTP local para ejecutar en x64.
- `kernel.test.js`: suite de pruebas con `node:test`.


## Compilador interno (GUI)

Desde la ventana **Internal Compiler** puedes escribir scripts con instrucciones simples:

- `CMD <comando-shell>`
- `SPAWN <name> <cpu> <mem> <prio>`
- `WRITE <archivo> <contenido>`
- `WAIT <ticks>`

Luego compilar y ejecutar directamente desde la interfaz o desde shell con `prog-run <name>`.
