import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { imageMetadataGetter } from './imageMetadata';

/**
 * Tải file bất kỳ (ảnh, pdf, zip...) và lưu vào thư mục tạm trong n8n
 */
export async function saveFile(url: string): Promise<string | null> {
	try {
		const n8nUserFolder = process.env.N8N_USER_FOLDER || path.join(os.homedir(), '.n8n');
		const dataStoragePath = path.join(n8nUserFolder, 'temp_files');

		if (!fs.existsSync(dataStoragePath)) {
			fs.mkdirSync(dataStoragePath, { recursive: true });
		}

		const urlPath = new URL(url).pathname;
		const ext = path.extname(urlPath) || '.bin';

		const timestamp = Date.now();
		const filePath = path.join(dataStoragePath, `temp-${timestamp}${ext}`);

		const { data } = await axios.get(url, { responseType: 'arraybuffer' });
		fs.writeFileSync(filePath, data);

		return filePath;
	} catch (error) {
		console.error('Lỗi khi tải/lưu file:', error);
		return null;
	}
}

/**
 * Xoá file đã lưu
 */
export function removeFile(filePath: string): void {
	try {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	} catch (error) {
		console.error('Lỗi khi xoá file:', error);
	}
}

/**
 * Parse cookie từ credential - xử lý cả v1 (double stringify) và v2
 * @param cookieRaw - Cookie từ credential
 * @returns Array cookie đã parse
 * @throws Error nếu format không hợp lệ
 */
export function parseCookieFromCredential(cookieRaw: any): any[] {
	try {
		// Nếu là string, parse lần 1
		let parsed = typeof cookieRaw === 'string' ? JSON.parse(cookieRaw) : cookieRaw;
		
		// Nếu vẫn là string (double stringify từ v1), parse lần 2
		if (typeof parsed === 'string') {
			parsed = JSON.parse(parsed);
		}
		
		// Kiểm tra phải là Array
		if (!Array.isArray(parsed)) {
			throw new Error('Cookie must be an array');
		}
		
		return parsed;
	} catch (error) {
		throw new Error(`Invalid cookie format: ${(error as Error).message}`);
	}
}

/**
 * Export imageMetadataGetter để sử dụng ở các node khác
 */
export { imageMetadataGetter };
