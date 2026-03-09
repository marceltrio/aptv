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

- Mejoras visuales estilo AmigaOS: selector de temas (`Ocean`, `Purple`, `Graphite`), efecto CRT scanlines, glow retro y modo cascade de ventanas.

## Comandos de Shell

- `help`, `ps`, `tick`, `io`, `kill <pid>`
- `profile <eco|balanced|performance>`
- `whoami`, `login <usuario>`, `logout`
- `apps`, `install <app>`
- `ls`, `cat <file>`, `write <file> <texto>`, `rm <file>`
- `save`, `load`

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

## Pruebas

```bash
npm test
```

## Archivos principales

- `index.html`: interfaz gráfica del sistema operativo.
- `styles.css`: tema visual AmigaOS y layout responsive.
- `kernel.js`: núcleo del simulador (scheduler + red + shell + FS + usuarios + apps + snapshot).
- `server.js`: servidor HTTP local para ejecutar en x64.
- `kernel.test.js`: suite de pruebas con `node:test`.
