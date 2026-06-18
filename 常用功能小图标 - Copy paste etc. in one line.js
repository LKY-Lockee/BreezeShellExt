// @name: 常用功能小图标 - Copy paste etc. in one line
// @description: 将复制，剪切等常用功能按钮添加到右键菜单的第一行小图标
// @version: 0.0.4
// @author: MicroBlock

import * as shell from "mshell";

// ---- CONFIG TEMPLATE ----
const ICON_CHECKED = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"><path fill="currentColor" d="M9.765 3.205a.75.75 0 0 1 .03 1.06l-4.25 4.5a.75.75 0 0 1-1.075.015L2.22 6.53a.75.75 0 0 1 1.06-1.06l1.705 1.704l3.72-3.939a.75.75 0 0 1 1.06-.03"/></svg>`;
const ICON_EMPTY = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"></svg>`;
const CONFIG_FILE = "common-small-button.json";
const PLUGIN_NAME = "常用功能小图标 - Copy paste etc. in one line";
const default_config = {
    remove_original: false,
    use_original_icon_if_exists: true,
    show_name: false,
    show_icon: true,
};
let config = {};
const read_config = () => {
    const config_dir = shell.breeze.data_directory() + "/config/";
    shell.fs.mkdir(config_dir);
    if (shell.fs.exists(config_dir + CONFIG_FILE)) {
        try {
            config = JSON.parse(shell.fs.read(config_dir + CONFIG_FILE));
        } catch (e) {
            shell.println("配置文件解析失败", e, "\n", e.stack);
        }
    }
};

read_config();

const read_config_key = (key) => {
    const read = (keys, obj) => {
        if (keys.length === 1) {
            return obj[keys[0]];
        }
        if (!obj[keys[0]]) {
            return undefined;
        }
        return read(keys.slice(1), obj[keys[0]]);
    };

    return read(key.split("."), config) ?? read(key.split("."), default_config);
};

const write_config = () => {
    const config_dir = shell.breeze.data_directory() + "/config/";
    shell.fs.mkdir(config_dir);
    shell.fs.write(config_dir + CONFIG_FILE, JSON.stringify(config, null, 4));
};

const write_config_key = (key, value) => {
    let obj = config;

    const keys = key.split(".");
    for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
            obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    write_config();
};

on_plugin_menu[PLUGIN_NAME] = (menu) => {
    const createToggleMenu = (menu, name, configKey, submenu) => {
        const menuItem = menu.append_menu({
            name,
            action() {
                try {
                    write_config_key(configKey, !read_config_key(configKey));
                    menuItem.set_data({
                        icon_svg: read_config_key(configKey)
                            ? ICON_CHECKED
                            : ICON_EMPTY,
                    });
                } catch (e) {
                    shell.println(e, e.stack);
                }
            },
            icon_svg: read_config_key(configKey) ? ICON_CHECKED : ICON_EMPTY,
            submenu,
        });
        return menuItem;
    };

    createToggleMenu(menu, "移除原始按钮", "remove_original");
    createToggleMenu(menu, "使用原始图标", "use_original_icon_if_exists");
    createToggleMenu(menu, "显示名称", "show_name");
    createToggleMenu(menu, "显示图标", "show_icon");
};

