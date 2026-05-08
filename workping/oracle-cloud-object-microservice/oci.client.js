import path from "path";
import common from "oci-common";
import objectStorage from "oci-objectstorage";

const configPath = process.env.OCI_CONFIG_PATH || path.resolve(".oci", "config");
const profile = process.env.OCI_PROFILE || "DEFAULT";

const provider = new common.ConfigFileAuthenticationDetailsProvider(configPath, profile);

const client = new objectStorage.ObjectStorageClient({
    authenticationDetailsProvider: provider,
});

export default client;
