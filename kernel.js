class OnlineKernel {
  constructor(config = {}) {
    this.memoryTotal = config.memoryTotal ?? 2048;
    this.quantum = config.quantum ?? 2;
    this.reset();
  }

  boot() {
    if (this.booted) return "SYS: Workbench ya está activo.";
    this.booted = true;
    this.clock = 1;
    return "SYS: Kickstart cargado. Workbench activo.";
  }

  reset() {
    this.booted = false;
    this.clock = 0;
    this.memoryUsed = 0;
    this.pid = 1;
    this.processes = [];
    this.roundRobinIndex = 0;
    this.completedCount = 0;
    this.lastCpuUsage = 0;
    return "SYS: Reinicio completo.";
  }

  createProcess(spec = {}) {
    if (!this.booted) return "ERR: inicia Workbench primero.";

    const mem = this.clamp(spec.mem ?? this.random(16, 256), 4, 512);
    if (this.memoryUsed + mem > this.memoryTotal) {
      return `ERR: memoria CHIP/FAST insuficiente (${mem}MB).`;
    }

    const cpu = this.clamp(spec.cpu ?? this.random(2, 12), 1, 60);
    const priority = this.clamp(spec.priority ?? this.random(1, 10), 1, 10);
    const name = this.normalizeName(spec.name);

    const process = {
      pid: this.pid++,
      name,
      state: "READY",
      cpuLeft: cpu,
      mem,
      priority,
      blockedFor: 0,
    };

    this.processes.push(process);
    this.memoryUsed += mem;
    return `TASK: ${process.name} PID=${process.pid} CPU=${cpu} MEM=${mem}MB PRIO=${priority}.`;
  }

  killProcess(pid) {
    if (!this.booted) return "ERR: kernel inactivo.";
    const proc = this.processes.find((p) => p.pid === pid && p.state !== "TERMINATED");
    if (!proc) return `ERR: PID ${pid} no encontrado.`;

    proc.state = "TERMINATED";
    proc.blockedFor = 0;
    this.memoryUsed -= proc.mem;
    this.completedCount += 1;
    return `TASK: PID ${pid} finalizado por usuario.`;
  }

  triggerIOInterrupt() {
    if (!this.booted) return "ERR: kernel inactivo.";
    const candidates = this.processes.filter((p) => p.state === "READY");
    if (!candidates.length) return "SYS: sin tareas READY para I/O.";

    const selected = candidates[this.random(0, candidates.length - 1)];
    selected.state = "BLOCKED";
    selected.blockedFor = this.random(1, 4);
    return `IRQ: ${selected.name} bloqueado ${selected.blockedFor} ciclo(s).`;
  }

  tick() {
    if (!this.booted) return "ERR: kernel inactivo.";

    this.clock += 1;
    this.updateBlockedProcesses();

    const readyQueue = this.getReadyQueue();
    if (!readyQueue.length) {
      this.lastCpuUsage = 0;
      return "CPU: idle (sin READY).";
    }

    const index = this.roundRobinIndex % readyQueue.length;
    const proc = readyQueue[index];
    proc.state = "RUNNING";

    const runCycles = Math.min(this.quantum, proc.cpuLeft);
    proc.cpuLeft -= runCycles;
    this.lastCpuUsage = Math.round((runCycles / this.quantum) * 100);

    if (proc.cpuLeft <= 0) {
      proc.state = "TERMINATED";
      this.memoryUsed -= proc.mem;
      this.completedCount += 1;
      this.roundRobinIndex = 0;
      return `CPU: PID ${proc.pid} ejecutó ${runCycles} y terminó.`;
    }

    proc.state = "READY";
    this.roundRobinIndex += 1;
    return `CPU: PID ${proc.pid} ejecutó ${runCycles}, restante ${proc.cpuLeft}.`;
  }

  updateBlockedProcesses() {
    this.processes
      .filter((p) => p.state === "BLOCKED")
      .forEach((p) => {
        p.blockedFor -= 1;
        if (p.blockedFor <= 0) {
          p.state = "READY";
          p.blockedFor = 0;
        }
      });
  }

  getReadyQueue() {
    return this.processes
      .filter((p) => p.state === "READY")
      .sort((a, b) => b.priority - a.priority || a.pid - b.pid);
  }

  getState() {
    const countByState = (target) => this.processes.filter((p) => p.state === target).length;
    const active = this.processes.filter((p) => p.state !== "TERMINATED");

    return {
      booted: this.booted,
      clock: this.clock,
      memoryTotal: this.memoryTotal,
      memoryUsed: this.memoryUsed,
      quantum: this.quantum,
      ready: countByState("READY"),
      running: countByState("RUNNING"),
      blocked: countByState("BLOCKED"),
      terminated: countByState("TERMINATED"),
      activeCount: active.length,
      completedCount: this.completedCount,
      lastCpuUsage: this.lastCpuUsage,
      readyQueue: this.getReadyQueue(),
    };
  }

  normalizeName(rawName = "") {
    const value = String(rawName).trim();
    if (!value) {
      const names = ["dos.library", "intuition.task", "audio.device", "exec.task", "shell.task", "workbench.task"];
      return `${names[this.random(0, names.length - 1)]}.${this.random(10, 99)}`;
    }
    return value.slice(0, 20);
  }

  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }
}

