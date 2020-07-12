import * as ghActions from '@actions/core';
import { actionInputs } from './actionInputs';
import { actionOutputs } from './actionOutputs';
import { getWorkspacePath } from "github-actions-utils";
import * as fs from "fs";
import * as path from "path";
import simpleGit, {SimpleGit} from 'simple-git';
import { modifyScheduledWorkflow } from "./modifyScheduledWorkflow";

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
    if (process.env.GITHUB_TOKEN === undefined) {
        throw new Error('GITHUB_TOKEN env variable is not set');
    }
    if (process.env.GITHUB_ACTOR === undefined) {
        throw new Error('GITHUB_ACTOR env variable is not set');
    }
    if (process.env.GITHUB_SHA === undefined) {
        throw new Error('GITHUB_SHA env variable is not set');
    }
    if (process.env.GITHUB_REPOSITORY === undefined) {
        throw new Error('GITHUB_REPOSITORY env variable is not set');
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
    ghActions.info(`Copying ${actionInputs.templateYmlFile} to ${targetYmlFileAbsPath}...`);

    const copyFlags = actionInputs.overrideTargetFile
        ? undefined
        : fs.constants.COPYFILE_EXCL;
    fs.copyFileSync(actionInputs.templateYmlFile, targetYmlFileAbsPath, copyFlags);

    modifyScheduledWorkflow(targetYmlFilePath, targetRef, actionInputs.addTag !== undefined);

    const git = await getWorkspaceGit();

    ghActions.info(`Git: add ${targetYmlFilePath}...`);
    await git.add(targetYmlFilePath);
    if (actionInputs.addTag !== undefined) {
        ghActions.info(`Git: add ${actionInputs.addTag} tag...`);
        await git.addTag(actionInputs.addTag);
    }

    ghActions.info(`Git: commit changes...`);
    await git.commit(`Add delayed ${targetYmlFileName} job`);

    const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}` +
        `@github.com/${process.env.GITHUB_REPOSITORY}.git`;
    ghActions.info(`Git: push changes to ${actionInputs.targetBranch} branch...`);
    await git.push(remoteRepo, actionInputs.targetBranch, {
        'tags': actionInputs.addTag !== undefined,
        'follow-tags': true,
        'force': actionInputs.pushForce
    });

    actionOutputs.targetYmlFileName.setValue(targetYmlFileName);
    actionOutputs.targetYmlFilePath.setValue(targetYmlFileAbsPath);
}

async function getWorkspaceGit(): Promise<SimpleGit> {
    const git = simpleGit(getWorkspacePath());
    await git.addConfig('user.email', actionInputs.gitUserEmail);
    await git.addConfig('user.name', actionInputs.gitUserName);
    return git;
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