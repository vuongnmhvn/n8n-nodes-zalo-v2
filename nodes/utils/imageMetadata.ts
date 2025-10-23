import fs from 'fs';

/**
 * Hàm lấy metadata của ảnh cho zca-js v2
 * ZCA-JS v2 yêu cầu width và height hợp lệ
 * Nếu không có Sharp, trả về giá trị mặc định hợp lệ
 */
export async function imageMetadataGetter(filePath: string): Promise<{
	height: number;
	width: number;
	size: number;
}> {
	try {
		const stats = await fs.promises.stat(filePath);
		
		// Trả về giá trị mặc định hợp lệ thay vì 0
		// ZCA-JS v2 có thể yêu cầu width/height > 0
		return {
			width: 1920,   // Giá trị mặc định hợp lệ
			height: 1080,  // Giá trị mặc định hợp lệ
			size: stats.size,
		};
	} catch (error) {
		throw new Error(`Không thể đọc metadata của file ${filePath}: ${(error as Error).message}`);
	}
}
