import { createParamDecorator } from '@nestjs/common';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { PATH_METADATA } from '@nestjs/common/constants';

export function Api(prefix?: string): ClassDecorator {
	const path = isUndefined(prefix) ? '/api/' : `/api/${prefix}`;
	return (target: object): void => {
		Reflect.defineMetadata(PATH_METADATA, path, target);
	};
}

export const CurrentUser = createParamDecorator(async (param, request) => {
	return !param ? request.user : request.user[param];
});
