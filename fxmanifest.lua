fx_version 'cerulean'
games {'rdr3'}
rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'

author 'daggre_actual'
description 'Development Kit for RedM'
version '0.0.1'
lua54 'yes'

shared_scripts {
    '@da_log/log_sh.lua',
    '@da_lib/features/cli/cli_sh.lua',
    'src/cli_sh.lua',
}

server_scripts {
    -- 'src/db_inv_etl.lua',
}

client_scripts {
    '@da_lib/data/animation.lua',
    '@da_lib/data/flags_af.lua',
    '@da_lib/data/flags_aik.lua',
    '@da_lib/data/key.lua',
    '@da_lib/data/object.lua',
    '@da_lib/data/ped.lua',
    '@da_lib/data/pickup.lua',
    '@da_lib/data/propset.lua',
    '@da_lib/data/taskFilter.lua',
    '@da_lib/data/vehicle.lua',

    '@da_lib/features/nui/nui_cl.lua',
    '@da_lib/features/cache/cache_delay.lua',
    '@da_lib/features/cache/cache_lazy.lua',
    '@da_lib/features/util/util_cl.lua',
    '@da_lib/features/anim/anim_cl.lua',
    '@da_lib/features/draw/draw_cl.lua',
    '@da_lib/features/control/control_cl.lua',
    '@da_lib/features/object/object_cl.lua',
    '@da_lib/features/mode/mode_cl.lua',
    '@da_lib/features/net/net_cl.lua',
    '@da_lib/features/api/api_sh.lua',
    '@da_lib/features/kvp/kvp_sh.lua',
    '@da_lib/features/fx/fx_cl.lua',

    '@polyzone/client.lua',
    '@polyzone/CircleZone.lua',
    '@da_lib/features/polyzone/polyzone_cl.lua',

    '@da_lib/features/trie/trie_cl.lua',
    'ui/ui.lua',

    'src/menu_cl.lua',
    'src/keys_cl.lua',
    -- 'src/kinematics_cl.lua',
    'src/environment_cl.lua',
    'src/fx_cl.lua',
    'src/mode_anim_cl.lua',
    'src/mode_devtree_cl.lua',
    'src/mode_freecam_cl.lua',
    'src/mode_gizmo_cl.lua',
    'src/mode_object_cl.lua',
    'src/teleport_cl.lua',
    'src/ped_cl.lua',
    'src/zone_cl.lua',
    'src/debug_cl.lua',
    'dat/bones.lua',
    'src/bone_cl.lua',

    -- Testing
    'test/test_debug.lua',
}

files {
    'ui/web/index.html',
    'ui/web/script.js',
    'ui/web/assets/gizmo.js',
    'ui/web/assets/fonts/LiterationMonoNerd.ttf',
    'ui/web/assets/css/style.css',
    'ui/web/src/hud/anim.js',
    'ui/web/src/hud/common.js',
    'ui/web/src/hud/export.js',
    'ui/web/src/hud/help.js',
    'ui/web/src/hud/import.js',
    'ui/web/src/hud/obj.js',
    'ui/web/src/hud/settings.js',
    'ui/web/src/anims.js',
    'ui/web/src/camera.js',
    'ui/web/src/clipboard.js',
    'ui/web/src/confirm.js',
    'ui/web/src/crosshair.js',
    'ui/web/src/deferred.js',
    'ui/web/src/dropdown.js',
    'ui/web/src/events.js',
    'ui/web/src/msg.js',
    'ui/web/src/nav.js',
    'ui/web/src/obj.js',
    'ui/web/src/scene.js',
    'ui/web/src/settings.js',
    'ui/web/src/theme.js',
    'ui/web/src/tooltip.js',
    'ui/web/src/trie.js',
    'ui/web/src/ymap.js',
}

ui_page {
    'ui/web/index.html',
}
