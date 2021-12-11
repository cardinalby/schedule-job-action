import { OctokitResponse, RequestError } from '@octokit/types';

export async function octokitHandle404<T, S extends number = number>(
    promise: Promise<OctokitResponse<T, S>>
): Promise<OctokitResponse<T, S>|undefined> {
    try {
        return await promise;
    } catch (e) {
        if ((e as RequestError).status === 404) {
            return undefined;
        }
        throw e;
    }
}