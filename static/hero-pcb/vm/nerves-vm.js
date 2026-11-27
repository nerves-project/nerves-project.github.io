/*
 * nerves-vm.js: run the Nerves machine (TinyEMU compiled to WebAssembly)
 * in a page and report what it does as DOM events.
 *
 *   const vm = new NervesVM({ config: "nerves.cfg" });
 *   vm.addEventListener("console", (e) => term.write(e.detail.data));
 *   vm.addEventListener("progress", (e) => show(e.detail.percent));
 *   vm.start();
 *
 * Events (all CustomEvents, the payload is in event.detail):
 *
 *   console   {data}            raw console output, escape sequences and
 *                               all, for a terminal
 *   line      {text, time}      one console line without escape sequences;
 *                               the last lines are kept in vm.log
 *   stage     {stage, label, previous, time, sinceBoot, slot, restored}
 *                               boot progress: loading, opensbi, uboot,
 *                               linux, init, erlang, ready; reset when the
 *                               guest reboots, off when it powers off.
 *                               downloading while the machine waits for the
 *                               disk image (and snapshot). With a snapshot:
 *                               ready with restored: true when it runs
 *   snapshot  {phase, url, loaded, total, percent, bytesPerSecond,
 *              secondsLeft, elapsed, message}
 *                               restoring a saved machine instead of
 *                               booting (when the disk image has one and
 *                               no disk changes are saved in this browser):
 *                               phase start, progress, restored, or skipped
 *                               / error (message), after which it boots
 *   download  {loaded, total, percent, bytesPerSecond, secondsLeft,
 *              elapsed, done}   everything the machine downloads: the disk
 *                               image and the snapshot, if one is restored.
 *                               By default the machine starts when it is
 *                               done (options.waitForDisk)
 *   progress  {loaded, total, percent, bytesPerSecond, secondsLeft,
 *              blocksLoaded, blocksTotal, elapsed, done}
 *                               download of the disk image: every block
 *                               that is not all zeros, whether the guest
 *                               asked for it or it was prefetched
 *   disk      {status, savedBytes, restoredBytes}
 *                               disk persistence in IndexedDB ("on",
 *                               "off" or "error")
 *   reset     {}                the guest rebooted; the machine starts over
 *   poweroff  {status}          the guest powered off; the machine stopped
 *   power     {on}              the machine has power: on once it runs
 *                               (a reboot keeps it), off when it powers off
 *   gpio      {line, name, direction, value, input, on}
 *                               a GPIO line changed (see "Hardware" below);
 *                               every line once when the machine is created
 *   error     {message}         something went wrong loading the machine
 *
 * The emulator keeps its state in globals (Module), so there can be one
 * NervesVM per page.
 *
 * vm.saveSnapshot() saves the running machine (for a snapshot to serve
 * next to the disk image; see make_snapshot in the README).
 *
 * Hardware: the VM config can give the machine a GPIO controller
 * (gpio0: { lines: [names] }) and an I2C adapter (i2c0: {}), which Linux
 * sees as /dev/gpiochip0 and /dev/i2c-0. Their other side is the page:
 *
 *   vm.gpio                     [{line, name, direction, value, input, on}]
 *                               direction "none" (not in use), "out" or
 *                               "in"; value is what the guest drives, input
 *                               the level the page drives; on: an output
 *                               driven high (a lit LED)
 *   vm.setInput(name, level)    drive an input (a button: 1 while pressed)
 *   vm.press(name, ms)          press and release it; resolves when released
 *   vm.attachI2C(address, dev)  a device at a 7-bit address: dev.write(bytes)
 *                               gets each write (a Uint8Array) and
 *                               dev.read(length) answers each read (bytes);
 *                               see NervesVM.I2CRegisters. Nothing attached:
 *                               no acknowledge
 *   vm.detachI2C(address)
 *
 * Disk: vm.diskBytes is its size, and vm.writeDisk(offset, bytes) writes
 * to it from the page (a file for the guest, see board.js).
 */
"use strict";

