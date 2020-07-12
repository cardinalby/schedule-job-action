import { actionInputs as inputs } from 'github-actions-utils';

export const actionInputs = {
    templateYmlFile: inputs.getWsPath('templateYmlFile', true),
    overrideTargetFile: inputs.getBool('overrideTargetFile', true),
    targetYmlFileName: inputs.getString('targetYmlFileName', false),
    targetBranch: inputs.getString('targetBranch', true),
    pushForce: inputs.getBool('pushForce', true),
    addTag: inputs.getString('addTag', false),
    gitUserEmail: inputs.getString('gitUserEmail', true),
    gitUserName: inputs.getString('gitUserName', true),
}