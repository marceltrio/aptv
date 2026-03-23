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


test("usa swap cuando memoria RAM no alcanza", () => {
  const k = new OnlineKernel({ memoryTotal: 64, swapTotal: 128 });
  k.boot();
  const out = k.createProcess({ name: "big.swap", cpu: 5, mem: 80, priority: 4 });
  assert.match(out, /swap=/);
  assert.equal(k.swapUsed > 0, true);
});

test("permisos de FS bloquean lectura de archivo privado", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("login alice");
  k.createFile("secret.txt", "top-secret");
  k.executeCommand("login bob");
  assert.match(k.readFile("secret.txt"), /permiso denegado/);
  k.executeCommand("login alice");
  k.executeCommand("share secret.txt on");
  k.executeCommand("login bob");
  assert.match(k.readFile("secret.txt"), /top-secret/);
});

test("job-add y watchdog por comandos", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("watchdog off"), /OFF/);
  assert.equal(k.serviceWatchdogEnabled, false);
  assert.match(k.executeCommand("job-add 1 template-add delayed 3 16 2"), /JOB:/);
  k.tick();
  assert.equal(k.templates.some((t) => t.name === "delayed"), true);
});


test("suspend y resume controlan la ejecución del proceso", () => {
  const k = new OnlineKernel({ quantum: 1 });
  k.boot();
  k.createProcess({ name: "task.susp", cpu: 4, mem: 16, priority: 5 });
  const pid = k.processes[0].pid;
  assert.match(k.executeCommand(`suspend ${pid}`), /suspendido/);
  const before = k.processes[0].cpuLeft;
  k.tick();
  assert.equal(k.processes[0].cpuLeft, before);
  assert.match(k.executeCommand(`resume ${pid}`), /reanudado/);
  k.tick();
  assert.equal(k.processes[0].cpuLeft < before, true);
});

test("job-addp prioriza jobs por prioridad", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("job-addp 1 1 write low.txt low");
  k.executeCommand("job-addp 1 9 write high.txt high");
  k.tick();
  const audit = k.executeCommand("audit");
  assert.match(audit, /Job p=9/);
  assert.equal(k.files.some((f) => f.name === "high.txt"), true);
});

test("netpolicy cambia el perfil de red", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("netpolicy high"), /policy high/);
  assert.equal(k.networkPolicy, "high");
  const status = k.executeCommand("status");
  assert.match(status, /net=high/);
});


test("RBAC restringe panic para rol user", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("login mario");
  const out = k.executeCommand("panic test");
  assert.match(out, /privilegios insuficientes/);
  k.executeCommand("login admin");
  assert.match(k.executeCommand("role mario operator"), /mario -> operator/);
});

test("policy engine dispara acciones automáticas", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("policy-add activeCount >= 0 firewall_on"), /POL:/);
  k.tick();
  assert.equal(k.firewallEnabled, true);
  assert.match(k.executeCommand("policies"), /firewall_on/);
});

test("governor y eventos se conservan en snapshot", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("governor auto");
  k1.emitEvent("custom", { ok: 1 });
  const snap = k1.saveSnapshot();

  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.governorMode, "auto");
  assert.equal(k2.systemEvents.some((e) => e.type === "custom"), true);
});


test("namespace por usuario refleja consumo", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("login ana");
  k.createProcess({ name: "ana.task", cpu: 3, mem: 20, priority: 4 });
  const ns = k.executeCommand("namespaces");
  assert.match(ns, /ana:mem=20/);
});

test("latencia de scheduler y net-circuit visibles en status", () => {
  const k = new OnlineKernel({ quantum: 1 });
  k.boot();
  k.createProcess({ name: "lat.task", cpu: 3, mem: 16, priority: 5 });
  k.tick();
  const st = k.executeCommand("status");
  assert.match(st, /lat=\d+\/\d+/);
  assert.match(k.executeCommand("net-circuit"), /net-circuit=/);
});

test("snapshot conserva governor, namespaces y schedulerLatency", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("login pepa");
  k1.createProcess({ name: "p.task", cpu: 2, mem: 18, priority: 4 });
  k1.executeCommand("governor auto");
  k1.tick();
  const snap = k1.saveSnapshot();

  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.governorMode, "auto");
  assert.equal(typeof k2.schedulerLatency.avg, "number");
  assert.equal(Boolean(k2.userNamespaces.pepa), true);
});