// ---- CONFIG TEMPLATE ----
const icons = {
    copy: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
    <path fill="#0078D4" d="M360 240Q327 240 303.5 263.5Q280 287 280 320V800Q280 833 303.5 856.5Q327 880 360 880H720Q753 880 776.5 856.5Q800 833 800 800V320Q800 287 776.5 263.5Q753 240 720 240Z" transform="translate(-0.0500 16.4000) scale(0.0175 -0.0175)"/>
    <path fill="#FAFAFA" d="M360 320H720Q720 320 720.0 320.0Q720 320 720 320V800Q720 800 720.0 800.0Q720 800 720 800H360Q360 800 360.0 800.0Q360 800 360 800V320Q360 320 360.0 320.0Q360 320 360 320Z" transform="translate(-0.0500 16.4000) scale(0.0175 -0.0175)"/>
    <path fill="#555555" d="M200 80Q167 80 143.5 103.5Q120 127 120 160V680Q120 697 131.5 708.5Q143 720 160.0 720.0Q177 720 188.5 708.5Q200 697 200 680V160Q200 160 200.0 160.0Q200 160 200 160H600Q617 160 628.5 148.5Q640 137 640 120Q640 103 628.5 91.5Q617 80 600 80Z" transform="translate(-0.0500 16.4000) scale(0.0175 -0.0175)"/>
    <path fill="#555555" d="M360 320Q360 320 360.0 320.0Q360 320 360 320V800Q360 800 360.0 800.0Q360 800 360 800Q360 800 360.0 800.0Q360 800 360 800V320Q360 320 360.0 320.0Q360 320 360 320Z" transform="translate(-0.0500 16.4000) scale(0.0175 -0.0175)"/>
</svg>`,
    cut: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
    <path fill="#555555" d="M480 400 386 306Q394 291 397.0 274.0Q400 257 400 240Q400 174 353.0 127.0Q306 80 240 80Q174 80 127.0 127.0Q80 174 80.0 240.0Q80 306 127.0 353.0Q174 400 240 400Q257 400 274.0 397.0Q291 394 306 386L400 480L306 574Q291 566 274.0 563.0Q257 560 240 560Q174 560 127.0 607.0Q80 654 80.0 720.0Q80 786 127.0 833.0Q174 880 240.0 880.0Q306 880 353.0 833.0Q400 786 400 720Q400 703 397.0 686.0Q394 669 386 654L824 216Q851 189 836.0 154.5Q821 120 783 120Q772 120 761.5 124.5Q751 129 743 137Z" transform="translate(-0.0619 16.4000) scale(0.0175 -0.0175)"/>
    <path fill="#0078D4" d="M600 520 520 600 743 823Q751 831 761.5 835.5Q772 840 783 840Q821 840 835.5 805.0Q850 770 823 743Z" transform="translate(-0.0619 16.4000) scale(0.0175 -0.0175)"/>
    <path fill="#FAFAFA" d="M240.0 640.0Q273 640 296.5 663.5Q320 687 320.0 720.0Q320 753 296.5 776.5Q273 800 240.0 800.0Q207 800 183.5 776.5Q160 753 160.0 720.0Q160 687 183.5 663.5Q207 640 240.0 640.0Z" transform="translate(-0.0619 16.4000) scale(0.0175 -0.0175)"/>
    <path fill="#FAFAFA" d="M480.0 460.0Q488 460 494.0 466.0Q500 472 500.0 480.0Q500 488 494.0 494.0Q488 500 480.0 500.0Q472 500 466.0 494.0Q460 488 460.0 480.0Q460 472 466.0 466.0Q472 460 480.0 460.0Z" transform="translate(-0.0619 16.4000) scale(0.0175 -0.0175)"/>
    <path fill="#FAFAFA" d="M240.0 160.0Q273 160 296.5 183.5Q320 207 320.0 240.0Q320 273 296.5 296.5Q273 320 240.0 320.0Q207 320 183.5 296.5Q160 273 160.0 240.0Q160 207 183.5 183.5Q207 160 240.0 160.0Z" transform="translate(-0.0619 16.4000) scale(0.0175 -0.0175)"/>
</svg>`,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
    <path fill="#555555" d="M280 120Q247 120 223.5 143.5Q200 167 200 200V720Q183 720 171.5 731.5Q160 743 160.0 760.0Q160 777 171.5 788.5Q183 800 200 800H360Q360 817 371.5 828.5Q383 840 400 840H560Q577 840 588.5 828.5Q600 817 600 800H760Q777 800 788.5 788.5Q800 777 800.0 760.0Q800 743 788.5 731.5Q777 720 760 720V200Q760 167 736.5 143.5Q713 120 680 120Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#FAFAFA" d="M680 720H280V200Q280 200 280.0 200.0Q280 200 280 200H680Q680 200 680.0 200.0Q680 200 680 200Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#0078D4" d="M440 320V600Q440 617 428.5 628.5Q417 640 400.0 640.0Q383 640 371.5 628.5Q360 617 360 600V320Q360 303 371.5 291.5Q383 280 400.0 280.0Q417 280 428.5 291.5Q440 303 440 320Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#0078D4" d="M600 320V600Q600 617 588.5 628.5Q577 640 560.0 640.0Q543 640 531.5 628.5Q520 617 520 600V320Q520 303 531.5 291.5Q543 280 560.0 280.0Q577 280 588.5 291.5Q600 303 600 320Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M280 720V200Q280 200 280.0 200.0Q280 200 280 200Q280 200 280.0 200.0Q280 200 280 200Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
</svg>`,
    paste: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
    <path fill="#555555" d="M200 120Q167 120 143.5 143.5Q120 167 120 200V760Q120 793 143.5 816.5Q167 840 200 840H367Q378 875 410.0 897.5Q442 920 480 920Q520 920 551.5 897.5Q583 875 594 840H760Q793 840 816.5 816.5Q840 793 840 760V200Q840 167 816.5 143.5Q793 120 760 120Z" transform="translate(-0.4000 17.1000) scale(0.0175 -0.0175)"/>
    <path fill="#FAFAFA" d="M200 200H760Q760 200 760.0 200.0Q760 200 760 200V760Q760 760 760.0 760.0Q760 760 760 760H680V680Q680 663 668.5 651.5Q657 640 640 640H320Q303 640 291.5 651.5Q280 663 280 680V760H200Q200 760 200.0 760.0Q200 760 200 760V200Q200 200 200.0 200.0Q200 200 200 200Z" transform="translate(-0.4000 17.1000) scale(0.0175 -0.0175)"/>
    <path fill="#0078D4" d="M480.0 760.0Q497 760 508.5 771.5Q520 783 520.0 800.0Q520 817 508.5 828.5Q497 840 480.0 840.0Q463 840 451.5 828.5Q440 817 440.0 800.0Q440 783 451.5 771.5Q463 760 480.0 760.0Z" transform="translate(-0.4000 17.1000) scale(0.0175 -0.0175)"/>
</svg>`,
    rename: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
    <path fill="#555555" d="M480.0 120.0Q463 120 451.5 131.5Q440 143 440.0 160.0Q440 177 451.5 188.5Q463 200 480.0 200.0Q497 200 508.5 188.5Q520 177 520.0 160.0Q520 143 508.5 131.5Q497 120 480.0 120.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M320.0 120.0Q303 120 291.5 131.5Q280 143 280.0 160.0Q280 177 291.5 188.5Q303 200 320.0 200.0Q337 200 348.5 188.5Q360 177 360.0 160.0Q360 143 348.5 131.5Q337 120 320.0 120.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M160.0 120.0Q143 120 131.5 131.5Q120 143 120.0 160.0Q120 177 131.5 188.5Q143 200 160.0 200.0Q177 200 188.5 188.5Q200 177 200.0 160.0Q200 143 188.5 131.5Q177 120 160.0 120.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M160.0 280.0Q143 280 131.5 291.5Q120 303 120.0 320.0Q120 337 131.5 348.5Q143 360 160.0 360.0Q177 360 188.5 348.5Q200 337 200.0 320.0Q200 303 188.5 291.5Q177 280 160.0 280.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M160.0 440.0Q143 440 131.5 451.5Q120 463 120.0 480.0Q120 497 131.5 508.5Q143 520 160.0 520.0Q177 520 188.5 508.5Q200 497 200.0 480.0Q200 463 188.5 451.5Q177 440 160.0 440.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M160.0 600.0Q143 600 131.5 611.5Q120 623 120.0 640.0Q120 657 131.5 668.5Q143 680 160.0 680.0Q177 680 188.5 668.5Q200 657 200.0 640.0Q200 623 188.5 611.5Q177 600 160.0 600.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M480.0 760.0Q463 760 451.5 771.5Q440 783 440.0 800.0Q440 817 451.5 828.5Q463 840 480.0 840.0Q497 840 508.5 828.5Q520 817 520.0 800.0Q520 783 508.5 771.5Q497 760 480.0 760.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M320.0 760.0Q303 760 291.5 771.5Q280 783 280.0 800.0Q280 817 291.5 828.5Q303 840 320.0 840.0Q337 840 348.5 828.5Q360 817 360.0 800.0Q360 783 348.5 771.5Q337 760 320.0 760.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#555555" d="M160.0 760.0Q143 760 131.5 771.5Q120 783 120.0 800.0Q120 817 131.5 828.5Q143 840 160.0 840.0Q177 840 188.5 828.5Q200 817 200.0 800.0Q200 783 188.5 771.5Q177 760 160.0 760.0Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
    <path fill="#0078D4" d="M640 120Q623 120 611.5 131.5Q600 143 600.0 160.0Q600 177 611.5 188.5Q623 200 640 200H680V760H640Q623 760 611.5 771.5Q600 783 600.0 800.0Q600 817 611.5 828.5Q623 840 640 840H800Q817 840 828.5 828.5Q840 817 840.0 800.0Q840 783 828.5 771.5Q817 760 800 760H760V200H800Q817 200 828.5 188.5Q840 177 840.0 160.0Q840 143 828.5 131.5Q817 120 800 120Z" transform="translate(-1.3333 17.3333) scale(0.0194 -0.0194)"/>
</svg>`,
};
shell.menu_controller.add_menu_listener((ctx) => {
    try {
        const small_buttons = [
            {
                icon: "copy",
                orig_resid: "4162@SHELL32.dll",
                orig_name: ["复制", "Copy"],
            },
            {
                icon: "cut",
                orig_resid: "33576@SHELL32.dll",
                orig_name: ["剪切", "Cut"],
            },
            {
                icon: "delete",
                orig_resid: "4163@SHELL32.dll",
                orig_name: ["删除", "Delete"],
            },
            {
                icon: "paste",
                orig_resid: "33578@SHELL32.dll",
                orig_name: ["粘贴"],
            },
            {
                icon: "rename",
                orig_resid: "4164@SHELL32.dll",
                orig_name: ["重命名", "Rename"],
            },
        ];

        const remove_original = read_config_key("remove_original");
        const use_original_icon_if_exists = read_config_key(
            "use_original_icon_if_exists",
        );
        const show_name = read_config_key("show_name");
        const show_icon = read_config_key("show_icon");

        const items = ctx.menu.get_items();
        const icon_menu = ctx.menu.prepend_parent_item();

        for (const button of small_buttons) {
            const corresponding_item = items.find((v) => {
                const data = v.data();
                if (!data.name) return false;
                if (button.orig_resid && data.resid === button.orig_resid)
                    return true;
                if (button.orig_name && button.orig_name.includes(data.name))
                    return true;
                return false;
            });

            if (!corresponding_item) continue;

            const data = corresponding_item.data();
            const icon =
                use_original_icon_if_exists && data.icon_svg
                    ? data.icon_svg
                    : icons[button.icon];
            const action = data.action;

            icon_menu.append_child_after(
                {
                    icon_svg: show_icon ? icon : null,
                    action,
                    name: show_name ? data.name : null,
                    disabled: data.disabled,
                },
                -1,
            );

            if (remove_original) corresponding_item.remove();
        }

        if (icon_menu.children().length === 0) icon_menu.remove();
        else
            ctx.menu.append_item_after(
                {
                    type: "spacer",
                },
                1,
            );

        const items2 = ctx.menu.get_items();
        let is_last_spacer = false;
        for (const item of items2) {
            if (item.data().type === "spacer") {
                if (is_last_spacer) {
                    item.remove();
                }
                is_last_spacer = true;
            } else is_last_spacer = false;
        }
    } catch (e) {
        shell.println(e, e.stack);
    }
});
