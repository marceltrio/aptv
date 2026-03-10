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

## Comandos de Shell

- Núcleo/CPU: `help`, `status`, `tick`, `bench <n>`, `ps`, `top`, `kill <pid>`, `scheduler <hybrid|rr|priority>`, `cores <n>`, `profile <eco|balanced|performance>`
- Interrupciones/dispositivos: `io`, `irq <type> <source> <prio>`, `irq-list`, `dev <name> <on|off>`, `dev-list`
- Estabilidad: `panic <reason>`, `recover`, `maintenance`, `aging <on|off>`, `compact`
- Red/seguridad: `netstat`, `firewall <on|off>`, `audit`
- Servicios: `services`, `startsvc <name>`, `stopsvc <name>`
- Automatización: `templates`, `template-add <n> <cpu> <mem> <prio>`, `template-run <n>`, `jobs`, `history`
- Usuarios/energía: `whoami`, `login <usuario>`, `logout`, `quota <usuario> <mem>`, `powersave`
- Apps/FS: `apps`, `install <app>`, `ls`, `cat <file>`, `write <file> <texto>`, `rm <file>`
- Utilidades: `uptime`, `alerts-clear`, `save`, `load`

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
- `server.js`: servidor HTTP local para ejecutar en x64.
- `kernel.test.js`: suite de pruebas con `node:test`.
