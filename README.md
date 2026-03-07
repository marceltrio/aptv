# AmigaOS Kernel Studio (simulador avanzado)

Simulador web del kernel con interfaz gráfica estilo AmigaOS, ahora con módulos extra de sistema operativo para práctica realista.

## Novedades (muchas mejoras)

- Escritorio gráfico completo: menubar, dock, ventanas y navegación por foco.
- Scheduler Round Robin con prioridades, I/O blocking y métricas de CPU/memoria.
- Perfiles de sistema: `eco`, `balanced`, `performance` (cambian quantum y memoria total).
- Auto Tick para simulación continua.
- **Virtual FileSystem** con creación, lectura, borrado y listado de archivos.
- Shell interactiva con comandos:
  - `help`, `ps`, `tick`, `io`, `kill <pid>`
  - `profile <eco|balanced|performance>`
  - `ls`, `cat <file>`, `write <file> <texto>`, `rm <file>`
  - `save`, `load`
- Persistencia local: guardar/cargar snapshot en `localStorage`.
- Pruebas automáticas extendidas del kernel (scheduler + FS + snapshots + parser de comandos).

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

- `index.html`: interfaz gráfica del sistema.
- `styles.css`: tema visual AmigaOS y layout responsive.
- `kernel.js`: núcleo del simulador + shell + filesystem + snapshot.
- `server.js`: servidor HTTP local para ejecutar en x64.
- `kernel.test.js`: suite de pruebas con `node:test`.
