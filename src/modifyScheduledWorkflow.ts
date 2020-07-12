import * as yaml from "js-yaml";
import * as fs from "fs";
import * as ghActions from '@actions/core';

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

    job.env.DELAYED_JOB_CHECKOUT_REF = envRef;
    job.env.DELAYED_JOB_CHECKOUT_REF_IS_TAG = isTag ? 'true' : 'false';

    ghActions.info(`DELAYED_JOB_CHECKOUT_REF=${job.env.DELAYED_JOB_CHECKOUT_REF}`);
    ghActions.info(`DELAYED_JOB_CHECKOUT_REF_IS_TAG=${job.env.DELAYED_JOB_CHECKOUT_REF_IS_TAG}`);

    const modifiedFileContents = yaml.safeDump(workflow);

    ghActions.info(`Saving ${filePath}...`);
    fs.writeFileSync(filePath, modifiedFileContents);
}