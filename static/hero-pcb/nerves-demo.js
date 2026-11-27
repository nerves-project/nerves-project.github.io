// The hero's live demo: Nerves running in the page, on the board in the picture.
//
// "Try Me" on the board (pcb-hero.js) opens a panel over the hero's left side and slides the
// board's power switch on. While the firmware downloads the panel shows a progress bar; then a
// terminal opens there, at the IEx prompt of a machine restored from a snapshot. Meanwhile the
// board's plates smack together and it turns top down: its buttons press GPIO lines of the
// machine, its LEDs follow them, its temperature sensor answers on I2C, its power switch cuts
// the power and gives it back, and a card under its storage chip updates the firmware: a delta
// of about 140 KB is fetched, written to the machine's disk and applied by fwup, and the machine
// reboots into the other slot (vm/updates/, see "Firmware updates" in jsnerves' README).
//
// The machine is jsnerves (vm/, copied by tools/pcb-hero/sync_jsnerves.sh): TinyEMU compiled to
// WebAssembly, emulating a RISC-V board that boots a Nerves firmware. It runs in a frame of its
// own (vm/frame.html), because one document can run one machine once: power off removes the
// frame, power on makes a new one. Nothing of it loads until the sign is clicked.
//
// Usage:
//   import { mountNervesDemo } from './nerves-demo.js';
//   mountNervesDemo({ hero, host, copy });
// hero: what mountPcbHero returned; host: the element the panel covers the left of (it gets
// position: relative if it is static); copy: what the panel replaces on narrow screens.
// Options: vmUrl (where vm/ is), autoAttachLog (default true: the log is attached to the console,
// so button presses show).

const VM_URL = new URL('./vm/', import.meta.url);

// what the firmware calls the board's lines (vm/board.js), by the hero's names for its parts
const LEDS = ['power', 'ready', 'slotA', 'slotB'];
const POWER = 'POWER';   // the hero's name for the power switch (DEMO_BOARD)

// The TMP103 on the starter kit: I2C 0x70, register 0 is the temperature in whole degrees
// Celsius, two's complement.
const TMP103_ADDRESS = 0x70;

const HINTS = [
  { label: 'Read the temperature', run: 'with {:ok, bus} <- Circuits.I2C.open("i2c-0"), {:ok, <<t::signed>>} <- Circuits.I2C.write_read(bus, 0x70, <<0>>, 1), do: t' },
  { label: 'Frame rate sensor', run: 'WebDemoNerves.Board.fps()' },
  { label: 'Firmware slots', run: 'Nerves.Runtime.KV.get_all()' },
  { label: 'Reboot', run: 'Nerves.Runtime.reboot()' },
];

