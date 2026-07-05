// dev-mocks.js

const testHud = 'ui_object';
// const testHud = "ui_animation";
const animjsonString = `{"test":["a","b"], "vest":["c","d"]}`;
// INFO: Issue with the @ symbol
// const jsonString = `{"test@test@test": ["test1", "test2", "test3" ], "test@test@test3": [ "test_back", "test_front", "test_left", "test_right" ],}`

const getRandomElement = arr => arr[Math.floor(Math.random() * arr.length)];
const randomSuffix = () =>
    Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');

const pedPrefixes = [
    'human',
    'cowboy',
    'bandit',
    'hunter',
    'sheriff',
    'traveler',
];
const objectPrefixes = [
    'crate',
    'barrel',
    'table',
    'lamp',
    'statue',
    'fence',
    'wheel',
];
const pickupPrefixes = ['gold', 'ammo', 'coin', 'map', 'food', 'herb', 'pouch'];
const vehiclePrefixes = [
    'wagon',
    'stagecoach',
    'cart',
    'train',
    'boat',
    'carriage',
];
const propsetPrefixes = [
    'camp',
    'ranch',
    'market',
    'graveyard',
    'station',
    'fort',
];

/* prettier-ignore-start */
const animFlags = [
    { value: 1 << 0, name: 'AF_LOOPING', note: 'Loop the animation' },
    { value: 1 << 1, name: 'AF_HOLD_LAST_FRAME', note: 'Stop animation on last frame', },
    { value: 1 << 2, name: 'AF_NOT_INTERRUPTABLE', note: 'Prevent animation interrupts', },
    { value: 1 << 3, name: 'AF_UPPERBODY', note: 'Filter animation to upper body', },
    { value: 1 << 4, name: 'AF_SECONDARY', note: 'Allow player control' },
    { value: 1 << 5, name: 'AF_ABORT_ON_PED_MOVEMENT', note: 'Abort animation on movement', },
    { value: 1 << 6, name: 'AF_ADDITIVE', note: 'Used for additive animations', },
    { value: 1 << 7, name: 'AF_OVERRIDE_PHYSICS', note: '' },
    { value: 1 << 8, name: 'AF_EXTRACT_INITIAL_OFFSET', note: '' },
    { value: 1 << 9, name: 'AF_EXIT_AFTER_INTERRUPTED', note: '' },
    { value: 1 << 10, name: 'AF_TAG_SYNC_IN', note: '' },
    { value: 1 << 11, name: 'AF_TAG_SYNC_OUT', note: '' },
    { value: 1 << 12, name: 'AF_TAG_SYNC_CONTINUOUS', note: '' },
    { value: 1 << 13, name: 'AF_FORCE_START', note: '' },
    { value: 1 << 14, name: 'AF_USE_KINEMATIC_PHYSICS', note: '' },
    { value: 1 << 15, name: 'AF_USE_MOVER_EXTRACTION', note: '' },
    { value: 1 << 16, name: 'AF_DONT_SUPPRESS_LOCO', note: '' },
    { value: 1 << 17, name: 'AF_ENDS_IN_DEAD_POSE', note: '' },
    { value: 1 << 18, name: 'AF_ACTIVATE_RAGDOLL_ON_COLLISION', note: '' },
    { value: 1 << 19, name: 'AF_DONT_EXIT_ON_DEATH', note: '' },
    { value: 1 << 20, name: 'AF_ABORT_ON_WEAPON_DAMAGE', note: '' },
    { value: 1 << 21, name: 'AF_DISABLE_FORCED_PHYSICS_STATE', note: '' },
    { value: 1 << 22, name: 'AF_GESTURE', note: 'Used for gesture type animations', },
    { value: 1 << 23, name: 'AF_SKIP_IF_BLOCKED_BY_HIGHER_PRIORITY_TASK', note: '', },
    { value: 1 << 24, name: 'AF_USE_ABSOLUTE_MOVER', note: '' },
    { value: 1 << 25, name: 'AF_0xC57F16E7', note: '' },
    { value: 1 << 26, name: 'AF_UPPERBODY_TAGS', note: '' },
    { value: 1 << 27, name: 'AF_PROCESS_ATTACHMENTS_ON_START', note: '' },
    { value: 1 << 28, name: 'AF_EXPAND_PED_CAPSULE_FROM_SKELETON', note: '' },
    { value: 1 << 29, name: 'AF_BLENDOUT_WRT_LAST_FRAME', note: '' },
    { value: 1 << 30, name: 'AF_DISABLE_PHYSICAL_ACTIVATION', note: '' },
    { value: 1 << 31, name: 'AF_DISABLE_RELEASE_EVENTS', note: '' },
];
const animikFlags = [
    { value: 1 << 0, name: 'AIK_DISABLE_LEG_IK', note: 'Disable Leg Inverse Kinematics', },
    { value: 1 << 1, name: 'AIK_DISABLE_ARM_IK', note: 'Disable Arm Inverse Kinematics', },
    { value: 1 << 2, name: 'AIK_DISABLE_HEAD_IK', note: 'Disable Head Inverse Kinematics', },
    { value: 1 << 3, name: 'AIK_DISABLE_TORSO_IK', note: 'Disable Torso Inverse Kinematics', },
    { value: 1 << 4, name: 'AIK_DISABLE_TORSO_REACT_IK', note: 'Disable Torso Reaction?? Inverse Kinematics', },
    { value: 1 << 5, name: 'AIK_USE_LEG_ALLOW_TAGS', note: 'Use Animation Allow Tags For Legs', },
    { value: 1 << 6, name: 'AIK_USE_LEG_BLOCK_TAGS', note: 'Use Animation Block Tags For Legs', },
    { value: 1 << 7, name: 'AIK_USE_ARM_ALLOW_TAGS', note: 'Use Animation Allow Tags for Arms', },
    { value: 1 << 8, name: 'AIK_USE_ARM_BLOCK_TAGS', note: 'Use Animation Block Tags for Arms', },
    { value: 1 << 9, name: 'AIK_PROCESS_WEAPON_HAND_GRIP', note: 'Enable the weapon hand grip??', },
    { value: 1 << 10, name: 'AIK_USE_FP_ARM_LEFT', note: 'First Person Left Arm', },
    { value: 1 << 11, name: 'AIK_USE_FP_ARM_RIGHT', note: 'First Person Right Arm', },
    { value: 1 << 12, name: 'AIK_0x88FF50BE', note: '??' },
    { value: 1 << 13, name: 'AIK_DISABLE_TORSO_VEHICLE_IK', note: '' },
    { value: 1 << 14, name: 'AIK_DISABLE_PRONE_IK', note: '' },
    { value: 1 << 15, name: 'AIK_UPPERBODY', note: '' },
    { value: 1 << 16, name: 'AIK_UPPERBODY_TAGS', note: '' },
    { value: 1 << 17, name: 'AIK_USE_POSE_FIXUP', note: '' },
    { value: 1 << 18, name: 'AIK_0x5465E64A', note: '' },
    { value: 1 << 19, name: 'AIK_DISABLE_LEG_POSTURE_IK', note: '' },
    { value: 1 << 20, name: 'AIK_0x32939A0E', note: '' },
    { value: 1 << 21, name: 'AIK_BLOCK_NON_ANIMSCENE_LOOKS', note: 'Disable look reactions while in animation?', },
    { value: 1 << 22, name: 'AIK_0x3CC5DD38', note: '' },
    { value: 1 << 23, name: 'AIK_0xB819088C', note: '' },
    { value: 1 << 24, name: 'AIK_DISABLE_CONTOUR_IK', note: '' },
    { value: 1 << 25, name: 'AIK_0xF9E28A5F', note: '' },
    { value: 1 << 26, name: 'AIK_0x983AE6C1', note: '' },
    { value: 1 << 27, name: 'AIK_0x5B5D2BEF', note: 'Seems to dampen the facing direction' },
    { value: 1 << 28, name: 'AIK_0xA4F64B54', note: '' },
    { value: 1 << 29, name: 'AIK_DISABLE_TWO_BONE_IK', note: 'Only use one bone in IK?', },
    { value: 1 << 30, name: 'AIK_0x0C1380EC', note: '' },
];
const taskfilters = [
    { value: false, name: 'false', note: 'Default, false (Different than "None")' },
    { value: '', name: 'None', note: 'Prevents some AnimFlags from working??' },
    { value: 'accessoriesonly_filter', name: 'Accessories Only', note: 'Animate Accessories Only', },
    { value: 'allfingers_and_hand_helpers_filter', name: 'Helper: Fingers, Hands', note: '', },
    { value: 'allfingers_and_hand_helpers_no_ch_filter', name: 'Helper: Fingers, Hands (no ch)', note: '', },
    { value: 'allfingers_and_toes_and_hand_helpers_filter', name: 'Helper: Fingers, Toes, Hands', note: '', },
    { value: 'arm_l_and_hat', name: 'Left Arm, Hat', note: 'Only animate left arm and hat', },
    { value: 'arms_filter', name: 'Arms', note: 'Only animate arms' },
    { value: 'armsheadnomover_filter', name: 'No Move: Arms, Head', note: '' },
    { value: 'biped_capture_filter', name: 'Biped Capture', note: '' },
    { value: 'bodyonly_filter', name: 'Body', note: 'Only animate body' },
    { value: 'bonemask_armonly_l', name: 'Bone Mask: Left Arm', note: '' },
    { value: 'bonemask_armonly_r', name: 'Bone Mask: Right Arm', note: '' },
    { value: 'bonemask_arms', name: 'Bone Mask: Arms', note: '' },
    { value: 'bonemask_bodyonly', name: 'Bone Mask: Body', note: '' },
    { value: 'bonemask_head_neck_and_arms', name: 'Bone Mask: Head, Neck, Arms', note: '', },
    { value: 'bonemask_head_neck_and_l_arm', name: 'Bone Mask: Head, Neck, Left Arm', note: '', },
    { value: 'bonemask_head_neck_and_r_arm', name: 'Bone Mask: Head, Neck, Right Arm', note: '', },
    { value: 'bonemask_headonly', name: 'Bone Mask: Head', note: '' },
    { value: 'bonemask_lod_lo', name: 'Bone Mask: LOD', note: '' },
    { value: 'bonemask_spine_feathered', name: 'Bone Mask: Feather Spine', note: '', },
    { value: 'bonemask_spineonly', name: 'Bone Mask: Spine', note: '' },
    { value: 'bonemask_upperonly', name: 'Bone Mask: Upper Body', note: '' },
    { value: 'botharms_filter', name: 'Both Arms', note: "Don't animate arms?", },
    { value: 'botharms_nospine_filter', name: 'No Spine', note: '' },
    { value: 'ch_only_filter', name: 'CH Only', note: '' },
    { value: 'corebones', name: 'Core Bones', note: '' },
    { value: 'facial_and_handik_filter', name: 'Facial, Hand IK', note: '' },
    { value: 'facial_and_mhmask_filter', name: 'Facial, MHMask', note: '' },
    { value: 'facialcapture_filter', name: 'Facial Capture', note: '' },
    { value: 'facialonly_brows', name: 'Eyebrows Only', note: '' },
    { value: 'facialonly_dialogue', name: 'Dialogue Only', note: '' },
    { value: 'facialonly_filter', name: 'Face Only', note: '' },
    { value: 'facialonly_mouth', name: 'Mouth Only', note: '' },
    { value: 'facingonly_filter', name: 'Facing Only', note: '' },
    { value: 'fps_camera_only_filter', name: 'FPS Camera', note: '' },
    { value: 'grip_l_only_filter', name: 'Grip Left', note: '' },
    { value: 'grip_l_only_no_ch_filter', name: 'Grip Left (no ch)', note: '' },
    { value: 'grip_l_only_no_ch_no_ik_filter', name: 'Grip Left (no ch, no ik)', note: '', },
    { value: 'grip_r_only_filter', name: 'Grip Right', note: '' },
    { value: 'grip_r_only_no_ch_filter', name: 'Grip Right (no ch)', note: '' },
    { value: 'grip_r_only_no_ch_no_ik_filter', name: 'Grip Right (no ch, no ik)', note: '', },
    { value: 'grip_r_only_no_ik_hand_helpers_filter', name: 'Grip Right (no ik, hand helpers)', note: '', },
    { value: 'headandneckonly_filter', name: 'Head, Neck', note: '' },
    { value: 'headandneckonly_no_fp_camera_filter', name: 'Head, Neck (No FP)', note: '', },
    { value: 'headneckandarms_filter', name: 'Head, Neck, Arms', note: '' },
    { value: 'headneckandleftarm_filter', name: 'Head, Neck, Left Arm', note: '', },
    { value: 'headneckandrightarm_filter', name: 'Head, Neck, Right Arm', note: '', },
    { value: 'headonly_filter', name: 'Head', note: '' },
    { value: 'horse_capture_filter', name: 'Horse Capture', note: '' },
    { value: 'horse_head_and_neck', name: 'Horse Head, Neck', note: '' },
    { value: 'ignoremoverblend_filter', name: 'No Mover Blend', note: '' },
    { value: 'ignoremoverblendrotationonly_filter', name: 'No Mover Blend, Rotate Only', note: '', },
    { value: 'ignoreohmoverblend_filter', name: 'Ignore oh Mover Blend', note: '', },
    { value: 'ik_recoil_l_filter', name: 'IK Recoil Left', note: '' },
    { value: 'ik_recoil_oh_filter', name: 'IK Recoil OH', note: '' },
    { value: 'ik_recoil_oh_transitionmultiplier', name: 'IK Recoil OH Multix', note: '', },
    { value: 'ik_recoil_r_filter', name: 'IK Recoil Right', note: '' },
    { value: 'ik_recoil_reload_both_hands_filter', name: 'IK Recoil Reload Hands', note: '', },
    { value: 'jacketonly_filter', name: 'Jacket', note: '' },
    { value: 'leftarm_nospine_filter', name: 'Left Arm, No Spine', note: '' },
    { value: 'leftarmonly_filter', name: 'Left Arm Only', note: '' },
    { value: 'leftfingers_and_helpers_filter', name: 'Left Fingers, Helpers', note: '', },
    { value: 'leftfingers_and_helpers_noik_filter', name: 'Left Fingers, Helpers, No IK', note: '', },
    { value: 'lefthand_fingers_filter', name: 'Left Hand, Fingers', note: '' },
    { value: 'lefthandik_and_fps_camera_filter', name: 'Left Hand IK, FP Cam', note: '', },
    { value: 'lefthandik_only_filter', name: 'Left Hand, IK Only', note: '' },
    { value: 'leftlegonly_filter', name: 'Left Leg Only', note: '' },
    { value: 'legsonly_filter', name: 'Legs Only', note: '' },
    { value: 'lolod_filter', name: 'Lo LOD', note: '' },
    { value: 'lookcontrol_and_handik_filter', name: 'Look Control, Hand IK', note: '', },
    { value: 'lookcontrol_only_filter', name: 'Look Control Only', note: '' },
    { value: 'lowerbody_filter', name: 'Lowerbody', note: '' },
    { value: 'mh_mask_and_ch_filter', name: 'MH Mask, CH', note: '' },
    { value: 'mh_mask_and_leftfingers_filter', name: 'MH Mask, Left Fingers', note: '', },
    { value: 'mh_mask_and_lefthandik_filter', name: 'MH Mask, Left Hand IK', note: '', },
    { value: 'mh_mask_and_righthandik_filter', name: 'MH Mask, Right Hand IK', note: '', },
    { value: 'mh_maskonly_filter', name: 'MH Mask Only', note: '' },
    { value: 'moveronly_filter', name: 'Mover Only', note: '' },
    { value: 'no_ph_l_carriable_filter', name: 'No Prop Hand Left Carriable', note: '', },
    { value: 'nofirstpersoncamera_filter', name: 'No FP Cam', note: '' },
    { value: 'noleftarm_filter', name: 'No Left Arm', note: '' },
    { value: 'nolefthand_filter', name: 'No Left Hand', note: '' },
    { value: 'noleftleg_filter', name: 'No Left Leg', note: '' },
    { value: 'nomover_filter', name: 'No Mover', note: '' },
    { value: 'norightarm_filter', name: 'No Right Arm', note: '' },
    { value: 'norighthand_filter', name: 'No Right Hand', note: '' },
    { value: 'norighthand_with_ik_filter', name: 'No Right Hand, IK', note: '', },
    { value: 'norightleg_filter', name: 'No Right Leg', note: '' },
    { value: 'noroot_filter', name: 'No Root', note: '' },
    { value: 'null_filter', name: 'Null', note: '' },
    { value: 'oh_pelvis_only_filter', name: 'OH Pelvis', note: '' },
    { value: 'oh_torsodir_and_oh_facingdir_filter', name: 'OH Torso Direction, OH Facing', note: '', },
    { value: 'ph_r_carriableshoulder_only_filter', name: 'Prop Right Carriable Shoulder Only', note: '', },
    { value: 'ph_rifleinverted_and_ph_l_armpitrifle_only_filter', name: 'Prop: Rifle Inverted, Armpit Rifle Only', note: '', },
    { value: 'ph_spinelevel01_only_filter', name: 'Prop: Spine 1 Only', note: '', },
    { value: 'rightarm_nospine_filter', name: 'Right Arm, No Spine', note: '' },
    { value: 'rightarmonly_filter', name: 'Right Arm Only', note: '' },
    { value: 'rightfingers_and_helpers_filter', name: 'Right Fingers, Helpers', note: '', },
    { value: 'righthand_fingers_filter', name: 'Right Hand, Fingers', note: '', },
    { value: 'righthandik_and_fps_camera_filter', name: 'Right Hand IK, FP Cam', note: '', },
    { value: 'righthandik_only_filter', name: 'Right Hand IK Only', note: '' },
    { value: 'rightlegonly_filter', name: 'Right Leg Only', note: '' },
    { value: 'rootonly_filter', name: 'Root Only', note: '' },
    { value: 'rootupperbody_filter', name: 'Root Upper Body', note: '' },
    { value: 'satchel_and_hatloc_filter', name: 'Satchel and Hat Location', note: '', },
    { value: 'satchel_and_ik_hand_helpers_filter', name: 'Satchel and IK Hand Helpers', note: '', },
    { value: 'satchel_and_ik_hand_helpers_nocam_filter', name: 'Satchel and IK Hand Helpers, No Cam', note: '', },
    { value: 'satchel_and_ik_l_hand_helper_filter', name: 'Satchel and IK Left Hand Helper', note: '', },
    { value: 'satchel_and_ik_left_hand_helpers_nocam_filter', name: 'Satchel and IK Left Hand Helper No Cam', note: '', },
    { value: 'satchel_and_ph_hand_helpers_filter', name: 'Satchel, Prop Hand Helpers', note: '', },
    { value: 'satchel_only_filter', name: 'Satchel Only', note: '' },
    { value: 'spinefeathered_filter', name: 'Spine Feathered', note: '' },
    { value: 'spineonly_filter', name: 'Spine Only', note: '' },
    { value: 'taskbodyblendedentry_ignored_dofs_filter', name: 'Blend Body, Ignore DOFs', note: '', },
    { value: 'toes_filter', name: 'Toes', note: '' },
    { value: 'trunkonly_filter', name: 'Trunk Only', note: '' },
    { value: 'upperbody_filter', name: 'Upperbody', note: '' },
    { value: 'upperbody_from_spine3_filter', name: 'Spine 3 Upperbody', note: '', },
    { value: 'upperbodyandfacing_filter', name: 'Upperbody, Facing', note: '' },
    { value: 'upperbodyandik_filter', name: 'Upperbody, IK', note: '' },
    { value: 'upperbodybicycledriveby_filter', name: 'Upperbody, Bicycle', note: '', },
    { value: 'upperbodyfeathered_cover_filter', name: 'Upperbody Feathered, Cover', note: '', },
    { value: 'upperbodyfeathered_filter', name: 'Upperbody Feathered', note: '', },
    { value: 'upperbodyfeathered_noleftarm_partialhead_filter', name: 'Upperbody Feathered, No Left Arm, Partial Head', note: '', },
    { value: 'upperbodyfeathered_nolefttarm_filter', name: 'Upperbody Feathered, No Left Arm', note: '', },
    { value: 'upperbodyfeathered_norightarm_filter', name: 'Upperbody Feathered, No Right Arm', note: '', },
    { value: 'upperbodyfeathered_norightarm_partialhead_filter', name: 'Upperbody Feathered, No Right Arm, Partial Head', note: '', },
    { value: 'upperbodyfeathered_partialhead_filter', name: 'Upperbody Feathered, Partial Head', note: '', },
    { value: 'upperbodyfixup_filter', name: 'Upperbody Fixup', note: '' },
    { value: 'upperbodyfixupandfacing_filter', name: 'Upperbody Fixup, Facing', note: '', },
    { value: 'upperbodynoarms_filter', name: 'Upperbody, No Arms', note: '' },
    { value: 'upperbodynomover_filter', name: 'Upperbody, No Mover', note: '' },
    { value: 'upperbodywithsatchel_filter', name: 'Upperbody, Satchel', note: '', },
    { value: 'upperonly_filter', name: 'Upper Only', note: '' },
    { value: 'weaponswap_filter', name: 'Weapon Swap', note: '' },
];
/* prettier-ignore-end */