(function(global) {

const DISK_DB = "tinyemu-disk"; /* see js/lib.js in tinyemu */

const STAGES = [
    { stage: "opensbi", label: "OpenSBI", match: /^OpenSBI v\d/ },
    { stage: "uboot", label: "U-Boot", match: /^U-Boot \d{4}\.\d+/ },
    { stage: "linux", label: "Linux", match: /^Starting kernel|Linux version \d/ },
    { stage: "init", label: "erlinit", match: /Run \/sbin\/init as init process/ },
    { stage: "erlang", label: "Erlang", match: /^Erlang\/OTP \d+/ },
    { stage: "ready", label: "IEx", match: /^iex\(\d+\)> ?$/, prompt: true },
];
const LABELS = { idle: "Not started", loading: "Loading the emulator",
                 downloading: "Downloading",
                 restoring: "Restoring a snapshot",
                 reset: "Rebooting", off: "Powered off" };
STAGES.forEach(function(s) { LABELS[s.stage] = s.label; });

/* CSI, OSC and the other escape sequences a console prints */
const ESCAPES = /\x1b(?:\[[0-?]*[ -\/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[()#][0-9A-Za-z]|[0-9=<>@-Z\\^_`a-z~])/g;
const CONTROLS = /[\x00-\x08\x0b-\x1f\x7f]/g;

function plain(str)
{
    return str.replace(ESCAPES, "").replace(CONTROLS, "");
}

const SPEED_WINDOW_MS = 3000;   /* download speed over the last 3 s */
const PROGRESS_EVERY_MS = 100;  /* at most 10 progress events a second */
const TRANSCRIPT_MAX = 1 << 20; /* console output kept for a snapshot */

class NervesVM extends EventTarget {
    constructor(options) {
        super();
        this.options = Object.assign({
            config: "nerves.cfg",          /* VM configuration file */
            emulator: "riscvemu64-wasm.js", /* emscripten output */
            memory: 128,                   /* MB */
            cols: 80,
            rows: 30,
            cmdline: "",
            resetDisk: false,              /* drop the persisted disk first */
            logLines: 2000,                /* lines kept in vm.log */
            network: null,                 /* see attachNetwork() */
            snapshot: true,                /* restore one if there is one */
            waitForDisk: true,             /* run once the disk is local */
        }, options || {});
        this.stage = "idle";
        this.slot = null;       /* firmware slot U-Boot booted */
        this.log = [];          /* [{time, text}] */
        this.progress = null;   /* last progress payload */
        this.download = null;   /* last download payload */
        this.disk = { status: "off", savedBytes: 0, restoredBytes: 0 };
        this._line = "";
        this._stageIndex = -1;
        this._t0 = 0;
        this._bootT0 = 0;
        this._image = null;
        this._queueChar = null;
        this._netWrite = null;
        this._netCarrier = null;
        this._network = null;
        this._transcript = "";  /* console output, see transcript */
        this._replaying = false;
        this._snap = null;
        this._restoredExtra = null;
        this._waitingDisk = false;
        this._dl = { samples: [], start: 0, lastEmit: 0, timer: null, finished: false };
        this.gpio = [];
        this.powered = false;
        this._inputs = {};      /* name -> level the page drives */
        this._running = false;  /* the machine runs (inputs reach it) */
        this._i2c = new Map();  /* address -> device */
        this._gpioSet = null;
    }

    /* Load the emulator and boot. Resolves once the machine is running. */
    async start() {
        if (NervesVM._instance)
            throw new Error("NervesVM: only one machine per page");
        NervesVM._instance = this;
        this._t0 = this._bootT0 = performance.now();
        this._setStage("loading");

        if (this.options.resetDisk)
            await NervesVM.resetDisk();

        const vm = this;
        const ready = new Promise(function(resolve) {
            global.Module = {
                onRuntimeInitialized: function() {
                    vm._boot();
                    resolve();
                },
                onConsoleOutput: function(str) { vm._consoleOutput(str); },
                getConsoleSize: function() {
                    return [vm.options.cols, vm.options.rows];
                },
                onFetch: function(ev) { vm._fetch(ev); },
                onDiskInfo: function(info) { vm._diskInfo(info); },
                onDiskPersist: function(info) { vm._diskPersist(info); },
                onNetPacket: function(bytes) {
                    if (vm._network)
                        vm._network.receive(bytes);
                },
                onReset: function() { vm._reset(); },
                onPowerOff: function(status) { vm._powerOff(status); },
                snapshot: vm.options.snapshot !== false,
                onSnapshot: function(info) { vm._snapshot(info); },
                waitForDisk: vm.options.waitForDisk !== false,
                onWaiting: function(info) { vm._waiting(info); },
                onRun: function(info) { vm._run(info); },
                onGpio: function(info) { vm._gpioChanged(info); },
                onI2C: function(address, isRead, data) {
                    return vm._i2cTransfer(address, isRead, data);
                },
                printErr: function(text) {
                    console.error("[emulator] " + text);
                },
            };
        });
        try {
            await loadScript(new URL(this.options.emulator, document.baseURI).href);
        } catch (e) {
            this._emit("error", { message: "could not load " + this.options.emulator });
            throw e;
        }
        await ready;
    }

    /* the console output so far (the last MB of it) */
    get transcript() {
        return this._transcript;
    }

    /* Type into the console (a string of byte values, as a terminal sends) */
    write(str) {
        if (!this._queueChar)
            return;
        for (let i = 0; i < str.length; i++)
            this._queueChar(str.charCodeAt(i) & 0xff);
    }

    /* Save the running machine: resolves to the snapshot file
       (uncompressed; serve it gzip-compressed and name it in blk.txt as
       "snapshot"). It holds the console output so far (or
       options.console), which a restore shows again. Waits for the disk
       to be idle. */
    async saveSnapshot(options) {
        const M = global.Module;
        const opts = options || {};
        const extra = new TextEncoder().encode(JSON.stringify({
            version: 1,
            console: typeof opts.console == "string" ? opts.console : this._transcript,
            slot: this.slot,
            saved: new Date().toISOString(),
        }));
        for (let attempt = 0; attempt < 50; attempt++) {
            const result = await new Promise(function(resolve) {
                M.snapshotExtra = extra;
                M.onSnapshotSaved = function(bytes, info) {
                    resolve(bytes ? { bytes: bytes, info: info } : null);
                };
                M.ccall("vm_snapshot_save", null, [], []);
            });
            if (result)
                return result.bytes;
            await new Promise(function(r) { setTimeout(r, 100); });
        }
        throw new Error("NervesVM: the machine stayed busy, no snapshot");
    }

    /* Throw away the disk writes saved in this browser. Use before start(),
       or reload the page afterwards. */
    static resetDisk() {
        return new Promise(function(resolve) {
            let req;
            if (typeof indexedDB == "undefined")
                return resolve();
            try {
                req = indexedDB.deleteDatabase(DISK_DB);
            } catch (e) {
                return resolve();
            }
            req.onsuccess = req.onerror = req.onblocked = function() { resolve(); };
        });
    }

    /* GPIO line by name (see "Hardware" above), or undefined */
    getLine(name) {
        return this.gpio.find(function(l) { return l.name === name; });
    }

    /* Drive an input line from outside: 1 (a pressed button) or 0. Before
       the machine runs (while it downloads or restores a snapshot) the
       level waits and is applied when it starts. */
    setInput(name, level) {
        level = level ? 1 : 0;
        this._inputs[name] = level;
        if (this._running)
            this._applyInput(name);
    }

    _applyInput(name) {
        const l = this.getLine(name);
        if (l && this._gpioSet && l.input !== this._inputs[name])
            this._gpioSet(l.line, this._inputs[name]);
    }

    /* Press a button for ms milliseconds */
    press(name, ms) {
        const vm = this;
        this.setInput(name, 1);
        return new Promise(function(resolve) {
            setTimeout(function() {
                vm.setInput(name, 0);
                resolve();
            }, ms === undefined ? 150 : ms);
        });
    }

    attachI2C(address, device) {
        this._i2c.set(address, device);
    }

    detachI2C(address) {
        this._i2c.delete(address);
    }

    /* Write bytes (a Uint8Array) to the disk at a byte offset that is a
       multiple of 512, as the guest would: the write is kept with the
       guest's own (see Persistence in the README). For handing the guest a
       file, in a part of the disk that it does not use otherwise and that
       is all zeros in the image (see board.sendUpdate). The guest has to
       read it past its cache (drop_caches). Resolves when it is written. */
    async writeDisk(offset, bytes) {
        const CHUNK = 16 * 512;
        let done = 0, n, chunk, r, tries;
        if (!this._diskWrite)
            throw new Error("NervesVM: the machine is not running");
        if (offset % 512 !== 0)
            throw new Error("NervesVM: the offset has to be a multiple of 512");
        while (done < bytes.length) {
            n = Math.min(CHUNK, bytes.length - done);
            chunk = bytes.subarray(done, done + n);
            if (n % 512 !== 0) {    /* the last sector, padded with zeros */
                chunk = new Uint8Array(Math.ceil(n / 512) * 512);
                chunk.set(bytes.subarray(done, done + n));
            }
            for (tries = 0; ; tries++) {
                r = this._diskWrite((offset + done) / 512, chunk, chunk.length / 512);
                if (r !== -1 || tries > 500)
                    break;
                /* the guest waits for a block: after it */
                await new Promise(function(resolve) { setTimeout(resolve, 10); });
            }
            if (r !== 0)
                throw new Error("NervesVM: could not write to the disk at " +
                                (offset + done) + " (" + r + ")");
            done += n;
        }
    }

    /* A network adapter (see net/nerves-net.js) is an object with
       receive(frame), which gets every Ethernet frame the guest sends, and
       optionally attach(vm), called once the machine exists. It gives
       frames to the guest with vm.sendPacket(frame) and sets the link state
       with vm.setCarrier(up). Pass it as options.network so the guest sees
       a network interface. */
    sendPacket(frame) {
        if (this._netWrite)
            this._netWrite(frame, frame.length);
    }

    setCarrier(up) {
        if (this._netCarrier)
            this._netCarrier(up ? 1 : 0);
    }

    /* internals */

    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail: detail }));
    }

    _now() {
        return performance.now() - this._t0;
    }

    _boot() {
        const M = global.Module;
        const url = new URL(this.options.config, document.baseURI).href;
        const net = this.options.network;
        this._queueChar = M.cwrap("console_queue_char", null, ["number"]);
        this._netWrite = M.cwrap("net_write_packet", null, ["array", "number"]);
        this._netCarrier = M.cwrap("net_set_carrier", null, ["number"]);
        this._gpioSet = M.cwrap("gpio_set_input", null, ["number", "number"]);
        this._diskWrite = M.cwrap("disk_write", "number", ["number", "array", "number"]);
        M.ccall("vm_start", null,
                ["string", "number", "string", "string", "number", "number", "number"],
                [url, this.options.memory, this.options.cmdline, null, 0, 0, net ? 1 : 0]);
        if (net) {
            this._network = net;
            if (net.attach)
                net.attach(this);
        }
    }

    _setStage(stage, extra) {
        const previous = this.stage;
        const now = this._now();
        this.stage = stage;
        this._emit("stage", Object.assign({
            stage: stage,
            label: LABELS[stage] || stage,
            previous: previous,
            time: now,
            sinceBoot: performance.now() - this._bootT0,
            slot: this.slot,
        }, extra || {}));
    }

    _consoleOutput(str) {
        let nl, line;
        this._transcript += str;
        if (this._transcript.length > TRANSCRIPT_MAX)
            this._transcript = this._transcript.substring(this._transcript.length - TRANSCRIPT_MAX / 2);
        this._emit("console", { data: str, replayed: this._replaying });
        this._line += str;
        while ((nl = this._line.indexOf("\n")) >= 0) {
            line = plain(this._line.substring(0, nl));
            this._line = this._line.substring(nl + 1);
            this._addLine(line);
        }
        /* a prompt does not end with a newline */
        if (this._line.length > 0 && this._line.length < 256)
            this._matchStage(plain(this._line), true);
    }

    _addLine(text) {
        const entry = { time: this._now(), text: text };
        this.log.push(entry);
        if (this.log.length > this.options.logLines)
            this.log.splice(0, this.log.length - this.options.logLines);
        this._emit("line", entry);
        const m = /^Booting Nerves slot (\w+)/.exec(text);
        if (m)
            this.slot = m[1];
        this._matchStage(text, false);
    }

    _matchStage(text, partial) {
        if (this._replaying)
            return;
        for (let i = this._stageIndex + 1; i < STAGES.length; i++) {
            const s = STAGES[i];
            if (partial && !s.prompt)
                continue;
            if (s.match.test(text)) {
                this._stageIndex = i;
                this._setStage(s.stage);
                return;
            }
        }
    }

    _reset() {
        this._stageIndex = -1;
        this._bootT0 = performance.now();
        this.slot = null;
        this._emit("reset", {});
        this._setStage("reset");
    }

    _powerOff(status) {
        this._emit("poweroff", { status: status });
        this._setStage("off");
        this._running = false;
        this._setPower(false);
    }

    _setPower(on) {
        if (this.powered === on)
            return;
        this.powered = on;
        this._emit("power", { on: on });
    }

    /* a line changed, or is announced (see gpio_line_changed in lib.js) */
    _gpioChanged(info) {
        const l = Object.assign({}, info, {
            on: info.direction === "out" && info.value === 1,
        });
        /* no calls into the emulator from here: this runs inside it, during
           a reset or a snapshot restore */
        this.gpio[l.line] = l;
        this._emit("gpio", l);
    }

    /* one I2C message: true if a device answered (data is filled for a
       read) */
    _i2cTransfer(address, isRead, data) {
        const dev = this._i2c.get(address);
        let bytes;
        if (!dev)
            return false;
        if (!isRead) {
            if (dev.write)
                dev.write(data);
            return true;
        }
        bytes = dev.read ? dev.read(data.length) : null;
        if (bytes)
            data.set(Array.from(bytes).slice(0, data.length));
        return true;
    }

    /* snapshot restore (see snapshot_fetch in tinyemu's js/lib.js) */
    _snapshot(info) {
        const now = performance.now();
        const snap = this._snap;
        let d, extra, rate = null, s0;

        switch (info.phase) {
        case "start":
            this._snap = { start: now, samples: [], loaded: 0, total: info.total || 0, done: false };
            if (!this._waitingDisk)
                this._setStage("restoring");
            this._emit("snapshot", { phase: "start", url: info.url });
            this._updateDownload(true);
            return;
        case "progress":
            if (!snap)
                return;
            /* a server that sends it with Content-Encoding: gzip gives the
               compressed size, and the browser the decoded bytes */
            if (info.total && info.loaded > info.total)
                info.total = 0;
            snap.loaded = info.loaded;
            snap.total = info.total;
            this._updateDownload(false);
            snap.samples.push([now, info.loaded]);
            while (snap.samples.length > 2 && now - snap.samples[1][0] >= SPEED_WINDOW_MS)
                snap.samples.shift();
            s0 = snap.samples[0];
            if (now - s0[0] >= 200)
                rate = (info.loaded - s0[1]) * 1000 / (now - s0[0]);
            this._emit("snapshot", {
                phase: "progress", url: info.url,
                loaded: info.loaded, total: info.total,
                percent: info.total ? 100 * info.loaded / info.total : null,
                bytesPerSecond: rate,
                secondsLeft: rate && info.total ? (info.total - info.loaded) / rate : null,
                elapsed: (now - snap.start) / 1000,
            });
            return;
        case "restored":
            d = (now - (snap ? snap.start : now)) / 1000;
            try {
                extra = JSON.parse(new TextDecoder().decode(info.extra));
            } catch (e) {
                extra = {};
            }
            /* shown when the machine runs (_run) */
            this._restoredExtra = extra;
            if (snap) {
                snap.loaded = info.loaded;
                snap.total = info.total && info.total >= info.loaded ? info.total : info.loaded;
                snap.done = true;
                this._updateDownload(true);
            }
            this._emit("snapshot", {
                phase: "restored", url: info.url,
                loaded: info.loaded,
                total: info.total && info.total >= info.loaded ? info.total : info.loaded,
                percent: 100, elapsed: d,
                bytesPerSecond: d > 0 ? info.loaded / d : null,
                secondsLeft: 0,
            });
            return;
        default: /* skipped, error: the machine boots */
            this._snap = null;
            this._updateDownload(true);
            this._emit("snapshot", { phase: info.phase, url: info.url,
                                     message: info.message });
            return;
        }
    }

    /* what the machine waits for before it runs */
    _waiting(info) {
        this._waitingDisk = info.disk;
        if (info.disk)
            this._setStage("downloading");
    }

    /* the machine starts */
    _run(info) {
        const extra = this._restoredExtra;
        this._waitingDisk = false;
        this._running = true;
        this._setPower(true);
        /* the levels the page drives, over what a snapshot restored */
        for (const name in this._inputs)
            this._applyInput(name);
        if (!info.restored || !extra)
            return;
        this._restoredExtra = null;
        /* show what the console showed when the snapshot was taken */
        if (extra.slot)
            this.slot = extra.slot;
        if (extra.console) {
            this._replaying = true;
            try {
                this._consoleOutput(extra.console);
            } finally {
                this._replaying = false;
            }
        }
        this._stageIndex = STAGES.length - 1;
        this._setStage("ready", { restored: true });
    }

    /* everything downloaded: the disk image, and the snapshot if one is
       restored */
    _updateDownload(force) {
        const dl = this._dl;
        const img = this.progress;
        const snap = this._snap;
        const now = performance.now();
        let loaded = 0, total = 0, rate = null, s0, done, p;

        if (dl.finished)
            return;
        if (!dl.start)
            dl.start = now;
        if (img) {
            loaded += img.loaded;
            total += img.total;
        }
        if (snap) {
            loaded += snap.loaded;
            total += Math.max(snap.total, snap.loaded);
        }
        done = !!(img && img.done) && (!snap || snap.done);
        dl.samples.push([now, loaded]);
        while (dl.samples.length > 2 && now - dl.samples[1][0] >= SPEED_WINDOW_MS)
            dl.samples.shift();
        s0 = dl.samples[0];
        if (now - s0[0] >= 200)
            rate = (loaded - s0[1]) * 1000 / (now - s0[0]);
        p = {
            loaded: loaded,
            total: total,
            percent: total > 0 ? Math.min(100, 100 * loaded / total) : 0,
            bytesPerSecond: rate,
            secondsLeft: rate && rate > 0 ? (total - loaded) / rate : null,
            elapsed: (now - dl.start) / 1000,
            done: done,
        };
        if (done) {
            dl.finished = true;
            p.percent = 100;
            p.secondsLeft = 0;
            p.bytesPerSecond = loaded * 1000 / Math.max(1, now - dl.start);
        }
        this.download = p;
        if (dl.timer !== null) {
            clearTimeout(dl.timer);
            dl.timer = null;
        }
        if (force || done || now - dl.lastEmit >= PROGRESS_EVERY_MS) {
            dl.lastEmit = now;
            this._emit("download", p);
        } else {
            const vm = this;
            dl.timer = setTimeout(function() {
                dl.timer = null;
                dl.lastEmit = performance.now();
                vm._emit("download", vm.download);
            }, PROGRESS_EVERY_MS - (now - dl.lastEmit));
        }
    }

    _diskPersist(info) {
        this.disk = { status: info.status, savedBytes: info.saved_bytes,
                      restoredBytes: info.restored_bytes };
        this._emit("disk", this.disk);
    }

    /* disk image download */

    _diskInfo(info) {
        /* the disk's size in bytes */
        this.diskBytes = info.blockBytes * info.blocks;
        this._image = {
            prefix: info.url,
            blockBytes: info.blockBytes,
            blocksTotal: info.blocks - info.zeroBlocks,
            done: new Set(),
            doneBytes: 0,
            inFlight: new Map(),   /* request id -> {block, loaded} */
            samples: [],
            start: performance.now(),
            timer: null,
            lastEmit: 0,
            finished: false,
        };
        this._updateProgress(true);
    }

    _fetch(ev) {
        const img = this._image;
        let m, r;
        if (!img || ev.url.indexOf(img.prefix) != 0)
            return;
        m = /blk(\d+)\.bin$/.exec(ev.url);
        if (!m)
            return;
        switch (ev.phase) {
        case "start":
            img.inFlight.set(ev.id, { block: m[1] | 0, loaded: 0 });
            return;
        case "progress":
            r = img.inFlight.get(ev.id);
            if (r)
                r.loaded = ev.loaded;
            break;
        case "done":
        case "error":
            r = img.inFlight.get(ev.id);
            img.inFlight.delete(ev.id);
            /* a 404 is a block of zeros that blk.txt did not list: it is
               part of the image all the same */
            if (r && !img.done.has(r.block) &&
                (ev.phase == "done" || ev.status == 404)) {
                img.done.add(r.block);
                img.doneBytes += img.blockBytes;
            } else if (ev.phase == "error") {
                this._emit("error", { message: "could not load " + ev.url +
                                      " (HTTP " + ev.status + ")" });
            }
            break;
        }
        this._updateProgress(false);
    }

    _updateProgress(force) {
        const img = this._image;
        const now = performance.now();
        let loaded = img.doneBytes, total, rate = null, left = null, s0, p;

        img.inFlight.forEach(function(r) {
            if (!img.done.has(r.block))
                loaded += Math.min(r.loaded, img.blockBytes);
        });
        total = img.blocksTotal * img.blockBytes;
        loaded = Math.min(loaded, total);

        img.samples.push([now, loaded]);
        while (img.samples.length > 2 && now - img.samples[1][0] >= SPEED_WINDOW_MS)
            img.samples.shift();
        s0 = img.samples[0];
        if (now - s0[0] >= 200)
            rate = (loaded - s0[1]) * 1000 / (now - s0[0]);
        if (rate && rate > 0)
            left = (total - loaded) / rate;

        p = {
            loaded: loaded,
            total: total,
            percent: total > 0 ? 100 * loaded / total : 100,
            bytesPerSecond: rate,
            secondsLeft: left,
            blocksLoaded: img.done.size,
            blocksTotal: img.blocksTotal,
            elapsed: (now - img.start) / 1000,
            done: img.done.size >= img.blocksTotal,
        };
        if (img.finished)
            return;
        this.progress = p;
        if (p.done) {
            img.finished = true;
            p.secondsLeft = 0;
            p.bytesPerSecond = loaded * 1000 / Math.max(1, now - img.start);
        }
        if (img.timer !== null) {
            clearTimeout(img.timer);
            img.timer = null;
        }
        this._updateDownload(force || p.done);
        if (force || p.done || now - img.lastEmit >= PROGRESS_EVERY_MS) {
            img.lastEmit = now;
            this._emit("progress", p);
        } else {
            /* deliver the latest numbers even if nothing else arrives */
            const vm = this;
            img.timer = setTimeout(function() {
                img.timer = null;
                img.lastEmit = performance.now();
                vm._emit("progress", vm.progress);
            }, PROGRESS_EVERY_MS - (now - img.lastEmit));
        }
    }
}

function loadScript(src)
{
    return new Promise(function(resolve, reject) {
        const script = document.createElement("script");
        script.src = src;
        script.onload = function() { resolve(); };
        script.onerror = function() { reject(new Error("could not load " + src)); };
        document.head.appendChild(script);
    });
}

/* An I2C device with byte registers, as most sensors are: a write sets
   the register pointer (its first byte) and writes the rest from there, a
   read reads from the pointer; both move it on. refresh() runs before
   each read, for live values. */
class I2CRegisters {
    constructor(size) {
        this.registers = new Uint8Array(size || 256);
        this.pointer = 0;
    }

    refresh() {
    }

    /* set registers from reg on: bytes, or a big-endian number of size
       bytes */
    set(reg, value, size) {
        let bytes = value, i;
        if (typeof value == "number") {
            bytes = [];
            for (i = (size || 1) - 1; i >= 0; i--)
                bytes.push((value / Math.pow(256, i)) & 0xff);
        }
        for (i = 0; i < bytes.length; i++)
            this.registers[(reg + i) % this.registers.length] = bytes[i];
    }

    write(bytes) {
        if (bytes.length === 0)
            return;
        this.pointer = bytes[0] % this.registers.length;
        for (let i = 1; i < bytes.length; i++) {
            this.registers[this.pointer] = bytes[i];
            this.pointer = (this.pointer + 1) % this.registers.length;
        }
    }

    read(length) {
        const out = new Uint8Array(length);
        this.refresh();
        for (let i = 0; i < length; i++) {
            out[i] = this.registers[this.pointer];
            this.pointer = (this.pointer + 1) % this.registers.length;
        }
        return out;
    }
}

NervesVM.I2CRegisters = I2CRegisters;
NervesVM.STAGES = ["loading"].concat(STAGES.map(function(s) { return s.stage; }));
NervesVM.plain = plain;
global.NervesVM = NervesVM;

})(window);