function bytes(n) {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}
function seconds(s) {
  return s < 10 ? `${s.toFixed(1)} s` : s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`;
}
// "1.2.10" is newer than "1.2.9"
const newer = (a, b) => a.localeCompare(b, undefined, { numeric: true }) > 0;
const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};

export function mountNervesDemo({ hero, host, copy, vmUrl = VM_URL, autoAttachLog = true } = {}) {
  if (!hero || !host) return null;
  const base = new URL(vmUrl, document.baseURI);
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.classList.add('nerves-demo-host');
  copy?.classList.add('nerves-demo-copy');

  // --- the panel
  const panel = h('section', 'nerves-demo');
  panel.setAttribute('aria-label', 'Live Nerves demo');
  panel.hidden = true;
  const bar = h('div', 'nerves-demo__bar');
  const title = h('span', 'nerves-demo__title', 'Nerves, running in your browser');
  const close = h('button', 'nerves-demo__close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the demo');
  bar.append(title, close);

  const loader = h('div', 'nerves-demo__loader');
  loader.setAttribute('role', 'status');
  const loaderText = h('p', 'nerves-demo__loader-text');
  const track = h('div', 'nerves-demo__track');
  const fill = h('div', 'nerves-demo__fill');
  track.append(fill);
  const loaderDetail = h('p', 'nerves-demo__loader-detail');
  loader.append(loaderText, track, loaderDetail);

  // the machine's frame goes here while it has power
  const screen = h('div', 'nerves-demo__screen');
  screen.hidden = true;
  // and this shows while it has none
  const off = h('p', 'nerves-demo__off', 'No power. Slide the power switch on the board to start it again.');
  off.hidden = true;

  const hints = h('div', 'nerves-demo__hints');
  hints.hidden = true;
  hints.append(h('span', 'nerves-demo__hints-label', 'Try'));
  const foot = h('p', 'nerves-demo__foot');
  // without the 3D board: its lights, buttons and power switch as a strip under the terminal
  const strip = h('div', 'nerves-demo__strip');
  strip.hidden = true;
  // the firmware card: under the storage chip on the board, or in the panel without one
  const store = hero.storageEl || h('div', 'nerves-demo__storage');
  panel.append(bar, loader, screen, off, strip, hints, foot);
  if (!hero.storageEl) panel.insertBefore(store, hints);
  host.append(panel);

  // powered: the switch is on. running: the machine runs (it is past its download).
  const state = { open: false, powered: false, running: false, frame: null, vm: null, board: null, status: '', disk: '' };
  // --- firmware: what runs (fw: {active, a, b, valid}, as the board reports it), the updates
  // on offer (updates: vm/updates/index.json) and what is going on with one (job)
  Object.assign(state, { fw: null, updates: null, job: '' });
  fetch(new URL('updates/index.json', base)).then((r) => (r.ok ? r.json() : null)).then((u) => { state.updates = u; showStore(); }).catch(() => {});
  function showStore() {
    store.replaceChildren();
    const { fw, updates, job } = state;
    if (!updates || !state.powered || !state.running) return;
    const running = fw && fw[fw.active], other = fw && fw[fw.active === 'a' ? 'b' : 'a'];
    store.append(h('span', 'pcb-hero__storage-title', running ? `Firmware v${running}, slot ${fw.active.toUpperCase()}` : 'Firmware'));
    const note = job || (!fw ? 'starting…' : !fw.valid ? 'checking that the new firmware is good…' : '');
    store.append(h('span', 'pcb-hero__storage-note', note));
    if (note || !fw) return;
    const button = (label, primary, act) => {
      const b = h('button', primary ? 'is-primary' : '', label);
      b.type = 'button';
      b.addEventListener('click', act);
      store.append(b);
    };
    for (const d of updates.deltas.filter((q) => q.from === running)) {
      button(`${newer(d.to, running) ? 'Update' : 'Downgrade'} to v${d.to}`, newer(d.to, running), () => update(d));
    }
    if (other) button('Revert to previous', false, revert);
  }
  const job = (text) => { state.job = text; showStore(); };
  // fetch the delta, put it on the machine's disk and have the firmware apply it
  async function update(delta) {
    const { vm, board } = state;
    try {
      job(`downloading ${bytes(delta.size)}…`);
      const res = await fetch(new URL(`updates/${delta.file}`, base));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const file = new Uint8Array(await res.arrayBuffer());
      if (state.vm !== vm) return;
      await board.sendUpdate(file);
      job(`applying v${delta.to} with fwup…`);
      state.pending = `rebooting into v${delta.to}…`;
      run('WebDemoNerves.Update.install()');
    } catch (e) {
      if (state.vm === vm) { job(`could not update: ${e.message}`); setTimeout(() => { if (state.vm === vm) job(''); }, 4000); }
    }
  }
  function revert() {
    job('reverting to the previous firmware…');
    run('WebDemoNerves.Update.revert()');
  }

  const showFoot = () => { foot.textContent = [state.status, state.disk].filter(Boolean).join(' · '); };

  // how much of the hero's own element the panel covers, for the board to keep clear of
  function inset() {
    if (!state.open || !hero.el) return 0;
    const p = panel.getBoundingClientRect(), s = hero.el.getBoundingClientRect();
    // beside the board (wide screens) it covers its left; stacked above it, nothing
    if (p.bottom <= s.top + 1 || p.top >= s.bottom - 1) return 0;
    return Math.max(0, p.right - s.left + 12);
  }
  const place = () => { hero.demoInset = inset(); };
  new ResizeObserver(place).observe(panel);
  addEventListener('resize', () => { place(); size(); });

  function open() {
    if (state.open) return;
    state.open = true;
    panel.hidden = false;
    host.classList.add('is-demo-open');
    // next frame, so the panel's opening transition runs
    requestAnimationFrame(() => { panel.classList.add('is-open'); place(); });
    place();
    hero.setDemo(true);
    // the first time, opening it is switching it on
    if (!state.everOn) power(true);
    else focus();
  }
  function shut() {
    if (!state.open) return;
    state.open = false;
    panel.classList.remove('is-open');
    host.classList.remove('is-demo-open');
    panel.hidden = true;
    hero.demoInset = 0;
    hero.setDemo(false);
  }
  close.addEventListener('click', shut);
  hero.onTry = open;

  // the terminal's room: the frame sizes its console to this when it is made
  function size() {
    const narrow = matchMedia('(max-width: 860px)').matches;
    const room = narrow ? Math.min(innerHeight * 0.4, 300) : Math.min(host.clientHeight - 150, 500);
    screen.style.height = `${Math.max(120, Math.round(room))}px`;
  }
  const focus = () => { if (state.running) { state.frame?.focus(); state.frame?.contentWindow?.focusTerminal?.(); } };

  // Type a command and enter it. The enter follows a moment later: IEx draws a line twice when
  // both arrive at once.
  function run(command) {
    const vm = state.vm;
    if (!vm || !state.running) return;
    vm.write(command);
    setTimeout(() => { if (state.vm === vm) vm.write('\r'); }, 80);
  }

  function showLoader(text, detail) {
    loaderText.textContent = text;
    loaderDetail.textContent = detail;
    fill.style.width = '0';
    panel.classList.remove('is-failed');
    loader.hidden = false;
    screen.classList.add('is-waiting');
    off.hidden = true;
  }
  function reveal() {
    loader.hidden = true;
    screen.classList.remove('is-waiting');
    hints.hidden = false;
    place();
    focus();
  }
  function fail(message) {
    loader.hidden = false;
    loaderText.textContent = 'The demo could not start';
    loaderDetail.textContent = message;
    panel.classList.add('is-failed');
    state.status = `error: ${message}`;
    showFoot();
  }

  // --- power: the board's switch. On makes a machine, off takes it away, as a power cut would.
  function power(on) {
    on = !!on;
    if (on === state.powered) return;
    state.powered = on;
    hero.setSwitch?.(POWER, on);
    stripPower?.(on);
    if (on) powerOn(); else powerOff();
  }
  hero.onButton = (name, pressed) => {
    if (name === POWER) power(pressed);
    else if (state.running) state.board.button(name, pressed);
  };

  function powerOff() {
    state.frame?.remove();
    Object.assign(state, { frame: null, vm: null, board: null, running: false, status: 'powered off', disk: '', fw: null, job: '' });
    showStore();
    for (const led of LEDS) { hero.setLed(led, false); stripLed?.(led, false); }
    screen.hidden = true;
    loader.hidden = true;
    hints.hidden = true;
    off.hidden = false;
    showFoot();
    place();
  }

  function powerOn() {
    const again = state.everOn;
    state.everOn = true;
    showLoader(again ? 'Powering up…' : 'Fetching a Nerves device…', 'loading the emulator');
    screen.hidden = false;
    size();
    state.status = '';
    showFoot();
    const frame = state.frame = h('iframe', 'nerves-demo__frame');
    frame.title = 'Nerves terminal';
    frame.src = new URL('frame.html', base).href;
    frame.addEventListener('load', () => { if (state.frame === frame) wire(frame); });
    frame.addEventListener('error', () => fail('could not load the machine'));
    screen.append(frame);
    place();
  }

  // the machine in its frame is ready to start: connect the board to it, then start it
  function wire(frame) {
    const win = frame.contentWindow;
    const vm = win.nervesVM, board = win.nervesBoard;
    if (!vm || !board) { fail('could not load the machine'); return; }
    Object.assign(state, { vm, board });
    window.nervesVM = vm;          // for the browser console
    window.nervesBoard = board;
    const live = () => state.vm === vm;

    // the temperature sensor by the thermal slot: the slider on the board sets what it reads
    const tmp = new win.NervesVM.I2CRegisters(4);
    const setTemp = (c) => tmp.set(0, Math.round(c) & 0xff);
    setTemp(hero.sensorValue?.() ?? 23);
    hero.onSensor = setTemp;
    vm.attachI2C(TMP103_ADDRESS, tmp);

    // lights
    const led = (name, on) => { hero.setLed(name, on); stripLed?.(name, on); };
    for (const name of LEDS) led(name, !!board.leds[name]);
    board.addEventListener('led', (e) => { if (live()) led(e.detail.led, e.detail.on); });

    // the firmware says what it runs when it starts, and how an update goes
    board.addEventListener('firmware', (e) => { if (live()) { state.fw = e.detail; state.job = ''; showStore(); } });
    board.addEventListener('update', (e) => {
      if (!live()) return;
      if (e.detail.status === 'ok') job(state.pending || 'rebooting…');
      else if (e.detail.status === 'failed') { job('the update failed'); setTimeout(() => { if (live()) job(''); }, 4000); }
    });

    vm.addEventListener('download', (e) => {
      if (!live()) return;
      const p = e.detail;
      fill.style.width = `${p.percent.toFixed(1)}%`;
      let text = `${bytes(p.loaded)} of ${bytes(p.total)}`;
      if (!p.done && p.secondsLeft !== null) text += ` · ${seconds(p.secondsLeft)} left`;
      loaderDetail.textContent = p.done ? `${bytes(p.total)} in ${seconds(p.elapsed)}` : text;
    });
    vm.addEventListener('snapshot', (e) => {
      if (live() && e.detail.phase === 'error') loaderDetail.textContent = 'no snapshot, booting instead';
    });
    vm.addEventListener('stage', (e) => {
      if (!live()) return;
      const s = e.detail;
      if (s.stage === 'downloading' || s.stage === 'loading') return;
      if (s.stage === 'restoring') { loaderText.textContent = 'Waking it up…'; return; }
      if (!state.running) { state.running = true; reveal(); }
      // a machine restored from the snapshot has not said what it runs: it is the disk image's
      // firmware, in slot A. One that reboots says so once it is up.
      if (s.stage === 'ready' && s.restored && state.updates) state.fw = { active: 'a', a: state.updates.base, b: null, valid: true };
      if (s.stage === 'reset') { state.fw = null; if (!state.job) state.job = 'rebooting…'; }
      showStore();
      state.status = s.stage === 'ready'
        ? (s.restored ? 'restored from a snapshot, already booted' : `booted in ${seconds(s.sinceBoot / 1000)}`)
        : s.stage === 'reset' ? 'rebooting' : s.stage === 'off' ? 'it powered itself off' : `booting: ${s.label}`;
      showFoot();
      // with the log on the console a button press shows as soon as it happens
      if (s.stage === 'ready' && autoAttachLog) setTimeout(() => { if (live()) run('RingLogger.attach()'); }, 150);
    });
    vm.addEventListener('disk', (e) => {
      if (!live()) return;
      state.disk = e.detail.status === 'on' ? 'what it writes to disk stays in this browser' : '';
      showFoot();
    });
    // the firmware powered the machine off (Nerves.Runtime.poweroff()): the switch is still on,
    // and switching it off and on starts it again
    vm.addEventListener('error', (e) => { if (live()) fail(e.detail.message); });

    Promise.resolve().then(() => win.powerOn()).catch((e) => { if (live()) fail(e.message || String(e)); });
  }

  for (const hint of HINTS) {
    const b = h('button', 'nerves-demo__hint', hint.label);
    b.type = 'button';
    b.title = hint.run;
    b.addEventListener('click', () => { run(hint.run); focus(); });
    hints.append(b);
  }

  // The board without WebGPU: LEDs, buttons and the power switch in a row.
  let stripLed = null, stripPower = null;
  if (hero.fallback) {
    strip.hidden = false;
    const names = { power: 'PWR', ready: 'RDY', slotA: 'A', slotB: 'B' };
    const dots = {};
    for (const led of LEDS) {
      dots[led] = h('span', `nerves-demo__led is-${led}`, names[led]);
      strip.append(dots[led]);
    }
    stripLed = (led, on) => dots[led]?.classList.toggle('is-on', !!on);
    for (const b of hero.demo?.buttons || []) {
      const el = h('button', 'nerves-demo__key', b.name === POWER ? 'Power' : b.label);
      el.type = 'button';
      if (b.name === POWER) {
        el.classList.add('is-switch');
        el.setAttribute('aria-pressed', 'false');
        el.addEventListener('click', () => power(!state.powered));
        stripPower = (on) => { el.classList.toggle('is-down', on); el.setAttribute('aria-pressed', String(on)); };
      } else {
        el.setAttribute('aria-label', `Button ${b.label}`);
        const set = (down) => (e) => { e.preventDefault(); if (state.running) state.board.button(b.name, down); el.classList.toggle('is-down', down); };
        el.addEventListener('pointerdown', set(true));
        for (const t of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(t, set(false));
      }
      strip.append(el);
    }
  }

  return { open, close: shut, power, panel, get vm() { return state.vm; }, get board() { return state.board; } };
}
