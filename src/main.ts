import * as ghActions from '@actions/core';
import { actionInputs } from './actionInputs';
import { actionOutputs } from './actionOutputs';
import { getWorkspacePath } from "github-actions-utils";
import * as fs from "fs";
import * as path from "path";
import { modifyScheduledWorkflow } from "./modifyScheduledWorkflow";
import { context } from "@actions/github";
import { createTokenAuth } from '@octokit/auth-token';
import { Octokit } from '@octokit/rest';
import {components as OctokitTypes} from "@octokit/openapi-types/types";
import {octokitHandle404} from "./octokitHandle404";
import {consts} from "./consts";
import {GithubTagManager} from "./githubTagManager";

const WORKFLOWS_DIR = '.github/workflows';

// noinspection JSUnusedLocalSymbols
async function run(): Promise<void> {
    try {
        await runImpl();
    } catch (error) {
        ghActions.setFailed(error.message);
    }
}

async function runImpl() {
    if (process.env.GITHUB_SHA === undefined) {
        throw new Error('GITHUB_SHA env variable is not set');
    }

    const {owner, repo} = context.repo;
    const octokit = new Octokit({authStrategy: createTokenAuth, auth: actionInputs.ghToken});

    const currentCommit = (await octokit.rest.repos.getCommit({owner, repo, ref: process.env.GITHUB_SHA})).data;
    currentCommit.commit
    if (isTriggeredByAction(currentCommit)) {
        ghActions.info('Commit was triggered by the action, skip to prevent a loop');
        return;
    }

    if (!fs.existsSync(actionInputs.templateYmlFile)) {
        throw new Error(`${actionInputs.templateYmlFile} file doesn't exist`);
    }

    const targetRef = actionInputs.addTag !== undefined
        ? actionInputs.addTag
        : process.env.GITHUB_SHA;
    const targetYmlFileName = getTargetYmlFileName(targetRef);
    const targetYmlFilePath = path.join(WORKFLOWS_DIR, targetYmlFileName);
    const targetYmlFileAbsPath = getWorkspacePath(targetYmlFilePath);

    const targetOwner = actionInputs.targetRepo ? actionInputs.targetRepo.owner : owner;
    const targetRepo = actionInputs.targetRepo ? actionInputs.targetRepo.repo : repo;

    let targetBranch = actionInputs.targetBranch;
    if (targetBranch === undefined) {
        ghActions.info('Finding out repository default branch...');
        const targetBranchResponse = octokit.rest.repos.get({
            owner: targetOwner,
            repo: targetRepo
        });
        targetBranch = (await targetBranchResponse).data.default_branch;
    }

    ghActions.info(
        `GitHub: check if ${targetYmlFilePath} file already exists in ` +
        `${targetOwner}/${targetRepo}@${targetBranch}...`
    );
    const existingFileResponse = await octokitHandle404(
        octokit.rest.repos.getContent({
            owner: targetOwner,
            repo: targetRepo,
            path: targetYmlFilePath,
            ref: 'heads/' + targetBranch
        }));
    const existingSha = (existingFileResponse?.data as OctokitTypes["schemas"]["content-file"]).sha;
    ghActions.info(existingSha ? `File found: ${existingSha}` : `File not found`);

    if (existingSha && !actionInputs.overrideTargetFile) {
        throw new Error(`${targetYmlFilePath} file already exists but overrideTargetFile is false!`);
    }

    ghActions.info(`Reading and modifying ${actionInputs.templateYmlFile}...`);
    let workflowContents = fs.readFileSync(actionInputs.templateYmlFile, 'utf8');
    workflowContents = modifyScheduledWorkflow(
        workflowContents,
        targetYmlFilePath,
        targetRef,
        actionInputs.addTag !== undefined,
        targetBranch,
        actionInputs.jobPayload,
        actionInputs.copyEnvVariables
    );

    const tagManager = actionInputs.addTag !== undefined
        ? new GithubTagManager(octokit, targetOwner, targetRepo, actionInputs.addTag)
        : undefined;
    if (tagManager) {
        await tagManager.createOrUpdate(process.env.GITHUB_SHA);
    }

    ghActions.info(
        `GitHub: Creating ${targetYmlFilePath} workflow file from the template in ` +
        `${targetOwner}/${targetRepo}@${actionInputs.targetBranch}...`
    );
    try {
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: targetOwner,
            repo: targetRepo,
            author: {
                email: consts.gitAuthorEmail,
                name: consts.gitAuthorName
            },
            branch: actionInputs.targetBranch,
            message: `Add delayed ${targetYmlFileName} job`,
            content: Buffer.from(workflowContents, 'binary').toString('base64'),
            path: targetYmlFilePath,
            sha: existingSha
        });
    } catch (e) {
        ghActions.error('Error creating file: ' + e.message);
        if (tagManager) {
            await tagManager.rollbackAction();
        }
        throw e;
    }

    actionOutputs.targetYmlFileName.setValue(targetYmlFileName);
    actionOutputs.targetYmlFilePath.setValue(targetYmlFileAbsPath);
}

function isTriggeredByAction(commit: OctokitTypes['schemas']['commit']): boolean {
    return (commit.commit.author?.name === consts.gitAuthorName &&
        commit.commit.author.email === consts.gitAuthorEmail) ||
        commit.author?.login === 'actions-user';
}

function getTargetYmlFileName(targetRef: string): string {
    if (actionInputs.targetYmlFileName !== undefined) {
        return actionInputs.targetYmlFileName;
    }
    const templateYmlFilePath = path.parse(actionInputs.templateYmlFile);
    if (templateYmlFilePath.ext !== '.yml') {
        ghActions.warning(`${actionInputs.templateYmlFile} file has not a .yml extension`);
    }
    return templateYmlFilePath.name + '-' + targetRef + '.yml';
}

// noinspection JSIgnoredPromiseFromCall
run();