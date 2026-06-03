// @name: 菜单项过滤 - Menu Filter
// @description: 通过配置文件过滤右键菜单项，支持完全匹配和正则表达式 / Filter context menu items by name using exact match or regex
// @version: 0.1.1
// @author: LKY-Lockee

import * as shell from "mshell";

const CONFIG_FILE = "menu-filter.json";
const PLUGIN_NAME = "菜单项过滤 - Menu Filter";

// ---- Default config ----
const default_config = {
    rules: [
        // Example rules - customize in menu-filter.json:
        // { pattern: "Scan with Windows Defender", matchType: "exact", enabled: true },
        // { pattern: "^Edit with ", matchType: "regex", enabled: true },
    ],
};

let config = {};
const read_config = () => {
    const config_dir = shell.breeze.data_directory() + "/config/";
    shell.fs.mkdir(config_dir);
    if (shell.fs.exists(config_dir + CONFIG_FILE)) {
        try {
            config = JSON.parse(shell.fs.read(config_dir + CONFIG_FILE));
        } catch (e) {
            shell.println(
                "[" + PLUGIN_NAME + "] 配置文件解析失败",
                e,
                "\n",
                e.stack,
            );
        }
    }
};

const write_config = () => {
    const config_dir = shell.breeze.data_directory() + "/config/";
    shell.fs.mkdir(config_dir);
    shell.fs.write(config_dir + CONFIG_FILE, JSON.stringify(config, null, 4));
};

read_config();

// Ensure config has rules array
if (!config.rules || !Array.isArray(config.rules)) {
    config.rules = [];
    write_config();
}

// ---- Config template (for plugin menu) ----
const ICON_CHECKED = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"><path fill="currentColor" d="M9.765 3.205a.75.75 0 0 1 .03 1.06l-4.25 4.5a.75.75 0 0 1-1.075.015L2.22 6.53a.75.75 0 0 1 1.06-1.06l1.705 1.704l3.72-3.939a.75.75 0 0 1 1.06-.03"/></svg>`;
const ICON_EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"></svg>`;

// Plugin config menu
on_plugin_menu[PLUGIN_NAME] = (menu) => {
    let enabledAll =
        config.rules.length > 0 &&
        config.rules.every((r) => r.enabled !== false);
    const toggleAllItem = menu.append_menu({
        name: "启用全部规则 / Enable All",
        icon_svg: enabledAll ? ICON_CHECKED : ICON_EMPTY,
        action() {
            const newVal = !(
                config.rules.length > 0 &&
                config.rules.every((r) => r.enabled !== false)
            );
            config.rules.forEach((r) => {
                r.enabled = newVal;
            });
            write_config();
            toggleAllItem.set_data({
                icon_svg: newVal ? ICON_CHECKED : ICON_EMPTY,
            });
            // Refresh later menu items
            shell.println(
                "[" +
                    PLUGIN_NAME +
                    "] 已" +
                    (newVal ? "启用" : "禁用") +
                    "全部规则",
            );
        },
    });

    menu.append_menu({ type: "spacer" });

    // List each rule with toggle
    for (let i = 0; i < config.rules.length; i++) {
        const rule = config.rules[i];
        const ruleItem = menu.append_menu({
            name:
                (rule.enabled !== false ? "[ON] " : "[OFF] ") +
                rule.pattern +
                " (" +
                rule.matchType +
                ")",
            icon_svg: rule.enabled !== false ? ICON_CHECKED : ICON_EMPTY,
            action() {
                rule.enabled = !(rule.enabled !== false);
                write_config();
                ruleItem.set_data({
                    icon_svg:
                        rule.enabled !== false ? ICON_CHECKED : ICON_EMPTY,
                    name:
                        (rule.enabled !== false ? "[ON] " : "[OFF] ") +
                        rule.pattern +
                        " (" +
                        rule.matchType +
                        ")",
                });
                shell.println(
                    "[" +
                        PLUGIN_NAME +
                        "] " +
                        rule.pattern +
                        " " +
                        (rule.enabled !== false ? "已启用" : "已禁用"),
                );
            },
        });
    }
};

// ---- Main filtering logic ----
const matchItem = (name, rule) => {
    if (!rule.pattern) return false;

    try {
        if (rule.matchType === "regex") {
            const regex = new RegExp(rule.pattern);
            return regex.test(name);
        } else {
            // Default: exact match
            return name === rule.pattern;
        }
    } catch (e) {
        shell.println(
            "[" + PLUGIN_NAME + '] 规则 "' + rule.pattern + '" 匹配出错:',
            e.message,
        );
        return false;
    }
};

/**
 * Recursively filter menu items and wrap submenu callbacks for lazy submenu filtering.
 * @param {*} menuController - menu_controller instance
 */
const filterMenuItems = (menuController) => {
    const enabledRules = config.rules.filter((r) => r.enabled !== false);
    if (enabledRules.length === 0) return;

    const items = menuController.get_items();

    for (const item of items) {
        const data = item.data();

        // Check if this item should be removed by name
        if (data.name) {
            for (const rule of enabledRules) {
                if (matchItem(data.name, rule)) {
                    item.remove();
                    break;
                }
            }
        }

        // If item was removed, skip submenu wrapping
        if (!item.valid()) continue;

        // If item has a submenu, wrap its callback to filter submenu items lazily
        if (data.submenu) {
            const originalSubmenu = data.submenu;
            item.update_data({
                submenu: (sub) => {
                    originalSubmenu(sub);
                    filterMenuItems(sub);
                },
            });
        }
    }
};

shell.menu_controller.add_menu_listener((ctx) => {
    try {
        filterMenuItems(ctx.menu);
    } catch (e) {
        shell.println("[" + PLUGIN_NAME + "] 过滤出错:", e, "\n", e.stack);
    }
});
