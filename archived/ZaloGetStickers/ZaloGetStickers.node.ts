import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';
import { API, Zalo } from 'zca-js';

let api: API | undefined;

export class ZaloGetStickers implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Lấy Danh Sách Sticker',
		name: 'zaloGetStickers',
		group: ['Zalo'],
		version: 1,
		description: 'Lấy danh sách tất cả sticker có sẵn trên Zalo',
		defaults: {
			name: 'Zalo Lấy Danh Sách Sticker',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		icon: 'file:../shared/zalo.svg',
		credentials: [
			{
				name: 'zaloApi',
				required: true,
				displayName: 'Zalo Credential to connect with',
			},
		],
		properties: [
			{
				displayName: 'Tên Sticker',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				description: 'Số lượng sticker tối đa cần lấy',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const inputs = this.getInputData();
		const zaloCred = await this.getCredentials("zaloApi");

		const cookieFromCred = JSON.parse(zaloCred.cookie as string);
		const imeiFromCred = zaloCred.imei as string;
		const userAgentFromCred = zaloCred.userAgent as string;

		const cookie = cookieFromCred ?? inputs.find((x) => x.json.cookie)?.json.cookie as any;
		const imei = imeiFromCred ?? inputs.find((x) => x.json.imei)?.json.imei as string;
		const userAgent = userAgentFromCred ?? inputs.find((x) => x.json.userAgent)?.json.userAgent as string;

		const zalo = new Zalo();
		const _api = await zalo.login({ cookie, imei, userAgent });
		api = _api;

		if (!api) {
			throw new NodeOperationError(
				this.getNode(),
				'No API instance found. Please make sure to provide valid credentials.',
			);
		}

		try {
			const name = this.getNodeParameter('name', 0) as string;
			const result = await api.getStickers(name);

			returnData.push({
				json: {
					success: true,
					message: 'Lấy danh sách sticker thành công',
					result,
				},
			});

			return [returnData];
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
				});
				return [returnData];
			}
			throw error;
		}
	}
} 