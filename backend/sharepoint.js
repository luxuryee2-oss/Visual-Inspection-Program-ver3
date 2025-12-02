// backend/sharepoint.js
import { ClientSecretCredential } from "@azure/identity";
import fetch from "node-fetch";
import "dotenv/config"; // .env 읽기

const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

// 1. 토큰 받기
export async function getToken() {
  const credential = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );
  const scope = "https://graph.microsoft.com/.default";
  const token = await credential.getToken(scope);
  return token.token;
}

// 2. Site ID 찾기
export async function getSiteId(host, sitePath) {
  const accessToken = await getToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${host}:${sitePath}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await res.json();
  return data.id;
}

// 3. List ID 찾기
export async function getListIdByName(siteId, listName) {
  const accessToken = await getToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await res.json();
  const target = data.value.find(
    (list) =>
      list.name === listName || list.displayName === listName
  );

  return target?.id;
}

// 4. Drive ID 찾기
export async function getDriveIdByName(siteId, driveName) {
  const accessToken = await getToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await res.json();
  const target = data.value.find((drive) => drive.name === driveName);
  return target?.id;
}

// 5. 실제 파일 업로드
export async function uploadImageToSharePoint(fileBuffer, fileName) {
  const accessToken = await getToken();
  const driveId = process.env.SHAREPOINT_DRIVE_ID;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/사진/${fileName}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "image/jpeg",
      },
      body: fileBuffer,
    }
  );

  const data = await res.json();
  return data;
}
