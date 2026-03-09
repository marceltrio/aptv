const test = require("node:test");
const assert = require("node:assert/strict");
const { OnlineKernel } = require("./kernel.js");

test("no permite crear procesos antes de boot", () => {
  const kernel = new OnlineKernel();
  assert.match(kernel.createProcess(), /inicia Workbench primero/);
});

test("perfil performance cambia quantum y memoria", () => {
  const kernel = new OnlineKernel();
  const msg = kernel.setProfile("performance");
  assert.match(msg, /performance/);
  assert.equal(kernel.quantum, 4);
  assert.equal(kernel.memoryTotal, 4096);
});

test("login crea sesión y usuario", () => {
  const kernel = new OnlineKernel();
  const msg = kernel.login("maria");
  assert.match(msg, /maria/);
  assert.equal(kernel.currentUser, "maria");
  assert.equal(kernel.users.includes("maria"), true);
});

test("crea proceso y consume memoria", () => {
  const kernel = new OnlineKernel({ memoryTotal: 128, quantum: 2 });
  kernel.boot();
  kernel.login("dev");
  const msg = kernel.createProcess({ name: "shell.task", cpu: 4, mem: 32, priority: 8 });
  assert.match(msg, /OWNER=dev/);
  const state = kernel.getState();
  assert.equal(state.memoryUsed, 32);
  assert.equal(state.ready, 1);
});

test("tick ejecuta y termina procesos liberando memoria", () => {
  const kernel = new OnlineKernel({ memoryTotal: 128, quantum: 2 });
  kernel.boot();
  kernel.createProcess({ name: "dos.library", cpu: 2, mem: 40, priority: 5 });
  const msg = kernel.tick();
  assert.match(msg, /terminó/);
  const state = kernel.getState();
  assert.equal(state.terminated, 1);
  assert.equal(state.memoryUsed, 0);
});

test("I/O interrupt bloquea y luego vuelve a READY", () => {
  const kernel = new OnlineKernel({ memoryTotal: 128, quantum: 1 });
  kernel.boot();
  kernel.createProcess({ name: "audio.device", cpu: 5, mem: 20, priority: 3 });
  const irq = kernel.triggerIOInterrupt();
  assert.match(irq, /bloqueado/);

  for (let i = 0; i < 5; i += 1) kernel.tick();

  const hasBlocked = kernel.processes.some((p) => p.state === "BLOCKED");
  assert.equal(hasBlocked, false);
});

test("filesystem virtual crea y lee archivos", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  assert.match(kernel.createFile("notes.txt", "hola amiga"), /creado|actualizado/);
  assert.match(kernel.readFile("notes.txt"), /hola amiga/);
  assert.match(kernel.listFiles(), /notes.txt/);
});

test("app manager instala y lista apps", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  assert.match(kernel.installApp("paint.app"), /instalado|ya está instalado/);
  assert.match(kernel.listApps(), /paint.app/);
});

test("snapshot guarda y restaura estado", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.login("ana");
  k1.createProcess({ name: "w.task", cpu: 4, mem: 20, priority: 2 });
  k1.createFile("boot.log", "ok");
  k1.installApp("paint.app");
  const snap = k1.saveSnapshot();

  const k2 = new OnlineKernel();
  const msg = k2.loadSnapshot(snap);
  assert.match(msg, /snapshot cargado/);
  assert.equal(k2.processes.length, 1);
  assert.equal(k2.files.some((f) => f.name === "boot.log"), true);
  assert.equal(k2.apps.includes("paint.app"), true);
  assert.equal(k2.currentUser, "ana");
});

test("shell command parser ejecuta comandos básicos", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.createProcess({ name: "x.task", cpu: 3, mem: 16, priority: 3 });
  assert.match(kernel.executeCommand("ps"), /PID/);
  assert.match(kernel.executeCommand("login pedro"), /pedro/);
  assert.match(kernel.executeCommand("whoami"), /pedro/);
  assert.match(kernel.executeCommand("install term.app"), /APP:/);
  assert.match(kernel.executeCommand("apps"), /term.app/);
  assert.match(kernel.executeCommand("write test.txt hola"), /FS:/);
  assert.match(kernel.executeCommand("ls"), /test.txt/);
});

test("diagnostics incluye red y usuarios", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.login("ops");
  kernel.tick();
  const report = kernel.diagnosticsReport();
  assert.equal(typeof report.network.packetsSent, "number");
  assert.equal(report.users.includes("ops"), true);
});


test("benchmark genera historial", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.createProcess({ name: "bench.task", cpu: 50, mem: 32, priority: 5 });
  const out = kernel.benchmark(15);
  assert.match(out, /BENCH/);
  assert.equal(kernel.benchmarkHistory.length > 0, true);
});

test("alerts-clear limpia notificaciones", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.login("qa");
  assert.equal(kernel.notifications.length > 0, true);
  const msg = kernel.executeCommand("alerts-clear");
  assert.match(msg, /notificaciones limpiadas/);
  assert.equal(kernel.notifications.length, 0);
});


