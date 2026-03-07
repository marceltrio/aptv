const test = require("node:test");
const assert = require("node:assert/strict");
const { OnlineKernel } = require("./kernel.js");

test("no permite crear procesos antes de boot", () => {
  const kernel = new OnlineKernel();
  assert.match(kernel.createProcess(), /inicia Workbench primero/);
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

  for (let i = 0; i < 5; i += 1) {
    kernel.tick();
  }

  const hasBlocked = kernel.processes.some((p) => p.state === "BLOCKED");
  assert.equal(hasBlocked, false);
});