const mockScene = {
    objects: [
        {
            collision: true,
            coords_x: -2808.27,
            coords_y: -718.63,
            coords_z: 271.11,
            distance: 9.7392,
            frozen: true,
            handle: 8305927,
            modelHash: -899122294,
            modelName: "p_spookynative04x",
            networkID: "-",
            rot_x: 1.56,
            rot_y: -4.58,
            rot_z: 101.11,
            visible: true,
        },
        {
            collision: true,
            coords_x: -2805.57,
            coords_y: -725.55,
            coords_z: 272.75,
            distance: 17.1865,
            frozen: true,
            handle: 8305415,
            modelHash: -278966957,
            modelName: "p_spookynative05x",
            networkID: "-",
            rot_x: -23.78,
            rot_y: -2.71,
            rot_z: -169.04,
            visible: true,
        },
        {
            collision: true,
            coords_x: -2804.78,
            coords_y: -728.03,
            coords_z: 271.75,
            distance: 19.6644,
            frozen: true,
            handle: 8305159,
            modelHash: 153380363,
            modelName: "da_tipi_hide_lrg_dr",
            networkID: "-",
            rot_x: -3.51,
            rot_y: 0.01,
            rot_z: 133.64,
            visible: true,
        },
        {
            collision: true,
            coords_x: -2804.58,
            coords_y: -728.55,
            coords_z: 272.14,
            distance: 20.2406,
            frozen: true,
            handle: 8304903,
            modelHash: 312012583,
            modelName: "p_campfire02xb",
            networkID: "-",
            rot_x: -5.6,
            rot_y: -4.42,
            rot_z: -13.9,
            visible: true,
        },
    ],
}

