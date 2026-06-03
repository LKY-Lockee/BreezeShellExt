// @name: 菜单排序与重命名 - Menu Order & Rename
// @description: 自定义菜单项顺序与名称，通过 JSON 配置文件控制 / Reorder and rename menu items via JSON config
// @version: 0.1.1
// @author: LKY-Lockee

import * as shell from "mshell";

const CONFIG_FILE = "menu-order.json";
const PLUGIN_NAME = "菜单排序与重命名 - Menu Order & Rename";

// ---- Config format (menu-order.json) ----
// Key = menu item name (exact match)
// Value = { name?: string, sort?: boolean }
//   - name: new display name (omit to keep original)
//   - sort: whether to move to top in config order (default true)
//   - {} means: sort to top, don't rename
//
// Example:
// {
//     "Copy": { "name": "复制" },
//     "Cut": { "sort": true },
//     "Paste": {},
//     "Delete": { "sort": false, "name": "删除" }
// }

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

read_config();

// ---- Plugin config menu ----
const ICON_CHECKED = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"><path fill="currentColor" d="M9.765 3.205a.75.75 0 0 1 .03 1.06l-4.25 4.5a.75.75 0 0 1-1.075.015L2.22 6.53a.75.75 0 0 1 1.06-1.06l1.705 1.704l3.72-3.939a.75.75 0 0 1 1.06-.03"/></svg>`;
const ICON_EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"></svg>`;

on_plugin_menu[PLUGIN_NAME] = (menu) => {
    menu.append_menu({
        name: "重新加载配置 / Reload Config",
        action() {
            read_config();
            shell.println(
                "[" +
                    PLUGIN_NAME +
                    "] 配置已重新加载, " +
                    Object.keys(config).length +
                    " 条规则",
            );
        },
    });

    menu.append_menu({ type: "spacer" });

    const configKeys = Object.keys(config);
    if (configKeys.length === 0) {
        menu.append_menu({
            name: "（无规则）编辑 menu-order.json 来添加规则",
            disabled: true,
        });
    } else {
        for (const key of configKeys) {
            const cfg = config[key];
            const sortLabel = cfg.sort !== false ? "⇧" : "—";
            const newName = cfg.name ? " → " + cfg.name : "";
            menu.append_menu({
                name: sortLabel + " " + key + newName,
                disabled: true,
            });
        }
    }
};

// ---- Submenu wrapper ----
const wrapSubmenu = (item, origSubmenu, processFn) => {
    item.update_data({
        submenu: (sub) => {
            origSubmenu(sub);
            processFn(sub);
        },
    });
};

// ---- Main processing ----
const processMenu = (menuController) => {
    const configKeys = Object.keys(config);
    if (configKeys.length === 0) return;

    const items = menuController.get_items();
    const sortedMap = new Map(); // configKey -> item
    const unsorted = [];

    for (const item of items) {
        const data = item.data();
        const hasSubmenu = !!data.submenu;

        // Rename "打开方式..." for consistency (same as Context Menu Cleaner)
        if (data.name === "打开方式...") {
            item.update_data({ name: "打开方式" });
        }

        if (!data.name || data.type === "spacer") {
            unsorted.push(item);
            if (hasSubmenu) wrapSubmenu(item, data.submenu, processMenu);
            continue;
        }

        const cfg = config[data.name];
        if (cfg) {
            // Apply rename if configured
            if (cfg.name && cfg.name !== data.name) {
                item.update_data({ name: cfg.name });
            }
            // Categorize: sort=true (default) → sorted, sort=false → unsorted
            if (cfg.sort !== false) {
                sortedMap.set(data.name, item);
            } else {
                unsorted.push(item);
            }
        } else {
            unsorted.push(item);
        }

        if (hasSubmenu) wrapSubmenu(item, data.submenu, processMenu);
    }

    // Reorder: config-ordered items to front, after any leading parent items
    // (e.g., icon row from small button plugin). Detect leading unnamed
    // non-spacer items and skip them so they stay at the very top.
    let leadingOffset = 0;
    const allItems = menuController.get_items();
    for (const item of allItems) {
        const d = item.data();
        if (!d.name && d.type !== "spacer") {
            leadingOffset++;
        } else {
            break;
        }
    }
    // Also skip the spacer that immediately follows the icon row
    if (leadingOffset > 0 && leadingOffset < allItems.length) {
        if (allItems[leadingOffset].data().type === "spacer") {
            leadingOffset++;
        }
    }
    let pos = leadingOffset;
    for (const key of configKeys) {
        const item = sortedMap.get(key);
        if (item) {
            item.set_position(pos);
            pos++;
        }
    }
    // Unsorted items shift down naturally (no explicit reorder needed)
};

// ---- Register listener ----
shell.menu_controller.add_menu_listener((ctx) => {
    try {
        read_config(); // Reload on each menu open for instant feedback
        processMenu(ctx.menu);
    } catch (e) {
        shell.println("[" + PLUGIN_NAME + "] 处理出错:", e, "\n", e.stack);
    }
});