function bootstrapUI() {
  if (typeof document === "undefined") return;

  const kernel = new OnlineKernel();
  const kernelState = document.getElementById("kernelState");
  const processTable = document.getElementById("processTable");
  const logEl = document.getElementById("log");
  const processForm = document.getElementById("processForm");
  const queueView = document.getElementById("queueView");
  const clockEl = document.getElementById("clock");
  const memBar = document.getElementById("memBar");
  const cpuBar = document.getElementById("cpuBar");

  const bootBtn = document.getElementById("bootBtn");
  const tickBtn = document.getElementById("tickBtn");
  const autoTickBtn = document.getElementById("autoTickBtn");
  const ioBtn = document.getElementById("ioBtn");
  const resetBtn = document.getElementById("resetBtn");
  const clearLogBtn = document.getElementById("clearLogBtn");
  const spawnManualBtn = document.getElementById("spawnManualBtn");
  const spawnAutoBtn = document.getElementById("spawnAutoBtn");

  const nameInput = document.getElementById("nameInput");
  const cpuInput = document.getElementById("cpuInput");
  const memInput = document.getElementById("memInput");
  const prioInput = document.getElementById("prioInput");

  let autoTickTimer = null;

  function updateTopClock() {
    clockEl.textContent = new Date().toLocaleTimeString();
  }

  function writeLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    logEl.textContent = `[${timestamp}] ${message}\n` + logEl.textContent;
  }

  function setAutoTick(active) {
    if (active && !autoTickTimer) {
      autoTickTimer = setInterval(() => {
        writeLog(kernel.tick());
        render();
      }, 900);
      autoTickBtn.textContent = "Stop Auto";
    } else if (!active && autoTickTimer) {
      clearInterval(autoTickTimer);
      autoTickTimer = null;
      autoTickBtn.textContent = "Auto Tick";
    }
  }

  function renderQueue(readyQueue) {
    if (!readyQueue.length) {
      queueView.innerHTML = '<span class="queue-pill">READY queue vacía</span>';
      return;
    }

    queueView.innerHTML = readyQueue
      .map((p, idx) => `<span class="queue-pill">#${idx + 1} PID ${p.pid} (${p.name}) P${p.priority}</span>`)
      .join("");
  }

  function render() {
    const state = kernel.getState();
    const memoryPercent = Math.round((state.memoryUsed / state.memoryTotal) * 100);

    kernelState.innerHTML = `
      <li><strong>Workbench:</strong> ${state.booted ? '<span class="ok">Online</span>' : '<span class="warn">Offline</span>'}</li>
      <li><strong>Clock Tick:</strong> ${state.clock}</li>
      <li><strong>Quantum RR:</strong> ${state.quantum}</li>
      <li><strong>Memoria:</strong> ${state.memoryUsed} / ${state.memoryTotal} MB (${memoryPercent}%)</li>
      <li><strong>READY / BLOCKED / RUNNING:</strong> ${state.ready} / ${state.blocked} / ${state.running}</li>
      <li><strong>Terminados:</strong> ${state.terminated}</li>
      <li><strong>Tareas activas:</strong> ${state.activeCount}</li>
      <li><strong>Finalizados acumulados:</strong> ${state.completedCount}</li>
    `;

    memBar.value = memoryPercent;
    cpuBar.value = state.lastCpuUsage;

    renderQueue(state.readyQueue);

    processTable.innerHTML = kernel.processes
      .map(
        (p) => `
        <tr>
          <td>${p.pid}</td>
          <td>${p.name}</td>
          <td>${p.state}</td>
          <td>${Math.max(0, p.cpuLeft)}</td>
          <td>${p.mem}MB</td>
          <td>${p.priority}</td>
          <td>${p.blockedFor || "-"}</td>
          <td><button data-kill="${p.pid}" ${p.state === "TERMINATED" ? "disabled" : ""}>Kill</button></td>
        </tr>
      `,
      )
      .join("");

    const disabled = !state.booted;
    tickBtn.disabled = disabled;
    autoTickBtn.disabled = disabled;
    ioBtn.disabled = disabled;
    spawnManualBtn.disabled = disabled;
    spawnAutoBtn.disabled = disabled;

    if (disabled) {
      setAutoTick(false);
    }
  }

  bootBtn.addEventListener("click", () => {
    writeLog(kernel.boot());
    render();
  });

  tickBtn.addEventListener("click", () => {
    writeLog(kernel.tick());
    render();
  });

  autoTickBtn.addEventListener("click", () => {
    if (!kernel.booted) return;
    setAutoTick(!autoTickTimer);
  });

  ioBtn.addEventListener("click", () => {
    writeLog(kernel.triggerIOInterrupt());
    render();
  });

  resetBtn.addEventListener("click", () => {
    setAutoTick(false);
    writeLog(kernel.reset());
    render();
  });

  clearLogBtn.addEventListener("click", () => {
    logEl.textContent = "";
    writeLog("SYS: log limpiado.");
  });

  spawnAutoBtn.addEventListener("click", () => {
    writeLog(kernel.createProcess());
    render();
  });

  processForm.addEventListener("submit", (event) => {
    event.preventDefault();
    writeLog(
      kernel.createProcess({
        name: nameInput.value,
        cpu: cpuInput.value,
        mem: memInput.value,
        priority: prioInput.value,
      }),
    );
    render();
  });

  processTable.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kill]");
    if (!button) return;
    writeLog(kernel.killProcess(Number(button.dataset.kill)));
    render();
  });

  document.querySelectorAll(".dock-icon").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.focus);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("highlight");
      setTimeout(() => target.classList.remove("highlight"), 900);
    });
  });

  setInterval(updateTopClock, 1000);
  updateTopClock();
  render();
  writeLog("SYS: AmigaOS Kernel Studio listo.");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { OnlineKernel };
}

bootstrapUI();