const mockData = {
    ped: Array.from(
        { length: 100 },
        () =>
            `${getRandomElement(pedPrefixes)}_${getRandomElement(pedPrefixes)}_${randomSuffix()}`
    ),
    object: Array.from(
        { length: 100 },
        () =>
            `${getRandomElement(objectPrefixes)}_${getRandomElement(objectPrefixes)}_${randomSuffix()}`
    ),
    pickup: Array.from(
        { length: 100 },
        () =>
            `${getRandomElement(pickupPrefixes)}_${getRandomElement(pickupPrefixes)}_${randomSuffix()}`
    ),
    vehicle: Array.from(
        { length: 100 },
        () =>
            `${getRandomElement(vehiclePrefixes)}_${getRandomElement(vehiclePrefixes)}_${randomSuffix()}`
    ),
    propset: Array.from(
        { length: 100 },
        () =>
            `${getRandomElement(propsetPrefixes)}_${getRandomElement(propsetPrefixes)}_${randomSuffix()}`
    ),
};

const mockResponses = {
    initAnims: () => ({ animations: animjsonString }),
    initAnimFlags: () => ({ animflags: JSON.stringify(animFlags) }),
    initIKAnimFlags: () => ({ animikflags: JSON.stringify(animikFlags) }),
    initTaskFilters: () => ({ taskfilters: JSON.stringify(taskfilters) }),
    fetchSettings: () => ({
        nearby: JSON.stringify({
            object: true,
            ped: true,
            vehicle: true,
            other: false,
            origin: 'camera',
            range: 50,
        }),
        tags: JSON.stringify({
            sort: 'dist',
        }),
        theme: JSON.stringify({
            color: 'retro_wave',
            divider: 'chevron',
            border: true,
            borderrad: false,
            borderradamount: 8,
        }),
    }),
    fetchObjects: () => ({
        ped: JSON.stringify(mockData.ped),
        object: JSON.stringify(mockData.object),
        pickup: JSON.stringify(mockData.pickup),
        vehicle: JSON.stringify(mockData.vehicle),
        propset: JSON.stringify(mockData.propset),
        other: JSON.stringify(mockData.other || []),
    }),
    scenesList: () => ({
        scenes: JSON.stringify([
            { name: 'default', objects: [] },
            {
                name: 'test',
                objects: [
                    {
                        model: 0x3dc6147e,
                        coords_x: -2816.43,
                        coords_y: -697.29,
                        coords_z: 268.31,
                        rot_x: -10.56,
                        rot_y: -4.85,
                        rot_z: -0.45,
                        frozen: true,
                        collision: true,
                    },
                ],
            },
        ]),
    }),
    deactivateMode: () => ({}),
    toggleMode: () => ({}),
    deactivateMCP: () => ({}),
    activateMCP: () => ({}),
    selectSpawnObject: () => ({}),
    saveSettings: () => ({}),
    setNearbyOriginPos: () => ({}),
    nearbyObjects: () => ({
        nearbyObjects: [
            {
                handle: 12345,
                model: '101010',
                modelName: 'test_model',
                distance: 2.0,
                objType: 'object',
            },
            {
                handle: 999,
                model: '990099',
                modelName: 'test_model',
                distance: 123.05,
                objType: 'object',
            },
        ],
    }),
    trackObject: () => ({}),
    loadScene: () => ({}),
    getScene: () => mockScene,
    saveScene: () => ({}),
    dispatchKeyEvents: () => ({}),
    sendCursorPos: () => ({}),
    playAnimation: () => ({}),
    stopAnim: () => ({}),
    gizmoStop: () => ({}),
    spawnPreviewObject: () => ({}),
    removePreviewObject: () => ({}),
    setTheme: () => ({}),
};

