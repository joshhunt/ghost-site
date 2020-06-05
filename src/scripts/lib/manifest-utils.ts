import axios from "axios";
import fs from "fs-extra";
import { DestinyManifest, ServerResponse } from "bungie-api-ts/destiny2";

const API_KEY = "c3e5fac733944b058c558a0a0ef15a34";
const VERSION_FILE_PATH = "./generated-data/version.json";

interface VersionFile {
  version: string;
}

function versionFromManifest(manifest: DestinyManifest) {
  return manifest.version;
}

export async function getCurrentManifestVersion() {
  try {
    const versionData: VersionFile = await fs.readJson(VERSION_FILE_PATH);
    return versionData.version;
  } catch {
    return null;
  }
}

export async function getApiManifestVersion() {
  const manifestResp = await axios.get<ServerResponse<DestinyManifest>>(
    `https://www.bungie.net/Platform/Destiny2/Manifest`,
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  return versionFromManifest(manifestResp.data.Response);
}

let apiVersion: string;
export async function hasManifestChanged() {
  const currentVersion = await getCurrentManifestVersion();
  apiVersion = await getApiManifestVersion();

  console.log("currentVersion:", currentVersion);
  console.log("apiVersion:", apiVersion);

  if (currentVersion !== apiVersion) {
    return true; // change, should run
  } else {
    return false; // has not changed, don't run
  }
}

export async function saveManifestVersion() {
  if (!apiVersion) {
    throw new Error(
      "apiVersion is empty when trying to save. *extremely Rove voice* What the??"
    );
  }

  const data: VersionFile = {
    version: apiVersion,
  };

  await fs.writeJSON(VERSION_FILE_PATH, data);
}
