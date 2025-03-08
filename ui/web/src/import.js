function parseYMAP(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        // Error check: If XML is invalid, `parsererror` will be present
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

            const rotation = rotationNode ? {
                w: parseFloat(rotationNode.getAttribute("w")) || 1,
                x: parseFloat(rotationNode.getAttribute("x")) || 0,
                y: parseFloat(rotationNode.getAttribute("y")) || 0,
                z: parseFloat(rotationNode.getAttribute("z")) || 0
            } : { w: 1, x: 0, y: 0, z: 0 };

            const frozen = flagsNode ? (parseInt(flagsNode.getAttribute("value")) & 32) !== 0 : false;

            sceneObjects.push({
                modelName,
                coords_x: position.x,
                coords_y: position.y,
                coords_z: position.z,
                rotation_w: rotation.w,
                rotation_x: rotation.x,
                rotation_y: rotation.y,
                rotation_z: rotation.z,
                frozen
            });
        });

        return { success: true, objects: sceneObjects };
    } catch (error) {
        console.error("Failed to parse YMAP XML:", error);
        return { success: false, objects: [] };
    }
}

export function importScene(sceneData) {
    const { success, objects } = parseYMAP(sceneData);
    console.log("Importing scene data...", success, objects);

    if (!success) {
        console.log("Failed to import scene data.");
        return;
    }

    // TODO: implement importScene handler
    // const resp = sendClientMessage("importScene", { objects });
    if (resp.success) {
        console.log("Scene imported successfully.");
    } else {
        console.log("Failed to import scene data.");
    }
}
