--- Copyright © 2024 Joshua Nelson

fx_version 'cerulean'
games {'rdr3'}
rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'

author 'daggre_actual'
description 'Development Kit for RedM'
version '0.0.1'
lua54 'yes'
-- this_is_a_map 'yes'

shared_scripts {
    '@da_log/log_sh.lua',
    '@da_lib/lib/cli_sh.lua',
    'src/cli_sh.lua',
}

server_scripts {
    -- 'src/db_inv_etl.lua',
}

client_scripts {
    '@da_lib/dat/animation.lua',
    '@da_lib/dat/flags_af.lua',
    '@da_lib/dat/flags_aik.lua',
    '@da_lib/dat/key.lua',
    '@da_lib/dat/object.lua',
    '@da_lib/dat/ped.lua',
    '@da_lib/dat/pickup.lua',
    '@da_lib/dat/propset.lua',
    '@da_lib/dat/taskFilter.lua',
    '@da_lib/dat/vehicle.lua',

    '@da_lib/lib/nui_cl.lua',
    '@da_lib/lib/cache_delay.lua',
    '@da_lib/lib/cache_lazy.lua',
    '@da_lib/lib/util_cl.lua',
    '@da_lib/lib/anim_cl.lua',
    '@da_lib/lib/draw_cl.lua',
    '@da_lib/lib/control_cl.lua',
    '@da_lib/lib/object_cl.lua',
    '@da_lib/lib/mode_cl.lua',
    '@da_lib/lib/net_cl.lua',
    '@da_lib/api/api_sh.lua',
    '@da_lib/lib/kvp_sh.lua',
    '@da_lib/lib/fx_cl.lua',

    '@polyzone/client.lua',
    '@polyzone/CircleZone.lua',
    '@da_lib/lib/polyzone_cl.lua',

    '@da_lib/lib/trie_cl.lua',
    'ui/ui.lua',

    'src/menu_cl.lua',
    'src/keys_cl.lua',
    -- 'src/kinematics_cl.lua',
    'src/environment_cl.lua',
    'src/fx_cl.lua',
    -- 'src/heritage_cl.lua',
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
    'ui/web/components/anims.js',
    'ui/web/components/camera.js',
    'ui/web/components/crosshair.js',
    'ui/web/components/obj.js',
    'ui/web/components/theme.js',
    'ui/web/components/tooltip.js',
    'ui/web/components/trie.js',
    'ui/web/utils/clipboard.js',
    'ui/web/utils/msg.js',
    'ui/web/utils/nav.js',
}

ui_page {
    'ui/web/index.html',
}
