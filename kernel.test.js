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

test("crea proceso y consume memoria", () => {
  const kernel = new OnlineKernel({ memoryTotal: 128, quantum: 2 });
  kernel.boot();
  const msg = kernel.createProcess({ name: "shell.task", cpu: 4, mem: 32, priority: 8 });
  assert.match(msg, /PID=1/);
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

test("snapshot guarda y restaura estado", () => {
  const k1 = new OnlineKernel();
  k1.boot();
  k1.createProcess({ name: "w.task", cpu: 4, mem: 20, priority: 2 });
  k1.createFile("boot.log", "ok");
  const snap = k1.saveSnapshot();

  const k2 = new OnlineKernel();
  const msg = k2.loadSnapshot(snap);
  assert.match(msg, /snapshot cargado/);
  assert.equal(k2.processes.length, 1);
  assert.equal(k2.files.some((f) => f.name === "boot.log"), true);
});

test("shell command parser ejecuta comandos básicos", () => {
  const kernel = new OnlineKernel();
  kernel.boot();
  kernel.createProcess({ name: "x.task", cpu: 3, mem: 16, priority: 3 });
  assert.match(kernel.executeCommand("ps"), /PID/);
  assert.match(kernel.executeCommand("write test.txt hola"), /FS:/);
  assert.match(kernel.executeCommand("ls"), /test.txt/);
});
