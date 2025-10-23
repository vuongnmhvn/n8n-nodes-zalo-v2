import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';
import { API, ThreadType, Zalo } from 'zca-js';
import { saveFile, removeFile, imageMetadataGetter, parseCookieFromCredential } from '../utils/helper';

let api: API | undefined;

export class ZaloSendMessage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Send Message',
		name: 'zaloSendMessage',
		icon: 'file:../shared/zalo.svg',
		// @ts-ignore
		group: ['Zalo'],
		version: 4,
		description: 'Gửi tin nhắn qua API Zalo sử dụng kết nối đăng nhập bằng cookie',
		defaults: {
			name: 'Zalo Send Message',
		},
		// @ts-ignore
		inputs: ['main'],
		// @ts-ignore
		outputs: ['main'],
		credentials: [
			{
				name: 'zaloApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Thread ID',
				name: 'threadId',
				type: 'string',
				default: '',
				required: true,
				description: 'ID của thread để gửi tin nhắn',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'User',
						value: 0,
					},
					{
						name: 'Group',
						value: 1,
					},
				],
				default: 0,
				description: 'Loại của tin nhắn (user hoặc group)',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				description: 'Nội dung tin nhắn cần gửi',
			},
			{
				displayName: 'Urgency',
				name: 'urgency',
				type: 'options',
				options: [
					{
						name: 'Default',
						value: 0,
					},
					{
						name: 'Important',
						value: 1,
					},
					{
						name: 'Urgent',
						value: 2,
					},
				],
				default: 0,
				description: 'Mức độ khẩn cấp của tin nhắn',
			},
			{
				displayName: 'Quote Message',
				name: 'quote',
				type: 'collection',
				placeholder: 'Add Quote',
				default: {},
				options: [
					{
						displayName: 'Message ID',
						name: 'msgId',
						type: 'string',
						default: '',
						description: 'ID của tin nhắn cần trích dẫn',
					},
					{
						displayName: 'Sender ID',
						name: 'senderId',
						type: 'string',
						default: '',
						description: 'ID của người gửi tin nhắn trích dẫn',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'Nội dung tin nhắn trích dẫn',
					},
				],
			},
			{
				displayName: 'Mentions',
				name: 'mentions',
				type: 'collection',
				placeholder: 'Add Mention',
				default: {},
				options: [
					{
						displayName: 'User ID',
						name: 'uid',
						type: 'string',
						default: '',
						description: 'ID của người dùng được mention',
					},
					{
						displayName: 'Position',
						name: 'pos',
						type: 'number',
						default: 0,
						description: 'Vị trí mention trong tin nhắn',
					},
					{
						displayName: 'Length',
						name: 'len',
						type: 'number',
						default: 0,
						description: 'Độ dài của mention',
					},
				],
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Attachment',
				default: {},
				options: [
					{
						name: 'attachment',
						displayName: 'Attachment',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Image URL/File URL',
										value: 'url',
									}
								],
								default: 'url',
								description: 'Loại file đính kèm',
							},
							{
								displayName: 'Image URL/File URL',
								name: 'imageUrl',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										'type': ['url'],
									},
								},
								description: 'URL công khai của ảnh hoặc file',
							}
						],
					},
				],
				description: 'Một hoặc nhiều ảnh đính kèm để gửi',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();
		const zaloCred = await this.getCredentials('zaloApi');

		// === DEBUG LOGGING ===
		console.log('=== CREDENTIAL DEBUG ===');
		console.log('Cookie raw type:', typeof zaloCred.cookie);
		console.log('Cookie raw value (first 100 chars):', JSON.stringify(zaloCred.cookie).substring(0, 100));
		console.log('IMEI:', zaloCred.imei);
		console.log('UserAgent (first 50 chars):', (zaloCred.userAgent as string)?.substring(0, 50));

		// Parse cookie - xử lý cả v1 và v2
		let cookieFromCred;
		try {
			cookieFromCred = parseCookieFromCredential(zaloCred.cookie);
			console.log('✅ Cookie parsed successfully');
			console.log('Cookie is Array:', Array.isArray(cookieFromCred));
			console.log('Cookie length:', cookieFromCred?.length);
			if (cookieFromCred && cookieFromCred.length > 0) {
				console.log('First cookie item keys:', Object.keys(cookieFromCred[0]));
			}
		} catch (error) {
			console.error('❌ Cookie parse failed:', (error as Error).message);
			throw new NodeOperationError(
				this.getNode(),
				`${(error as Error).message}. Please login again with QR code.`
			);
		}

		const imeiFromCred = zaloCred.imei as string;
		const userAgentFromCred = zaloCred.userAgent as string;

		// Initialize Zalo API
		try {
			console.log('🔐 Initializing Zalo...');
			const zalo = new Zalo({ imageMetadataGetter });
			
			console.log('🔑 Attempting login...');
			console.log('Login params:', {
				cookieLength: cookieFromCred?.length,
				hasImei: !!imeiFromCred,
				hasUserAgent: !!userAgentFromCred
			});
			
			api = await zalo.login({ 
				cookie: cookieFromCred,
				imei: imeiFromCred, 
				userAgent: userAgentFromCred 
			});
			
			if (!api) {
				throw new NodeOperationError(this.getNode(), 'Failed to initialize Zalo API. Check your credentials.');
			}
			
			console.log('✅ Login successful!');
		} catch (error) {
			console.error('❌ Login failed:', error);
			throw new NodeOperationError(this.getNode(), `Zalo login error: ${(error as Error).message}`);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const threadId = this.getNodeParameter('threadId', i) as string;
				const typeNumber = this.getNodeParameter('type', i) as number;
				const type = typeNumber === 0 ? ThreadType.User : ThreadType.Group;
				const message = this.getNodeParameter('message', i) as string;
				const urgency = this.getNodeParameter('urgency', i, 0) as number;
				const quote = this.getNodeParameter('quote', i, {}) as any;
				const mentions = this.getNodeParameter('mentions', i, {}) as any;
				const attachments = this.getNodeParameter('attachments', i, {}) as any;

				const messageContent: any = { msg: message };

				if (urgency !== 0) {
					messageContent.urgency = urgency;
				}

				if (quote && Object.keys(quote).length > 0) {
					messageContent.quote = {
						msgId: quote.msgId,
						senderId: quote.senderId,
						content: quote.content,
					};
				}

				if (mentions && Object.keys(mentions).length > 0) {
					messageContent.mentions = [{
						pos: mentions.pos || 0,
						uid: mentions.uid,
						len: mentions.len || 0,
					}];
				}

				if (attachments && attachments.attachment && attachments.attachment.length > 0) {
					messageContent.attachments = [];
					for (const attachment of attachments.attachment) {
						if (attachment.type === 'url') {
							const fileData = await saveFile(attachment.imageUrl);
							if (fileData) {
								messageContent.attachments.push(fileData);
							}
						}
					}
				}

				this.logger.info(`Sending message: ${JSON.stringify(messageContent)}`);
				
				if (!api) {
					throw new NodeOperationError(this.getNode(), 'Zalo API not initialized');
				}

				// Send typing event
				try {
					await api.sendTypingEvent(threadId, type);
					this.logger.info("Typing event sent");
				} catch (e) {
					this.logger.error("Cannot send typing event:", e);
				}
				
				// Send message
				const response = await api.sendMessage(messageContent, threadId, type);

				// Remove temp files
				if (messageContent.attachments && messageContent.attachments.length > 0) {
					for (const attachment of messageContent.attachments) {
						removeFile(attachment);
					}
				}

				this.logger.info('Message sent successfully');

				returnData.push({
					json: {
						success: true,
						response,
						threadId,
						threadType: type,
						messageContent,
					},
				});
				
			} catch (error) {
				this.logger.error('Error sending Zalo message:', error);
				console.error('Full error details:', error);
				
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: (error as Error).message,
						},
					});
				} else {
					throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}
