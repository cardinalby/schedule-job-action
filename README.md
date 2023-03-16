![Build Status](https://github.com/cardinalby/schedule-job-action/workflows/build-test/badge.svg)

# Schedule delayed GitHub Actions job

Sometimes you can't finish your CI/CD job in a single run: you have to wait for some event or 
until an external long-running process finishes. In that case, you can schedule a delayed job 
to finish it later. 

Read [the article](https://cardinalby.github.io/blog/post/github-actions/implementing-deferred-steps/) for details
and **other possible approaches**.

### Generate token
To make it work, you have to 
[generate](https://github.com/settings/tokens) a new GitHub token with `workflows` and `repo` 
permissions because by default GitHub permits creating workflows by automation tools. Add new token to
the secret with the `WORKFLOWS_TOKEN` name.

### Schedule delayed job in your workflow
```yaml
# ... your steps ...
# ...
# schedule the rest for finishing later:
- uses: actions/checkout@v2
- uses: cardinalby/schedule-job-action@v1
  with:
    ghToken: ${{ secrets.WORKFLOWS_TOKEN }}
    templateYmlFile: '.github-scheduled-workflows/example.yml'
```

### Define scheduled job
Create `.github-scheduled-workflows/example.yml` scheduled workflow definition (using `cron` trigger) with the 
single job:

```yaml
name: "example-cron-action"
on:
  schedule:
    - cron:  '*/15 * * * *'    # At every 15th minute

jobs:
  singleJobName:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          ref: ${{ env.DELAYED_JOB_CHECKOUT_REF }} # SHA that triggered your original job 

      - name: Do some work
        run: echo $GITHUB_SHA

      # If job finished successfully, remove the workflow file (and tag if necessary)
      - name: Remove scheduled job
        uses: cardinalby/unschedule-job-action@v1
        with:
          ghToken: ${{ secrets.WORKFLOWS_TOKEN }} 
``` 
 
Please note, it's not located in the `.github` directory. It's just a template that will
be copied to the `.github` directory during the run. 

### Template modifications
Also, the action will add several env variables to the `env` section of the template workflow file:

* `DELAYED_JOB_CHECKOUT_REF`<br>
SHA of a commit triggered the original workflow or tag name from the  `addTag` input

* `DELAYED_JOB_CHECKOUT_REF_IS_TAG`<br>
`true` (ref above is a tag name) or `false` (it's a commit SHA)

* `DELAYED_JOB_WORKFLOW_FILE_PATH`<br> 
`.github/workflows/example-%SHA%.yml` in our example (see `targetYmlFileName` input).

* `DELAYED_JOB_WORKFLOW_UNSCHEDULE_TARGET_BRANCH`<br>
`master` (see `targetBranch` input)

* `DELAYED_JOB_PAYLOAD`<br>
If `jobPayload` input was filled.

Step with [cardinalby/unschedule-job-action](https://github.com/cardinalby/unschedule-job-action/) action
utilizes these env variables for proper removing of the delayed workflow file and tag. 

### Limit attempts number
To limit failed attempts number for the delayed job to run, add 
[cardinalby/unschedule-job-action](https://github.com/cardinalby/unschedule-job-action/)
as a first step in `.github-scheduled-workflows/example.yml` (before checkout) with the condition:

```yaml
- name: Remove scheduled job after 10 attempts
  uses: cardinalby/unschedule-job-action@v1
  if: github.run_number > 10
  with:
    ghToken: ${{ secrets.WORKFLOWS_TOKEN }} 
```

### Scheduled actions reminder

Remember, scheduled workflows can run only in the main branch (`master`) of the repository. 

### Infinite loop protection

The action checks if a commit triggered the run was made by the action itself (adding 
scheduled workflow file) or by other action (deleting scheduled workflow file) to prevent
an infinite loop caused by actions.

## Inputs

* `ghToken` **Required**<br>
Special GitHub access token with `workflows` permission. Use secrets!

* `templateYmlFile` **Required**<br>
Path (relative to the repository) to template scheduled workflow yml file.

* `overrideTargetFile` Default: `true`<br>
Override yml file if exists. If `false` and file exists, action will fail.

* `targetYmlFileName` Default: `templateYmlFile`'s name + sha/tag + `.yml`<br>
Target yml file name in `.github/workflows` folder

* `targetRepo` Default: current repository<br>
Repository to add the delayed workflow to. Format: `owner-name/repo-name`

* `targetBranch` Default: `master`<br>
Branch to push. Please note, scheduled jobs work only in the default branch.

* `addTag`<br>
Specify a tag to schedule job for. Will be used as a ref in the checkout step instead of commit sha.

* `jobPayload`<br>
Optional, pass a string to `DELAYED_JOB_PAYLOAD` env variable in delayed workflow file.

* `copyEnvVariables`<br>
Names of env variables (whitespace separated) that should be set in `env` section of scheduled workflow jobs. Values
will be given from env variables of the step where this action called. <br>
**Be aware!** Do not expose variables with secret values. 

## Outputs

* `targetYmlFileName` File name of the new yml file (inside `.github/workflows` folder).
* `targetYmlFilePath` Absolute path to the target yml file.