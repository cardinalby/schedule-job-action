import * as ghActions from '@actions/core';
import { actionInputs } from './actionInputs';
import { actionOutputs } from './actionOutputs';
import { getWorkspacePath } from "github-actions-utils";
import * as fs from "fs";
import * as path from "path";
import { modifyScheduledWorkflow } from "./modifyScheduledWorkflow";
import { context, GitHub } from "@actions/github";

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
    if (!actionInputs.overrideTargetFile && fs.existsSync(targetYmlFileAbsPath)) {
        throw new Error(`${targetYmlFilePath} file already exists!`);
    }

    ghActions.info(`Reading and modifying ${actionInputs.templateYmlFile}...`);
    let workflowContents = fs.readFileSync(targetYmlFileAbsPath, 'utf8');
    workflowContents = modifyScheduledWorkflow(
        workflowContents, targetYmlFilePath, targetRef, actionInputs.addTag !== undefined
    );

    const {owner, repo} = context.repo;
    const github = new GitHub(actionInputs.ghToken);
    // const blob = (await github.git.createBlob({ owner, repo, content: workflowContents })).data;

    ghActions.info(`Requesting a tree with sha = ${process.env.GITHUB_SHA}...`);
    const tree = (await github.git.getTree({ owner, repo, tree_sha: process.env.GITHUB_SHA })).data;
    console.log(tree);

    ghActions.info(`Creating new tree...`);
    const newTree = (await github.git.createTree({owner, repo, base_tree: tree.sha, tree: [{
            content: workflowContents,
            mode: "100644",
            path: targetYmlFilePath,
            type: "blob"
        }]})).data;
    console.log(newTree);

    ghActions.info(`Creating commit with new tree...`);
    const commit = (await github.git.createCommit({owner, repo,
        parents: [ process.env.GITHUB_SHA ],
        tree: newTree.sha,
        message: `Add delayed ${targetYmlFileName} job`,
        author: {
            email: actionInputs.gitUserEmail,
            name: actionInputs.gitUserName
        }
    })).data;
    console.log(commit);

    ghActions.info(`Updating ref: heads/${actionInputs.targetBranch}...`);
    await github.git.updateRef({owner, repo,
        ref: 'heads/' + actionInputs.targetBranch,
        sha: commit.sha,
        force: actionInputs.pushForce
    });

    if (actionInputs.addTag !== undefined) {
        // github.git.createTag({owner, repo, });
        // await git.addTag(actionInputs.addTag);
    }

    actionOutputs.targetYmlFileName.setValue(targetYmlFileName);
    actionOutputs.targetYmlFilePath.setValue(targetYmlFileAbsPath);
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