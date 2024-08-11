Control = {}
Control.a = `INPUT_MOVE_LEFT_ONLY`
Control.c = 0x9959A6F0
Control.d = `INPUT_MOVE_RIGHT_ONLY`
Control.e = `INPUT_DYNAMIC_SCENARIO`
Control.f = `INPUT_CONTEXT_B`
Control.g = `INPUT_INTERACT_ANIMAL`
Control.q = `INPUT_FRONTEND_LB`
Control.r = `INPUT_RELOAD`
Control.s = `INPUT_MOVE_DOWN_ONLY`
Control.v = `INPUT_NEXT_CAMERA`
Control.w = `INPUT_MOVE_UP_ONLY`
Control.x = `INPUT_SWITCH_SHOULDER`
Control.z = 0x26E9DC00
Control.Crouch = `INPUT_DUCK`
Control.Spacebar = `INPUT_JUMP`
Control[" "] = `INPUT_JUMP`
Control.Alt = `INPUT_PC_FREE_LOOK`
Control.Shift = `INPUT_SPRINT`
Control.Control = `INPUT_FRONTEND_RUP`
Control.MouseLR = `INPUT_LOOK_LR`
Control.MouseUD = `INPUT_LOOK_UD`
Control.MouseLeft = `INPUT_ATTACK`
Control.MouseLeft2 = `SKIPCUTSCENE`
Control.MouseRight = `INPUT_AIM`
Control.WheelUp = `INPUT_PREV_WEAPON`
Control.WheelDown = `INPUT_NEXT_WEAPON`
Control["]"] = 0xA5BDCD3C
Control.RightBracket = 0xA5BDCD3C
Control.Escape = 0x308588E6
Control.Escape2 = `INPUT_FRONTEND_RRIGHT`
Control.Escape3 = `INPUT_FRONTEND_PAUSE_ALTERNATE`

AllControls = {}
for k, v in pairs(Control) do
    table.insert(AllControls, v)
end

da.Dev.Control = {}
da.Dev.Control.GetPressed = function(pressed, justPressed)
    pressed = pressed or {}
    justPressed = justPressed or {}
    local getPressed, getJustPressed = {}, {}

    for _, key in ipairs(pressed) do
        if Control[key] then
            getPressed[key] = IsControlPressed(0, Control[key]) or IsDisabledControlPressed(0, Control[key])
        end
    end

    for _, key in ipairs(justPressed) do
        if Control[key] then
            getJustPressed[key] = IsControlJustPressed(0, Control[key]) or IsDisabledControlJustPressed(0, Control[key])
        end
    end

    return getPressed, getJustPressed
end
