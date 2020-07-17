import * as yaml from "js-yaml";
import * as fs from "fs";
import * as ghActions from '@actions/core';
import { actionInputs } from "./actionInputs";
import { getWorkspacePath } from "github-actions-utils";

interface IGitHubActionsJob {
    env?: { [name: string]: string }
}

interface IGithubActionsWorkflow {
    jobs?: {
        [name: string]: IGitHubActionsJob
    }
}

export function modifyScheduledWorkflow(
    workflowContents: string,
    relativeFilePath: string,
    envRef: string,
    isTag: boolean,
    unscheduleTargetBranch: string,
    jobPayload?: string|undefined
): string
{
    const loadedYml = yaml.safeLoad(workflowContents);
    if (typeof loadedYml !== 'object') {
        throw new Error(`Error parsing workflow yml`);
    }
    const workflow = loadedYml as IGithubActionsWorkflow;
    if (typeof workflow.jobs !== 'object' || Object.keys(workflow.jobs).length < 1) {
        throw new Error('Job definition not found');
    }
    if (Object.keys(workflow.jobs).length > 1) {
        throw new Error('Multiple job definitions found');
    }
    const jobName = Object.keys(workflow.jobs)[0];
    const job = workflow.jobs[jobName];
    if (job.env === undefined) {
        job.env = {};
    }
    ghActions.info(`Adding env variables to ${jobName} job...`);

    const addEnv = (envObj: { [n: string]: string }, name: string, value: string) => {
        envObj[name] = value;
        ghActions.info(`${name}=${value}`);
    };

    addEnv(job.env, 'DELAYED_JOB_CHECKOUT_REF', envRef);
    addEnv(job.env, 'DELAYED_JOB_CHECKOUT_REF_IS_TAG', isTag ? 'true' : 'false');
    addEnv(job.env, 'DELAYED_JOB_WORKFLOW_FILE_PATH', relativeFilePath);
    addEnv(job.env, 'DELAYED_JOB_WORKFLOW_UNSCHEDULE_TARGET_BRANCH', unscheduleTargetBranch);

    if (jobPayload !== undefined) {
        addEnv(job.env, 'DELAYED_JOB_PAYLOAD', jobPayload);
    }

    return yaml.safeDump(workflow);
}