test("service manager inicia y detiene servicios", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  assert.match(kernel.startService("print.service"), /iniciado/);
  assert.match(kernel.listServices(), /print.service/);
  assert.match(kernel.stopService("print.service"), /detenido/);
});

test("shell soporta comandos de servicios y observabilidad", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  assert.match(kernel.executeCommand("startsvc dns.service"), /SVC:/);
  assert.match(kernel.executeCommand("services"), /dns.service/);
  assert.match(kernel.executeCommand("netstat"), /sent=/);
  assert.match(kernel.executeCommand("uptime"), /uptime/);
});

test("scheduler mode cambia por comando y por API", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  assert.match(kernel.setScheduler("rr"), /rr/);
  assert.equal(kernel.schedulerMode, "rr");
  assert.match(kernel.executeCommand("scheduler priority"), /priority/);
  assert.equal(kernel.schedulerMode, "priority");
});

test("maintenance bloquea creación de procesos e instalación", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.toggleMaintenance();
  assert.match(kernel.createProcess({ mem: 16, cpu: 2, priority: 2 }), /maintenance mode activo/);
  assert.match(kernel.installApp("paint.app"), /maintenance mode activo/);
});


test("template workflow y firewall toggle funcionan", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  assert.match(kernel.createTemplate("web.worker", { cpu: 9, mem: 40, priority: 6 }), /guardado/);
  assert.match(kernel.runTemplate("web.worker"), /TASK:/);
  assert.equal(kernel.templates.some((t) => t.name === "web.worker"), true);
  assert.match(kernel.setFirewall(true), /ON/);
  assert.equal(kernel.firewallEnabled, true);
});

test("shell soporta templates, firewall y audit", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  assert.match(kernel.executeCommand("template-add api.worker 8 32 5"), /TPL:/);
  assert.match(kernel.executeCommand("templates"), /api.worker/);
  assert.match(kernel.executeCommand("firewall on"), /SEC:/);
  assert.match(kernel.executeCommand("audit"), /Kernel iniciado|Firewall/);
});

test("quota y powersave funcionan", () => {
  const kernel = new OnlineKernel({ memoryTotal: 4096, quantum: 3 });
  kernel.boot();
  kernel.login("alice");
  assert.match(kernel.setUserQuota("alice", 64), /quota/);
  assert.match(kernel.createProcess({ name: "big.task", mem: 128, cpu: 2, priority: 2 }), /quota excedida/);
  assert.match(kernel.togglePowerSave(), /powersave ON/);
  assert.equal(kernel.powerSaveMode, true);
});

test("jobs programados se ejecutan", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.addJob(1, "template-add batch 5 32 4");
  kernel.tick();
  assert.equal(kernel.templates.some((t) => t.name === "batch"), true);
});


test("irq priority atiende primero las de mayor prioridad", () => {
  const kernel = new OnlineKernel({ coreCount: 2 });
  kernel.boot();
  kernel.executeCommand("irq io disk.device 2");
  kernel.executeCommand("irq device-fault net.device 9");
  const list = kernel.executeCommand("irq-list");
  assert.match(list.split(" | ")[0], /device-fault/);
  kernel.tick();
  assert.equal(kernel.interruptStats.handled > 0, true);
});

test("dev on/off y persistencia en snapshot", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  assert.match(k1.executeCommand("dev net.device off"), /OFF/);
  const snap = k1.saveSnapshot();

  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.devices.find((d) => d.name === "net.device").online, false);
});


test("compact reduce fragmentación y comando aging", () => {
  const kernel = new OnlineKernel({ memoryTotal: 256, quantum: 1, coreCount: 1 });
  kernel.boot();
  kernel.createProcess({ name: "a", cpu: 1, mem: 32, priority: 1 });
  kernel.tick();
  assert.equal(kernel.fragmentationLevel > 0, true);
  const prev = kernel.fragmentationLevel;
  assert.match(kernel.executeCommand("compact"), /compactación/);
  assert.equal(kernel.fragmentationLevel <= prev, true);
  assert.match(kernel.executeCommand("aging off"), /aging OFF/);
  assert.equal(kernel.agingEnabled, false);
});

test("aging eleva prioridad de procesos hambrientos", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.createProcess({ name: "starved", cpu: 20, mem: 16, priority: 1 });
  const target = kernel.processes.find((p) => p.name.startsWith("starved"));
  for (let i = 0; i < 6; i += 1) kernel.applyAging([target]);
  assert.equal(target.priority > 1, true);
});

test("snapshot conserva fragmentation, aging y serviceEvents", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("aging off");
  k1.fragmentationLevel = 17;
  k1.serviceEvents = { failures: 2, restarts: 3 };
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.agingEnabled, false);
  assert.equal(k2.fragmentationLevel, 17);
  assert.equal(k2.serviceEvents.restarts, 3);
});
