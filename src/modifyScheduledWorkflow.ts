import * as yaml from "js-yaml";
import * as fs from "fs";
import * as ghActions from '@actions/core';
import {actionInputs} from "./actionInputs";

interface IGitHubActionsJob {
    env?: { [name: string]: string }
}

interface IGithubActionsWorkflow {
    jobs?: {
        [name: string]: IGitHubActionsJob
    }
}

export function modifyScheduledWorkflow(filePath: string, envRef: string, isTag: boolean) {
    ghActions.info(`Parsing ${filePath}...`);
    const loadedYml = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    if (typeof loadedYml !== 'object') {
        throw new Error(`Error parsing yml in ${filePath}`);
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
    ghActions.info(`Adding env variables to ${job} job...`);

    const addEnv = (envObj: { [n: string]: string }, name: string, value: string) => {
        envObj[name] = value;
        ghActions.info(`${name}=${value}`);
    };

    addEnv(job.env, actionInputs.envRefVariable, envRef);
    addEnv(job.env, actionInputs.envRefIsTagVariable, isTag ? 'true' : 'false');

    const modifiedFileContents = yaml.safeDump(workflow);

    ghActions.info(`Saving ${filePath}...`);
    fs.writeFileSync(filePath, modifiedFileContents);
}