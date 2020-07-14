import * as ghActions from '@actions/core';
import {GitHub} from "@actions/github";
import {Octokit} from "@octokit/rest";
import {octokitHandle404} from "./octokitHandle404";
import {actionInputs} from "./actionInputs";

export class GithubTagManager {
    private readonly _github: GitHub;
    private readonly _targetOwner: string;
    private readonly _targetRepo: string;
    private readonly _tagName: string;
    private _existingTag: Octokit.GitGetRefResponse|undefined|false;

    constructor(github: GitHub, targetOwner: string, targetRepo: string, tagName: string) {
        this._github = github;
        this._targetOwner = targetOwner;
        this._targetRepo = targetRepo;
        this._tagName = tagName;
    }

    async loadExisting(): Promise<Octokit.GitGetRefResponse|false> {
        ghActions.info(
            `GitHub: Checking if ${this._tagName} exists in ` +
            `${this._targetOwner}/${this._targetRepo}...`
        );
        const tagResponse = await octokitHandle404(this._github.git.getRef, {
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'tags/' + this._tagName
        });
        if (tagResponse !== undefined) {
            ghActions.info(`Tag found at commit ${tagResponse.data.object.sha}`);
            this._existingTag = tagResponse.data;
        } else {
            ghActions.info(`Tag doesn't exist`);
            this._existingTag = false;
        }
        return this._existingTag;
    }

    async update(sha: string): Promise<Octokit.Response<Octokit.GitUpdateRefResponse>> {
        ghActions.info(`GitHub: Updating ${this._tagName} tag to sha ${sha}...`);
        return this._github.git.updateRef({
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'refs/tags/' + this._tagName,
            sha
        });
    }

    async create(sha: string): Promise<Octokit.Response<Octokit.GitCreateRefResponse>> {
        ghActions.info(`GitHub: Creating ${this._tagName} tag on sha ${sha}...`);
        return this._github.git.createRef({
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'refs/tags/' + this._tagName,
            sha
        });
    }

    async createOrUpdate(
        sha: string
    ): Promise<Octokit.Response<Octokit.GitCreateRefResponse|Octokit.GitUpdateRefResponse>>
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
            await this._github.git.updateRef({
                owner: this._targetOwner,
                repo: this._targetRepo,
                ref: 'refs/tags/' + this._tagName,
                sha: this._existingTag.object.sha
            });
            return;
        }

        ghActions.info(`GitHub: rolling back: delete ${this._tagName} tag`);
        await this._github.git.deleteRef({
            owner: this._targetOwner,
            repo: this._targetRepo,
            ref: 'tags/' + this._tagName,
        })
    }
}