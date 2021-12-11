import { actionInputs as inputs, transformIfSet } from 'github-actions-utils';

export const actionInputs = {
    ghToken: inputs.getString('ghToken', true, true),
    templateYmlFile: inputs.getWsPath('templateYmlFile', true),
    overrideTargetFile: inputs.getBool('overrideTargetFile', true),
    targetYmlFileName: inputs.getString('targetYmlFileName', false),
    targetRepo: transformIfSet<string, { owner: string, repo: string }>(
        inputs.getString('targetRepo', false),
        s => {
            const parts = s.split('/');
            if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
                return {
                    owner: parts[0],
                    repo: parts[1]
                }
            }
            throw new Error('Invalid "targetRepo" input format. Should look like: "ownername/reponame"');
        }
        ),
    targetBranch: inputs.getString('targetBranch', false),
    jobPayload: inputs.getString('jobPayload', false),
    addTag: inputs.getString('addTag', false),
    copyEnvVariables: transformIfSet<string, string[]>(
        inputs.getString('copyEnvVariables', false),
        s => s.split(/\s+/).filter(s => s.length > 0)
    )
}

