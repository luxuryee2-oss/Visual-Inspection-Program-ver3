// backend/server.js
// SharePoint 업로드 + 리스트 기록용 API 서버 (CommonJS)

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
const upload = multer();

const {
  TENANT_ID,
  CLIENT_ID,
  CLIENT_SECRET,
  SHAREPOINT_SITE_ID,
  SHAREPOINT_LIST_ID,
  SHAREPOINT_DRIVE_ID,
  IMAGE_FOLDER_PATH = 'inspection-images',
} = process.env;

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.warn('[WARN] Azure AD (TENANT_ID / CLIENT_ID / CLIENT_SECRET)가 설정되지 않았습니다.');
}
if (!SHAREPOINT_SITE_ID || !SHAREPOINT_LIST_ID || !SHAREPOINT_DRIVE_ID) {
  console.warn('[WARN] SharePoint SITE/LIST/DRIVE ID가 설정되지 않았습니다.');
}

// CORS: 프론트는 http://localhost:3000 에서만 요청
app.use(cors({ origin: 'http://localhost:3000' }));

async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const res = await fetch(url, { method: 'POST', body: params });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function uploadToSharePoint(fileBuffer, fileName, contentType) {
  const token = await getAccessToken();
  const url =
    `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}` +
    `/drives/${SHAREPOINT_DRIVE_ID}/root:/${encodeURIComponent(
      IMAGE_FOLDER_PATH
    )}/${encodeURIComponent(fileName)}:/content`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload error: ${res.status} ${text}`);
  }

  return res.json(); // webUrl, id 등 포함
}

async function createListItem(fields) {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/lists/${SHAREPOINT_LIST_ID}/items`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List create error: ${res.status} ${text}`);
  }

  return res.json();
}

app.post(
  '/api/inspection',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
    { name: 'side', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { productName, inspector, note, datamatrix } = req.body;

      if (!productName || !inspector) {
        return res
          .status(400)
          .json({ error: 'productName, inspector는 필수입니다.' });
      }

      const images = {};

      const uploadSide = async (key) => {
        const files = req.files[key];
        if (!files || !files[0]) return;
        const file = files[0];
        const ts = Date.now();
        const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
        const fileName = `${key}_${ts}.${ext}`;
        const info = await uploadToSharePoint(
          file.buffer,
          fileName,
          file.mimetype
        );
        images[`${key}Url`] = info.webUrl;
      };

      await uploadSide('front');
      await uploadSide('back');
      await uploadSide('side');

      const fields = {
        ProductName: productName,
        Inspector: inspector,
        Note: note || '',
        Datamatrix: datamatrix || '',
        FrontImageUrl: images.frontUrl || '',
        BackImageUrl: images.backUrl || '',
        SideImageUrl: images.sideUrl || '',
      };

      const item = await createListItem(fields);
      res.json({ ok: true, itemId: item.id, images });
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'server error', detail: err.message });
      }
    }
  }
);

app.get('/', (req, res) => {
  res.json({
    message: 'SharePoint Inspection API Server',
    version: '1.0.0',
    endpoints: {
      inspection: 'POST /api/inspection',
    },
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`SharePoint upload server listening on port ${PORT}`);
});
