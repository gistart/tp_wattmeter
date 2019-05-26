const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;

const Clutter = imports.gi.Clutter

const VOLTAGE_NOW = "/sys/class/power_supply/BAT0/voltage_now";
const CURRENT_NOW = "/sys/class/power_supply/BAT0/current_now";
const STATUS = "/sys/class/power_supply/BAT0/status";
const WINDOW_SIZE = 100;

let meta;
let wattmeter;
let label;
let interval;

var WattMeter = class WattMeter extends PanelMenu.Button {
    constructor(meta) {
        super();
        this.meta = meta;
    }
    _init() {
        super._init(St.Align.START);
        this.mainBox = null;
        this.buttonText = new St.Label({ text: _("(...)"), y_align: Clutter.ActorAlign.CENTER });
        this.actor.add_actor(this.buttonText);
        this.powerWindows = [];
        this.lastStatus = 'unknown';
    }

    _measure() {
        this.lastStatus = getStatus().trim();
        if (this.lastStatus !== 'Discharging') {
            this.powerWindows = [];
            return true;
        }
        const current = getCurrent();
        const voltage = getVoltage();
        if (current < 0 || voltage < 0) {
            this.powerWindows = [];
            return true;
        }
        const power = current * voltage;
        this.powerWindows.push(power);
        if (this.powerWindows.length >= WINDOW_SIZE) {
            this.powerWindows.shift();
        }
        return true;
    }
    _refresh() {
        let temp = this.buttonText;
        let power_text = '';

        if (this.powerWindows.length < 1) {
            power_text = this.lastStatus != null ? this.lastStatus : 'N/A';
        } else {
            let avg = this.powerWindows.reduce((acc, elem) => acc + elem, 0.0) / this.powerWindows.length;
            power_text = avg.toFixed(2) + ' W'
        }

        temp.set_text(power_text);
        return true;
    }

    _enable() {
        this.measure = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50,
            Lang.bind(this, this._measure));
        this.interval = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000,
            Lang.bind(this, this._refresh));
    }

    _disable() {
        GLib.source_remove(this.interval);
        GLib.source_remove(this.measure);
    }
}
const GObject = imports.gi.GObject;
const Config = imports.misc.config;
let shellMinorVersion = parseInt(Config.PACKAGE_VERSION.split('.')[1]);

if (shellMinorVersion > 30) {
    WattMeter = GObject.registerClass(
        { GTypeName: 'WattMeter' },
        WattMeter
    );
}

function getStatus() {
    return readFileSafely(STATUS, "Unknown");
}

function getVoltage() {
    const voltage = parseFloat(readFileSafely(VOLTAGE_NOW, -1));
    return voltage === -1 ? voltage : voltage / 1000000;
}

function getCurrent() {
    const current = parseFloat(readFileSafely(CURRENT_NOW, -1));
    return current === -1 ? current : current / 1000000;
}

function readFileSafely(filePath, defaultValue) {
    try {
        return Shell.get_file_contents_utf8_sync(filePath);
    } catch (e) {
        log(`Cannot read file ${filePath}`, e);
    }
    return defaultValue;
}
function checkFile(filename) {
    //Checks for the existance of a file
    if (GLib.file_test(filename, GLib.FileTest.EXISTS)) {
        return true;
    }
    else {
        return false;
    }
}

// Shell entry points
function init(metadata) {
    meta = metadata;
}

function enable() {
    wattmeter = new WattMeter(meta);
    wattmeter._enable();
    Main.panel.addToStatusArea('wattmeter', wattmeter);
}

function disable() {
    wattmeter._disable();
    wattmeter.destroy();
    wattmeter = null;
}