test("compiler interno compila y ejecuta script", () => {
  const k = new OnlineKernel();
  k.boot();
  const src = `WRITE c1.txt hola
SPAWN c.task 3 16 4
WAIT 1`;
  const compiled = k.compileProgram("demo", src);
  assert.equal(compiled.ok, true);
  const out = k.runProgram("demo");
  assert.match(out, /RUNNER/);
  assert.equal(k.files.some((f) => f.name === "c1.txt"), true);
  assert.equal(k.processes.some((p) => p.name.startsWith("c.task")), true);
});

test("shell expone comandos de programas compilados", () => {
  const k = new OnlineKernel();
  k.boot();
  k.compileProgram("mini", "CMD status");
  assert.match(k.executeCommand("prog-list"), /mini/);
  assert.match(k.executeCommand("prog-run mini"), /RUNNER/);
  assert.match(k.executeCommand("prog-rm mini"), /eliminado/);
});

test("snapshot conserva programas compilados", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.compileProgram("persist", "CMD status");
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.programs.some((p) => p.name === "persist"), true);
});

test("memoria virtual expone alloc/protección/fault", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("vmalloc 12 rw"), /páginas asignadas/);
  assert.match(k.executeCommand("vmprotect 1 r"), /protegida/);
  assert.match(k.executeCommand("vmaccess 1 w"), /FAULT/);
  assert.match(k.executeCommand("vmstat"), /faults=1/);
});

test("drivers pueden descargarse y listarse", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("drv-list"), /nvme/);
  assert.match(k.executeCommand("drv-unload nvme"), /descargado/);
  assert.equal(k.devices.find((d) => d.driver === "nvme").online, false);
});

test("ArkrFS soporta mkdir journaling y cifrado", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("mkdir /home"), /creada/);
  assert.match(k.executeCommand("writee enc.txt key123 secreto"), /encriptación/);
  assert.match(k.executeCommand("cat enc.txt key123"), /secreto/);
  assert.match(k.executeCommand("fs-journal"), /mkdir|create-encrypted/);
});

test("snapshot conserva VM/drivers/journal", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("vmalloc 8 rw");
  k1.executeCommand("drv-unload xhci");
  k1.executeCommand("write f1 hola");
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.virtualMemory.pages.length > 0, true);
  assert.equal(k2.drivers.find((d) => d.name === "xhci").loaded, false);
  assert.equal(k2.fsJournal.length > 0, true);
});

test("boot crea layout moderno de ArkrFS", () => {
  const k = new OnlineKernel();
  k.boot();
  const roots = k.executeCommand("fs-root");
  assert.match(roots, /\/system/);
  assert.match(roots, /\/users/);
  assert.match(roots, /\/apps/);
  assert.match(roots, /\/temp/);
  assert.match(roots, /\/logs/);
  assert.equal(k.files.some((f) => f.type === "dir" && f.name === "/users/marcel"), true);
});

test("fsck detecta y repara padres faltantes", () => {
  const k = new OnlineKernel();
  k.boot();
  k.files.push({ name: "/orphan/a.txt", type: "file", content: "x", owner: "admin", perms: { owner: "rw", others: "" } });
  assert.match(k.executeCommand("fsck"), /issues detectadas/);
  assert.match(k.executeCommand("fsck repair"), /reparadas/);
  assert.equal(k.files.some((f) => f.type === "dir" && f.name === "/orphan"), true);
});

test("updates y snapshot conservan catálogo pendiente", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.availableUpdates = ["kernel.core", "security.patch"];
  assert.match(k1.executeCommand("update kernel.core"), /aplicado/);
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.deepEqual(k2.availableUpdates, ["security.patch"]);
  assert.match(k2.executeCommand("update all"), /actualizaciones aplicadas/);
});

test("desktops virtuales pueden crearse y cambiarse", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("desktop-add DevSpace"), /creado/);
  assert.match(k.executeCommand("desktops"), /DevSpace/);
  assert.match(k.executeCommand("desktop-switch DevSpace"), /activo/);
  assert.equal(k.activeDesktopId, k.virtualDesktops.find((d) => d.name === "DevSpace").id);
});

test("plugins se instalan y pueden desactivarse", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("plugin-add ai.assistant 2.1"), /instalado/);
  assert.match(k.executeCommand("plugins"), /ai.assistant/);
  assert.match(k.executeCommand("plugin ai.assistant off"), /OFF/);
});

test("voice ejecuta acciones rápidas del kernel", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("voice estado"), /profile=/);
  assert.match(k.executeCommand("voice acelerar"), /performance/);
});

