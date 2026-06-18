// @name: 菜单排序与重命名 - Menu Order & Rename
// @description: 自定义菜单项顺序与名称，通过 JSON 配置文件控制 / Reorder and rename menu items via JSON config
// @version: 0.3.0
// @author: LKY-Lockee

import * as shell from "mshell";

const CONFIG_FILE = "menu-order.json";
const PLUGIN_NAME = "菜单排序与重命名 - Menu Order & Rename";

// ---- Config format (menu-order.json) ----
// Key = menu item name (exact match)
// Value = { name?: string, above?: {...}, below?: {...}, spacer?: string[] }
//   - name: new display name (omit to keep original)
//   - above: items to place above this item, with their own sub-configs
//   - below: items to place below this item, with their own sub-configs
//   - spacer: where to insert separators. Array of: "before", "after",
//     "before-above", "after-below". Runs after sorting, before dedup.
//   - {} means: just a positioning anchor / ordering reference
//
// Root keys themselves are NOT reordered — they stay where they are.
// Only their above/below children are repositioned relative to them.
// If a root key doesn't exist in the menu, its above/below items still
// maintain their configured relative order (floating group).
//
// Example:
// {
//     "创建快捷方式": {
//         "above": { "复制文件路径": {} }
//     },
//     "打开": {
//         "below": { "编辑": {}, "打印": {} }
//     }
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
            const renameInfo = cfg.name ? " → " + cfg.name : "";
            const aboveCount = cfg.above ? Object.keys(cfg.above).length : 0;
            const belowCount = cfg.below ? Object.keys(cfg.below).length : 0;
            const hint =
                (aboveCount ? " ↑" + aboveCount : "") +
                (belowCount ? " ↓" + belowCount : "");
            menu.append_menu({
                name: key + renameInfo + hint,
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

// ---- Config tree helpers ----

// Traverse the config tree (including nested above/below), calling fn(key, cfg) for each node.
const walkConfigTree = (obj, fn) => {
    if (!obj || typeof obj !== "object") return;
    for (const [key, cfg] of Object.entries(obj)) {
        if (!cfg || typeof cfg !== "object") continue;
        fn(key, cfg);
        if (cfg.above) walkConfigTree(cfg.above, fn);
        if (cfg.below) walkConfigTree(cfg.below, fn);
    }
};

// ---- Main processing ----
const processMenu = (menuController) => {
    const configKeys = Object.keys(config);
    if (configKeys.length === 0) return;

    // ---- Step 0: Collect renames from the entire config tree ----
    const renames = new Map();
    walkConfigTree(config, (key, cfg) => {
        if (cfg.name) renames.set(key, cfg.name);
    });
    renames.set("打开方式...", "打开方式");

    // ---- Step 1: Expansion helpers (mutually recursive) ----
    // Flatten a config node's above/below into ordered name lists.
    // expandAbove: items that go ABOVE this node's anchor (above children + their subtrees)
    // expandBelow: items that go BELOW this node's anchor (below children + their subtrees)
    const expandAbove = (cfg) => {
        const r = [];
        if (!cfg || typeof cfg !== "object") return r;
        if (cfg.above) {
            for (const [k, c] of Object.entries(cfg.above)) {
                r.push(...expandAbove(c), k, ...expandBelow(c));
            }
        }
        return r;
    };
    const expandBelow = (cfg) => {
        const r = [];
        if (!cfg || typeof cfg !== "object") return r;
        if (cfg.below) {
            for (const [k, c] of Object.entries(cfg.below)) {
                r.push(...expandAbove(c), k, ...expandBelow(c));
            }
        }
        return r;
    };
    const expandAll = (cfg) => [...expandAbove(cfg), ...expandBelow(cfg)];

    // ---- Step 2: Place above/below items adjacent to existing anchors ----
    const anchored = new Set();
    const placeSubtree = (anchorName, anchorCfg) => {
        if (!anchorCfg || typeof anchorCfg !== "object") return;
        if (anchored.has(anchorName)) return;

        let items = menuController.get_items();
        const anchor = items.find((it) => it.data().name === anchorName);
        if (!anchor) return; // doesn't exist → handled by floating group

        anchored.add(anchorName);

        // Pre-compute full flat order for above and below
        const aboveFlat = expandAbove(anchorCfg);
        const belowFlat = expandBelow(anchorCfg);

        // Filter to items that actually exist, in config order
        const existingAbove = aboveFlat.filter((n) =>
            items.some((it) => it.data().name === n),
        );
        const existingBelow = belowFlat.filter((n) =>
            items.some((it) => it.data().name === n),
        );
        for (const n of existingAbove) anchored.add(n);
        for (const n of existingBelow) anchored.add(n);

        // ---- Gather above items contiguously before anchor ----
        if (existingAbove.length > 0) {
            // Remove all above items first (right-to-left to avoid index shifts)
            const aboveToPlace = existingAbove
                .map((n) => ({
                    name: n,
                    pos: menuController
                        .get_items()
                        .find((it) => it.data().name === n)
                        ?.get_position(),
                }))
                .filter((p) => p.pos !== undefined)
                .sort((a, b) => b.pos - a.pos);
            for (const { name } of aboveToPlace) {
                const it = menuController
                    .get_items()
                    .find((x) => x.data().name === name);
                if (it) it.set_position(menuController.get_items().length - 1);
            }
            // Place contiguously right before anchor
            items = menuController.get_items();
            const anchorPos = items
                .find((it) => it.data().name === anchorName)
                ?.get_position();
            if (anchorPos !== undefined) {
                for (let i = 0; i < existingAbove.length; i++) {
                    const it = menuController
                        .get_items()
                        .find((x) => x.data().name === existingAbove[i]);
                    if (it) {
                        const oldPos = it.get_position();
                        const target = anchorPos + i; // insert at anchorPos pushes anchor right
                        const adjusted = oldPos < target ? target - 1 : target;
                        it.set_position(adjusted);
                    }
                }
            }
        }

        // ---- Gather below items contiguously after anchor ----
        if (existingBelow.length > 0) {
            // Remove all below items first (right-to-left)
            const belowToPlace = existingBelow
                .map((n) => ({
                    name: n,
                    pos: menuController
                        .get_items()
                        .find((it) => it.data().name === n)
                        ?.get_position(),
                }))
                .filter((p) => p.pos !== undefined)
                .sort((a, b) => b.pos - a.pos);
            for (const { name } of belowToPlace) {
                const it = menuController
                    .get_items()
                    .find((x) => x.data().name === name);
                if (it) it.set_position(menuController.get_items().length - 1);
            }
            // Place contiguously right after anchor
            items = menuController.get_items();
            const anchorPos = items
                .find((it) => it.data().name === anchorName)
                ?.get_position();
            if (anchorPos !== undefined) {
                for (let i = 0; i < existingBelow.length; i++) {
                    const it = menuController
                        .get_items()
                        .find((x) => x.data().name === existingBelow[i]);
                    if (it) {
                        const oldPos = it.get_position();
                        const target = anchorPos + 1 + i;
                        const adjusted = oldPos < target ? target - 1 : target;
                        it.set_position(adjusted);
                    }
                }
            }
        }
    };

    for (const rootKey of configKeys) {
        placeSubtree(rootKey, config[rootKey]);
    }

    // ---- Step 3: Floating groups (root keys that don't exist in menu) ----
    for (const rootKey of configKeys) {
        if (anchored.has(rootKey)) continue;

        const allNames = expandAll(config[rootKey]);
        const existing = allNames.filter((n) => {
            const it = menuController
                .get_items()
                .find((x) => x.data().name === n);
            return it && !anchored.has(n);
        });
        if (existing.length <= 1) {
            for (const n of existing) anchored.add(n);
            continue;
        }

        for (const n of existing) anchored.add(n);

        // Remove from current positions (right-to-left to avoid index shift)
        const items = menuController.get_items();
        const toPlace = [];
        for (const name of existing) {
            const it = items.find((x) => x.data().name === name);
            if (it) toPlace.push({ name, pos: it.get_position() });
        }
        toPlace.sort((a, b) => b.pos - a.pos);
        for (const { name } of toPlace) {
            const it = menuController
                .get_items()
                .find((x) => x.data().name === name);
            if (it) {
                it.set_position(menuController.get_items().length - 1);
            }
        }

        // Place contiguously at min original position
        const minPos = Math.min(...toPlace.map((t) => t.pos));
        for (let i = 0; i < existing.length; i++) {
            const it = menuController
                .get_items()
                .find((x) => x.data().name === existing[i]);
            if (it) it.set_position(minPos + i);
        }
    }

    // ---- Step 4: Apply renames ----
    for (const item of menuController.get_items()) {
        const data = item.data();
        if (data.name && renames.has(data.name)) {
            const newName = renames.get(data.name);
            if (newName !== data.name) {
                item.update_data({ name: newName });
            }
        }
    }

    // ---- Step 5: Insert spacers per config (after sorting, before dedup) ----
    // Walks the ENTIRE config tree recursively so nested nodes (inside
    // above/below) are also processed. Collects all positions first, then
    // inserts from highest to lowest to avoid index shift interference.
    const spacerInserts = [];
    const collectSpacerInserts = (cfgObj) => {
        if (!cfgObj || typeof cfgObj !== "object") return;
        for (const [key, cfg] of Object.entries(cfgObj)) {
            if (!cfg || typeof cfg !== "object") continue;

            if (
                cfg.spacer &&
                Array.isArray(cfg.spacer) &&
                cfg.spacer.length > 0
            ) {
                const items = menuController.get_items();
                const anchor = items.find((it) => it.data().name === key);
                if (anchor) {
                    const anchorPos = anchor.get_position();
                    const existingAbove = expandAbove(cfg).filter((n) =>
                        items.some((it) => it.data().name === n),
                    );
                    const existingBelow = expandBelow(cfg).filter((n) =>
                        items.some((it) => it.data().name === n),
                    );

                    for (const sp of cfg.spacer) {
                        let pos = -1;
                        if (sp === "before") {
                            pos = anchorPos;
                        } else if (sp === "after") {
                            pos = anchorPos + 1;
                        } else if (sp === "before-above") {
                            if (existingAbove.length > 0) {
                                const firstAbove = items.find(
                                    (it) => it.data().name === existingAbove[0],
                                );
                                pos = firstAbove
                                    ? firstAbove.get_position()
                                    : anchorPos;
                            } else {
                                pos = anchorPos;
                            }
                        } else if (sp === "after-below") {
                            if (existingBelow.length > 0) {
                                const lastBelow = items.find(
                                    (it) =>
                                        it.data().name ===
                                        existingBelow[existingBelow.length - 1],
                                );
                                pos = lastBelow
                                    ? lastBelow.get_position() + 1
                                    : anchorPos + 1;
                            } else {
                                pos = anchorPos + 1;
                            }
                        }
                        if (pos >= 0) {
                            spacerInserts.push(pos);
                        }
                    }
                }
            }

            // Recurse into nested above/below
            if (cfg.above) collectSpacerInserts(cfg.above);
            if (cfg.below) collectSpacerInserts(cfg.below);
        }
    };
    collectSpacerInserts(config);

    // Insert from highest position down so earlier positions stay valid
    spacerInserts.sort((a, b) => b - a);
    for (const pos of spacerInserts) {
        menuController.append_item_after(
            { type: "spacer", disabled: true },
            pos,
        );
    }

    // ---- Step 6: Recurse into submenus ----
    for (const item of menuController.get_items()) {
        const data = item.data();
        if (data.submenu) {
            const orig = data.submenu;
            wrapSubmenu(item, orig, processMenu);
        }
    }

    // ---- Step 7: Clean up spacers (leading, trailing, and consecutive dupes) ----
    // Remove leading spacers
    while (true) {
        const items = menuController.get_items();
        if (items.length === 0) break;
        if (items[0].data().type === "spacer") {
            items[0].remove();
        } else break;
    }
    // Remove trailing spacers
    while (true) {
        const items = menuController.get_items();
        if (items.length === 0) break;
        if (items[items.length - 1].data().type === "spacer") {
            items[items.length - 1].remove();
        } else break;
    }
    // Remove consecutive duplicate spacers
    const spacerItems = menuController.get_items();
    let lastWasSpacer = false;
    for (const it of spacerItems) {
        if (it.data().type === "spacer") {
            if (lastWasSpacer) it.remove();
            lastWasSpacer = true;
        } else {
            lastWasSpacer = false;
        }
    }
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
