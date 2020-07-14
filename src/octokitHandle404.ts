import {Octokit} from "@octokit/rest";

export async function octokitHandle404<TRequestParams, TResponse>(
    func: (params?: Octokit.RequestOptions & TRequestParams) => Promise<Octokit.Response<TResponse>>,
    params: TRequestParams
): Promise<Octokit.Response<TResponse>|undefined> {
    try {
        return await func(params);
    } catch (e) {
        if (e.status === 404) {
            return undefined;
        }
        throw e;
    }
}