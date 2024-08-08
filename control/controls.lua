Control = {}
Control.A = `INPUT_MOVE_LEFT_ONLY`
Control.C = 0x9959A6F0
Control.D = `INPUT_MOVE_RIGHT_ONLY`
Control.E = `INPUT_DYNAMIC_SCENARIO`
Control.F = `INPUT_CONTEXT_B`
Control.G = `INPUT_INTERACT_ANIMAL`
Control.Q = `INPUT_FRONTEND_LB`
Control.R = `INPUT_RELOAD`
Control.S = `INPUT_MOVE_DOWN_ONLY`
Control.V = `INPUT_NEXT_CAMERA`
Control.W = `INPUT_MOVE_UP_ONLY`
Control.X = `INPUT_SWITCH_SHOULDER`
Control.Z = 0x26E9DC00
Control.Crouch = `INPUT_DUCK`
Control.Spacebar = `INPUT_JUMP`
Control.LeftAlt = `INPUT_PC_FREE_LOOK`
Control.LeftShift = `INPUT_SPRINT`
Control.LeftControl = `INPUT_FRONTEND_RUP`
Control.MouseLR = `INPUT_LOOK_LR`
Control.MouseUD = `INPUT_LOOK_UD`
Control.MouseLeft = `INPUT_ATTACK`
Control.MouseLeft2 = `SKIPCUTSCENE`
Control.MouseRight = `INPUT_AIM`
Control.WheelUp = `INPUT_PREV_WEAPON`
Control.WheelDown = `INPUT_NEXT_WEAPON`
Control.RightBracket = 0xA5BDCD3C
Control.Escape = 0x308588E6
Control.Escape2 = `INPUT_FRONTEND_RRIGHT`
Control.Escape3 = `INPUT_FRONTEND_PAUSE_ALTERNATE`

AllControls = {}
for k, v in pairs(Control) do
    table.insert(AllControls, v)
end
