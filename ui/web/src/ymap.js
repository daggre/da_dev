// TODO: YMAP is using bad rotation, might be going CW vs CCW
const STREAMING_EXTENTS_PADDING = 400;
const DEFAULT_LOD = 500;

const EntityFlags = {
    INVISIBLE: 0x1,
    NO_COLLISION: 0x2,
    FROZEN: 0x20,
    DISABLE_LIGHTING: 0x40,
    DYNAMIC_ENTITY: 0x100000,
};

/**
 * Set a flag in the given flag value.
 * @param {number} flags - The current flags value.
 * @param {number} flag - The flag to set.
 * @returns {number} - Updated flags value.
 */
function setFlag(flags, flag) {
    return flags | flag;
}

/**
 * Unset (remove) a flag in the given flag value.
 * @param {number} flags - The current flags value.
 * @param {number} flag - The flag to unset.
 * @returns {number} - Updated flags value.
 */
function unsetFlag(flags, flag) {
    return flags & ~flag;
}

/**
 * Check if a flag is set in the given flag value.
 * @param {number} flags - The current flags value.
 * @param {number} flag - The flag to check.
 * @returns {boolean} - True if the flag is set, false otherwise.
 */
function hasFlag(flags, flag) {
    return (flags & flag) !== 0;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
    return radians * (180 / Math.PI);
}

function normalizeAngle(angle) {
    return ((angle + 180) % 360) - 180;
}

export function parseYMAP(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        if (xmlDoc.querySelector("parsererror")) {
            console.error("Invalid XML format.");
            return { success: false, objects: [] };
        }

        const sceneObjects = [];
        const entities = xmlDoc.querySelector("entities");

        if (!entities) {
            console.error("No entities found in XML.");
            return { success: false, objects: [] };
        }

        entities.querySelectorAll("Item[type='CEntityDef']").forEach(item => {
            const modelName = item.querySelector("archetypeName")?.textContent || "unknown";
            const positionNode = item.querySelector("position");
            const rotationNode = item.querySelector("rotation");
            const flagsNode = item.querySelector("flags");

            const position = positionNode ? {
                x: parseFloat(positionNode.getAttribute("x")) || 0,
                y: parseFloat(positionNode.getAttribute("y")) || 0,
                z: parseFloat(positionNode.getAttribute("z")) || 0
            } : { x: 0, y: 0, z: 0 };

            const quaternion = rotationNode ? {
                w: parseFloat(rotationNode.getAttribute("w")) || 1,
                x: parseFloat(rotationNode.getAttribute("x")) || 0,
                y: parseFloat(rotationNode.getAttribute("y")) || 0,
                z: parseFloat(rotationNode.getAttribute("z")) || 0
            } : { w: 1, x: 0, y: 0, z: 0 };

            // const euler = quaternionToEuler(
            //     quaternion.x,
            //     quaternion.y,
            //     quaternion.z,
            //     quaternion.w,
            // );

            const flagsValue = parseInt(flagsNode?.getAttribute("value")) || 0;

            sceneObjects.push({
                modelName,
                pos_x: position.x,
                pos_y: position.y,
                pos_z: position.z,
                quaternion_x: quaternion.x,
                quaternion_y: quaternion.y,
                quaternion_z: quaternion.z,
                quaternion_w: quaternion.w,
                // rot_x: euler.roll, // Use quaternion on import
                // rot_y: euler.pitch, // Use quaternion on import
                // rot_z: euler.yaw, // Use quaternion on import
                frozen: hasFlag(flagsValue, EntityFlags.FROZEN),
                visible: true,
                // visible: !hasFlag(flagsValue, EntityFlags.INVISIBLE),
                collision: !hasFlag(flagsValue, EntityFlags.NO_COLLISION),
            });
        });

        return { success: true, objects: sceneObjects };
    } catch (error) {
        console.error("Failed to parse YMAP XML:", error);
        return { success: false, objects: [] };
    }
}

