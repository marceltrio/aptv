# AmigaOS Kernel Studio (simulador)

Simulador web del kernel con una **interfaz gráfica tipo escritorio** inspirada en AmigaOS.

## Mejoras principales

- Escritorio gráfico con barra superior, dock lateral e "ventanas" de trabajo.
- Panel de control del kernel con Boot, Tick, Auto Tick, I/O IRQ y Reset.
- Creador de tareas manual y automático.
- Monitor visual de cola `READY` + tabla de procesos.
- Barras de progreso para memoria y uso de CPU del último tick.
- Shell log con eventos del sistema en tiempo real.
- Scheduler Round Robin con prioridad, bloqueo por I/O y gestión de memoria.

## Ejecutar

```bash
python3 -m http.server 8000
```

Luego abre:

```text
http://localhost:8000
```

## Archivos

- `index.html`: estructura de la interfaz gráfica.
- `styles.css`: tema visual tipo AmigaOS.
- `kernel.js`: simulación del kernel y lógica de UI.
