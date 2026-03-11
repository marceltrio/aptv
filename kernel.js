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
    this.userRoles = { admin: "admin" };
    this.currentUser = null;
    this.apps = [];
    this.appRegistry = [];
    this.appProfiles = {};
    this.services = [];
    this.files = [];
    this.network = { packetsSent: 0, packetsDropped: 0, load: 0 };
    this.panicState = null;
    this.interruptQueue = [];
    this.interruptStats = { handled: 0, dropped: 0, avgLatency: 0 };
    this.devices = [
      { name: "disk.device", class: "storage", online: true, load: 0, driver: "ahci" },
      { name: "nvme.device", class: "storage", online: true, load: 0, driver: "nvme" },
      { name: "usb.device", class: "io", online: true, load: 0, driver: "xhci" },
      { name: "net.device", class: "network", online: true, load: 0, driver: "e1000" },
      { name: "ethernet.device", class: "network", online: true, load: 0, driver: "e1000" },
      { name: "wifi.device", class: "network", online: true, load: 0, driver: "iwlwifi" },
      { name: "gpu.device", class: "graphics", online: true, load: 0, driver: "virtio-gpu" },
      { name: "audio.device", class: "audio", online: true, load: 0, driver: "hda" },
    ];
    this.drivers = [];
    this.syscalls = {};
    this.virtualMemory = { pages: [], pageSizeMB: 4, nextPageId: 1, faults: 0, protectedPages: 0 };
    this.fsJournal = [];
    this.secureBootEnabled = true;
    this.diskEncryptionEnabled = false;
    this.malwareSignatures = ["rm -rf", "forkbomb", "crypto-miner"];
    this.packageRepo = ["shell.app", "monitor.app", "store.app", "editor.app", "nettools.app"];
    this.appStore = ["paint.app", "music.app", "files.app", "sysguard.app"];
    this.compatibleStore = ["studio.app", "nettools.app", "files.app", "sec.audit.app"];
    this.updateCatalog = ["kernel.core", "scheduler.pack", "security.patch", "arkrfs.tools"];
    this.availableUpdates = [];
    this.virtualDesktops = [{ id: 1, name: "Main", apps: [] }];
    this.activeDesktopId = 1;
    this.plugins = [];
    this.aiModel = "NovaCore-Lite";
    this.restorePoints = [];
    this.kernelVersion = "1.0.0-x64";
    this.appSandboxes = {};
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
    this.networkPolicy = "normal";
    this.systemEvents = [];
    this.policies = [];
    this.nextPolicyId = 1;
    this.governorMode = "manual";
    this.netCircuitOpen = false;
    this.netCircuitUntil = 0;
    this.schedulerLatency = { avg: 0, peak: 0, samples: 0 };
    this.userNamespaces = {};
    this.programs = [];
    this.initDrivers();
    this.initSyscalls();
    this.reset();
  }

  initDrivers() {
    this.drivers = [
      { name: "ahci", loaded: true, version: "1.0" },
      { name: "nvme", loaded: true, version: "1.1" },
      { name: "xhci", loaded: true, version: "2.0" },
      { name: "e1000", loaded: true, version: "3.4" },
      { name: "iwlwifi", loaded: true, version: "5.8" },
      { name: "virtio-gpu", loaded: true, version: "1.2" },
      { name: "hda", loaded: true, version: "1.7" },
    ];
  }

  initSyscalls() {
    this.syscalls = {
      spawn: (args) => this.createProcess({ name: args[0], cpu: args[1], mem: args[2], priority: args[3] }),
      kill: (args) => this.killProcess(Number(args[0])),
      write: (args) => this.createFile(args[0], args.slice(1).join(" ")),
      read: (args) => this.readFile(args[0], args[1]),
      mkdir: (args) => this.createDirectory(args[0]),
      firewall: (args) => this.setFirewall(args[0] === "on"),
      vmalloc: (args) => this.allocateVirtualMemory(Number(args[0] || 4), args[1] || "rw"),
      vmprotect: (args) => this.protectPage(Number(args[0]), args[1] || "r"),
    };
  }

  boot() {
    if (this.booted) return "SYS: Workbench ya está activo.";
    this.booted = true;
    this.clock = 1;
    this.currentUser = this.currentUser || "admin";

    if (!this.files.length) {
      this.ensureSystemLayout();
      this.createFile("/system/readme.txt", "Bienvenido a AmigaOS Kernel Studio");
      this.createFile("/logs/syslog.txt", "Sistema inicializado.");
    }
    if (!this.apps.length) {
      this.installApp("shell.app");
      this.installApp("monitor.app");
    }
    if (!this.appRegistry.length) {
      this.seedCompatibleApps();
    }
    if (!this.services.length) {
      this.startService("net.service");
      this.startService("fs.service");
    }
    if (this.secureBootEnabled) this.notify("Secure boot verificado", "ok");
    this.notify("Kernel iniciado", "ok");
    return "SYS: Kickstart cargado. Workbench activo.";
  }

  ensureSystemLayout() {
    ["/system", "/users", "/users/marcel", "/apps", "/temp", "/temp/.trash", "/logs"].forEach((dir) => {
      if (!this.files.find((f) => f.type === "dir" && f.name === dir)) this.createDirectory(dir);
    });
    if (!this.users.includes("marcel")) this.users.push("marcel");
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
    this.networkPolicy = "normal";
    this.systemEvents = [];
    this.policies = [];
    this.nextPolicyId = 1;
    this.governorMode = "manual";
    this.netCircuitOpen = false;
    this.netCircuitUntil = 0;
    this.schedulerLatency = { avg: 0, peak: 0, samples: 0 };
    this.userNamespaces = {};
    this.programs = [];
    this.appRegistry = [];
    this.appProfiles = {};
    this.availableUpdates = [];
    this.virtualDesktops = [{ id: 1, name: "Main", apps: [] }];
    this.activeDesktopId = 1;
    this.plugins = [];
    this.restorePoints = [];
    this.kernelVersion = "1.0.0-x64";
    this.virtualMemory = { pages: [], pageSizeMB: 4, nextPageId: 1, faults: 0, protectedPages: 0 };
    this.fsJournal = [];
    this.appSandboxes = {};
    return "SYS: Reinicio completo.";
  }

  allocateVirtualMemory(sizeMB = 4, flags = "rw") {
    const size = this.clamp(sizeMB, 1, 256);
    const pagesNeeded = Math.ceil(size / this.virtualMemory.pageSizeMB);
    const created = [];
    for (let i = 0; i < pagesNeeded; i += 1) {
      const page = {
        id: this.virtualMemory.nextPageId++,
        sizeMB: this.virtualMemory.pageSizeMB,
        owner: this.currentUser || "system",
        flags: String(flags || "rw"),
        protected: String(flags || "rw").includes("x") || String(flags || "rw").includes("k"),
      };
      this.virtualMemory.pages.push(page);
      created.push(page.id);
    }
    this.virtualMemory.protectedPages = this.virtualMemory.pages.filter((p) => p.protected).length;
    return `VM: ${pagesNeeded} páginas asignadas (${size}MB) ids=${created.join(",")}`;
  }

  protectPage(pageId, flags = "r") {
    const page = this.virtualMemory.pages.find((p) => p.id === Number(pageId));
    if (!page) return `ERR: página ${pageId} no existe.`;
    page.flags = String(flags || "r");
    page.protected = true;
    this.virtualMemory.protectedPages = this.virtualMemory.pages.filter((p) => p.protected).length;
    return `VM: página ${page.id} protegida (${page.flags}).`;
  }

  accessPage(pageId, mode = "r") {
    const page = this.virtualMemory.pages.find((p) => p.id === Number(pageId));
    if (!page) {
      this.virtualMemory.faults += 1;
      return `FAULT: página ${pageId} ausente.`;
    }
    if (page.protected && !page.flags.includes(mode)) {
      this.virtualMemory.faults += 1;
      return `FAULT: violación de memoria page=${page.id} mode=${mode}.`;
    }
    return `VM: acceso ${mode} a page=${page.id} ok.`;
  }

  loadDriver(name) {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: driver inválido.";
    const existing = this.drivers.find((d) => d.name === safe);
    if (existing) {
      existing.loaded = true;
      return `DRV: ${safe} cargado.`;
    }
    this.drivers.push({ name: safe, loaded: true, version: "custom" });
    return `DRV: ${safe} registrado y cargado.`;
  }

  unloadDriver(name) {
    const drv = this.drivers.find((d) => d.name === String(name || "").trim());
    if (!drv) return `ERR: driver '${name}' no existe.`;
    drv.loaded = false;
    this.devices.forEach((d) => {
      if (d.driver === drv.name) d.online = false;
    });
    return `DRV: ${drv.name} descargado.`;
  }

  listDrivers() {
    return this.drivers.map((d) => `${d.name}:${d.loaded ? "loaded" : "off"}`).join(", ");
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

  emitEvent(type, payload = {}) {
    this.systemEvents.unshift({ at: this.clock, type, payload });
    this.systemEvents = this.systemEvents.slice(0, 80);
  }

  getCurrentRole() {
    const user = this.currentUser || "admin";
    return this.userRoles[user] || "user";
  }

  hasPrivilege(action = "") {
    const role = this.getCurrentRole();
    const adminOnly = ["panic", "recover", "firewall", "watchdog", "svcfail", "role", "policy"];
    if (!adminOnly.includes(action)) return true;
    return role === "admin";
  }

  setRole(user, role) {
    if (!this.hasPrivilege("role")) return "ERR: privilegios insuficientes.";
    const safeUser = String(user || "").trim();
    const safeRole = String(role || "").trim();
    if (!safeUser) return "ERR: usuario inválido.";
    if (!["admin", "operator", "user"].includes(safeRole)) return "ERR: rol inválido.";
    this.userRoles[safeUser] = safeRole;
    this.emitEvent("role_changed", { user: safeUser, role: safeRole });
    return `AUTH: ${safeUser} -> ${safeRole}`;
  }

  addPolicy(metric, op, value, action) {
    if (!this.hasPrivilege("policy")) return "ERR: privilegios insuficientes.";
    const m = String(metric || "").trim();
    const o = String(op || "").trim();
    const a = String(action || "").trim();
    if (!["memoryPercent", "dropRate", "activeCount"].includes(m)) return "ERR: métrica inválida.";
    if (![">", ">=", "<", "<=", "=="].includes(o)) return "ERR: operador inválido.";
    if (!["powersave_on", "powersave_off", "firewall_on", "firewall_off", "compact"].includes(a)) return "ERR: acción inválida.";
    const pol = { id: this.nextPolicyId++, metric: m, op: o, value: Number(value), action: a };
    this.policies.push(pol);
    this.emitEvent("policy_added", pol);
    return `POL: ${pol.id} ${m}${o}${pol.value} -> ${a}`;
  }

  clearPolicies() {
    if (!this.hasPrivilege("policy")) return "ERR: privilegios insuficientes.";
    this.policies = [];
    return "POL: limpiadas.";
  }

  evaluatePolicies() {
    if (!this.policies.length) return 0;
    const packetsTotal = this.network.packetsSent || 1;
    const ctx = {
      memoryPercent: Math.round((this.memoryUsed / Math.max(1, this.memoryTotal)) * 100),
      dropRate: Math.round((this.network.packetsDropped / packetsTotal) * 100),
      activeCount: this.processes.filter((p) => p.state !== "TERMINATED").length,
    };
    const cmp = (left, op, right) => ({">": left > right, ">=": left >= right, "<": left < right, "<=": left <= right, "==": left === right}[op]);
    let fired = 0;
    this.policies.forEach((pol) => {
      if (!cmp(Number(ctx[pol.metric]), pol.op, Number(pol.value))) return;
      fired += 1;
      if (pol.action === "powersave_on" && !this.powerSaveMode) this.togglePowerSave();
      if (pol.action === "powersave_off" && this.powerSaveMode) this.togglePowerSave();
      if (pol.action === "firewall_on" && !this.firewallEnabled) this.setFirewall(true);
      if (pol.action === "firewall_off" && this.firewallEnabled) this.setFirewall(false);
      if (pol.action === "compact") this.compactMemory();
      this.emitEvent("policy_fired", { id: pol.id, action: pol.action });
    });
    return fired;
  }

  setGovernorMode(mode) {
    const safe = String(mode || "").trim();
    if (!["manual", "auto"].includes(safe)) return "ERR: governor inválido.";
    this.governorMode = safe;
    return `SYS: governor ${safe}`;
  }

  governorTick() {
    if (this.governorMode !== "auto") return;
    const mem = this.memoryUsed / Math.max(1, this.memoryTotal);
    const drop = (this.network.packetsDropped / Math.max(1, this.network.packetsSent));
    if (mem > 0.82 && this.profile !== "performance") this.setProfile("performance");
    else if (drop > 0.18 && this.profile !== "eco") this.setProfile("eco");
    else if (mem < 0.55 && drop < 0.08 && this.profile !== "balanced") this.setProfile("balanced");
  }

  notify(message, level = "warn") {
    this.notifications.unshift({ message, level, at: this.clock });
    this.emitEvent("notify", { message, level });
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

  addJob(delayTicks, command, priority = 5) {
    const delay = this.clamp(delayTicks, 1, 500);
    const cmd = String(command || "").trim();
    if (!cmd) return "ERR: comando job vacío.";
    const prio = this.clamp(priority, 1, 10);
    const job = { at: this.clock + delay, command: cmd, priority: prio };
    this.jobs.push(job);
    this.notify(`Job programado @${job.at} p=${prio}: ${cmd}`, "ok");
    return `JOB: programado para tick ${job.at} (p=${prio}).`;
  }

  runJobs() {
    const due = this.jobs.filter((j) => j.at <= this.clock);
    if (!due.length) return;
    this.jobs = this.jobs.filter((j) => j.at > this.clock);
    due
      .sort((a, b) => (b.priority || 5) - (a.priority || 5) || a.at - b.at)
      .forEach((job) => {
        const out = this.executeCommand(job.command, { internal: true });
        this.notify(`Job p=${job.priority || 5} ${job.command} => ${String(out).slice(0, 48)}`, "ok");
        this.emitEvent("job_executed", { command: job.command, priority: job.priority || 5 });
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
    if (!this.userRoles[safe]) this.userRoles[safe] = "user";
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
    const perms = file.perms || { owner: "rw", others: file.shared ? "r" : "" };
    const token = mode === "write" ? "w" : "r";
    if (String(perms.others || "").includes(token)) return true;
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

  ensureNamespace(user) {
    const safe = String(user || "system").trim() || "system";
    if (!this.userNamespaces[safe]) this.userNamespaces[safe] = { cpu: 0, mem: 0, processCount: 0 };
    return this.userNamespaces[safe];
  }

  updateSchedulerLatency(proc) {
    const latency = Math.max(0, this.clock - (proc.createdAt || this.clock));
    const cur = this.schedulerLatency;
    cur.samples += 1;
    cur.peak = Math.max(cur.peak, latency);
    cur.avg = Math.round(((cur.avg * (cur.samples - 1)) + latency) / cur.samples);
  }

  evaluateNetworkCircuitBreaker() {
    const sent = this.network.packetsSent || 1;
    const dropRate = this.network.packetsDropped / sent;
    if (!this.netCircuitOpen && dropRate > 0.35) {
      this.netCircuitOpen = true;
      this.netCircuitUntil = this.clock + 4;
      this.notify("NET Circuit OPEN", "warn");
      this.emitEvent("net_circuit_open", { until: this.netCircuitUntil });
      this.services.forEach((svc) => { if (svc.name.includes("net")) svc.running = false; });
    }
    if (this.netCircuitOpen && this.clock >= this.netCircuitUntil) {
      this.netCircuitOpen = false;
      this.notify("NET Circuit CLOSED", "ok");
      this.emitEvent("net_circuit_closed", {});
      this.services.forEach((svc) => { if (svc.name.includes("net")) svc.running = true; });
    }
  }

  compileProgram(name, source = "") {
    const progName = String(name || "").trim();
    if (!progName) return { ok: false, error: "nombre de programa vacío" };
    const lines = String(source || "").split(/\r?\n/);
    const instructions = [];
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("#")) continue;
      const [op, ...rest] = raw.split(/\s+/);
      const upper = op.toUpperCase();
      if (upper === "CMD") {
        instructions.push({ kind: "cmd", value: rest.join(" ") });
      } else if (upper === "SPAWN") {
        instructions.push({ kind: "spawn", name: rest[0], cpu: Number(rest[1] || 6), mem: Number(rest[2] || 32), priority: Number(rest[3] || 5) });
      } else if (upper === "WRITE") {
        instructions.push({ kind: "write", file: rest[0], content: rest.slice(1).join(" ") });
      } else if (upper === "WAIT") {
        instructions.push({ kind: "wait", ticks: this.clamp(rest[0] || 1, 1, 50) });
      } else {
        return { ok: false, error: `línea ${i + 1}: op desconocido '${op}'` };
      }
    }
    const compiled = { name: progName, source: String(source || ""), instructions, compiledAt: this.clock, owner: this.currentUser || "system" };
    const idx = this.programs.findIndex((p) => p.name === progName);
    if (idx >= 0) this.programs[idx] = compiled;
    else this.programs.push(compiled);
    this.emitEvent("program_compiled", { name: progName, instructions: instructions.length });
    return { ok: true, program: compiled, message: `COMPILER: '${progName}' compilado (${instructions.length} instrucciones).` };
  }

  runProgram(name) {
    const progName = String(name || "").trim();
    const program = this.programs.find((p) => p.name === progName);
    if (!program) return `ERR: programa '${progName}' no existe.`;
    const logs = [];
    for (const ins of program.instructions) {
      if (ins.kind === "cmd") logs.push(this.executeCommand(ins.value, { internal: true }));
      if (ins.kind === "spawn") logs.push(this.createProcess({ name: ins.name, cpu: ins.cpu, mem: ins.mem, priority: ins.priority }));
      if (ins.kind === "write") logs.push(this.createFile(ins.file, ins.content));
      if (ins.kind === "wait") {
        for (let i = 0; i < ins.ticks; i += 1) logs.push(this.tick());
      }
    }
    this.emitEvent("program_ran", { name: progName, steps: program.instructions.length });
    return `RUNNER: '${progName}' ejecutado. ${logs.slice(0, 4).join(" | ")}`;
  }

  listPrograms() {
    return this.programs.length
      ? this.programs.map((p) => `${p.name}[${p.instructions.length}] owner=${p.owner}`).join(" | ")
      : "sin programas";
  }

  removeProgram(name) {
    const safe = String(name || "").trim();
    const before = this.programs.length;
    this.programs = this.programs.filter((p) => p.name !== safe);
    return before === this.programs.length ? `ERR: programa '${safe}' no existe.` : `COMPILER: '${safe}' eliminado.`;
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
    const ns = this.ensureNamespace(owner);
    ns.mem += mem;
    ns.processCount += 1;
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
    const ns = this.ensureNamespace(proc.owner);
    ns.mem = Math.max(0, ns.mem - (proc.mem || 0));
    ns.processCount = Math.max(0, ns.processCount - 1);
    this.completedCount += 1;
    this.notify(`Proceso ${pid} terminado`, "warn");
    return `TASK: PID ${pid} finalizado por usuario.`;
  }


  suspendProcess(pid) {
    if (!this.booted) return "ERR: kernel inactivo.";
    const proc = this.processes.find((p) => p.pid === Number(pid) && ["READY", "BLOCKED", "RUNNING"].includes(p.state));
    if (!proc) return `ERR: PID ${pid} no suspendible.`;
    proc.prevState = proc.state;
    proc.state = "SUSPENDED";
    this.notify(`Proceso ${pid} suspendido`, "warn");
    return `TASK: PID ${pid} suspendido.`;
  }

  resumeProcess(pid) {
    if (!this.booted) return "ERR: kernel inactivo.";
    const proc = this.processes.find((p) => p.pid === Number(pid) && p.state === "SUSPENDED");
    if (!proc) return `ERR: PID ${pid} no suspendido.`;
    proc.state = proc.prevState === "BLOCKED" ? "BLOCKED" : "READY";
    proc.prevState = null;
    this.notify(`Proceso ${pid} reanudado`, "ok");
    return `TASK: PID ${pid} reanudado.`;
  }

  setNetworkPolicy(policy) {
    const allowed = ["low", "normal", "high"];
    if (!allowed.includes(policy)) return `ERR: netpolicy '${policy}' no válida.`;
    this.networkPolicy = policy;
    this.notify(`Network policy ${policy}`, "ok");
    return `NET: policy ${policy}`;
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
    this.evaluateNetworkCircuitBreaker();
    this.governorTick();
    this.runJobs();
    this.evaluatePolicies();
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
      this.updateSchedulerLatency(proc);
      const runCycles = Math.min(this.quantum, proc.cpuLeft);
      proc.cpuLeft -= runCycles;
      proc.cpuUsed += runCycles;
      this.coreLoad[core] = Math.round((runCycles / this.quantum) * 100);
      if (proc.cpuLeft <= 0) {
        proc.state = "TERMINATED";
        this.memoryUsed -= (proc.ramMem || proc.allocMem || proc.mem);
    this.swapUsed -= (proc.swapMem || 0);
        this.fragmentationLevel = this.clamp(this.fragmentationLevel + this.random(1, 3), 0, 60);
        const ns = this.ensureNamespace(proc.owner);
        ns.mem = Math.max(0, ns.mem - (proc.mem || 0));
        ns.processCount = Math.max(0, ns.processCount - 1);
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
    if (this.netCircuitOpen) {
      this.network.load = Math.min(100, this.network.load + this.random(0, 6));
      return;
    }
    const ranges = { low: [1, 8], normal: [2, 20], high: [12, 36] };
    const [minSend, maxSend] = ranges[this.networkPolicy] || ranges.normal;
    const baseSend = this.random(minSend, maxSend);
    const send = this.powerSaveMode ? Math.max(1, Math.round(baseSend * 0.6)) : baseSend;
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
    const compat = this.checkAppCompatibility(safe);
    if (compat !== "OK") return `ERR: app incompatible (${compat}).`;
    if (this.apps.includes(safe)) return `APP: '${safe}' ya está instalado.`;
    this.apps.push(safe);
    return `APP: '${safe}' instalado.`;
  }

  listApps() {
    return this.apps.length ? this.apps.join(", ") : "APP: sin apps instaladas.";
  }

  getAppInfo(name) {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: app requerida.";
    const spec = this.appRegistry.find((a) => a.name === safe);
    if (!spec) return `APP: sin metadata para '${safe}'.`;
    const compat = this.checkAppCompatibility(safe);
    return `APPINFO ${safe}: arch=${spec.arch} minKernel=${spec.minKernel} drivers=${spec.drivers.join("|") || "none"} services=${spec.services.join("|") || "none"} compat=${compat}`;
  }

  installCompatibleBundle(name, profile = "default") {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: app requerida.";
    const spec = this.appRegistry.find((a) => a.name === safe);
    if (!spec) return "ERR: app no registrada.";
    spec.drivers.forEach((drv) => this.loadDriver(drv));
    spec.services.forEach((svc) => this.startService(svc));
    const out = this.installApp(safe);
    if (!out.startsWith("APP:")) return out;
    this.appProfiles[safe] = String(profile || "default").trim() || "default";
    return `${out} profile=${this.appProfiles[safe]}`;
  }

  uninstallApp(name) {
    const safe = String(name || "").trim();
    if (!this.apps.includes(safe)) return `ERR: app '${safe}' no instalada.`;
    this.apps = this.apps.filter((a) => a !== safe);
    delete this.appProfiles[safe];
    return `APP: '${safe}' desinstalada.`;
  }

  seedCompatibleApps() {
    [
      { name: "files.app", minKernel: 1, arch: "x64", drivers: ["nvme"], services: ["fs.service"] },
      { name: "nettools.app", minKernel: 1, arch: "x64", drivers: ["e1000"], services: ["net.service"] },
      { name: "studio.app", minKernel: 1, arch: "x64", drivers: ["virtio-gpu"], services: [] },
    ].forEach((pkg) => this.registerCompatibleApp(pkg));
  }

  registerCompatibleApp(spec = {}) {
    const name = String(spec.name || "").trim();
    if (!name) return "ERR: nombre de app requerido.";
    const entry = {
      name,
      minKernel: Number(spec.minKernel || 1),
      arch: String(spec.arch || "x64"),
      drivers: Array.isArray(spec.drivers) ? spec.drivers.map((d) => String(d)) : [],
      services: Array.isArray(spec.services) ? spec.services.map((s) => String(s)) : [],
    };
    const idx = this.appRegistry.findIndex((a) => a.name === name);
    if (idx >= 0) this.appRegistry[idx] = entry;
    else this.appRegistry.push(entry);
    return `APPREG: '${name}' registrado.`;
  }

  checkAppCompatibility(name) {
    const spec = this.appRegistry.find((a) => a.name === String(name || "").trim());
    if (!spec) return "OK";
    if (spec.arch !== "x64") return "arch";
    const major = Number(String(this.kernelVersion).split(".")[0] || 1);
    if (major < spec.minKernel) return "kernel";
    const missingDrv = spec.drivers.find((d) => !this.drivers.some((drv) => drv.name === d && drv.loaded));
    if (missingDrv) return `driver:${missingDrv}`;
    const missingSvc = spec.services.find((s) => !this.services.some((svc) => svc.name === s && svc.running));
    if (missingSvc) return `service:${missingSvc}`;
    return "OK";
  }

  runCompatibleApp(name) {
    const safe = String(name || "").trim();
    if (!this.apps.includes(safe)) return `ERR: app '${safe}' no instalada.`;
    const compat = this.checkAppCompatibility(safe);
    if (compat !== "OK") return `ERR: app incompatible (${compat}).`;
    this.notify(`App ${safe} ejecutándose`, "ok");
    return `APP: '${safe}' ejecutada en kernel ${this.kernelVersion}.`;
  }

  createFile(name, content = "") {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: nombre de archivo vacío.";
    if (safe.endsWith("/")) return "ERR: ruta de archivo inválida.";
    const file = this.files.find((f) => f.name === safe);
    const payload = this.encodeFileContent(String(content), { compress: false, encrypt: this.diskEncryptionEnabled, key: "disk" });
    if (file) {
      if (!this.canAccessFile(file, "write")) return "ERR: permiso denegado.";
      file.content = payload.content;
      file.meta = payload.meta;
      file.updatedAt = this.clock;
      this.logFsJournal("update", safe);
      return `FS: '${safe}' actualizado.`;
    }
    this.files.push({
      name: safe,
      type: "file",
      content: payload.content,
      meta: payload.meta,
      updatedAt: this.clock,
      owner: this.currentUser || "system",
      perms: { owner: "rw", others: "" },
      shared: false,
    });
    this.logFsJournal("create", safe);
    return `FS: '${safe}' creado.`;
  }

  readFile(name, key = "") {
    const file = this.files.find((f) => f.name === name);
    if (!file) return `ERR: archivo '${name}' no existe.`;
    if (!this.canAccessFile(file, "read")) return "ERR: permiso denegado.";
    const decoded = this.decodeFileContent(file.content, file.meta || {}, key);
    if (!decoded.ok) return `ERR: ${decoded.error}`;
    return `FILE ${file.name}: ${decoded.content}`;
  }

  deleteFile(name) {
    const file = this.files.find((f) => f.name === name);
    if (!file) return `ERR: archivo '${name}' no existe.`;
    if (!this.canAccessFile(file, "write")) return "ERR: permiso denegado.";
    this.files = this.files.filter((f) => f.name !== name);
    this.logFsJournal("delete", name);
    return `FS: '${name}' eliminado.`;
  }

  listFiles() {
    return this.files.length ? this.files.map((f) => `${f.name} (${f.content.length}B${f.meta?.compressed ? ",zip" : ""}${f.meta?.encrypted ? ",enc" : ""})`).join(", ") : "FS: vacío.";
  }

  listRootDirectories() {
    return this.files.filter((f) => f.type === "dir" && /^\/[^/]+$/.test(f.name)).map((d) => d.name).sort();
  }

  renderFsTree() {
    const roots = this.listRootDirectories();
    if (!roots.length) return "FS: sin estructura raíz.";
    const lines = [];
    roots.forEach((root) => {
      lines.push(root);
      this.files
        .filter((f) => f.name.startsWith(`${root}/`))
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((entry) => {
          const depth = entry.name.slice(root.length + 1).split("/").length;
          const marker = entry.type === "dir" ? "📁" : "📄";
          lines.push(`${"  ".repeat(depth)}${marker} ${entry.name}`);
        });
    });
    return lines.join("\n");
  }

  runFsck(repair = false) {
    const dirs = new Set(this.files.filter((f) => f.type === "dir").map((f) => f.name));
    const issues = [];
    this.files.forEach((entry) => {
      if (!entry.name.startsWith("/") || entry.name === "/") return;
      const parent = entry.name.split("/").slice(0, -1).join("/") || "/";
      if (parent !== "/" && !dirs.has(parent)) {
        issues.push({ type: "missing-parent", target: entry.name, parent });
        if (repair) {
          this.createDirectory(parent);
          dirs.add(parent);
        }
      }
    });
    if (!issues.length) return "FSCK: limpio.";
    this.logFsJournal(repair ? "fsck-repair" : "fsck", `${issues.length} issues`);
    return `FSCK: ${issues.length} issues${repair ? " reparadas" : " detectadas"}.`;
  }

  checkUpdates() {
    const candidates = this.updateCatalog.filter((item) => !this.availableUpdates.includes(item));
    const selected = candidates.filter(() => Math.random() > 0.45).slice(0, 3);
    this.availableUpdates = [...new Set([...this.availableUpdates, ...selected])];
    return this.availableUpdates.length ? `UPD: disponibles ${this.availableUpdates.join(", ")}` : "UPD: sistema al día.";
  }

  applyUpdates(target = "all") {
    if (!this.availableUpdates.length) return "UPD: no hay actualizaciones pendientes.";
    const requested = String(target || "all").trim();
    if (requested === "all") {
      const count = this.availableUpdates.length;
      this.availableUpdates = [];
      this.notify(`Actualizaciones aplicadas: ${count}`, "ok");
      return `UPD: ${count} actualizaciones aplicadas.`;
    }
    if (!this.availableUpdates.includes(requested)) return `ERR: update '${requested}' no disponible.`;
    this.availableUpdates = this.availableUpdates.filter((u) => u !== requested);
    this.notify(`Update aplicado: ${requested}`, "ok");
    return `UPD: '${requested}' aplicado.`;
  }

  createDesktop(name = "Desktop") {
    const safe = String(name || "Desktop").trim().slice(0, 24);
    if (!safe) return "ERR: nombre de desktop inválido.";
    if (this.virtualDesktops.some((d) => d.name.toLowerCase() === safe.toLowerCase())) return `ERR: desktop '${safe}' ya existe.`;
    const id = (this.virtualDesktops.at(-1)?.id || 0) + 1;
    this.virtualDesktops.push({ id, name: safe, apps: [] });
    return `DSK: desktop '${safe}' creado (id=${id}).`;
  }

  switchDesktop(target) {
    const value = String(target || "").trim();
    const desk = this.virtualDesktops.find((d) => String(d.id) === value || d.name.toLowerCase() === value.toLowerCase());
    if (!desk) return `ERR: desktop '${target}' no existe.`;
    this.activeDesktopId = desk.id;
    return `DSK: activo '${desk.name}' (id=${desk.id}).`;
  }

  listDesktops() {
    return this.virtualDesktops.map((d) => `${d.id}:${d.name}${d.id === this.activeDesktopId ? "*" : ""}`).join(" | ");
  }

  installPlugin(name, version = "1.0.0") {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: plugin requerido.";
    if (this.plugins.some((p) => p.name === safe)) return `PLG: '${safe}' ya instalado.`;
    this.plugins.push({ name: safe, version: String(version || "1.0.0"), enabled: true, installedAt: this.clock });
    return `PLG: '${safe}' instalado v${version}.`;
  }

  setPluginState(name, enabled) {
    const plugin = this.plugins.find((p) => p.name === String(name || "").trim());
    if (!plugin) return `ERR: plugin '${name}' no existe.`;
    plugin.enabled = Boolean(enabled);
    return `PLG: '${plugin.name}' ${plugin.enabled ? "ON" : "OFF"}.`;
  }

  listPlugins() {
    return this.plugins.length ? this.plugins.map((p) => `${p.name}@${p.version}[${p.enabled ? "on" : "off"}]`).join(", ") : "PLG: sin plugins.";
  }

  voiceControl(text = "") {
    const phrase = String(text || "").trim().toLowerCase();
    if (!phrase) return "VOICE: di un comando.";
    if (phrase.includes("estado") || phrase.includes("status")) return this.executeCommand("status", { internal: true });
    if (phrase.includes("acelerar") || phrase.includes("rapido")) return this.setProfile("performance");
    if (phrase.includes("silencio") || phrase.includes("eco")) return this.setProfile("eco");
    if (phrase.includes("actualiza") || phrase.includes("update")) return this.applyUpdates("all");
    return `VOICE: no entendí '${phrase}'.`;
  }

  aiAssist(prompt = "") {
    const ask = String(prompt || "").trim().toLowerCase();
    if (!ask) return "AI: describe tu consulta.";
    if (ask.includes("seguridad")) return `AI(${this.aiModel}): secureBoot=${this.secureBootEnabled ? "on" : "off"}, firewall=${this.firewallEnabled ? "on" : "off"}, diskenc=${this.diskEncryptionEnabled ? "on" : "off"}`;
    if (ask.includes("rendimiento") || ask.includes("performance")) return `AI(${this.aiModel}): profile=${this.profile}, cpu=${this.lastCpuUsage}%, mem=${this.memoryUsed}/${this.memoryTotal}, swap=${this.swapUsed}/${this.swapTotal}`;
    if (ask.includes("filesystem") || ask.includes("archivo")) return `AI(${this.aiModel}): roots=${this.listRootDirectories().join(",") || "none"}, journal=${this.fsJournal.length}`;
    return `AI(${this.aiModel}): usa consultas como 'seguridad', 'rendimiento' o 'filesystem'.`;
  }

  createRestorePoint(name = "manual") {
    const label = String(name || "manual").trim().slice(0, 32) || "manual";
    const snapshot = this.saveSnapshot();
    this.restorePoints.unshift({ id: `${this.clock}-${this.random(100, 999)}`, label, at: this.clock, snapshot });
    this.restorePoints = this.restorePoints.slice(0, 12);
    return `RSP: punto '${label}' creado.`;
  }

  listRestorePoints() {
    return this.restorePoints.length ? this.restorePoints.map((r) => `${r.id}:${r.label}@${r.at}`).join(" | ") : "RSP: sin puntos.";
  }

  recoverRestorePoint(id) {
    const safe = String(id || "").trim();
    const rp = this.restorePoints.find((r) => r.id === safe || r.label.toLowerCase() === safe.toLowerCase());
    if (!rp) return `ERR: restore point '${id}' no existe.`;
    return this.loadSnapshot(rp.snapshot);
  }

  createDirectory(path) {
    const safe = String(path || "").trim();
    if (!safe) return "ERR: carpeta inválida.";
    const normalized = safe.endsWith("/") ? safe.slice(0, -1) : safe;
    if (this.files.find((f) => f.name === normalized && f.type === "dir")) return `FS: carpeta '${normalized}' ya existe.`;
    this.files.push({ name: normalized, type: "dir", content: "", updatedAt: this.clock, owner: this.currentUser || "system", perms: { owner: "rwx", others: "rx" }, shared: true });
    this.logFsJournal("mkdir", normalized);
    return `FS: carpeta '${normalized}' creada.`;
  }

  setFilePerms(name, ownerPerm = "rw", othersPerm = "r") {
    const file = this.files.find((f) => f.name === String(name || "").trim());
    if (!file) return `ERR: archivo '${name}' no existe.`;
    if ((this.currentUser || "") !== file.owner && this.getCurrentRole() !== "admin") return "ERR: permiso denegado.";
    file.perms = { owner: String(ownerPerm), others: String(othersPerm) };
    this.logFsJournal("chmod", file.name);
    return `FS: permisos ${file.name} owner=${file.perms.owner} others=${file.perms.others}`;
  }

  logFsJournal(action, target) {
    this.fsJournal.unshift({ at: this.clock, action, target, user: this.currentUser || "system" });
    this.fsJournal = this.fsJournal.slice(0, 80);
  }

  encodeFileContent(content, opts = {}) {
    const useCompress = Boolean(opts.compress);
    const useEncrypt = Boolean(opts.encrypt);
    let out = String(content || "");
    if (useCompress) out = out.replace(/[aeiou]/gi, "");
    if (useEncrypt) out = this.base64Encode(`${opts.key || "k"}:${out}`);
    return { content: out, meta: { compressed: useCompress, encrypted: useEncrypt } };
  }

  decodeFileContent(content, meta = {}, key = "") {
    let out = String(content || "");
    if (meta.encrypted) {
      try {
        const decoded = this.base64Decode(out);
        const [fileKey, value] = decoded.split(":");
        if (key && fileKey !== key) return { ok: false, error: "clave incorrecta" };
        out = value ?? "";
      } catch {
        return { ok: false, error: "contenido encriptado inválido" };
      }
    }
    if (meta.compressed) return { ok: true, content: `${out} (compressed)` };
    return { ok: true, content: out };
  }

  base64Encode(value) {
    if (typeof btoa === "function") return btoa(value);
    if (typeof Buffer !== "undefined") return Buffer.from(value, "utf8").toString("base64");
    return value;
  }

  base64Decode(value) {
    if (typeof atob === "function") return atob(value);
    if (typeof Buffer !== "undefined") return Buffer.from(value, "base64").toString("utf8");
    return value;
  }

  writeCompressedFile(name, content = "") {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: nombre de archivo vacío.";
    const payload = this.encodeFileContent(String(content), { compress: true, encrypt: false });
    this.files.push({ name: safe, type: "file", content: payload.content, meta: payload.meta, updatedAt: this.clock, owner: this.currentUser || "system", perms: { owner: "rw", others: "" }, shared: false });
    this.logFsJournal("create-compressed", safe);
    return `FS: '${safe}' creado con compresión.`;
  }

  writeEncryptedFile(name, content = "", key = "disk") {
    const safe = String(name || "").trim();
    if (!safe) return "ERR: nombre de archivo vacío.";
    const payload = this.encodeFileContent(String(content), { compress: false, encrypt: true, key });
    this.files.push({ name: safe, type: "file", content: payload.content, meta: payload.meta, updatedAt: this.clock, owner: this.currentUser || "system", perms: { owner: "rw", others: "" }, shared: false });
    this.logFsJournal("create-encrypted", safe);
    return `FS: '${safe}' creado con encriptación.`;
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
      governorMode: state.governorMode,
      policyCount: state.policies.length,
      roleMap: state.userRoles,
      recentEvents: state.systemEvents.slice(0, 10),
      schedulerLatency: state.schedulerLatency,
      netCircuit: { open: state.netCircuitOpen, until: state.netCircuitUntil },
      namespaces: state.userNamespaces,
      programs: state.programs.map((p) => ({ name: p.name, instructions: p.instructions.length, owner: p.owner })),
      virtualMemory: state.virtualMemory,
      drivers: state.drivers,
      fsJournal: state.fsJournal.slice(0, 10),
      secureBootEnabled: state.secureBootEnabled,
      diskEncryptionEnabled: state.diskEncryptionEnabled,
      appSandboxes: state.appSandboxes,
      availableUpdates: state.availableUpdates,
      virtualDesktops: state.virtualDesktops,
      activeDesktopId: state.activeDesktopId,
      plugins: state.plugins,
      aiModel: state.aiModel,
      restorePoints: state.restorePoints.map((r) => ({ id: r.id, label: r.label, at: r.at })),
      kernelVersion: state.kernelVersion,
      appRegistry: state.appRegistry,
      appProfiles: state.appProfiles,
      compatibleStore: state.compatibleStore,
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
      networkPolicy: this.networkPolicy,
      schedulerMode: this.schedulerMode,
      maintenanceMode: this.maintenanceMode,
      pid: this.pid,
      processes: this.processes,
      completedCount: this.completedCount,
      files: this.files,
      users: this.users,
      userRoles: this.userRoles,
      currentUser: this.currentUser,
      apps: this.apps,
      appRegistry: this.appRegistry,
      appProfiles: this.appProfiles,
      compatibleStore: this.compatibleStore,
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
      policies: this.policies,
      nextPolicyId: this.nextPolicyId,
      systemEvents: this.systemEvents,
      governorMode: this.governorMode,
      programs: this.programs,
      virtualMemory: this.virtualMemory,
      fsJournal: this.fsJournal,
      drivers: this.drivers,
      secureBootEnabled: this.secureBootEnabled,
      diskEncryptionEnabled: this.diskEncryptionEnabled,
      appSandboxes: this.appSandboxes,
      availableUpdates: this.availableUpdates,
      virtualDesktops: this.virtualDesktops,
      activeDesktopId: this.activeDesktopId,
      plugins: this.plugins,
      aiModel: this.aiModel,
      restorePoints: this.restorePoints,
      kernelVersion: this.kernelVersion,
      netCircuitOpen: this.netCircuitOpen,
      netCircuitUntil: this.netCircuitUntil,
      schedulerLatency: this.schedulerLatency,
      userNamespaces: this.userNamespaces,
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
      this.userRoles = data.userRoles && typeof data.userRoles === "object" ? data.userRoles : { admin: "admin" };
      this.currentUser = data.currentUser || null;
      this.apps = Array.isArray(data.apps) ? data.apps : [];
      this.appRegistry = Array.isArray(data.appRegistry) ? data.appRegistry : [];
      this.appProfiles = data.appProfiles && typeof data.appProfiles === "object" ? data.appProfiles : {};
      this.compatibleStore = Array.isArray(data.compatibleStore) ? data.compatibleStore : ["studio.app", "nettools.app", "files.app", "sec.audit.app"];
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
      this.policies = Array.isArray(data.policies) ? data.policies : [];
      this.nextPolicyId = Number(data.nextPolicyId || (this.policies.length + 1));
      this.systemEvents = Array.isArray(data.systemEvents) ? data.systemEvents : [];
      this.governorMode = data.governorMode || "manual";
      this.programs = Array.isArray(data.programs) ? data.programs : [];
      this.netCircuitOpen = Boolean(data.netCircuitOpen);
      this.netCircuitUntil = Number(data.netCircuitUntil || 0);
      this.schedulerLatency = data.schedulerLatency && typeof data.schedulerLatency === "object" ? data.schedulerLatency : { avg: 0, peak: 0, samples: 0 };
      this.userNamespaces = data.userNamespaces && typeof data.userNamespaces === "object" ? data.userNamespaces : {};
      this.virtualMemory = data.virtualMemory && typeof data.virtualMemory === "object" ? data.virtualMemory : { pages: [], pageSizeMB: 4, nextPageId: 1, faults: 0, protectedPages: 0 };
      this.fsJournal = Array.isArray(data.fsJournal) ? data.fsJournal : [];
      this.drivers = Array.isArray(data.drivers) ? data.drivers : this.drivers;
      this.secureBootEnabled = data.secureBootEnabled !== undefined ? Boolean(data.secureBootEnabled) : true;
      this.diskEncryptionEnabled = Boolean(data.diskEncryptionEnabled);
      this.appSandboxes = data.appSandboxes && typeof data.appSandboxes === "object" ? data.appSandboxes : {};
      this.availableUpdates = Array.isArray(data.availableUpdates) ? data.availableUpdates : [];
      this.virtualDesktops = Array.isArray(data.virtualDesktops) && data.virtualDesktops.length ? data.virtualDesktops : [{ id: 1, name: "Main", apps: [] }];
      this.activeDesktopId = Number(data.activeDesktopId || this.virtualDesktops[0].id || 1);
      this.plugins = Array.isArray(data.plugins) ? data.plugins : [];
      this.aiModel = data.aiModel || "NovaCore-Lite";
      this.restorePoints = Array.isArray(data.restorePoints) ? data.restorePoints : [];
      this.kernelVersion = data.kernelVersion || "1.0.0-x64";
      this.agingEnabled = data.agingEnabled !== undefined ? Boolean(data.agingEnabled) : true;
      this.fragmentationLevel = Number(data.fragmentationLevel || 0);
      this.serviceEvents = data.serviceEvents && typeof data.serviceEvents === "object" ? data.serviceEvents : { failures: 0, restarts: 0 };
      this.swapTotal = Number(data.swapTotal || this.swapTotal || 2048);
      this.swapUsed = Number(data.swapUsed || 0);
      this.serviceWatchdogEnabled = data.serviceWatchdogEnabled !== undefined ? Boolean(data.serviceWatchdogEnabled) : true;
      this.serviceFailureRate = Number(data.serviceFailureRate ?? 0.03);
      this.networkPolicy = data.networkPolicy || "normal";
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

    if (cmd === "help") return "help, status, ps, top, bench <n>, tick, io, irq <type> <source> <prio>, irq-list, netstat, uptime, kill <pid>, profile <eco|balanced|performance>, scheduler <hybrid|rr|priority>, cores <n>, aging <on|off>, compact, maintenance, panic <reason>, recover, whoami, login <user>, logout, apps, install <app>, uninstall <app>, app-run <app>, app-compat <app>, app-info <app>, app-installc <app> [profile], app-reg <name> <minKernel> <arch> <driversCSV> <servicesCSV>, store, store-compatible, install-store <app>, ls, cat <file> [key], write <file> <txt>, writec <file> <txt>, writee <file> <key> <txt>, rm <file>, mkdir <path>, chmod <file> <owner> <others>, fs-journal, fs-root, fs-tree, fsck [repair], updates, update <name|all>, desktop-add <name>, desktop-switch <id|name>, desktops, plugin-add <name> [ver], plugin <name> <on|off>, plugins, voice <texto>, ai <consulta>, rp-create <name>, rp-list, rp-load <id|name>, alerts-clear, services, startsvc <name>, stopsvc <name>, dev <name> <on|off>, dev-list, drv-list, drv-load <name>, drv-unload <name>, firewall <on|off>, templates, template-add <n> <cpu> <mem> <prio>, template-run <n>, quota <user> <mem>, powersave, jobs, job-add <delay> <cmd>, job-addp <delay> <prio> <cmd>, history, audit, share <file> <on|off>, watchdog <on|off>, svcfail <rate>, suspend <pid>, resume <pid>, netpolicy <low|normal|high>, governor <manual|auto>, role <user> <admin|operator|user>, policies, policy-add <metric> <op> <value> <action>, policy-clear, events, events-clear, namespaces, vmalloc <mb> <flags>, vmprotect <id> <flags>, vmaccess <id> <mode>, vmstat, syscall <name> [...args], secureboot <on|off>, diskenc <on|off>, malware-scan, sandbox <app> <on|off>, net-circuit, prog-list, prog-run <name>, prog-rm <name>, save, load";
    if (cmd === "status") {
      return `profile=${this.profile} scheduler=${this.schedulerMode} cores=${this.coreCount} panic=${this.panicState ? "on" : "off"} maintenance=${this.maintenanceMode ? "on" : "off"} irqDepth=${this.interruptQueue.length} frag=${this.fragmentationLevel}% aging=${this.agingEnabled ? "on" : "off"} swap=${this.swapUsed}/${this.swapTotal} net=${this.networkPolicy} gov=${this.governorMode} policies=${this.policies.length} role=${this.getCurrentRole()} lat=${this.schedulerLatency.avg}/${this.schedulerLatency.peak} circuit=${this.netCircuitOpen ? "open" : "closed"}`;
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
    if (cmd === "panic") return this.hasPrivilege("panic") ? this.triggerPanic(args.join(" ") || "manual") : "ERR: privilegios insuficientes.";
    if (cmd === "recover") return this.hasPrivilege("recover") ? this.recoverKernel() : "ERR: privilegios insuficientes.";
    if (cmd === "whoami") return this.currentUser || "sin sesión";
    if (cmd === "login") return this.login(args[0]);
    if (cmd === "logout") return this.logout();
    if (cmd === "apps") return this.listApps();
    if (cmd === "install") return this.installApp(args[0]);
    if (cmd === "uninstall") return this.uninstallApp(args[0]);
    if (cmd === "app-run") return this.runCompatibleApp(args[0]);
    if (cmd === "app-compat") return `APP: ${args[0]} => ${this.checkAppCompatibility(args[0])}`;
    if (cmd === "app-info") return this.getAppInfo(args[0]);
    if (cmd === "app-installc") return this.installCompatibleBundle(args[0], args[1]);
    if (cmd === "app-reg") return this.registerCompatibleApp({ name: args[0], minKernel: Number(args[1] || 1), arch: args[2] || "x64", drivers: (args[3] || "").split(",").filter(Boolean), services: (args[4] || "").split(",").filter(Boolean) });
    if (cmd === "store") return `STORE: ${this.appStore.join(", ")}`;
    if (cmd === "store-compatible") return `STOREC: ${this.compatibleStore.join(", ")}`;
    if (cmd === "install-store") return this.installApp(args[0]);
    if (cmd === "services") return this.listServices();
    if (cmd === "startsvc") return this.startService(args[0]);
    if (cmd === "stopsvc") return this.stopService(args[0]);
    if (cmd === "dev") return this.setDeviceState(args[0], args[1] === "on");
    if (cmd === "dev-list") return this.listDevices();
    if (cmd === "drv-list") return this.listDrivers();
    if (cmd === "drv-load") return this.loadDriver(args[0]);
    if (cmd === "drv-unload") return this.unloadDriver(args[0]);
    if (cmd === "firewall") return this.hasPrivilege("firewall") ? this.setFirewall(args[0] === "on") : "ERR: privilegios insuficientes.";
    if (cmd === "templates") return this.listTemplates();
    if (cmd === "template-add") return this.createTemplate(args[0], { cpu: args[1], mem: args[2], priority: args[3] });
    if (cmd === "template-run") return this.runTemplate(args[0]);
    if (cmd === "quota") return this.setUserQuota(args[0], args[1]);
    if (cmd === "powersave") return this.togglePowerSave();
    if (cmd === "jobs") return this.jobs.map((j) => `${j.at}:${j.command}`).join(" | ") || "sin jobs";
    if (cmd === "job-add") return this.addJob(Number(args[0] || 1), args.slice(1).join(" "), 5);
    if (cmd === "job-addp") return this.addJob(Number(args[0] || 1), args.slice(2).join(" "), Number(args[1] || 5));
    if (cmd === "share") return this.setFileShare(args[0], args[1] === "on");
    if (cmd === "watchdog") { if (!this.hasPrivilege("watchdog")) return "ERR: privilegios insuficientes."; this.serviceWatchdogEnabled = args[0] !== "off"; return `SVC: watchdog ${this.serviceWatchdogEnabled ? "ON" : "OFF"}.`; }
    if (cmd === "svcfail") { if (!this.hasPrivilege("svcfail")) return "ERR: privilegios insuficientes."; this.serviceFailureRate = this.clamp(args[0], 0, 0.5); return `SVC: failureRate=${this.serviceFailureRate}`; }
    if (cmd === "suspend") return this.suspendProcess(args[0]);
    if (cmd === "resume") return this.resumeProcess(args[0]);
    if (cmd === "netpolicy") return this.setNetworkPolicy(args[0]);
    if (cmd === "governor") return this.setGovernorMode(args[0]);
    if (cmd === "role") return this.setRole(args[0], args[1]);
    if (cmd === "policies") return this.policies.map((p) => `${p.id}:${p.metric}${p.op}${p.value}->${p.action}`).join(" | ") || "sin policies";
    if (cmd === "policy-add") return this.addPolicy(args[0], args[1], args[2], args[3]);
    if (cmd === "policy-clear") return this.clearPolicies();
    if (cmd === "events") return this.systemEvents.slice(0, 8).map((e) => `${e.at}:${e.type}`).join(" | ") || "sin eventos";
    if (cmd === "events-clear") { this.systemEvents = []; return "SYS: eventos limpiados."; }
    if (cmd === "namespaces") return Object.entries(this.userNamespaces).map(([u,n]) => `${u}:mem=${n.mem},procs=${n.processCount}`).join(" | ") || "sin namespaces";
    if (cmd === "net-circuit") return `net-circuit=${this.netCircuitOpen ? "open" : "closed"} until=${this.netCircuitUntil}`;
    if (cmd === "prog-list") return this.listPrograms();
    if (cmd === "prog-run") return this.runProgram(args[0]);
    if (cmd === "prog-rm") return this.removeProgram(args[0]);
    if (cmd === "history") return this.commandHistory.slice(0, 8).map((h) => `${h.at}:${h.cmd}`).join(" | ") || "sin historial";
    if (cmd === "audit") return this.auditTrail.slice(0, 8).map((a) => `${a.at}:${a.message}`).join(" | ") || "sin eventos";
    if (cmd === "ls") return this.listFiles();
    if (cmd === "cat") return this.readFile(args[0], args[1]);
    if (cmd === "write") return this.createFile(args[0], args.slice(1).join(" "));
    if (cmd === "writec") return this.writeCompressedFile(args[0], args.slice(1).join(" "));
    if (cmd === "writee") return this.writeEncryptedFile(args[0], args.slice(2).join(" "), args[1]);
    if (cmd === "rm") return this.deleteFile(args[0]);
    if (cmd === "mkdir") return this.createDirectory(args[0]);
    if (cmd === "chmod") return this.setFilePerms(args[0], args[1], args[2]);
    if (cmd === "fs-journal") return this.fsJournal.slice(0, 10).map((j) => `${j.at}:${j.action}:${j.target}`).join(" | ") || "sin journal";
    if (cmd === "fs-root") return this.listRootDirectories().join(", ");
    if (cmd === "fs-tree") return this.renderFsTree();
    if (cmd === "fsck") return this.runFsck(args[0] === "repair");
    if (cmd === "updates") return this.checkUpdates();
    if (cmd === "update") return this.applyUpdates(args[0] || "all");
    if (cmd === "desktop-add") return this.createDesktop(args.join(" "));
    if (cmd === "desktop-switch") return this.switchDesktop(args.join(" "));
    if (cmd === "desktops") return this.listDesktops();
    if (cmd === "plugin-add") return this.installPlugin(args[0], args[1]);
    if (cmd === "plugin") return this.setPluginState(args[0], args[1] !== "off");
    if (cmd === "plugins") return this.listPlugins();
    if (cmd === "voice") return this.voiceControl(args.join(" "));
    if (cmd === "ai") return this.aiAssist(args.join(" "));
    if (cmd === "rp-create") return this.createRestorePoint(args.join(" "));
    if (cmd === "rp-list") return this.listRestorePoints();
    if (cmd === "rp-load") return this.recoverRestorePoint(args.join(" "));
    if (cmd === "alerts-clear") return this.clearNotifications();
    if (cmd === "vmalloc") return this.allocateVirtualMemory(Number(args[0] || 4), args[1] || "rw");
    if (cmd === "vmprotect") return this.protectPage(Number(args[0]), args[1] || "r");
    if (cmd === "vmaccess") return this.accessPage(Number(args[0]), args[1] || "r");
    if (cmd === "vmstat") return `VM: pages=${this.virtualMemory.pages.length} faults=${this.virtualMemory.faults} protected=${this.virtualMemory.protectedPages}`;
    if (cmd === "syscall") {
      const call = this.syscalls[args[0]];
      if (!call) return `ERR: syscall '${args[0]}' no existe.`;
      return call(args.slice(1));
    }
    if (cmd === "secureboot") { this.secureBootEnabled = args[0] !== "off"; return `SEC: secureboot ${this.secureBootEnabled ? "ON" : "OFF"}`; }
    if (cmd === "diskenc") { this.diskEncryptionEnabled = args[0] === "on"; return `SEC: disk encryption ${this.diskEncryptionEnabled ? "ON" : "OFF"}`; }
    if (cmd === "malware-scan") {
      const hits = this.files.filter((f) => this.malwareSignatures.some((sig) => String(f.content || "").toLowerCase().includes(sig))).map((f) => f.name);
      return hits.length ? `MALWARE: detectado en ${hits.join(",")}` : "MALWARE: limpio";
    }
    if (cmd === "sandbox") {
      const app = String(args[0] || "").trim();
      if (!app) return "ERR: app requerida.";
      this.appSandboxes[app] = args[1] !== "off";
      return `APP: sandbox ${app}=${this.appSandboxes[app] ? "on" : "off"}`;
    }
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
      networkPolicy: this.networkPolicy,
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
      userRoles: this.userRoles,
      currentUser: this.currentUser,
      apps: this.apps,
      appRegistry: this.appRegistry,
      appProfiles: this.appProfiles,
      compatibleStore: this.compatibleStore,
      services: this.services,
      healthScore: this.serviceHealthScore(),
      notifications: this.notifications,
      benchmarkHistory: this.benchmarkHistory,
      templates: this.templates,
      firewallEnabled: this.firewallEnabled,
      userQuotas: this.userQuotas,
      jobs: this.jobs,
      policies: this.policies,
      systemEvents: this.systemEvents,
      governorMode: this.governorMode,
      programs: this.programs,
      virtualMemory: this.virtualMemory,
      fsJournal: this.fsJournal,
      drivers: this.drivers,
      secureBootEnabled: this.secureBootEnabled,
      diskEncryptionEnabled: this.diskEncryptionEnabled,
      appSandboxes: this.appSandboxes,
      availableUpdates: this.availableUpdates,
      virtualDesktops: this.virtualDesktops,
      activeDesktopId: this.activeDesktopId,
      plugins: this.plugins,
      aiModel: this.aiModel,
      restorePoints: this.restorePoints.map((r) => ({ id: r.id, label: r.label, at: r.at })),
      kernelVersion: this.kernelVersion,
      netCircuitOpen: this.netCircuitOpen,
      netCircuitUntil: this.netCircuitUntil,
      schedulerLatency: this.schedulerLatency,
      userNamespaces: this.userNamespaces,
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
  const programList = el("programList");
  const memBar = el("memBar");
  const cpuBar = el("cpuBar");
  const netBar = el("netBar");
  const notificationList = el("notificationList");
  const coreList = el("coreList");
  const irqList = el("irqList");
  const deviceList = el("deviceList");

  const buttonIds = [
    "bootBtn", "tickBtn", "autoTickBtn", "ioBtn", "benchBtn", "maintenanceBtn", "panicBtn", "recoverBtn", "saveBtn", "loadBtn", "diagBtn", "resetBtn", "clearLogBtn",
    "spawnManualBtn", "spawnAutoBtn", "createFileBtn", "installAppBtn", "startServiceBtn", "saveTemplateBtn", "runTemplateBtn", "toggleFirewallBtn", "addJobBtn", "setQuotaBtn", "togglePowerSaveBtn", "logoutBtn", "compileProgramBtn", "runProgramBtn", "loadSampleCompilerBtn",
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

  function renderPrograms(programs) {
    programList.innerHTML = programs.length
      ? programs.map((p) => `<li>${p.name} (${p.instructions.length} instr, owner=${p.owner})</li>`).join("")
      : "<li>Sin programas compilados</li>";
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
      <li><strong>Net Policy:</strong> ${s.networkPolicy.toUpperCase()} | <strong>Suspendidos:</strong> ${kernel.processes.filter((p) => p.state === "SUSPENDED").length}</li>
      <li><strong>Governor:</strong> ${s.governorMode} | <strong>Policies:</strong> ${s.policies.length} | <strong>Role:</strong> ${s.userRoles[s.currentUser || "admin"] || "user"}</li>
      <li><strong>Sched Lat avg/peak:</strong> ${s.schedulerLatency.avg}/${s.schedulerLatency.peak} | <strong>Net Circuit:</strong> ${s.netCircuitOpen ? "OPEN" : "CLOSED"}</li>
      <li><strong>Programas compilados:</strong> ${s.programs.length}</li>
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
    renderPrograms(s.programs);
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

    ["tickBtn", "autoTickBtn", "ioBtn", "benchBtn", "maintenanceBtn", "panicBtn", "recoverBtn", "saveBtn", "diagBtn", "spawnManualBtn", "spawnAutoBtn", "createFileBtn", "installAppBtn", "startServiceBtn", "saveTemplateBtn", "runTemplateBtn", "toggleFirewallBtn", "addJobBtn", "setQuotaBtn", "togglePowerSaveBtn", "compileProgramBtn", "runProgramBtn"].forEach((id) => {
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


  el("compilerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = el("compilerNameInput").value;
    const source = el("compilerInput").value;
    const result = kernel.compileProgram(name, source);
    writeLog(result.ok ? result.message : `ERR COMPILER: ${result.error}`);
    render();
  });
  buttons.runProgramBtn.addEventListener("click", () => {
    writeLog(kernel.runProgram(el("compilerNameInput").value));
    render();
  });
  buttons.loadSampleCompilerBtn.addEventListener("click", () => {
    el("compilerInput").value = `# Script AmigaOS
WRITE hello.txt hola-desde-compiler
SPAWN compile.task 6 32 5
CMD netpolicy high
WAIT 1
CMD status`;
    writeLog("COMPILER: plantilla cargada.");
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