function getMockResponse(endpoint) {
    if (mockResponses[endpoint]) {
        if (window.endpointMute && !window.endpointMute[endpoint]) {
            console.log(
                `[Mock][NUI Return] ${endpoint}: `,
                mockResponses[endpoint]()
            );
        }
        return mockResponses[endpoint]();
    }
    console.warn(`No mock response defined for endpoint '${endpoint}'`);
    return {};
    // throw new Error(`No mock response defined for endpoint '${endpoint}'`);
}

function sendMockEvent(message, data) {
    console.log(
        `[Mock][CLIENT Send] ${message}: `,
        data
    );
    const e = new MessageEvent(message, { data: data });
    window.dispatchEvent(e);
}

console.log('Running dev-mocks');

window.getMockResponse = getMockResponse;
window.endpointMute = {
    sendCursorPos: true,
    nearbyObjects: true,
    getScene: true,
    trackObject: true,
    spawnPreviewObject: true,
    removePreviewObject: true,
};

document.body.style.backgroundColor = '#333333';

// Register global promise for messagesReady
window.messagesReady = window.messagesReady || new Deferred();
window.messagesReady.promise.then((data) => {
    sendMockEvent('message', {
        type: testHud,
        state: true,
    });
    sendMockEvent('message', {
        type: 'updateCamera',
        camera: { speed: '0.20' },
    });
});
