# AmigaOS Kernel Studio (simulador)

Simulador web del kernel con una **interfaz gráfica tipo escritorio** inspirada en AmigaOS.

## Mejoras principales

- Escritorio gráfico con barra superior, dock lateral y ventanas de trabajo.
- Panel de control del kernel con Boot, Tick, Auto Tick, I/O IRQ, Reset y limpieza de log.
- Creador de tareas manual y automático.
- Monitor visual de cola `READY` + tabla de procesos.
- Barras de progreso para memoria y uso de CPU del último tick.
- Scheduler Round Robin con prioridad, bloqueo por I/O y gestión de memoria.
- **Soporte de ejecución local en PC real de 64 bits** (Windows, Linux, macOS) con Node.js.

## Requisitos para PC 64 bits

- Node.js 18+ de 64 bits.
- Navegador moderno (Chrome, Edge, Firefox).

## Ejecutar en una PC real (64 bits)

```bash
npm start
```

Después abre:

```text
http://localhost:8000
```

> También puedes usar `python3 -m http.server 8000`, pero `npm start` ya incluye servidor local propio (`server.js`).

## Pruebas automáticas

```bash
npm test
```

## Archivos

- `index.html`: estructura de la interfaz gráfica.
- `styles.css`: tema visual tipo AmigaOS.
- `kernel.js`: simulación del kernel y lógica de UI.
- `server.js`: servidor HTTP estático para ejecución local en 64 bits.
- `kernel.test.js`: pruebas automáticas del kernel con `node:test`.
