'use strict';

const { Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function fillPreferencesWindow(window) {
    // Gnome 42+: GTK5 & libadwaita
    const Adw = imports.gi.Adw;

    const settings = ExtensionUtils.getSettings(SETTINGS_ID);

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    page.add(group);

    // history depth
    const avg_row = new Adw.ActionRow({ title: LBL_AVG });
    group.add(avg_row);

    const avg_spin = makeAvgOfSpin(settings);
    avg_row.add_suffix(avg_spin);
    avg_row.activatable_widget = avg_spin;

    // measure period
    const period_row = new Adw.ActionRow({ title: LBL_PERIOD });
    group.add(period_row);

    const period_spin = makePeriodSpin(settings);
    period_row.add_suffix(period_spin);
    period_row.activatable_widget = period_spin;

    // show lap mode for ThinkPads from T490 era (gen 8 intel cpu) onwwards

    const lap_mode_row = new Adw.ActionRow({ title: LBL_LAP_MODE });
    group.add(lap_mode_row);
    const lap_mode_switch = makeLapModeSwitch(settings);
    lap_mode_row.add_suffix(lap_mode_switch);
    lap_mode_row.activatable_widget = lap_mode_switch;

    // done
    window.add(page);
}


function buildPrefsWidget() {
    // Gnome 41-: GTK4 bare
    const settings = ExtensionUtils.getSettings(SETTINGS_ID);

    // history
    const avg_lbl = new Gtk.Label({label: LBL_AVG});
    const avg_spin = makeAvgOfSpin(settings);
    
    const avg_box = new Gtk.Box(); 
    avg_box.set_spacing(10);
    avg_box.set_orientation(Gtk.Orientation.HORIZONTAL);
    avg_box.prepend(avg_lbl);
    avg_box.append(avg_spin);

    // period
    const period_lbl = new Gtk.Label({label: LBL_PERIOD});
    const period_spin = makePeriodSpin(settings);
    
    const period_box = new Gtk.Box(); 
    period_box.set_spacing(10);
    period_box.set_orientation(Gtk.Orientation.HORIZONTAL);
    period_box.prepend(period_lbl);
    period_box.append(period_spin);

    // main
    const main_box = new Gtk.Box(); 
    main_box.set_spacing(25);
    main_box.set_orientation(Gtk.Orientation.VERTICAL);
    main_box.append(avg_box);
    main_box.append(period_box);

    // done
    return main_box;
}


/** Common
 */

const SETTINGS_ID = 'org.gnome.shell.extensions.tp_wattmeter';
const LBL_AVG = 'Show average of this many measurements';
const LBL_PERIOD = 'Period between measurements in seconds';
const LBL_LAP_MODE = 'Show status of lap mode thermal throttling';


function makeAvgOfSpin(settings) {
    const avg_spin = new Gtk.SpinButton({
        climb_rate: 1,
        digits: 0,
        adjustment: new Gtk.Adjustment({
            value: settings.get_int('avg-of'),
            lower: 1,
            upper: 25,
            step_increment: 1,
        }),
    });
    settings.bind(
        'avg-of',
        avg_spin,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );
    return avg_spin;
}

function makeLapModeSwitch(settings) {
    const lap_mode_switch = new Gtk.Switch({
            active: settings.get_boolean('lap-mode'),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

    settings.bind(
        'lap-mode',
        lap_mode_switch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    return lap_mode_switch;
}


function makePeriodSpin(settings) {
    const period_spin = new Gtk.SpinButton({
        climb_rate: 1,
        digits: 1,
        adjustment: new Gtk.Adjustment({
            value: settings.get_double('period-sec'),
            lower: 0.1,
            upper: 10.0,
            step_increment: 0.5,
        }),
    });
    settings.bind(
        'period-sec',
        period_spin,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );
    return period_spin;
}
