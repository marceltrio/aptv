class OnlineKernel {
  constructor(config = {}) {
    this.memoryTotal = config.memoryTotal ?? 2048;
    this.quantum = config.quantum ?? 2;
    this.profile = "balanced";
    this.coreCount = this.clamp(config.coreCount ?? 2, 1, 8);
    this.coreLoad = Array.from({ length: this.coreCount }, () => 0);
    this.schedulerMode = "hybrid";
    this.maintenanceMode = false;
    this.users = ["admin"];
    this.currentUser = null;
    this.apps = [];
    this.services = [];
    this.files = [];
    this.network = { packetsSent: 0, packetsDropped: 0, load: 0 };
    this.panicState = null;
    this.interruptQueue = [];
    this.interruptStats = { handled: 0, dropped: 0, avgLatency: 0 };
    this.devices = [
      { name: "disk.device", online: true, load: 0 },
      { name: "net.device", online: true, load: 0 },
      { name: "audio.device", online: true, load: 0 },
    ];
    this.notifications = [];
    this.benchmarkHistory = [];
    this.templates = [];
    this.firewallEnabled = false;
    this.auditTrail = [];
    this.userQuotas = {};
    this.jobs = [];
    this.powerSaveMode = false;
    this.commandHistory = [];
    this.agingEnabled = true;
    this.fragmentationLevel = 0;
    this.serviceEvents = { failures: 0, restarts: 0 };
    this.swapTotal = config.swapTotal ?? 2048;
    this.swapUsed = 0;
    this.serviceWatchdogEnabled = true;
    this.serviceFailureRate = 0.03;
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
    if (!this.services.length) {
      this.startService("net.service");
      this.startService("fs.service");
    }
    this.notify("Kernel iniciado", "ok");
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
    this.panicState = null;
    this.coreLoad = Array.from({ length: this.coreCount }, () => 0);
    this.interruptQueue = [];
    this.interruptStats = { handled: 0, dropped: 0, avgLatency: 0 };
    this.devices = this.devices.map((d) => ({ ...d, online: true, load: 0 }));
    this.services = this.services.map((svc) => ({ ...svc, running: false }));
    this.fragmentationLevel = 0;
    this.serviceEvents = { failures: 0, restarts: 0 };
    this.swapUsed = 0;
    this.serviceWatchdogEnabled = true;
    this.serviceFailureRate = 0.03;
    return "SYS: Reinicio completo.";
  }

  setCoreCount(count) {
    const value = this.clamp(count, 1, 8);
    this.coreCount = value;
    this.coreLoad = Array.from({ length: value }, () => 0);
    this.notify(`CPU cores configurados: ${value}`, "ok");
    return `SYS: core count=${value}.`;
  }

  triggerPanic(reason = "unknown") {
    this.panicState = { reason: String(reason), at: this.clock };
    this.notify(`KERNEL PANIC: ${reason}`, "warn");
    return `PANIC: ${reason}`;
  }

  recoverKernel() {
    if (!this.panicState) return "SYS: kernel estable, sin panic.";
    const previous = this.panicState.reason;
    this.panicState = null;
    this.notify(`Kernel recovered from: ${previous}`, "ok");
    return `SYS: recovered from panic (${previous}).`;
  }

  raiseInterrupt(type = "io", source = "kernel", priority = 5) {
    const item = {
      id: `${this.clock}-${this.random(1000, 9999)}`,
      type: String(type || "io"),
      source: String(source || "kernel"),
      priority: this.clamp(priority, 1, 10),
      createdAt: this.clock,
    };
    if (this.interruptQueue.length >= 64) {
      this.interruptStats.dropped += 1;
      return "IRQ: cola llena, interrupción descartada.";
    }
    this.interruptQueue.push(item);
    this.interruptQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    return `IRQ: ${item.type} encolada p=${item.priority} (${item.source}).`;
  }

  processInterrupts(limit = 2) {
    const n = this.clamp(limit, 1, 8);
    const served = this.interruptQueue.splice(0, n);
    if (!served.length) return [];
    served.forEach((irq) => {
      const latency = Math.max(0, this.clock - irq.createdAt);
      const prev = this.interruptStats.avgLatency;
      this.interruptStats.handled += 1;
      this.interruptStats.avgLatency = Math.round(((prev * (this.interruptStats.handled - 1)) + latency) / this.interruptStats.handled);
      const device = this.devices.find((d) => irq.source.startsWith(d.name.split(".")[0]) || irq.source === d.name || irq.type.includes(d.name.split(".")[0]));
      if (device) device.load = this.clamp(device.load + this.random(5, 20), 0, 100);
      if (irq.type === "device-fault") this.notify(`IRQ crítico ${irq.source}`, "warn");
    });
    return served;
  }

  setDeviceState(name, online) {
    const safe = String(name || "").trim();
    const d = this.devices.find((x) => x.name === safe);
    if (!d) return `ERR: device '${safe}' no existe.`;
    d.online = Boolean(online);
    if (!d.online) d.load = 0;
    this.notify(`Device ${d.name} ${d.online ? "ON" : "OFF"}`, d.online ? "ok" : "warn");
    return `DEV: ${d.name}=${d.online ? "ON" : "OFF"}`;
  }

  listDevices() {
    return this.devices.map((d) => `${d.name}:${d.online ? "ON" : "OFF"}(${d.load}%)`).join(", ");
  }

  notify(message, level = "warn") {
    this.notifications.unshift({ message, level, at: this.clock });
    this.notifications = this.notifications.slice(0, 8);
    this.auditTrail.unshift({ at: this.clock, type: level, message });
    this.auditTrail = this.auditTrail.slice(0, 50);
  }

  clearNotifications() {
    this.notifications = [];
    return "SYS: notificaciones limpiadas.";
  }

  setUserQuota(user, maxMem) {
    const safe = String(user || "").trim();
    if (!safe) return "ERR: usuario inválido.";
    const value = this.clamp(maxMem, 32, 4096);
    this.userQuotas[safe] = value;
    this.notify(`Quota ${safe}=${value}MB`, "ok");
    return `SEC: quota para ${safe} = ${value}MB`;
  }

  togglePowerSave() {
    this.powerSaveMode = !this.powerSaveMode;
    if (this.powerSaveMode) this.quantum = Math.max(1, this.quantum - 1);
    this.notify(`PowerSave ${this.powerSaveMode ? "ON" : "OFF"}`, this.powerSaveMode ? "warn" : "ok");
    return `SYS: powersave ${this.powerSaveMode ? "ON" : "OFF"}.`;
  }

  addJob(delayTicks, command) {
    const delay = this.clamp(delayTicks, 1, 500);
    const cmd = String(command || "").trim();
    if (!cmd) return "ERR: comando job vacío.";
    const job = { at: this.clock + delay, command: cmd };
    this.jobs.push(job);
    this.notify(`Job programado @${job.at}: ${cmd}`, "ok");
    return `JOB: programado para tick ${job.at}.`;
  }

  runJobs() {
    const due = this.jobs.filter((j) => j.at <= this.clock);
    if (!due.length) return;
    this.jobs = this.jobs.filter((j) => j.at > this.clock);
    due.forEach((job) => {
      const out = this.executeCommand(job.command, { internal: true });
      this.notify(`Job ${job.command} => ${String(out).slice(0, 48)}`, "ok");
    });
  }

  setFirewall(on) {
    this.firewallEnabled = Boolean(on);
    const status = this.firewallEnabled ? "ON" : "OFF";
    this.notify(`Firewall ${status}`, this.firewallEnabled ? "ok" : "warn");
    return `SEC: firewall ${status}.`;
  }

  createTemplate(name, spec = {}) {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: template vacío.";
    const tpl = {
      name: safe,
      cpu: this.clamp(spec.cpu ?? 8, 1, 60),
      mem: this.clamp(spec.mem ?? 32, 4, 512),
      priority: this.clamp(spec.priority ?? 5, 1, 10),
    };
    const idx = this.templates.findIndex((t) => t.name === safe);
    if (idx >= 0) this.templates[idx] = tpl;
    else this.templates.push(tpl);
    this.notify(`Template ${safe} guardado`, "ok");
    return `TPL: '${safe}' guardado.`;
  }

  runTemplate(name) {
    const tpl = this.templates.find((t) => t.name === name);
    if (!tpl) return `ERR: template '${name}' no existe.`;
    return this.createProcess({ name: tpl.name, cpu: tpl.cpu, mem: tpl.mem, priority: tpl.priority });
  }

  listTemplates() {
    return this.templates.length
      ? this.templates.map((t) => `${t.name}(cpu=${t.cpu},mem=${t.mem},p=${t.priority})`).join(", ")
      : "TPL: vacío.";
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
    this.notify(`Perfil cambiado a ${profile}`, "ok");
    return `SYS: perfil aplicado '${profile}' (Q=${this.quantum}, MEM=${this.memoryTotal}MB).`;
  }

  setScheduler(mode) {
    const allowed = ["hybrid", "rr", "priority"];
    if (!allowed.includes(mode)) return `ERR: scheduler '${mode}' no válido.`;
    this.schedulerMode = mode;
    this.notify(`Scheduler cambiado a ${mode}`, "ok");
    return `SYS: scheduler '${mode}' activo.`;
  }

  toggleMaintenance() {
    this.maintenanceMode = !this.maintenanceMode;
    const status = this.maintenanceMode ? "ON" : "OFF";
    this.notify(`Maintenance ${status}`, this.maintenanceMode ? "warn" : "ok");
    return `SYS: maintenance mode ${status}.`;
  }

  login(user) {
    const safe = String(user || "").trim();
    if (!safe) return "ERR: usuario vacío.";
    if (!this.users.includes(safe)) this.users.push(safe);
    this.currentUser = safe;
    this.notify(`Login de ${safe}`, "ok");
    return `AUTH: sesión iniciada como ${safe}.`;
  }

  logout() {
    if (!this.currentUser) return "AUTH: no hay sesión activa.";
    const previous = this.currentUser;
    this.currentUser = null;
    this.notify(`Logout de ${previous}`);
    return `AUTH: sesión cerrada (${previous}).`;
  }

  applyAging(readyQueue) {
    if (!this.agingEnabled) return;
    readyQueue.forEach((proc) => {
      proc.waitTicks = (proc.waitTicks || 0) + 1;
      if (proc.waitTicks >= 6 && proc.priority < 10) {
        proc.priority += 1;
        proc.waitTicks = 0;
        this.notify(`Aging boost PID ${proc.pid} -> P${proc.priority}`, "ok");
      }
    });
  }

  compactMemory() {
    const before = this.fragmentationLevel;
    this.fragmentationLevel = Math.max(0, this.fragmentationLevel - this.random(18, 32));
    this.notify(`Compactación memoria ${before}% -> ${this.fragmentationLevel}%`, "ok");
    return `MEM: compactación ${before}% -> ${this.fragmentationLevel}%`;
  }

  serviceSupervisorTick() {
    if (!this.serviceWatchdogEnabled) return;
    this.services.forEach((svc) => {
      if (!svc.running) return;
      if (Math.random() < this.serviceFailureRate) {
        svc.running = false;
        this.serviceEvents.failures += 1;
        this.notify(`Service fault: ${svc.name}`, "warn");
        if (!this.maintenanceMode) {
          svc.running = true;
          svc.restarts = (svc.restarts || 0) + 1;
          this.serviceEvents.restarts += 1;
          this.notify(`Service restart: ${svc.name}`, "ok");
        }
      }
    });
  }

  canAccessFile(file, mode = "read") {
    if (!file) return false;
    const user = this.currentUser || "system";
    if (user === "admin" || file.owner === user) return true;
    if (mode === "read") return Boolean(file.shared);
    return false;
  }

  setFileShare(name, on) {
    const safe = String(name || "").trim();
    const file = this.files.find((f) => f.name === safe);
    if (!file) return `ERR: archivo '${safe}' no existe.`;
    if (!this.canAccessFile(file, "write")) return "ERR: permiso denegado.";
    file.shared = Boolean(on);
    return `FS: '${safe}' share=${file.shared ? "on" : "off"}.`;
  }

  trySwapInProcess(proc) {
    if (!proc || (proc.swapMem || 0) <= 0) return true;
    const freeRam = this.memoryTotal - this.memoryUsed;
    if (freeRam < proc.swapMem) return false;
    this.memoryUsed += proc.swapMem;
    this.swapUsed -= proc.swapMem;
    proc.ramMem = (proc.ramMem || 0) + proc.swapMem;
    proc.swapMem = 0;
    this.notify(`SWAP-IN PID ${proc.pid}`, "ok");
    return true;
  }

  createProcess(spec = {}) {
    if (!this.booted) return "ERR: inicia Workbench primero.";
    if (this.maintenanceMode) return "ERR: maintenance mode activo, no se aceptan procesos nuevos.";

    const mem = this.clamp(spec.mem ?? this.random(16, 256), 4, 512);
    const owner = this.currentUser || "system";
    const quota = this.userQuotas[owner];
    if (quota) {
      const ownerUsage = this.processes.filter((p) => p.owner === owner && p.state !== "TERMINATED").reduce((a, p) => a + p.mem, 0);
      if (ownerUsage + mem > quota) return `ERR: quota excedida para ${owner} (${quota}MB).`;
    }
    const allocMem = mem + Math.ceil((mem * this.fragmentationLevel) / 100 * 0.2);
    const ramAvail = this.memoryTotal - this.memoryUsed;
    const ramAlloc = Math.max(0, Math.min(allocMem, ramAvail));
    const swapNeed = allocMem - ramAlloc;
    if (swapNeed > 0 && (this.swapUsed + swapNeed > this.swapTotal)) {
      this.notify("Memoria/swap insuficiente", "warn");
      return `ERR: memoria CHIP/FAST y SWAP insuficiente (${mem}MB).`;
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
      owner,
      createdAt: this.clock,
      cpuUsed: 0,
      waitTicks: 0,
      allocMem,
      ramMem: ramAlloc,
      swapMem: swapNeed,
    };

    this.processes.push(process);
    this.memoryUsed += ramAlloc;
    this.swapUsed += swapNeed;
    return `TASK: ${process.name} PID=${process.pid} CPU=${cpu} MEM=${mem}MB(alloc=${allocMem},swap=${swapNeed}) PRIO=${priority} OWNER=${process.owner}.`;
  }

  killProcess(pid) {
    if (!this.booted) return "ERR: kernel inactivo.";
    const proc = this.processes.find((p) => p.pid === pid && p.state !== "TERMINATED");
    if (!proc) return `ERR: PID ${pid} no encontrado.`;

    proc.state = "TERMINATED";
    proc.blockedFor = 0;
    this.memoryUsed -= (proc.ramMem || proc.allocMem || proc.mem);
    this.swapUsed -= (proc.swapMem || 0);
    this.fragmentationLevel = this.clamp(this.fragmentationLevel + this.random(1, 4), 0, 60);
    this.completedCount += 1;
    this.notify(`Proceso ${pid} terminado`, "warn");
    return `TASK: PID ${pid} finalizado por usuario.`;
  }

  triggerIOInterrupt() {
    if (!this.booted) return "ERR: kernel inactivo.";
    const candidates = this.processes.filter((p) => p.state === "READY");
    if (!candidates.length) return "SYS: sin tareas READY para I/O.";

    const selected = candidates[this.random(0, candidates.length - 1)];
    selected.state = "BLOCKED";
    selected.blockedFor = this.random(1, 4);
    this.raiseInterrupt("io", selected.name, this.random(3, 8));
    return `IRQ: ${selected.name} bloqueado ${selected.blockedFor} ciclo(s).`;
  }

  tick() {
    if (!this.booted) return "ERR: kernel inactivo.";
    if (this.panicState) return "ERR: kernel panic activo, usa recover.";

    this.clock += 1;
    this.updateBlockedProcesses();
    this.networkTick();
    this.runJobs();
    this.serviceSupervisorTick();
    const servedIrq = this.processInterrupts(this.coreCount >= 4 ? 4 : 2);
    this.devices.forEach((d) => { if (d.online) d.load = Math.max(0, d.load - this.random(1, 6)); });
    if (this.memoryUsed > this.memoryTotal * 0.85) this.notify("Uso de memoria alto", "warn");
    const readyQueue = this.getReadyQueue();
    this.applyAging(readyQueue);

    if (!readyQueue.length) {
      this.lastCpuUsage = 0;
      this.idleTicks += 1;
      return servedIrq.length ? `CPU: idle, IRQ atendidas=${servedIrq.length}.` : "CPU: idle (sin READY).";
    }

    const runN = Math.min(this.coreCount, readyQueue.length);
    const logs = [];
    this.coreLoad = Array.from({ length: this.coreCount }, () => 0);
    for (let core = 0; core < runN; core += 1) {
      const index = (this.roundRobinIndex + core) % readyQueue.length;
      const proc = readyQueue[index];
      if (proc.state !== "READY") continue;
      if (!this.trySwapInProcess(proc)) { logs.push(`C${core}: PID ${proc.pid} esperando SWAP`); continue; }
      proc.state = "RUNNING";
      proc.waitTicks = 0;
      const runCycles = Math.min(this.quantum, proc.cpuLeft);
      proc.cpuLeft -= runCycles;
      proc.cpuUsed += runCycles;
      this.coreLoad[core] = Math.round((runCycles / this.quantum) * 100);
      if (proc.cpuLeft <= 0) {
        proc.state = "TERMINATED";
        this.memoryUsed -= (proc.ramMem || proc.allocMem || proc.mem);
    this.swapUsed -= (proc.swapMem || 0);
        this.fragmentationLevel = this.clamp(this.fragmentationLevel + this.random(1, 3), 0, 60);
        this.completedCount += 1;
        logs.push(`C${core}: PID ${proc.pid} terminó`);
      } else {
        proc.state = "READY";
        logs.push(`C${core}: PID ${proc.pid} restante ${proc.cpuLeft}`);
      }
    }
    this.lastCpuUsage = this.coreLoad.reduce((a, b) => a + b, 0) / this.coreCount;
    this.roundRobinIndex += runN;
    const irqInfo = servedIrq.length ? ` | IRQ=${servedIrq.map((i) => i.type).join(",")}` : "";
    return `CPU: ${logs.join(" | ")}${irqInfo}`;
  }

  benchmark(cycles = 10) {
    if (!this.booted) return "ERR: kernel inactivo.";
    const n = this.clamp(Number(cycles) || 10, 1, 200);
    let busy = 0;
    for (let i = 0; i < n; i += 1) {
      const result = this.tick();
      if (!result.includes("idle")) busy += 1;
    }
    const score = Math.round((busy / n) * 100);
    this.benchmarkHistory.unshift({ at: this.clock, cycles: n, score });
    this.benchmarkHistory = this.benchmarkHistory.slice(0, 10);
    this.notify(`Benchmark ${score}% (${n} ciclos)`, score >= 60 ? "ok" : "warn");
    return `BENCH: score=${score}% busy en ${n} ciclos.`;
  }

  networkTick() {
    const send = this.powerSaveMode ? this.random(1, 10) : this.random(2, 20);
    let dropChance = this.profile === "eco" ? 0.2 : this.profile === "performance" ? 0.05 : 0.12;
    if (this.firewallEnabled) dropChance = Math.max(0.02, dropChance - 0.04);
    const dropped = Array.from({ length: send }).reduce((acc) => acc + (Math.random() < dropChance ? 1 : 0), 0);
    const serviceBoost = this.services.filter((s) => s.running).length;
    this.network.packetsSent += send + serviceBoost;
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
    const ready = this.processes.filter((p) => p.state === "READY");
    if (this.schedulerMode === "rr") {
      return ready.sort((a, b) => a.pid - b.pid);
    }
    if (this.schedulerMode === "priority") {
      return ready.sort((a, b) => b.priority - a.priority || a.pid - b.pid);
    }
    return ready.sort((a, b) => b.priority - a.priority || a.pid - b.pid);
  }

  getTopProcesses(limit = 5) {
    return [...this.processes]
      .filter((p) => p.state !== "TERMINATED")
      .sort((a, b) => b.cpuUsed - a.cpuUsed || b.priority - a.priority)
      .slice(0, limit);
  }

  startService(name) {
    if (this.maintenanceMode) return "ERR: maintenance mode activo, startService bloqueado.";
    const safe = String(name || "").trim();
    if (!safe) return "ERR: nombre de servicio vacío.";
    const existing = this.services.find((s) => s.name === safe);
    if (existing) {
      existing.running = true;
      return `SVC: '${safe}' iniciado.`;
    }
    const mem = this.clamp(this.random(8, 64), 4, 128);
    this.services.push({ name: safe, running: true, mem, restarts: 0 });
    this.notify(`Servicio ${safe} arriba`, "ok");
    return `SVC: '${safe}' iniciado.`;
  }

  stopService(name) {
    const safe = String(name || "").trim();
    const svc = this.services.find((s) => s.name === safe);
    if (!svc) return `ERR: servicio '${safe}' no existe.`;
    svc.running = false;
    this.notify(`Servicio ${safe} detenido`, "warn");
    return `SVC: '${safe}' detenido.`;
  }

  listServices() {
    if (!this.services.length) return "SVC: sin servicios.";
    return this.services.map((s) => `${s.name}[${s.running ? "up" : "down"},rst=${s.restarts || 0}]`).join(", ");
  }

  serviceHealthScore() {
    if (!this.services.length) return 100;
    const running = this.services.filter((s) => s.running).length;
    return Math.round((running / this.services.length) * 100);
  }

  installApp(name) {
    if (this.maintenanceMode) return "ERR: maintenance mode activo, instalación bloqueada.";
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
      if (!this.canAccessFile(file, "write")) return "ERR: permiso denegado.";
      file.content = String(content);
      file.updatedAt = this.clock;
      return `FS: '${safe}' actualizado.`;
    }
    this.files.push({ name: safe, content: String(content), updatedAt: this.clock, owner: this.currentUser || "system", shared: false });
    return `FS: '${safe}' creado.`;
  }

  readFile(name) {
    const file = this.files.find((f) => f.name === name);
    if (!file) return `ERR: archivo '${name}' no existe.`;
    if (!this.canAccessFile(file, "read")) return "ERR: permiso denegado.";
    return `FILE ${file.name}: ${file.content}`;
  }

  deleteFile(name) {
    const file = this.files.find((f) => f.name === name);
    if (!file) return `ERR: archivo '${name}' no existe.`;
    if (!this.canAccessFile(file, "write")) return "ERR: permiso denegado.";
    this.files = this.files.filter((f) => f.name !== name);
    return `FS: '${name}' eliminado.`;
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
      processSummary: { ready: state.ready, blocked: state.blocked, running: state.running, terminated: state.terminated },
      network: state.network,
      currentUser: state.currentUser,
      users: state.users,
      apps: state.apps,
      files: state.files.map((f) => f.name),
      services: state.services,
      healthScore: state.healthScore,
      firewallEnabled: state.firewallEnabled,
      templates: state.templates,
      benchmarkHistory: state.benchmarkHistory,
      quotas: state.userQuotas,
      powerSaveMode: state.powerSaveMode,
      pendingJobs: state.jobs,
      interrupts: state.interruptStats,
      irqQueueDepth: state.interruptQueue.length,
      devices: state.devices,
      memoryFragmentation: state.fragmentationLevel,
      agingEnabled: state.agingEnabled,
      serviceEvents: state.serviceEvents,
      swap: { used: state.swapUsed, total: state.swapTotal },
      watchdog: { enabled: state.serviceWatchdogEnabled, rate: state.serviceFailureRate },
    };
  }

  saveSnapshot() {
    return JSON.stringify({
      booted: this.booted,
      clock: this.clock,
      memoryTotal: this.memoryTotal,
      quantum: this.quantum,
      profile: this.profile,
      coreCount: this.coreCount,
      coreLoad: this.coreLoad,
      panicState: this.panicState,
      interruptQueue: this.interruptQueue,
      interruptStats: this.interruptStats,
      devices: this.devices,
      fragmentationLevel: this.fragmentationLevel,
      agingEnabled: this.agingEnabled,
      serviceEvents: this.serviceEvents,
      swapTotal: this.swapTotal,
      swapUsed: this.swapUsed,
      serviceWatchdogEnabled: this.serviceWatchdogEnabled,
      serviceFailureRate: this.serviceFailureRate,
      schedulerMode: this.schedulerMode,
      maintenanceMode: this.maintenanceMode,
      pid: this.pid,
      processes: this.processes,
      completedCount: this.completedCount,
      files: this.files,
      users: this.users,
      currentUser: this.currentUser,
      apps: this.apps,
      services: this.services,
      network: this.network,
      benchmarkHistory: this.benchmarkHistory,
      templates: this.templates,
      firewallEnabled: this.firewallEnabled,
      notifications: this.notifications,
      userQuotas: this.userQuotas,
      jobs: this.jobs,
      powerSaveMode: this.powerSaveMode,
      commandHistory: this.commandHistory,
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
      this.coreCount = this.clamp(data.coreCount || 2, 1, 8);
      this.coreLoad = Array.isArray(data.coreLoad) ? data.coreLoad : Array.from({ length: this.coreCount }, () => 0);
      this.panicState = data.panicState || null;
      this.interruptQueue = Array.isArray(data.interruptQueue) ? data.interruptQueue : [];
      this.interruptStats = data.interruptStats && typeof data.interruptStats === "object" ? data.interruptStats : { handled: 0, dropped: 0, avgLatency: 0 };
      this.devices = Array.isArray(data.devices) && data.devices.length ? data.devices : this.devices;
      this.schedulerMode = data.schedulerMode || "hybrid";
      this.maintenanceMode = Boolean(data.maintenanceMode);
      this.pid = Number(data.pid || 1);
      this.processes = Array.isArray(data.processes) ? data.processes : [];
      this.completedCount = Number(data.completedCount || 0);
      this.files = Array.isArray(data.files) ? data.files : [];
      this.users = Array.isArray(data.users) ? data.users : ["admin"];
      this.currentUser = data.currentUser || null;
      this.apps = Array.isArray(data.apps) ? data.apps : [];
      this.services = Array.isArray(data.services) ? data.services : [];
      this.network = data.network || { packetsSent: 0, packetsDropped: 0, load: 0 };
      this.benchmarkHistory = Array.isArray(data.benchmarkHistory) ? data.benchmarkHistory : [];
      this.templates = Array.isArray(data.templates) ? data.templates : [];
      this.firewallEnabled = Boolean(data.firewallEnabled);
      this.notifications = Array.isArray(data.notifications) ? data.notifications : [];
      this.userQuotas = data.userQuotas && typeof data.userQuotas === "object" ? data.userQuotas : {};
      this.jobs = Array.isArray(data.jobs) ? data.jobs : [];
      this.powerSaveMode = Boolean(data.powerSaveMode);
      this.commandHistory = Array.isArray(data.commandHistory) ? data.commandHistory : [];
      this.agingEnabled = data.agingEnabled !== undefined ? Boolean(data.agingEnabled) : true;
      this.fragmentationLevel = Number(data.fragmentationLevel || 0);
      this.serviceEvents = data.serviceEvents && typeof data.serviceEvents === "object" ? data.serviceEvents : { failures: 0, restarts: 0 };
      this.swapTotal = Number(data.swapTotal || this.swapTotal || 2048);
      this.swapUsed = Number(data.swapUsed || 0);
      this.serviceWatchdogEnabled = data.serviceWatchdogEnabled !== undefined ? Boolean(data.serviceWatchdogEnabled) : true;
      this.serviceFailureRate = Number(data.serviceFailureRate ?? 0.03);
      this.memoryUsed = this.processes.filter((p) => p.state !== "TERMINATED").reduce((sum, p) => sum + (p.ramMem || p.allocMem || p.mem), 0);
      return "SYS: snapshot cargado correctamente.";
    } catch {
      return "ERR: snapshot inválido.";
    }
  }

  executeCommand(input, options = {}) {
    const raw = String(input || "").trim();
    const [cmd, ...args] = raw.split(/\s+/);
    if (!cmd) return "";
    if (!options.internal) {
      this.commandHistory.unshift({ at: this.clock, cmd: raw });
      this.commandHistory = this.commandHistory.slice(0, 100);
    }

    if (cmd === "help") return "help, status, ps, top, bench <n>, tick, io, irq <type> <source> <prio>, irq-list, netstat, uptime, kill <pid>, profile <eco|balanced|performance>, scheduler <hybrid|rr|priority>, cores <n>, aging <on|off>, compact, maintenance, panic <reason>, recover, whoami, login <user>, logout, apps, install <app>, ls, cat <file>, write <file> <txt>, rm <file>, alerts-clear, services, startsvc <name>, stopsvc <name>, dev <name> <on|off>, dev-list, firewall <on|off>, templates, template-add <n> <cpu> <mem> <prio>, template-run <n>, quota <user> <mem>, powersave, jobs, job-add <delay> <cmd>, history, audit, share <file> <on|off>, watchdog <on|off>, svcfail <rate>, save, load";
    if (cmd === "status") {
      return `profile=${this.profile} scheduler=${this.schedulerMode} cores=${this.coreCount} panic=${this.panicState ? "on" : "off"} maintenance=${this.maintenanceMode ? "on" : "off"} irqDepth=${this.interruptQueue.length} frag=${this.fragmentationLevel}% aging=${this.agingEnabled ? "on" : "off"} swap=${this.swapUsed}/${this.swapTotal}`;
    }
    if (cmd === "ps") return this.processes.map((p) => `PID ${p.pid} ${p.name} ${p.state} CPU=${p.cpuLeft}`).join(" | ") || "sin procesos";
    if (cmd === "top") return this.getTopProcesses().map((p) => `${p.name}(PID${p.pid}) cpuUsed=${p.cpuUsed}`).join(" | ") || "sin procesos";
    if (cmd === "bench") return this.benchmark(Number(args[0] || 10));
    if (cmd === "tick") return this.tick();
    if (cmd === "io") return this.triggerIOInterrupt();
    if (cmd === "irq") return this.raiseInterrupt(args[0] || "io", args[1] || "shell", Number(args[2] || 5));
    if (cmd === "irq-list") return this.interruptQueue.map((q) => `${q.type}@${q.source}(p${q.priority})`).join(" | ") || "sin irq";
    if (cmd === "netstat") return `sent=${this.network.packetsSent} drop=${this.network.packetsDropped} load=${this.network.load}%`;
    if (cmd === "uptime") return `uptime ticks=${this.clock}`;
    if (cmd === "kill") return this.killProcess(Number(args[0]));
    if (cmd === "profile") return this.setProfile(args[0]);
    if (cmd === "scheduler") return this.setScheduler(args[0]);
    if (cmd === "cores") return this.setCoreCount(args[0]);
    if (cmd === "aging") { this.agingEnabled = args[0] !== "off"; return `SYS: aging ${this.agingEnabled ? "ON" : "OFF"}.`; }
    if (cmd === "compact") return this.compactMemory();
    if (cmd === "maintenance") return this.toggleMaintenance();
    if (cmd === "panic") return this.triggerPanic(args.join(" ") || "manual");
    if (cmd === "recover") return this.recoverKernel();
    if (cmd === "whoami") return this.currentUser || "sin sesión";
    if (cmd === "login") return this.login(args[0]);
    if (cmd === "logout") return this.logout();
    if (cmd === "apps") return this.listApps();
    if (cmd === "install") return this.installApp(args[0]);
    if (cmd === "services") return this.listServices();
    if (cmd === "startsvc") return this.startService(args[0]);
    if (cmd === "stopsvc") return this.stopService(args[0]);
    if (cmd === "dev") return this.setDeviceState(args[0], args[1] === "on");
    if (cmd === "dev-list") return this.listDevices();
    if (cmd === "firewall") return this.setFirewall(args[0] === "on");
    if (cmd === "templates") return this.listTemplates();
    if (cmd === "template-add") return this.createTemplate(args[0], { cpu: args[1], mem: args[2], priority: args[3] });
    if (cmd === "template-run") return this.runTemplate(args[0]);
    if (cmd === "quota") return this.setUserQuota(args[0], args[1]);
    if (cmd === "powersave") return this.togglePowerSave();
    if (cmd === "jobs") return this.jobs.map((j) => `${j.at}:${j.command}`).join(" | ") || "sin jobs";
    if (cmd === "job-add") return this.addJob(Number(args[0] || 1), args.slice(1).join(" "));
    if (cmd === "share") return this.setFileShare(args[0], args[1] === "on");
    if (cmd === "watchdog") { this.serviceWatchdogEnabled = args[0] !== "off"; return `SVC: watchdog ${this.serviceWatchdogEnabled ? "ON" : "OFF"}.`; }
    if (cmd === "svcfail") { this.serviceFailureRate = this.clamp(args[0], 0, 0.5); return `SVC: failureRate=${this.serviceFailureRate}`; }
    if (cmd === "history") return this.commandHistory.slice(0, 8).map((h) => `${h.at}:${h.cmd}`).join(" | ") || "sin historial";
    if (cmd === "audit") return this.auditTrail.slice(0, 8).map((a) => `${a.at}:${a.message}`).join(" | ") || "sin eventos";
    if (cmd === "ls") return this.listFiles();
    if (cmd === "cat") return this.readFile(args[0]);
    if (cmd === "write") return this.createFile(args[0], args.slice(1).join(" "));
    if (cmd === "rm") return this.deleteFile(args[0]);
    if (cmd === "alerts-clear") return this.clearNotifications();
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
      coreCount: this.coreCount,
      coreLoad: this.coreLoad,
      panicState: this.panicState,
      interruptQueue: this.interruptQueue,
      interruptStats: this.interruptStats,
      devices: this.devices,
      fragmentationLevel: this.fragmentationLevel,
      agingEnabled: this.agingEnabled,
      serviceEvents: this.serviceEvents,
      swapTotal: this.swapTotal,
      swapUsed: this.swapUsed,
      serviceWatchdogEnabled: this.serviceWatchdogEnabled,
      serviceFailureRate: this.serviceFailureRate,
      schedulerMode: this.schedulerMode,
      maintenanceMode: this.maintenanceMode,
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
      services: this.services,
      healthScore: this.serviceHealthScore(),
      notifications: this.notifications,
      benchmarkHistory: this.benchmarkHistory,
      templates: this.templates,
      firewallEnabled: this.firewallEnabled,
      userQuotas: this.userQuotas,
      jobs: this.jobs,
      powerSaveMode: this.powerSaveMode,
      topProcesses: this.getTopProcesses(),
      network: { ...this.network, dropRate: Math.round((this.network.packetsDropped / packetsTotal) * 100) },
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
  const body = document.body;
  const logEl = el("log");

  const processTable = el("processTable");
  const kernelState = el("kernelState");
  const queueView = el("queueView");
  const fileList = el("fileList");
  const appsList = el("appsList");
  const servicesList = el("servicesList");
  const topList = el("topList");
  const templateList = el("templateList");
  const jobList = el("jobList");
  const memBar = el("memBar");
  const cpuBar = el("cpuBar");
  const netBar = el("netBar");
  const notificationList = el("notificationList");
  const coreList = el("coreList");
  const irqList = el("irqList");
  const deviceList = el("deviceList");

  const buttonIds = [
    "bootBtn", "tickBtn", "autoTickBtn", "ioBtn", "benchBtn", "maintenanceBtn", "panicBtn", "recoverBtn", "saveBtn", "loadBtn", "diagBtn", "resetBtn", "clearLogBtn",
    "spawnManualBtn", "spawnAutoBtn", "createFileBtn", "installAppBtn", "startServiceBtn", "saveTemplateBtn", "runTemplateBtn", "toggleFirewallBtn", "addJobBtn", "setQuotaBtn", "togglePowerSaveBtn", "logoutBtn",
    "toggleScanBtn", "toggleGlowBtn", "cascadeBtn",
  ];
  const buttons = Object.fromEntries(buttonIds.map((id) => [id, el(id)]));

  let autoTickTimer = null;

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
    fileList.innerHTML = files.length ? files.map((f) => `<li><strong>${f.name}</strong> - ${f.content.slice(0, 36)}</li>`).join("") : "<li>Sin archivos</li>";
  }

  function renderApps(apps) {
    appsList.innerHTML = apps.length ? apps.map((a) => `<li>${a}</li>`).join("") : "<li>Sin apps</li>";
  }

  function renderServices(services) {
    servicesList.innerHTML = services.length
      ? services.map((svc) => `<li>${svc.name} - ${svc.running ? "UP" : "DOWN"} (${svc.mem}MB)</li>`).join("")
      : "<li>Sin servicios</li>";
  }

  function renderTemplates(templates) {
    templateList.innerHTML = templates.length
      ? templates.map((t) => `<li>${t.name} cpu=${t.cpu} mem=${t.mem} p=${t.priority}</li>`).join("")
      : "<li>Sin templates</li>";
  }

  function renderJobs(jobs) {
    jobList.innerHTML = jobs.length ? jobs.map((j) => `<li>tick ${j.at}: ${j.command}</li>`).join("") : "<li>Sin jobs</li>";
  }

  function renderInsights(state) {
    const lastBench = state.benchmarkHistory[0] ? `${state.benchmarkHistory[0].score}%` : "n/a";
    el("insightsSummary").textContent = `Uptime=${state.clock} ticks | Bench=${lastBench} | Health=${state.healthScore}% | Activos=${state.activeCount} | DropRate=${state.network.dropRate}%`;
    topList.innerHTML = state.topProcesses.length
      ? state.topProcesses.map((p) => `<li>${p.name} (PID ${p.pid}) cpuUsed=${p.cpuUsed} owner=${p.owner}</li>`).join("")
      : "<li>Sin procesos activos</li>";
  }

  function renderNotifications(list) {
    notificationList.innerHTML = list.length
      ? list.map((n) => `<li class="${n.level === "ok" ? "ok" : "warn"}">${n.message}</li>`).join("")
      : "<li>Sin alertas</li>";
  }

  function renderCoreLoad(coreLoad = []) {
    coreList.innerHTML = coreLoad.length
      ? coreLoad.map((load, index) => `<li>Core ${index}: ${load}%</li>`).join("")
      : "<li>Sin datos de core</li>";
  }

  function renderInterrupts(queue = [], stats = {}) {
    irqList.innerHTML = queue.length
      ? queue.slice(0, 8).map((q) => `<li>${q.type} @ ${q.source} (p${q.priority})</li>`).join("")
      : "<li>Sin IRQ pendientes</li>";
    const info = `IRQ handled=${stats.handled || 0}, dropped=${stats.dropped || 0}, avgLatency=${stats.avgLatency || 0}`;
    el("networkStats").textContent = `${el("networkStats").textContent} | ${info}`;
  }

  function renderDevices(devices = []) {
    deviceList.innerHTML = devices.length
      ? devices.map((d) => `<li>${d.name} - ${d.online ? "ON" : "OFF"} (${d.load}%)</li>`).join("")
      : "<li>Sin dispositivos</li>";
  }

  function render() {
    const s = kernel.getState();
    const memoryPercent = Math.round((s.memoryUsed / s.memoryTotal) * 100);

    kernelState.innerHTML = `
      <li><strong>Workbench:</strong> ${s.booted ? '<span class="ok">Online</span>' : '<span class="warn">Offline</span>'}</li>
      <li><strong>Perfil:</strong> ${s.profile} | <strong>Usuario:</strong> ${s.currentUser || "-"}</li>
      <li><strong>Scheduler:</strong> ${s.schedulerMode} | <strong>Cores:</strong> ${s.coreCount}</li>
      <li><strong>Kernel Panic:</strong> ${s.panicState ? `<span class="warn">ON (${s.panicState.reason})</span>` : '<span class="ok">OFF</span>'} | <strong>Maintenance:</strong> ${s.maintenanceMode ? "ON" : "OFF"}</li>
      <li><strong>Clock Tick:</strong> ${s.clock} | <strong>Quantum:</strong> ${s.quantum}</li>
      <li><strong>Memoria:</strong> ${s.memoryUsed}/${s.memoryTotal}MB (${memoryPercent}%) | <strong>Swap:</strong> ${s.swapUsed}/${s.swapTotal}MB | <strong>Frag:</strong> ${s.fragmentationLevel}%</li>
      <li><strong>READY/BLOCKED/RUNNING:</strong> ${s.ready}/${s.blocked}/${s.running}</li>
      <li><strong>Terminados:</strong> ${s.terminated} | <strong>Idle:</strong> ${s.idleTicks}</li>
      <li><strong>IRQ queue:</strong> ${s.interruptQueue.length} | <strong>IRQ avg latency:</strong> ${s.interruptStats.avgLatency}</li>
      <li><strong>Aging:</strong> ${s.agingEnabled ? "ON" : "OFF"} | <strong>SVC fail/restart:</strong> ${s.serviceEvents.failures}/${s.serviceEvents.restarts}</li>
    `;

    el("networkStats").textContent = `NET packets=${s.network.packetsSent}, drops=${s.network.packetsDropped}, dropRate=${s.network.dropRate}%`;
    el("sessionInfo").textContent = `Sesión: ${s.currentUser || "sin sesión"} | Usuarios: ${s.users.join(", ")}`;

    const wbBadge = el("wbStatus");
    const panicBadge = el("panicStatus");
    const maintenanceBadge = el("maintenanceStatus");
    const irqBadge = el("irqDepthBadge");
    if (wbBadge) {
      wbBadge.textContent = s.booted ? "WB Online" : "WB Offline";
      wbBadge.className = `wb-badge ${s.booted ? "on" : "off"}`;
    }
    if (panicBadge) {
      panicBadge.textContent = `Panic: ${s.panicState ? "ON" : "OFF"}`;
      panicBadge.className = `wb-badge ${s.panicState ? "warn" : "on"}`;
    }
    if (maintenanceBadge) {
      maintenanceBadge.textContent = `Maintenance: ${s.maintenanceMode ? "ON" : "OFF"}`;
      maintenanceBadge.className = `wb-badge ${s.maintenanceMode ? "warn" : "on"}`;
    }
    if (irqBadge) {
      irqBadge.textContent = `IRQ: ${s.interruptQueue.length}`;
      irqBadge.className = `wb-badge ${s.interruptQueue.length > 0 ? "warn" : "on"}`;
    }

    memBar.value = memoryPercent;
    cpuBar.value = s.lastCpuUsage;
    netBar.value = s.network.load;

    renderQueue(s.readyQueue);
    renderFiles(s.files);
    renderApps(s.apps);
    renderServices(s.services);
    renderTemplates(s.templates);
    renderJobs(s.jobs);
    el("securityInfo").textContent = `Firewall: ${s.firewallEnabled ? "ON" : "OFF"} | Scheduler: ${s.schedulerMode}`;
    el("powerInfo").textContent = `PowerSave: ${s.powerSaveMode ? "ON" : "OFF"} | Quotas: ${Object.keys(s.userQuotas).length}`;
    renderInsights(s);
    renderNotifications(s.notifications);
    renderCoreLoad(s.coreLoad);
    renderInterrupts(s.interruptQueue, s.interruptStats);
    renderDevices(s.devices);

    processTable.innerHTML = kernel.processes
      .map((p) => `<tr><td>${p.pid}</td><td>${p.name}</td><td>${p.state}</td><td>${Math.max(0, p.cpuLeft)}</td><td>${p.mem}MB</td><td>${p.priority}</td><td>${p.blockedFor || "-"}</td><td><button data-kill="${p.pid}" ${p.state === "TERMINATED" ? "disabled" : ""}>Kill</button></td></tr>`)
      .join("");

    ["tickBtn", "autoTickBtn", "ioBtn", "benchBtn", "maintenanceBtn", "panicBtn", "recoverBtn", "saveBtn", "diagBtn", "spawnManualBtn", "spawnAutoBtn", "createFileBtn", "installAppBtn", "startServiceBtn", "saveTemplateBtn", "runTemplateBtn", "toggleFirewallBtn", "addJobBtn", "setQuotaBtn", "togglePowerSaveBtn"].forEach((id) => {
      buttons[id].disabled = !s.booted;
    });
    buttons.logoutBtn.disabled = !s.currentUser;
    buttons.maintenanceBtn.textContent = s.maintenanceMode ? "Maintenance On" : "Maintenance Off";
    buttons.toggleFirewallBtn.textContent = s.firewallEnabled ? "Firewall On" : "Firewall Off";
    buttons.togglePowerSaveBtn.textContent = s.powerSaveMode ? "PowerSave On" : "PowerSave Off";
    el("profileSelect").value = s.profile;
    el("schedulerSelect").value = s.schedulerMode;
    el("schedulerSelect").disabled = !s.booted;
    el("coreSelect").value = String(s.coreCount);
    el("coreSelect").disabled = !s.booted;
    buttons.recoverBtn.disabled = !s.booted || !s.panicState;
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
    setTimeout(() => windows.forEach((w) => { w.style.transform = ""; w.style.zIndex = ""; }), 900);
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
  el("schedulerSelect").addEventListener("change", (e) => {
    writeLog(kernel.setScheduler(e.target.value));
    render();
  });
  el("coreSelect").addEventListener("change", (e) => {
    writeLog(kernel.setCoreCount(e.target.value));
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
  buttons.benchBtn.addEventListener("click", () => { writeLog(kernel.benchmark(20)); render(); });
  buttons.maintenanceBtn.addEventListener("click", () => { writeLog(kernel.toggleMaintenance()); render(); });
  buttons.panicBtn.addEventListener("click", () => { writeLog(kernel.triggerPanic("manual")); render(); });
  buttons.recoverBtn.addEventListener("click", () => { writeLog(kernel.recoverKernel()); render(); });
  buttons.resetBtn.addEventListener("click", () => { setAutoTick(false); writeLog(kernel.reset()); render(); });
  buttons.clearLogBtn.addEventListener("click", () => { logEl.textContent = ""; writeLog("SYS: log limpiado."); });
  buttons.spawnAutoBtn.addEventListener("click", () => { writeLog(kernel.createProcess()); render(); });

  buttons.saveBtn.addEventListener("click", () => {
    localStorage.setItem("amiga_kernel_snapshot", kernel.saveSnapshot());
    writeLog("SYS: estado guardado en localStorage.");
  });
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

  el("serviceForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(kernel.startService(el("serviceInput").value));
    el("serviceInput").value = "";
    render();
  });

  el("templateForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(kernel.createTemplate(el("templateNameInput").value, {
      cpu: el("templateCpuInput").value,
      mem: el("templateMemInput").value,
      priority: el("templatePrioInput").value,
    }));
    render();
  });
  buttons.runTemplateBtn.addEventListener("click", () => {
    writeLog(kernel.runTemplate(el("templateNameInput").value));
    render();
  });
  buttons.toggleFirewallBtn.addEventListener("click", () => {
    writeLog(kernel.setFirewall(!kernel.firewallEnabled));
    render();
  });
  buttons.addJobBtn.addEventListener("click", () => {
    writeLog(kernel.addJob(5, "tick"));
    render();
  });
  el("quotaForm").addEventListener("submit", (e) => {
    e.preventDefault();
    writeLog(kernel.setUserQuota(el("quotaUserInput").value, el("quotaMemInput").value));
    render();
  });
  buttons.togglePowerSaveBtn.addEventListener("click", () => {
    writeLog(kernel.togglePowerSave());
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

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "b" && e.altKey) {
      e.preventDefault();
      writeLog(kernel.benchmark(10));
      render();
    }
    if (e.key.toLowerCase() === "t" && e.altKey) {
      e.preventDefault();
      writeLog(kernel.tick());
      render();
    }
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
  writeLog("SYS: AmigaOS Kernel Studio listo. Tip: Alt+T tick, Alt+B benchmark.");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { OnlineKernel };
}

bootstrapUI();
