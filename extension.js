const BaseIndicator = imports.ui.status.power.Indicator;
const ExtensionUtils = imports.misc.extensionUtils;
const Panel = imports.ui.main.panel;
const Shell = imports.gi.Shell;
const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Config = imports.misc.config;


/** Settings
 */

const BAT0_STATUS = "/sys/class/power_supply/BAT0/status";
const BAT1_STATUS = "/sys/class/power_supply/BAT1/status";
const BAT0_POWER_NOW = "/sys/class/power_supply/BAT0/power_now";
const BAT1_POWER_NOW = "/sys/class/power_supply/BAT1/power_now";


/** Indicator
 */

var TPIndicator = GObject.registerClass(
    {
        GTypeName: 'TPIndicator',
    },
    class TPIndicator extends BaseIndicator {
        _init() {
            super._init();

            this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tp_wattmeter');
            this.settings.connect('changed::period-sec', () => { this._spawn(); });  // restart timers on setting change

            this.readings = [];
            this.last_value = 0.0;
            this.tm_measure = null;
        }

        _getBatteryStatus() {
            const pct = this._proxy.Percentage.toFixed(0);
            const power = this.last_value.toFixed(1);
            const status0 = this._read_file(BAT0_STATUS, '???');
            const status1 = this._read_file(BAT1_STATUS, '???');

            let sign = ' ';
            if (status0 == 'Charging') {
                sign = '+';
            } else if (status0 == 'Discharging') {
                sign = '-';
            }
			  else if (status1 == 'Charging') {
                sign = '+';
            }
              else if (status1 == 'Discharging') {
                sign = '-';
            }
            
            
            return _("%s%% %s%sW").format(pct, sign, power);
        }

        _sync() {
            super._sync();
            this._percentageLabel.clutter_text.set_text(this._getBatteryStatus());
            return true;
        }

        _read_file(filePath, defaultValue) {
            try {
                return Shell.get_file_contents_utf8_sync(filePath).trim();
            } catch (e) {
                log(`Cannot read file ${filePath}`, e);
            }
            return defaultValue;
        }

        _measure() {
            const power = parseFloat(this._read_file(BAT0_POWER_NOW) + this._read_file(BAT1_POWER_NOW)) / 1000000;
            this.readings.push(power)

            const avg_of = this.settings.get_int('avg-of');
            if (this.readings.length >= avg_of) {
                this.last_value = this.readings.reduce((acc, elem) => acc + elem, 0.0) / this.readings.length; // simple mean
                this._sync(); // update battery widget now!
                this.readings.length = 0;  // fastest way to clear array?
            } 
            return true;
        }

        _spawn() {
            if (this.tm_measure !== null) {
                GLib.source_remove(this.tm_measure);
            }
            this.tm_measure = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                this.settings.get_double('period-sec') * 1000,
                this._measure.bind(this),
            );
        }

        _stop() {
            GLib.source_remove(this.tm_measure);
            this.tm_measure = null;
        }
    }
);


/** Extension
 */

class TPWattMeter {
    constructor() {
        this.customIndicator = new TPIndicator();
        this.customIndicator._spawn();

        this.aggregateMenu = Panel.statusArea['aggregateMenu'];
        this.originalIndicator = this.aggregateMenu._power;
        this.aggregateMenu._indicators.replace_child(this.originalIndicator, this.customIndicator);
    }

    destroy(arg) {
        this.customIndicator._stop();
        this.aggregateMenu._indicators.replace_child(this.customIndicator, this.originalIndicator);
        this.customIndicator = null;
    }
}


/** Init
 */

let tp_wattmeter;


function enable() {
    tp_wattmeter = new TPWattMeter();
}

function disable() {
    tp_wattmeter.destroy();
    tp_wattmeter = null;
}
