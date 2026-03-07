class OnlineKernel {
  constructor(config = {}) {
    this.memoryTotal = config.memoryTotal ?? 2048;
    this.quantum = config.quantum ?? 2;
    this.profile = "balanced";
    this.files = [];
    this.reset();
  }

  boot() {
    if (this.booted) return "SYS: Workbench ya está activo.";
    this.booted = true;
    this.clock = 1;
    if (!this.files.length) {
      this.createFile("readme.txt", "Bienvenido a AmigaOS Kernel Studio");
      this.createFile("syslog.txt", "Sistema inicializado.");
    }
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
    this.idleTicks = 0;
    return "SYS: Reinicio completo.";
  }

  setProfile(profile) {
    const map = {
      eco: { quantum: 1, memoryTotal: 1024 },
      balanced: { quantum: 2, memoryTotal: 2048 },
      performance: { quantum: 4, memoryTotal: 4096 },
    };
    if (!map[profile]) return `ERR: perfil '${profile}' no válido.`;
    this.profile = profile;
    const cfg = map[profile];
    this.quantum = cfg.quantum;
    this.memoryTotal = Math.max(cfg.memoryTotal, this.memoryUsed || 0);
    return `SYS: perfil aplicado '${profile}' (Q=${this.quantum}, MEM=${this.memoryTotal}MB).`;
  }

  createProcess(spec = {}) {
    if (!this.booted) return "ERR: inicia Workbench primero.";

    const mem = this.clamp(spec.mem ?? this.random(16, 256), 4, 512);
    if (this.memoryUsed + mem > this.memoryTotal) {
      return `ERR: memoria CHIP/FAST insuficiente (${mem}MB).`;
    }

    const cpu = this.clamp(spec.cpu ?? this.random(2, 12), 1, 60);
    const priority = this.clamp(spec.priority ?? this.random(1, 10), 1, 10);
    const process = {
      pid: this.pid++,
      name: this.normalizeName(spec.name),
      state: "READY",
      cpuLeft: cpu,
      mem,
      priority,
      blockedFor: 0,
      createdAt: this.clock,
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
      this.idleTicks += 1;
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
    this.processes.filter((p) => p.state === "BLOCKED").forEach((p) => {
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

  createFile(name, content = "") {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: nombre de archivo vacío.";
    const exists = this.files.find((f) => f.name === safe);
    if (exists) {
      exists.content = String(content);
      exists.updatedAt = this.clock;
      return `FS: '${safe}' actualizado.`;
    }
    this.files.push({ name: safe, content: String(content), updatedAt: this.clock });
    return `FS: '${safe}' creado.`;
  }

  readFile(name) {
    const file = this.files.find((f) => f.name === name);
    if (!file) return `ERR: archivo '${name}' no existe.`;
    return `FILE ${file.name}: ${file.content}`;
  }

  deleteFile(name) {
    const before = this.files.length;
    this.files = this.files.filter((f) => f.name !== name);
    return before === this.files.length ? `ERR: archivo '${name}' no existe.` : `FS: '${name}' eliminado.`;
  }

  listFiles() {
    if (!this.files.length) return "FS: vacío.";
    return this.files.map((f) => `${f.name} (${f.content.length}B)`).join(", ");
  }

  saveSnapshot() {
    const payload = {
      booted: this.booted,
      clock: this.clock,
      memoryTotal: this.memoryTotal,
      quantum: this.quantum,
      profile: this.profile,
      pid: this.pid,
      processes: this.processes,
      completedCount: this.completedCount,
      files: this.files,
    };
    return JSON.stringify(payload);
  }

  loadSnapshot(raw) {
    try {
      const data = JSON.parse(raw);
      this.booted = Boolean(data.booted);
      this.clock = Number(data.clock || 0);
      this.memoryTotal = Number(data.memoryTotal || 2048);
      this.quantum = Number(data.quantum || 2);
      this.profile = data.profile || "balanced";
      this.pid = Number(data.pid || 1);
      this.processes = Array.isArray(data.processes) ? data.processes : [];
      this.completedCount = Number(data.completedCount || 0);
      this.files = Array.isArray(data.files) ? data.files : [];
      this.memoryUsed = this.processes.filter((p) => p.state !== "TERMINATED").reduce((sum, p) => sum + p.mem, 0);
      return "SYS: snapshot cargado correctamente.";
    } catch {
      return "ERR: snapshot inválido.";
    }
  }

  executeCommand(input) {
    const [cmd, ...args] = String(input || "").trim().split(/\s+/);
    if (!cmd) return "";
    if (cmd === "help") return "help, ps, tick, io, kill <pid>, profile <eco|balanced|performance>, ls, cat <file>, write <file> <txt>, rm <file>, save, load";
    if (cmd === "ps") return this.processes.map((p) => `PID ${p.pid} ${p.name} ${p.state} CPU=${p.cpuLeft}`).join(" | ") || "sin procesos";
    if (cmd === "tick") return this.tick();
    if (cmd === "io") return this.triggerIOInterrupt();
    if (cmd === "kill") return this.killProcess(Number(args[0]));
    if (cmd === "profile") return this.setProfile(args[0]);
    if (cmd === "ls") return this.listFiles();
    if (cmd === "cat") return this.readFile(args[0]);
    if (cmd === "write") return this.createFile(args[0], args.slice(1).join(" "));
    if (cmd === "rm") return this.deleteFile(args[0]);
    if (cmd === "save") return this.saveSnapshot();
    if (cmd === "load") return this.loadSnapshot(args.join(" "));
    return `ERR: comando desconocido '${cmd}'.`;
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
      profile: this.profile,
      ready: countByState("READY"),
      running: countByState("RUNNING"),
      blocked: countByState("BLOCKED"),
      terminated: countByState("TERMINATED"),
      activeCount: active.length,
      completedCount: this.completedCount,
      lastCpuUsage: this.lastCpuUsage,
      idleTicks: this.idleTicks,
      readyQueue: this.getReadyQueue(),
      files: this.files,
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

  random(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
  clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }
}

function bootstrapUI() {
  if (typeof document === "undefined") return;

  const kernel = new OnlineKernel();
  const el = (id) => document.getElementById(id);
  const logEl = el("log");
  const processTable = el("processTable");
  const kernelState = el("kernelState");
  const queueView = el("queueView");
  const fileList = el("fileList");
  const memBar = el("memBar");
  const cpuBar = el("cpuBar");
  const commandInput = el("commandInput");

  const ids = ["bootBtn", "tickBtn", "autoTickBtn", "ioBtn", "saveBtn", "loadBtn", "resetBtn", "clearLogBtn", "spawnManualBtn", "spawnAutoBtn", "createFileBtn"];
  const buttons = Object.fromEntries(ids.map((id) => [id, el(id)]));

  let autoTickTimer = null;

  function writeLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    logEl.textContent = `[${timestamp}] ${message}\n` + logEl.textContent;
  }

  function renderQueue(queue) {
    queueView.innerHTML = queue.length
      ? queue.map((p, i) => `<span class="queue-pill">#${i + 1} PID ${p.pid} ${p.name} P${p.priority}</span>`).join("")
      : '<span class="queue-pill">READY queue vacía</span>';
  }

  function renderFiles(files) {
    fileList.innerHTML = files.length
      ? files.map((f) => `<li><strong>${f.name}</strong> - ${f.content.slice(0, 36)}</li>`).join("")
      : "<li>Sin archivos</li>";
  }

  function render() {
    const s = kernel.getState();
    const memoryPercent = Math.round((s.memoryUsed / s.memoryTotal) * 100);

    kernelState.innerHTML = `
      <li><strong>Workbench:</strong> ${s.booted ? '<span class="ok">Online</span>' : '<span class="warn">Offline</span>'}</li>
      <li><strong>Perfil:</strong> ${s.profile}</li>
      <li><strong>Clock Tick:</strong> ${s.clock}</li>
      <li><strong>Quantum:</strong> ${s.quantum}</li>
      <li><strong>Memoria:</strong> ${s.memoryUsed}/${s.memoryTotal}MB (${memoryPercent}%)</li>
      <li><strong>READY/BLOCKED/RUNNING:</strong> ${s.ready}/${s.blocked}/${s.running}</li>
      <li><strong>Terminados:</strong> ${s.terminated} | <strong>Idle ticks:</strong> ${s.idleTicks}</li>
    `;

    memBar.value = memoryPercent;
    cpuBar.value = s.lastCpuUsage;
    renderQueue(s.readyQueue);
    renderFiles(s.files);

    processTable.innerHTML = kernel.processes
      .map((p) => `<tr><td>${p.pid}</td><td>${p.name}</td><td>${p.state}</td><td>${Math.max(0, p.cpuLeft)}</td><td>${p.mem}MB</td><td>${p.priority}</td><td>${p.blockedFor || "-"}</td><td><button data-kill="${p.pid}" ${p.state === "TERMINATED" ? "disabled" : ""}>Kill</button></td></tr>`)
      .join("");

    ["tickBtn", "autoTickBtn", "ioBtn", "saveBtn", "spawnManualBtn", "spawnAutoBtn", "createFileBtn"].forEach((id) => {
      buttons[id].disabled = !s.booted;
    });
  }

  function setAutoTick(on) {
    if (on && !autoTickTimer) {
      autoTickTimer = setInterval(() => { writeLog(kernel.tick()); render(); }, 850);
      buttons.autoTickBtn.textContent = "Stop Auto";
    } else if (!on && autoTickTimer) {
      clearInterval(autoTickTimer);
      autoTickTimer = null;
      buttons.autoTickBtn.textContent = "Auto Tick";
    }
  }

  el("profileSelect").addEventListener("change", (e) => { writeLog(kernel.setProfile(e.target.value)); render(); });
  buttons.bootBtn.addEventListener("click", () => { writeLog(kernel.boot()); render(); });
  buttons.tickBtn.addEventListener("click", () => { writeLog(kernel.tick()); render(); });
  buttons.autoTickBtn.addEventListener("click", () => setAutoTick(!autoTickTimer));
  buttons.ioBtn.addEventListener("click", () => { writeLog(kernel.triggerIOInterrupt()); render(); });
  buttons.resetBtn.addEventListener("click", () => { setAutoTick(false); writeLog(kernel.reset()); render(); });
  buttons.clearLogBtn.addEventListener("click", () => { logEl.textContent = ""; writeLog("SYS: log limpiado."); });
  buttons.spawnAutoBtn.addEventListener("click", () => { writeLog(kernel.createProcess()); render(); });
  buttons.saveBtn.addEventListener("click", () => { localStorage.setItem("amiga_kernel_snapshot", kernel.saveSnapshot()); writeLog("SYS: estado guardado en localStorage."); });
  buttons.loadBtn.addEventListener("click", () => { writeLog(kernel.loadSnapshot(localStorage.getItem("amiga_kernel_snapshot") || "")); render(); });

  el("processForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(kernel.createProcess({ name: el("nameInput").value, cpu: el("cpuInput").value, mem: el("memInput").value, priority: el("prioInput").value }));
    render();
  });

  el("fileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(kernel.createFile(el("fileNameInput").value, el("fileContentInput").value));
    render();
  });
  el("refreshFsBtn").addEventListener("click", () => render());

  processTable.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-kill]");
    if (!button) return;
    writeLog(kernel.killProcess(Number(button.dataset.kill)));
    render();
  });

  el("commandForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(`> ${commandInput.value}`);
    writeLog(kernel.executeCommand(commandInput.value));
    commandInput.value = "";
    render();
  });

  document.querySelectorAll(".dock-icon").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.focus);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("highlight");
      setTimeout(() => target.classList.remove("highlight"), 900);
    });
  });

  setInterval(() => { el("clock").textContent = new Date().toLocaleTimeString(); }, 1000);
  el("clock").textContent = new Date().toLocaleTimeString();
  render();
  writeLog("SYS: AmigaOS Kernel Studio listo. Escribe 'help' en shell.");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { OnlineKernel };
}

bootstrapUI();