export function exportYMAP(scene) {
    let minX, maxX, minY, maxY, minZ, maxZ;

    const xmlDoc = document.implementation.createDocument(null, "CMapData");
    const root = xmlDoc.documentElement;

    function createElement(name, attributes, textContent = null) {
        const element = xmlDoc.createElement(name);
        Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, value));
        if (textContent) element.textContent = textContent;
        return element;
    }

    root.appendChild(createElement("flags", { value: "2" }));
    root.appendChild(createElement("contentFlags", { value: "65" }));

    const entitiesNode = createElement("entities");

    scene.objects.forEach((obj) => {
        let flags = 1572865; // Default entity flags

        if (obj.frozen) flags = setFlag(flags, EntityFlags.FROZEN);
        // if (!obj.visible) flags = setFlag(flags, EntityFlags.INVISIBLE);
        if (!obj.collision) flags = setFlag(flags, EntityFlags.NO_COLLISION);

        const q = eulerToQuaternion(
            obj.rot_x,
            obj.rot_y,
            obj.rot_z
        );

        minX = minX === undefined ? obj.pos_x : Math.min(minX, obj.pos_x);
        maxX = maxX === undefined ? obj.pos_x : Math.max(maxX, obj.pos_x);
        minY = minY === undefined ? obj.pos_y : Math.min(minY, obj.pos_y);
        maxY = maxY === undefined ? obj.pos_y : Math.max(maxY, obj.pos_y);
        minZ = minZ === undefined ? obj.pos_z : Math.min(minZ, obj.pos_z);
        maxZ = maxZ === undefined ? obj.pos_z : Math.max(maxZ, obj.pos_z);

        const itemNode = createElement("Item", { type: "CEntityDef" });

        itemNode.appendChild(createElement("archetypeName", {}, obj.modelName));
        itemNode.appendChild(createElement("flags", { value: flags }));
        itemNode.appendChild(createElement("position", {
            x: obj.pos_x,
            y: obj.pos_y,
            z: obj.pos_z,
        }));
        itemNode.appendChild(createElement("rotation", {
            w: q.w,
            x: q.x,
            y: q.y,
            z: q.z,
        }));
        itemNode.appendChild(createElement("scaleXY", { value: "1" }));
        itemNode.appendChild(createElement("scaleZ", { value: "1" }));
        itemNode.appendChild(createElement("parentIndex", { value: "-1" }));
        itemNode.appendChild(createElement("lodDist", { value: DEFAULT_LOD }));
        itemNode.appendChild(createElement("childLodDist", { value: DEFAULT_LOD }));
        itemNode.appendChild(createElement("lodLevel", {}, "LODTYPES_DEPTH_HD"));
        itemNode.appendChild(createElement("numChildren", { value: "0" }));
        itemNode.appendChild(createElement("ambientOcclusionMultiplier", { value: "255" }));
        itemNode.appendChild(createElement("artificialAmbientOcclusion", { value: "255" }));

        entitiesNode.appendChild(itemNode);
    });

    if (minX !== undefined) {
        root.appendChild(createElement("streamingExtentsMin", {
            x: minX - STREAMING_EXTENTS_PADDING,
            y: minY - STREAMING_EXTENTS_PADDING,
            z: minZ - STREAMING_EXTENTS_PADDING
        }));
        root.appendChild(createElement("streamingExtentsMax", {
            x: maxX + STREAMING_EXTENTS_PADDING,
            y: maxY + STREAMING_EXTENTS_PADDING,
            z: maxZ + STREAMING_EXTENTS_PADDING
        }));
        root.appendChild(createElement("entitiesExtentsMin", { x: minX, y: minY, z: minZ }));
        root.appendChild(createElement("entitiesExtentsMax", { x: maxX, y: maxY, z: maxZ }));
    }

    root.appendChild(entitiesNode);

    const rawXml = new XMLSerializer().serializeToString(xmlDoc);

    return `<?xml version="1.0"?>\n` + formatXML(rawXml);
}

function formatXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const tab = "  "; // Use 2 spaces for indentation
    let formatted = "";
    let indentLevel = 0;

    // Elements that should remain inline
    const inlineElements = new Set(["archetypeName", "lodLevel"]);

    function formatNode(node, indent) {
        if (node.nodeType === Node.TEXT_NODE) {
            const trimmedText = node.nodeValue.trim();
            if (trimmedText) {
                formatted += trimmedText; // Keep inline text values without extra indentation
            }
            return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.nodeName;
            const attributes = [...node.attributes]
                .map(attr => `${attr.name}="${attr.value}"`)
                .join(" ");

            if (node.childNodes.length === 0) {
                formatted += `${indent}<${tagName}${attributes ? " " + attributes : ""}/>\n`;
                return;
            }

            if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE && inlineElements.has(tagName)) {
                formatted += `${indent}<${tagName}${attributes ? " " + attributes : ""}>${node.firstChild.nodeValue.trim()}</${tagName}>\n`;
                return;
            }

            formatted += `${indent}<${tagName}${attributes ? " " + attributes : ""}>\n`;

            [...node.childNodes].forEach(child => formatNode(child, indent + tab));

            formatted += `${indent}</${tagName}>\n`;
        }
    }

    formatNode(xmlDoc.documentElement, ""); // Start from root

    return formatted.trim(); // Remove trailing newlines
}

function eulerToQuaternion_DEPRECATED(pitch, roll, yaw) {
    // Convert degrees to radians
    const p = toRadians(-pitch);
    const r = toRadians(-yaw);
    const y = toRadians(-roll);

    // Precompute trigonometric values
    const cy = Math.cos(y * 0.5);
    const sy = Math.sin(y * 0.5);
    const cr = Math.cos(r * 0.5);
    const sr = Math.sin(r * 0.5);
    const cp = Math.cos(p * 0.5);
    const sp = Math.sin(p * 0.5);

    // Compute quaternion components
    return {
        x: cy * sp * cr + sy * cp * sr,
        y: sy * cp * cr - cy * sp * sr,
        z: cy * cp * sr - sy * sp * cr,
        w: cy * cp * cr + sy * sp * sr
    };
}

function eulerToQuaternion(eul_x, eul_y, eul_z) {
    // Convert degrees to radians
    const yaw = toRadians(-eul_z);  // Yaw (Z-axis)
    const roll = toRadians(-eul_x); // Roll (X-axis)
    const pitch = toRadians(-eul_y); // Pitch (Y-axis)

    // Precompute trigonometric values
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);

    // Quaternion components (ROT_ZXY order: Yaw → Roll → Pitch)
    return {
        w: cr * cp * cy - sr * sp * sy, // Scalar component
        x: sr * cp * cy + cr * sp * sy, // Roll (X)
        y: cr * sp * cy - sr * cp * sy, // Pitch (Y)
        z: cr * cp * sy + sr * sp * cy, // Yaw (Z)
    };
}

function quaternionToEuler(x, y, z, w) {
    // Normalize quaternion to prevent floating-point issues
    const norm = Math.sqrt(x * x + y * y + z * z + w * w);
    x /= norm;
    y /= norm;
    z /= norm;
    w /= norm;

    // Compute Pitch (Y-axis)
    const sinp = 2 * (w * y - z * x);
    let pitch;
    if (Math.abs(sinp) >= 1) {
        pitch = Math.sign(sinp) * 90; // Clamp at ±90° (gimbal lock case)
    } else {
        pitch = toDegrees(Math.asin(sinp));
    }

    // Compute Yaw (Z-axis)
    const yaw = toDegrees(Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)));

    // Compute Roll (X-axis)
    const roll = toDegrees(Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)));

    return { pitch, roll, yaw };
}
