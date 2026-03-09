class OnlineKernel {
  constructor(config = {}) {
    this.memoryTotal = config.memoryTotal ?? 2048;
    this.quantum = config.quantum ?? 2;
    this.profile = "balanced";
    this.users = ["admin"];
    this.currentUser = null;
    this.apps = [];
    this.files = [];
    this.network = { packetsSent: 0, packetsDropped: 0, load: 0 };
    this.reset();
  }

  boot() {
    if (this.booted) return "SYS: Workbench ya está activo.";
    this.booted = true;
    this.clock = 1;
    this.currentUser = this.currentUser || "admin";
    if (!this.files.length) {
      this.createFile("readme.txt", "Bienvenido a AmigaOS Kernel Studio");
      this.createFile("syslog.txt", "Sistema inicializado.");
    }
    if (!this.apps.length) {
      this.installApp("shell.app");
      this.installApp("monitor.app");
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
    this.network = { packetsSent: 0, packetsDropped: 0, load: 0 };
    return "SYS: Reinicio completo.";
  }

  setProfile(profile) {
    const map = {
      eco: { quantum: 1, memoryTotal: 1024 },
      balanced: { quantum: 2, memoryTotal: 2048 },
      performance: { quantum: 4, memoryTotal: 4096 },
    };
    if (!map[profile]) return `ERR: perfil '${profile}' no válido.`;
    const cfg = map[profile];
    this.profile = profile;
    this.quantum = cfg.quantum;
    this.memoryTotal = Math.max(cfg.memoryTotal, this.memoryUsed || 0);
    return `SYS: perfil aplicado '${profile}' (Q=${this.quantum}, MEM=${this.memoryTotal}MB).`;
  }

  login(user) {
    const safe = String(user || "").trim();
    if (!safe) return "ERR: usuario vacío.";
    if (!this.users.includes(safe)) {
      this.users.push(safe);
    }
    this.currentUser = safe;
    return `AUTH: sesión iniciada como ${safe}.`;
  }

  logout() {
    if (!this.currentUser) return "AUTH: no hay sesión activa.";
    const previous = this.currentUser;
    this.currentUser = null;
    return `AUTH: sesión cerrada (${previous}).`;
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
      owner: this.currentUser || "system",
      createdAt: this.clock,
    };

    this.processes.push(process);
    this.memoryUsed += mem;
    return `TASK: ${process.name} PID=${process.pid} CPU=${cpu} MEM=${mem}MB PRIO=${priority} OWNER=${process.owner}.`;
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
    this.networkTick();
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

  networkTick() {
    const send = this.random(2, 20);
    const dropChance = this.profile === "eco" ? 0.2 : this.profile === "performance" ? 0.05 : 0.12;
    const dropped = Array.from({ length: send }).reduce((acc) => acc + (Math.random() < dropChance ? 1 : 0), 0);
    this.network.packetsSent += send;
    this.network.packetsDropped += dropped;
    this.network.load = Math.min(100, Math.round((send / 20) * 100));
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

  installApp(name) {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: nombre de app vacío.";
    if (this.apps.includes(safe)) return `APP: '${safe}' ya está instalado.`;
    this.apps.push(safe);
    return `APP: '${safe}' instalado.`;
  }

  listApps() {
    return this.apps.length ? this.apps.join(", ") : "APP: sin apps instaladas.";
  }

  createFile(name, content = "") {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: nombre de archivo vacío.";
    const file = this.files.find((f) => f.name === safe);
    if (file) {
      file.content = String(content);
      file.updatedAt = this.clock;
      return `FS: '${safe}' actualizado.`;
    }
    this.files.push({ name: safe, content: String(content), updatedAt: this.clock });
    return `FS: '${safe}' creado.`;
  }

  readFile(name) {
    const file = this.files.find((f) => f.name === name);
    return file ? `FILE ${file.name}: ${file.content}` : `ERR: archivo '${name}' no existe.`;
  }

  deleteFile(name) {
    const before = this.files.length;
    this.files = this.files.filter((f) => f.name !== name);
    return before === this.files.length ? `ERR: archivo '${name}' no existe.` : `FS: '${name}' eliminado.`;
  }

  listFiles() {
    return this.files.length ? this.files.map((f) => `${f.name} (${f.content.length}B)`).join(", ") : "FS: vacío.";
  }

  diagnosticsReport() {
    const state = this.getState();
    return {
      timestamp: new Date().toISOString(),
      profile: state.profile,
      booted: state.booted,
      clock: state.clock,
      memory: `${state.memoryUsed}/${state.memoryTotal}`,
      processSummary: {
        ready: state.ready,
        blocked: state.blocked,
        running: state.running,
        terminated: state.terminated,
      },
      network: state.network,
      currentUser: state.currentUser,
      users: state.users,
      apps: state.apps,
      files: state.files.map((f) => f.name),
    };
  }

  saveSnapshot() {
    return JSON.stringify({
      booted: this.booted,
      clock: this.clock,
      memoryTotal: this.memoryTotal,
      quantum: this.quantum,
      profile: this.profile,
      pid: this.pid,
      processes: this.processes,
      completedCount: this.completedCount,
      files: this.files,
      users: this.users,
      currentUser: this.currentUser,
      apps: this.apps,
      network: this.network,
    });
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
      this.users = Array.isArray(data.users) ? data.users : ["admin"];
      this.currentUser = data.currentUser || null;
      this.apps = Array.isArray(data.apps) ? data.apps : [];
      this.network = data.network || { packetsSent: 0, packetsDropped: 0, load: 0 };
      this.memoryUsed = this.processes.filter((p) => p.state !== "TERMINATED").reduce((sum, p) => sum + p.mem, 0);
      return "SYS: snapshot cargado correctamente.";
    } catch {
      return "ERR: snapshot inválido.";
    }
  }

  executeCommand(input) {
    const [cmd, ...args] = String(input || "").trim().split(/\s+/);
    if (!cmd) return "";

    if (cmd === "help") return "help, ps, tick, io, kill <pid>, profile <eco|balanced|performance>, whoami, login <user>, logout, apps, install <app>, ls, cat <file>, write <file> <txt>, rm <file>, save, load";
    if (cmd === "ps") return this.processes.map((p) => `PID ${p.pid} ${p.name} ${p.state} CPU=${p.cpuLeft}`).join(" | ") || "sin procesos";
    if (cmd === "tick") return this.tick();
    if (cmd === "io") return this.triggerIOInterrupt();
    if (cmd === "kill") return this.killProcess(Number(args[0]));
    if (cmd === "profile") return this.setProfile(args[0]);
    if (cmd === "whoami") return this.currentUser || "sin sesión";
    if (cmd === "login") return this.login(args[0]);
    if (cmd === "logout") return this.logout();
    if (cmd === "apps") return this.listApps();
    if (cmd === "install") return this.installApp(args[0]);
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
    const packetsTotal = this.network.packetsSent || 1;

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
      users: this.users,
      currentUser: this.currentUser,
      apps: this.apps,
      network: {
        ...this.network,
        dropRate: Math.round((this.network.packetsDropped / packetsTotal) * 100),
      },
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
  const appsList = el("appsList");
  const memBar = el("memBar");
  const cpuBar = el("cpuBar");
  const netBar = el("netBar");

  const buttonIds = [
    "bootBtn", "tickBtn", "autoTickBtn", "ioBtn", "saveBtn", "loadBtn", "diagBtn", "resetBtn", "clearLogBtn",
    "spawnManualBtn", "spawnAutoBtn", "createFileBtn", "installAppBtn", "logoutBtn",
    "toggleScanBtn", "toggleGlowBtn", "cascadeBtn",
  ];
  const buttons = Object.fromEntries(buttonIds.map((id) => [id, el(id)]));

  let autoTickTimer = null;
  const body = document.body;

  function applyTheme(theme) {
    body.classList.remove("theme-purple", "theme-graphite");
    if (theme === "purple") body.classList.add("theme-purple");
    if (theme === "graphite") body.classList.add("theme-graphite");
  }

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

  function renderApps(apps) {
    appsList.innerHTML = apps.length ? apps.map((a) => `<li>${a}</li>`).join("") : "<li>Sin apps</li>";
  }

  function render() {
    const s = kernel.getState();
    const memoryPercent = Math.round((s.memoryUsed / s.memoryTotal) * 100);

    kernelState.innerHTML = `
      <li><strong>Workbench:</strong> ${s.booted ? '<span class="ok">Online</span>' : '<span class="warn">Offline</span>'}</li>
      <li><strong>Perfil:</strong> ${s.profile} | <strong>Usuario:</strong> ${s.currentUser || "-"}</li>
      <li><strong>Clock Tick:</strong> ${s.clock} | <strong>Quantum:</strong> ${s.quantum}</li>
      <li><strong>Memoria:</strong> ${s.memoryUsed}/${s.memoryTotal}MB (${memoryPercent}%)</li>
      <li><strong>READY/BLOCKED/RUNNING:</strong> ${s.ready}/${s.blocked}/${s.running}</li>
      <li><strong>Terminados:</strong> ${s.terminated} | <strong>Idle:</strong> ${s.idleTicks}</li>
    `;

    el("networkStats").textContent = `NET packets=${s.network.packetsSent}, drops=${s.network.packetsDropped}, dropRate=${s.network.dropRate}%`;
    el("sessionInfo").textContent = `Sesión: ${s.currentUser || "sin sesión"} | Usuarios: ${s.users.join(", ")}`;

    memBar.value = memoryPercent;
    cpuBar.value = s.lastCpuUsage;
    netBar.value = s.network.load;

    renderQueue(s.readyQueue);
    renderFiles(s.files);
    renderApps(s.apps);

    processTable.innerHTML = kernel.processes
      .map((p) => `<tr><td>${p.pid}</td><td>${p.name}</td><td>${p.state}</td><td>${Math.max(0, p.cpuLeft)}</td><td>${p.mem}MB</td><td>${p.priority}</td><td>${p.blockedFor || "-"}</td><td><button data-kill="${p.pid}" ${p.state === "TERMINATED" ? "disabled" : ""}>Kill</button></td></tr>`)
      .join("");

    ["tickBtn", "autoTickBtn", "ioBtn", "saveBtn", "diagBtn", "spawnManualBtn", "spawnAutoBtn", "createFileBtn", "installAppBtn"].forEach((id) => {
      buttons[id].disabled = !s.booted;
    });
    buttons.logoutBtn.disabled = !s.currentUser;
    el("profileSelect").value = s.profile;
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

  function cascadeWindows() {
    const windows = Array.from(document.querySelectorAll(".workspace .window"));
    windows.forEach((w, i) => {
      w.style.transform = `translate(${(i % 4) * 6}px, ${(i % 4) * 6}px)`;
      w.style.zIndex = String(10 + i);
    });
    setTimeout(() => {
      windows.forEach((w) => {
        w.style.transform = "";
        w.style.zIndex = "";
      });
    }, 900);
    writeLog("SYS: cascade visual aplicado.");
  }

  function exportDiagnostics() {
    const report = JSON.stringify(kernel.diagnosticsReport(), null, 2);
    if (typeof Blob === "undefined") {
      writeLog(report);
      return;
    }
    const blob = new Blob([report], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    writeLog("SYS: diagnóstico exportado.");
  }

  el("profileSelect").addEventListener("change", (e) => {
    const val = e.target.value;
    writeLog(kernel.setProfile(val));
    applyTheme(val === "eco" ? "graphite" : val === "performance" ? "purple" : "ocean");
    render();
  });
  el("themeSelect").addEventListener("change", (e) => applyTheme(e.target.value));
  buttons.toggleScanBtn.addEventListener("click", () => body.classList.toggle("scanlines"));
  buttons.toggleGlowBtn.addEventListener("click", () => body.classList.toggle("neon"));
  buttons.cascadeBtn.addEventListener("click", cascadeWindows);
  buttons.bootBtn.addEventListener("click", () => { writeLog(kernel.boot()); render(); });
  buttons.tickBtn.addEventListener("click", () => { writeLog(kernel.tick()); render(); });
  buttons.autoTickBtn.addEventListener("click", () => setAutoTick(!autoTickTimer));
  buttons.ioBtn.addEventListener("click", () => { writeLog(kernel.triggerIOInterrupt()); render(); });
  buttons.resetBtn.addEventListener("click", () => { setAutoTick(false); writeLog(kernel.reset()); render(); });
  buttons.clearLogBtn.addEventListener("click", () => { logEl.textContent = ""; writeLog("SYS: log limpiado."); });
  buttons.spawnAutoBtn.addEventListener("click", () => { writeLog(kernel.createProcess()); render(); });
  buttons.saveBtn.addEventListener("click", () => { localStorage.setItem("amiga_kernel_snapshot", kernel.saveSnapshot()); writeLog("SYS: estado guardado en localStorage."); });
  buttons.loadBtn.addEventListener("click", () => { writeLog(kernel.loadSnapshot(localStorage.getItem("amiga_kernel_snapshot") || "")); render(); });
  buttons.diagBtn.addEventListener("click", exportDiagnostics);

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
  el("refreshFsBtn").addEventListener("click", render);

  el("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(kernel.login(el("loginInput").value));
    el("loginInput").value = "";
    render();
  });
  buttons.logoutBtn.addEventListener("click", () => { writeLog(kernel.logout()); render(); });

  el("appForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(kernel.installApp(el("appInput").value));
    el("appInput").value = "";
    render();
  });

  processTable.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-kill]");
    if (!button) return;
    writeLog(kernel.killProcess(Number(button.dataset.kill)));
    render();
  });

  el("commandForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = el("commandInput").value;
    writeLog(`> ${input}`);
    writeLog(kernel.executeCommand(input));
    el("commandInput").value = "";
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

  setInterval(() => { el("clock").textContent = new Date().toLocaleTimeString(); }, 1000);
  el("clock").textContent = new Date().toLocaleTimeString();
  applyTheme("ocean");
  render();
  writeLog("SYS: AmigaOS Kernel Studio listo. Escribe 'help' en shell.");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { OnlineKernel };
}

bootstrapUI();