test("snapshot conserva desktops y plugins", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("desktop-add Ops");
  k1.executeCommand("desktop-switch Ops");
  k1.executeCommand("plugin-add sec.audit 1.0");
  const snap = k1.saveSnapshot();

  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.virtualDesktops.some((d) => d.name === "Ops"), true);
  assert.equal(k2.plugins.some((p) => p.name === "sec.audit"), true);
  assert.equal(k2.activeDesktopId, k2.virtualDesktops.find((d) => d.name === "Ops").id);
});

test("ai assistant responde contexto de seguridad", () => {
  const k = new OnlineKernel();
  k.boot();
  const out = k.executeCommand("ai seguridad");
  assert.match(out, /AI\(/);
  assert.match(out, /secureBoot=/);
});

test("restore points permiten rollback de estado", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("write /temp/a.txt uno");
  assert.match(k.executeCommand("rp-create before-change"), /punto/);
  k.executeCommand("write /temp/a.txt dos");
  assert.match(k.executeCommand("cat /temp/a.txt"), /dos/);
  assert.match(k.executeCommand("rp-load before-change"), /snapshot cargado/);
  assert.match(k.executeCommand("cat /temp/a.txt"), /uno/);
});

test("snapshot conserva restore points y aiModel", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("rp-create baseline");
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.aiModel, "NovaCore-Lite");
  assert.equal(k2.restorePoints.length > 0, true);
});

test("compatibilidad de apps valida drivers/servicios", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("app-reg pro.video 1 x64 virtio-gpu media.service"), /registrado/);
  assert.match(k.executeCommand("app-compat pro.video"), /service:media.service/);
  assert.match(k.executeCommand("startsvc media.service"), /iniciado/);
  assert.match(k.executeCommand("app-compat pro.video"), /OK/);
});

test("app-run ejecuta solo apps compatibles e instaladas", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("app-reg net.panel 1 x64 e1000 net.service");
  assert.match(k.executeCommand("install net.panel"), /instalado/);
  assert.match(k.executeCommand("app-run net.panel"), /ejecutada/);
  k.executeCommand("drv-unload e1000");
  assert.match(k.executeCommand("app-run net.panel"), /incompatible/);
});

test("snapshot conserva appRegistry y kernelVersion", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("app-reg office.pro 2 x64 nvme fs.service");
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.appRegistry.some((a) => a.name === "office.pro"), true);
  assert.equal(k2.kernelVersion, "1.0.0-x64");
});

test("bundle compatible instala dependencias y perfil", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("app-reg dev.studio 1 x64 virtio-gpu gfx.service");
  const out = k.executeCommand("app-installc dev.studio pro");
  assert.match(out, /instalado/);
  assert.equal(k.appProfiles["dev.studio"], "pro");
  assert.equal(k.services.some((s) => s.name === "gfx.service" && s.running), true);
});

test("uninstall elimina app y profile", () => {
  const k = new OnlineKernel();
  k.boot();
  k.executeCommand("app-reg tiny.app 1 x64  net.service");
  k.executeCommand("app-installc tiny.app default");
  assert.match(k.executeCommand("uninstall tiny.app"), /desinstalada/);
  assert.equal(k.apps.includes("tiny.app"), false);
});

test("snapshot conserva appProfiles y compatibleStore", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("app-reg office.neo 1 x64 nvme fs.service");
  k1.executeCommand("app-installc office.neo corp");
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.appProfiles["office.neo"], "corp");
  assert.equal(Array.isArray(k2.compatibleStore), true);
});

test("ios-setup habilita modo ios e instala apps base", () => {
  const k = new OnlineKernel();
  k.boot();
  const out = k.executeCommand("ios-setup");
  assert.match(out, /iOS-like/);
  assert.equal(k.interfaceMode, "ios");
  assert.equal(k.apps.includes("springboard.app"), true);
});

test("ui-mode permite alternar entre amiga e ios", () => {
  const k = new OnlineKernel();
  k.boot();
  assert.match(k.executeCommand("ui-mode ios"), /iOS-like/);
  assert.equal(k.interfaceMode, "ios");
  assert.match(k.executeCommand("ui-mode amiga"), /Amiga/);
  assert.equal(k.interfaceMode, "amiga");
});

test("snapshot conserva interfaceMode y iosCompatibleApps", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.executeCommand("ui-mode ios");
  const snap = k1.saveSnapshot();
  const k2 = new OnlineKernel();
  k2.loadSnapshot(snap);
  assert.equal(k2.interfaceMode, "ios");
  assert.equal(k2.iosCompatibleApps.includes("safari.app"), true);
});
