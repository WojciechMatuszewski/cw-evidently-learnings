# Checking out _Amazon CloudWatch Evidently_

This repo contains an example of how one might configure _Amazon CloudWatch Evidently_ via _AWS CDK_.
Please keep in mind that this configuration is relatively minimal. The main goal was to get familiar with the service and assess its pros and cons.

## Deployment

1. `cd infra`
2. `npm run bootstrap`
3. `npm run deploy`
4. `cd frontend`
5. `npm install`
6. Fill out the `config` in `config.js` values. Use the outputs from the infra deployment.

## Learnings

- The _Amazon CloudWatch Evidently_ [_IAM_ documentation site](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Evidently-permissions.html) is a bit lacking. It would be awesome to get fine examples instead of the guidance to use managed policies (which use `*` as the resource).

- The [official AWS IAM policy simulator](policysim.aws.amazon.com) takes SCPs into consideration. This makes the tool very handy in some situations.

- The `evidently:EvaluateFeature` action **has to be allowed for the project and the feature resources**.

- I could not make the setup presented in [this launch blog post](https://aws.amazon.com/blogs/aws/cloudwatch-evidently/) work. For reasons unknown to me, the `fromCognitoIdentityPool` function did not return correct (?) credentials.

  - It is super weird because the steps from [this tutorial](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Evidently-bookstoreexample.html) worked.

  - I've also ensured that the role works correctly by fronting APIGW with IAM authorization. The call to the endpoint was successful (after I amended _IAM role_ policy for unauthenticated _Cognito_ identities).

  - In the end, I ended up following [this tutorial](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Evidently-bookstoreexample.html).

- The _CloudFormation_ resources for _Amazon CloudWatch Evidently_ are OK to work with.

  - One thing that I do not like are the references to other resources via their names and not ARNs. One such example would be referring to a _variation_ (maybe another _CloudFormation_ resource should be used here?

- Like _LaunchDarkly_, the console provides a history of changes for a given _launch_. What is weird is that **since this view is powered by _AWS CloudTrail_ there is a lag between you changing the setting and the UI updating**.

  - I understand the motive here, but the experience is confusing. I'm not sure why AWS engineers decided it would be a good idea.

  - If it were not for the "powered by _AWS CloudTrail_" message, I would have no idea what is happening. The **question is: would someone who is not familiar with the lag _AWS CloudTrail_ introduces understand why their UI is stale?**

- **Unlike _LaunchDarkly_ the SDK does not support WebSocket out of the box**.

  - A bit of a letdown but not a deal-breaker.

  - The "WebSocket by default" approach has its drawbacks when used in stateless compute like _AWS Lambda_ where the Lambda service might freeze the connection due to the container freeze.

- I've encountered numerous issues with a _launch_ resource when it was created by _CloudFormation_
  - The deployment went OK, but I could not edit the _launch_ in the console
    - UI returned `ValidationException` and the error message: `message: "Launch groups name in steps not present in groups", name: "scheduledSplitsConfig"`
  - The _launch_ would not, well, launch. No matter if my `startTime` pointed in the future or at the current time.
  - To **make the _launch_ launch, I had to perform a noop operation in the UI. What worked for me was _modifying launch traffic_ without changing anything** – weird.
