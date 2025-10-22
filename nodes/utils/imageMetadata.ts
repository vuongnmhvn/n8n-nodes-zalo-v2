import fs from 'fs';

/**
 * Hàm lấy metadata của ảnh mà KHÔNG cần thư viện sharp
 * Trả về width và height mặc định vì không thể lấy chính xác mà không dùng thư viện xử lý ảnh
 * 
 * LƯU Ý: width và height là giá trị mặc định (0)
 * Nếu cần width/height thực tế, bạn phải cài đặt sharp hoặc thư viện khác
 */
export async function imageMetadataGetter(filePath: string): Promise<{
	height: number;
	width: number;
	size: number;
}> {
	try {
		// Đọc thông tin file
		const stats = await fs.promises.stat(filePath);
		
		// Trả về metadata với width/height mặc định
		// zca-js yêu cầu width và height phải là number, không được undefined
		return {
			width: 0,  // Không thể lấy chính xác mà không dùng thư viện
			height: 0, // Không thể lấy chính xác mà không dùng thư viện
			size: stats.size,
		};
	} catch (error) {
		throw new Error(`Không thể đọc metadata của file ${filePath}: ${(error as Error).message}`);
	}
}

/**
 * Phiên bản với Sharp (nếu bạn muốn dùng)
 * Uncomment code bên dưới và cài đặt sharp: pnpm add sharp
 */
/*
import sharp from 'sharp';

export async function imageMetadataGetterWithSharp(filePath: string): Promise<{
	height: number;
	width: number;
	size: number;
}> {
	try {
		const data = await fs.promises.readFile(filePath);
		const metadata = await sharp(data).metadata();
		
		return {
			height: metadata.height || 0,
			width: metadata.width || 0,
			size: metadata.size || data.length,
		};
	} catch (error) {
		throw new Error(`Không thể đọc metadata của ảnh ${filePath}: ${(error as Error).message}`);
	}
}
*/
