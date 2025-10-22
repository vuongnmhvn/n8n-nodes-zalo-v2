import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { Zalo } from 'zca-js';
import { imageMetadataGetter } from '../utils/helper';
import * as path from 'path';
import axios from 'axios';

export class ZaloLoginByQr implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Login Via QR Code',
		name: 'zaloLoginByQr',
		// @ts-ignore
		group: ['Zalo'],
		version: 1,
		description: 'Đăng nhập Zalo bằng QR code và lưu thông tin vào Credential',
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
				name: 'zaloApi',
				required: false,
				displayName: 'Zalo Credential to connect with',
			},
			{
				name: 'n8nZaloApi',
				required: true,
				displayName: 'n8n Account Credential',
			  },
		],
		properties: [
			{
				displayName: 'Proxy',
				name: 'proxy',
				type: 'string',
				default: '',
				placeholder: 'https://user:pass@host:port',
				description: 'HTTP proxy to use for Zalo API requests',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const proxy = this.getNodeParameter('proxy', 0, '') as string;
		const timeout = 30;
		const fileName = 'zalo-qr-code.png';

		let zaloCredential : any;
		let n8nCredential : any;

		try {
			zaloCredential = await this.getCredentials('zaloApi');
		} catch (error) {
			// No Zalo credential
		}

		try {
			n8nCredential = await this.getCredentials('n8nZaloApi');
		} catch (error) {
			// No n8n credential
		}

		let selectedCredential = undefined;

		if (n8nCredential) {
			console.error('Using n8n account credential');
			selectedCredential = n8nCredential;
		} else if (zaloCredential) {
			console.error('Using Zalo API credential');
			selectedCredential = zaloCredential;
		} else {
			console.error('No credentials provided, will generate QR code for login');
		}

		try {
			const zaloOptions: any = {
				selfListen: true,
				logging: true,
				imageMetadataGetter,
			};

			if (proxy) {
				zaloOptions.proxy = proxy;
			}

			let zalo: any;

			if (selectedCredential) {
				console.error('Using existing Zalo credentials');
				zalo = new Zalo(zaloOptions);

				if (selectedCredential === n8nCredential) {
					console.error('Using n8n credential to get Zalo credentials');
					const n8nApiKey = selectedCredential.apiKey as string;
					const n8nUrl = selectedCredential.url as string || 'http://localhost:5678';

					console.error(`Using n8n API at ${n8nUrl}`);
					console.error('n8n credential support is not fully implemented yet. Will use QR code login.');

					zalo = new Zalo(zaloOptions);
				} else {
					console.error('Using Zalo credential for login');

					// Parse cookie from STRING (giống V1)
					const cookieString = selectedCredential.cookie as string;
					const cookie = JSON.parse(cookieString);
					const imei = selectedCredential.imei as string;
					const userAgent = selectedCredential.userAgent as string;

					if (selectedCredential.proxy) {
						console.error('Using proxy from credential:', selectedCredential.proxy);
						zaloOptions.proxy = selectedCredential.proxy as string;
					}

					await zalo.login({
						cookie,
						imei,
						userAgent,
					});
				}
			} else {
				zalo = new Zalo(zaloOptions);
			}

			console.error('Starting Zalo QR login process...');

			const qrCodePromise = new Promise<string>(async (resolve, reject) => {
				let isResolved = false;

				const timeoutId = setTimeout(() => {
					if (!isResolved) {
						isResolved = true;
						reject(new NodeOperationError(this.getNode(), 'Timeout generating QR code'));
					}
				}, timeout * 1000);

				try {
					// @ts-ignore
					let api = await zalo.loginQR(null, (qrEvent: any) => {
						console.error('Received QR event type:', qrEvent ? qrEvent.type : 'no event');

						switch (qrEvent.type) {
							case 0: // QRCodeGenerated
								if (qrEvent?.data?.image) {
									const qrCodeBase64 = qrEvent.data.image;
									console.error('QR code generated, length:', qrCodeBase64.length);

									if (isResolved) return;

									clearTimeout(timeoutId);

									if (qrCodeBase64) {
										isResolved = true;
										resolve(qrCodeBase64);
									}
								} else {
									console.error('Could not get QR code from Zalo SDK');
									reject(new NodeOperationError(this.getNode(), "Could not get QR code"));
								}
								break;

							case 1: // QRCodeExpired
								console.error('QR code expired. Please try again.');
								break;

							case 2: // QRCodeScanned
								console.error('=== QR CODE SCANNED ===');
								if (qrEvent?.data) {
									console.error('User:', qrEvent.data.display_name);
									console.error('Avatar:', qrEvent.data.avatar ? 'Yes' : 'No');
								}
								break;

							case 3: // QRCodeDeclined
								console.error('=== QR CODE DECLINED ===');
								if (qrEvent?.data?.code) {
									console.error('Decline code:', qrEvent.data.code);
								}
								break;

							case 4: // GotLoginInfo
								console.error('=== GOT LOGIN INFO ===');
								if (qrEvent?.data) {
									const cookie = qrEvent.data.cookie || [];
									const imei = qrEvent.data.imei || '';
									const userAgent = qrEvent.data.userAgent || '';

									console.error('Cookie received:', cookie.length > 0 ? 'Yes' : 'No');
									console.error('IMEI received:', imei ? 'Yes' : 'No');
									console.error('User Agent received:', userAgent ? 'Yes' : 'No');

									if (cookie.length > 0 || imei || userAgent) {
										const credentialName = 'Zalo API Credentials';
										
										// LƯU DẠNG STRING giống V1
										const credentialData = {
											cookie: JSON.stringify(cookie),
											imei: imei,
											userAgent: userAgent,
											proxy: proxy || '',
											supportCode: '',
											licenseKey: ''
										};

										(async () => {
											try {
												console.error('Attempting to create Zalo credential via n8n API');

												const credentialApiData = {
													name: credentialName,
													type: 'zaloApi',
													nodesAccess: [],
													data: credentialData
												};

												const n8nApi = await this.getCredentials('n8nZaloApi');
												const n8nApiUrl = n8nApi.url as string;
												const fullApiUrl = `${n8nApiUrl}/api/v1/credentials`;
												const n8nApiKey = n8nApi.apiKey as string;

												console.error(`Creating credential at ${fullApiUrl}`);

												const response = await axios.post(fullApiUrl, credentialApiData, {
													headers: {
														'Content-Type': 'application/json',
														'X-N8N-API-KEY': n8nApiKey
													},
												});

												console.error('✅ Credential created successfully!');
												console.error('Credential ID:', response.data?.id || 'Unknown');
											} catch (error: any) {
												console.error('❌ Error creating credential:', error.message);
												if (error.response) {
													console.error('Response status:', error.response.status);
													console.error('Response data:', JSON.stringify(error.response.data));
												}
											}
										})();
									} else {
										console.error('=== NO CREDENTIALS TO SAVE ===');
									}
								}
								break;

							default:
								console.error('Unknown QR event type:', qrEvent.type);
						}
					});

					console.error('Starting Zalo listener');
					api.listener.start();

					api.listener.onConnected(() => {
						console.error("=== ZALO SDK CONNECTED ===");
					});

					api.listener.onError((error: any) => {
						console.error("=== ZALO ERROR ===", error);
					});

					console.error('All event listeners set up');
				} catch (error: any) {
					clearTimeout(timeoutId);

					if (!isResolved) {
						isResolved = true;
						reject(error);
					}
				}
			});

			const qrCodeBase64 = await qrCodePromise;
			const binaryData = Buffer.from(qrCodeBase64, 'base64');

			const newItem: INodeExecutionData = {
				json: {
					success: true,
					message: selectedCredential === n8nCredential
						? 'Using n8n account credential. QR code generated successfully.'
						: (selectedCredential === zaloCredential
							? 'Using existing Zalo credentials. QR code generated successfully.'
							: 'QR code generated successfully. Scan with Zalo app to login.'),
					fileName,
					usingExistingCredential: !!selectedCredential,
					credentialType: selectedCredential === n8nCredential ? 'n8nZaloApi' : (selectedCredential === zaloCredential ? 'zaloApi' : null),
				},
				binary: {
					data: await this.helpers.prepareBinaryData(binaryData, fileName, 'image/png'),
				},
			};

			returnData.push(newItem);

			return [returnData];
		} catch (error: any) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: 0 } },
				);
				return [executionData];
			} else {
				throw error;
			}
		}
	}
}
