import { getAccessToken } from './auth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const LUMINA_FOLDER = 'Lumina';

async function driveHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${token}` };
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
}

export async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const headers = await driveHeaders();
  let q = `name='${name}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;

  const searchResp = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    { headers },
  );
  const searchData = await searchResp.json();
  if (searchData.files?.length) return searchData.files[0].id;

  const body: Record<string, unknown> = { name, mimeType: FOLDER_MIME };
  if (parentId) body.parents = [parentId];
  const createResp = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const created = await createResp.json();
  return created.id;
}

export async function getLuminaFolderId(): Promise<string> {
  return findOrCreateFolder(LUMINA_FOLDER);
}

export async function listFiles(folderId: string): Promise<DriveFile[]> {
  const headers = await driveHeaders();
  const q = `'${folderId}' in parents and trashed=false`;
  const fields = 'files(id,name,mimeType,modifiedTime,parents)';
  const resp = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${fields}&pageSize=1000&spaces=drive`,
    { headers },
  );
  const data = await resp.json();
  return data.files || [];
}

export async function readTextFile(fileId: string): Promise<string> {
  const headers = await driveHeaders();
  const resp = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers });
  return resp.text();
}

export async function readBlobFile(fileId: string): Promise<Blob> {
  const headers = await driveHeaders();
  const resp = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers });
  return resp.blob();
}

export async function writeTextFile(
  name: string,
  content: string,
  mimeType: string,
  folderId: string,
  existingFileId?: string,
): Promise<DriveFile> {
  const headers = await driveHeaders();

  if (existingFileId) {
    const resp = await fetch(
      `${UPLOAD_API}/files/${existingFileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': mimeType },
        body: content,
      },
    );
    return resp.json();
  }

  const metadata = { name, parents: [folderId], mimeType };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const resp = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`,
    { method: 'POST', headers: { Authorization: headers.Authorization }, body: form },
  );
  return resp.json();
}

export async function writeBlobFile(
  name: string,
  blob: Blob,
  folderId: string,
  existingFileId?: string,
): Promise<DriveFile> {
  const headers = await driveHeaders();

  if (existingFileId) {
    const resp = await fetch(
      `${UPLOAD_API}/files/${existingFileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': blob.type },
        body: blob,
      },
    );
    return resp.json();
  }

  const metadata = { name, parents: [folderId], mimeType: blob.type };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const resp = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`,
    { method: 'POST', headers: { Authorization: headers.Authorization }, body: form },
  );
  return resp.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  const headers = await driveHeaders();
  await fetch(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE', headers });
}
