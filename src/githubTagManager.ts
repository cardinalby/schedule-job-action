import * as ghActions from '@actions/core';
import {Octokit} from "@octokit/rest";
import {components as OctokitTypes} from "@octokit/openapi-types/types";
import {RestEndpointMethodTypes} from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types";
import {octokitHandle404} from "./octokitHandle404";

export class GithubTagManager {
    private readonly _octokit: Octokit;
    private readonly _targetOwner: string;
    private readonly _targetRepo: string;
    private readonly _tagName: string;
    private _existingTag: OctokitTypes['schemas']['git-ref']|undefined|false;

    constructor(octokit: Octokit, targetOwner: string, targetRepo: string, tagName: string) {
        this._octokit = octokit;
        this._targetOwner = targetOwner;
        this._targetRepo = targetRepo;
        this._tagName = tagName;
    }

    async loadExisting(): Promise<OctokitTypes['schemas']['git-ref']|false> {
        ghActions.info(
            `GitHub: Checking if ${this._tagName} exists in ` +
            `${this._targetOwner}/${this._targetRepo}...`
        );
        const tagResponse = await octokitHandle404(this._octokit.rest.git.getRef({
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'tags/' + this._tagName
        }));
        if (tagResponse !== undefined) {
            ghActions.info(`Tag found at commit ${tagResponse.data.object.sha}`);
            return this._existingTag = tagResponse.data;
        } else {
            ghActions.info(`Tag doesn't exist`);
            return this._existingTag = false;
        }
    }

    async update(sha: string): Promise<RestEndpointMethodTypes["git"]["updateRef"]["response"]> {
        ghActions.info(`GitHub: Updating ${this._tagName} tag to sha ${sha}...`);
        return this._octokit.rest.git.updateRef({
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'tags/' + this._tagName,
            force: true,
            sha
        });
    }

    async create(sha: string): Promise<RestEndpointMethodTypes["git"]["createRef"]["response"]> {
        ghActions.info(`GitHub: Creating ${this._tagName} tag on sha ${sha}...`);
        return this._octokit.rest.git.createRef({
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'refs/tags/' + this._tagName,
            sha
        });
    }

    async createOrUpdate(
        sha: string
    ): Promise<
        RestEndpointMethodTypes["git"]["createRef"]["response"] |
        RestEndpointMethodTypes["git"]["updateRef"]["response"]
        >
    {
        if (this._existingTag === undefined) {
            await this.loadExisting();
        }
        if (this._existingTag === false) {
            return this.create(sha);
        }
        return this.update(sha);
    }

    async rollbackAction() {
        if (this._existingTag === undefined) {
            return;
        }

        if (this._existingTag) {
            ghActions.info(`GitHub: rolling back ${this._tagName} tag to sha ${this._existingTag.object.sha}...`);
            await this._octokit.rest.git.updateRef({
                owner: this._targetOwner,
                repo: this._targetRepo,
                ref: 'refs/tags/' + this._tagName,
                sha: this._existingTag.object.sha
            });
            return;
        }

        ghActions.info(`GitHub: rolling back: delete ${this._tagName} tag`);
        await this._octokit.rest.git.deleteRef({
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'tags/' + this._tagName,
        })
    }
}