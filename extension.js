const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const Main = imports.ui.main;
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;

const Clutter = imports.gi.Clutter

const POWER_NOW = "/sys/class/power_supply/BAT0/power_now";

let meta;
let tp_wattmeter;
let label;
let interval;

var TPWattMeter = class TPWattMeter extends PanelMenu.Button {
    constructor(meta) {
        super();
        this.meta = meta;
    }
    _init() {
        super._init(St.Align.START);
        this.mainBox = null;
        this.buttonText = new St.Label({
            text: _("?W"),
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'tp_wattmeter_lbl',
        });
        this.actor.add_actor(this.buttonText);
        this.powerWindows = [];
        this.lastStatus = '?W';
    }

    _measure() {
        const power = getPower();
        if (power < 0) {
            this.powerWindows = [];
            return true;
        }
        this.powerWindows.push(power);
        return true;
    }
    _refresh() {
        let temp = this.buttonText;
        let power_text = '';

        if (this.powerWindows.length < 1) {
            power_text = this.lastStatus != null ? this.lastStatus : 'N/A';
        } else {
            let avg = this.powerWindows.reduce((acc, elem) => acc + elem, 0.0) / this.powerWindows.length;
            while (this.powerWindows.length) { this.powerWindows.pop(); };
            this.powerWindows.push(avg);

            power_text = avg.toFixed(2) + 'W';
        }

        temp.set_text(power_text);
        return true;
    }

    _enable() {
        this.measure = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250,
            Lang.bind(this, this._measure));
        this.interval = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000,
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
    TPWattMeter = GObject.registerClass(
        { GTypeName: 'TPWattMeter' },
        TPWattMeter
    );
}

function getPower() {
    const power = parseFloat(readFileSafely(POWER_NOW), -1);
    return power === -1 ? power : power / 1000000;
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
    tp_wattmeter = new TPWattMeter(meta);
    tp_wattmeter._enable();
    Main.panel.addToStatusArea('tp_wattmeter', tp_wattmeter, -1); //, 'right');
}

function disable() {
    tp_wattmeter._disable();
    tp_wattmeter.destroy();
    tp_wattmeter = null;
}
