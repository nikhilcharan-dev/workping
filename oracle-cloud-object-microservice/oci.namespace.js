import client from "./oci.client.js";
import logger from "./logger.js";

let namespaceName = null;

export async function getNamespace() {
    if (!namespaceName) {
        const response = await client.getNamespace({});
        namespaceName = response.value;
        logger.info({ namespace: namespaceName }, "Namespace initialized");
    }
    return namespaceName;
}
