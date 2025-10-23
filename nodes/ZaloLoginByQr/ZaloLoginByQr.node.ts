import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { Zalo } from 'zca-js';
import { imageMetadataGetter } from '../utils/helper';
import axios from 'axios';

export class ZaloLoginByQr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Login Via QR Code',
		name: 'zaloLoginByQr',
		// @ts-ignore
		group: ['Zalo'],
		version: 1,
		description: 'Đăng nhập Zalo bằng QR code và tự động tạo credential',
		defaults: {
			name: 'Zalo Login Via QR Code',
		},
		// @ts-ignore
		inputs: ['main'],
		// @ts-ignore
		outputs: ['main'],
		icon: 'file:../shared/zalo.svg',
		credentials: [
			{
				name: 'n8nZaloApi',
				required: true,
				displayName: 'n8n API Credential',
			},
		],
		properties: [
			{
				displayName: 'Proxy',
				name: 'proxy',
				type: 'string',
				default: '',
				placeholder: 'https://user:pass@host:port',
				description: 'HTTP proxy (optional)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const proxy = this.getNodeParameter('proxy', 0, '') as string;
		const timeout = 30; // 30 seconds for QR generation
		const fileName = 'zalo-qr-code.png';

		try {
			// Get n8n API credentials
			const n8nCred = await this.getCredentials('n8nZaloApi');
			const n8nApiUrl = n8nCred.url as string || 'http://localhost:5678';
			const n8nApiKey = n8nCred.apiKey as string;

			// Initialize Zalo với imageMetadataGetter
			const zaloOptions: any = {
				selfListen: true,
				logging: true,
				imageMetadataGetter,
			};

			if (proxy) {
				zaloOptions.proxy = proxy;
			}

			const zalo = new Zalo(zaloOptions);
			
			console.log('🔐 Starting Zalo QR login...');

			// Promise chỉ để lấy QR code (không chờ scan)
			const qrCodePromise = new Promise<string>((resolve, reject) => {
				let isResolved = false;

				const timeoutId = setTimeout(() => {
					if (!isResolved) {
						isResolved = true;
						reject(new NodeOperationError(this.getNode(), 'Timeout generating QR code'));
					}
				}, timeout * 1000);

				(async () => {
					try {
						// @ts-ignore
						const api = await zalo.loginQR(null, async (qrEvent: any) => {
							console.log(`📱 QR Event Type: ${qrEvent.type}`);

							switch (qrEvent.type) {
								case 0: // QRCodeGenerated
									if (qrEvent?.data?.image && !isResolved) {
										const qrCodeBase64 = qrEvent.data.image;
										console.log('✅ QR code generated, length:', qrCodeBase64.length);
										
										clearTimeout(timeoutId);
										isResolved = true;
										resolve(qrCodeBase64);
									}
									break;

								case 1: // QRCodeExpired
									console.log('⏰ QR code expired');
									break;

								case 2: // QRCodeScanned
									console.log('📲 QR code scanned by user');
									break;

								case 3: // QRCodeDeclined
									console.log('❌ Login declined by user');
									break;

								case 4: // GotLoginInfo
									console.log('🎉 Got login info!');
									
									if (qrEvent?.data) {
										const cookie = qrEvent.data.cookie || [];
										const imei = qrEvent.data.imei || '';
										const userAgent = qrEvent.data.userAgent || '';

										console.log('Cookie received:', cookie.length > 0 ? 'Yes' : 'No');
										console.log('IMEI:', imei ? 'Yes' : 'No');
										console.log('UserAgent:', userAgent ? 'Yes' : 'No');

										if (cookie.length > 0 && imei && userAgent) {
											// Lưu credential
											const credentialData = {
												cookie: JSON.stringify(cookie),
												imei,
												userAgent,
												proxy: proxy || '',
												supportCode: '',
												licenseKey: ''
											};

											// Tự động tạo credential
											try {
												const fullApiUrl = `${n8nApiUrl}/api/v1/credentials`;
												
												console.log(`🔄 Creating credential at ${fullApiUrl}`);

												const response = await axios.post(fullApiUrl, {
													name: `Zalo API - ${new Date().toLocaleString()}`,
													type: 'zaloApi',
													nodesAccess: [],
													data: credentialData
												}, {
													headers: {
														'Content-Type': 'application/json',
														'X-N8N-API-KEY': n8nApiKey
													},
												});

												console.log(`✅ Credential created! ID: ${response.data?.id}`);
											} catch (apiError: any) {
												console.error('❌ Failed to create credential:', apiError.message);
												if (apiError.response) {
													console.error('Status:', apiError.response.status);
													console.error('Data:', apiError.response.data);
												}
											}
										}
									}
									break;

								default:
									console.log(`❓ Unknown event: ${qrEvent.type}`);
							}
						});

						// Start listener để nhận events
						console.log('👂 Starting listener...');
						api.listener.start();

					} catch (error: any) {
						clearTimeout(timeoutId);
						if (!isResolved) {
							isResolved = true;
							reject(error);
						}
					}
				})();
			});

			// Chờ QR code được tạo
			const qrCodeBase64 = await qrCodePromise;

			// Tạo binary data
			const binaryData = Buffer.from(qrCodeBase64, 'base64');

			// Return QR code ngay lập tức
			const item: INodeExecutionData = {
				json: {
					success: true,
					message: 'QR code generated. Please scan with Zalo app. Credential will be created automatically after login.',
					fileName,
					note: 'Credential will be created in background after you scan the QR code.',
				},
				binary: {
					data: await this.helpers.prepareBinaryData(binaryData, fileName, 'image/png'),
				},
			};

			returnData.push(item);
			return [returnData];

		} catch (error: any) {
			console.error('Error in ZaloLoginByQr:', error);
			
			if (this.continueOnFail()) {
				return [[{
					json: {
						error: error.message,
						success: false,
					},
				}]];
			} else {
				throw error;
			}
		}
	}
}
