import {
  aws_cognito,
  aws_evidently,
  aws_iam,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib";
import * as constants from "cdk-constants";
import { Construct } from "constructs";

export class InfraStack extends Stack {
  private featureName = "TestFeature";
  private launchName = "TestLaunch";

  private featureVariationEnabledName = "FeatureEnabled";
  private featureVariationDisabledName = "FeatureDisabled";

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const evidentlyProject = new aws_evidently.CfnProject(
      this,
      "EvidentlyProject",
      {
        name: "TestProject"
      }
    );

    const evidentlyFeature = new aws_evidently.CfnFeature(
      this,
      "EvidentlyFeature",
      {
        project: evidentlyProject.ref,
        name: this.featureName,
        variations: [
          {
            booleanValue: true,
            variationName: this.featureVariationEnabledName
          },
          {
            booleanValue: false,
            variationName: this.featureVariationDisabledName
          }
        ]
      }
    );

    const evidentlyLaunch = new aws_evidently.CfnLaunch(
      this,
      "EvidentlyLaunch",
      {
        name: this.launchName,
        project: evidentlyProject.ref,
        groups: [
          {
            feature: evidentlyFeature.ref,
            variation: this.featureVariationEnabledName,
            groupName: this.featureVariationEnabledName
          },
          {
            feature: evidentlyFeature.ref,
            variation: this.featureVariationDisabledName,
            groupName: this.featureVariationDisabledName
          }
        ],
        // Why is the launch not enabled by default?
        scheduledSplitsConfig: [
          {
            groupWeights: [
              {
                splitWeight: 50000,
                groupName: this.featureVariationEnabledName
              },
              {
                splitWeight: 50000,
                groupName: this.featureVariationDisabledName
              }
            ],
            // You have to account for the deployment time, otherwise the feature will never launch.

            // startTime: new Date().toISOString(),
            startTime: new Date(Date.now() + 1000 * 60 * 3).toISOString()
          }
        ]
      }
    );

    const userPool = new aws_cognito.UserPool(this, "UserPool", {
      removalPolicy: RemovalPolicy.DESTROY
    });

    const userPoolCLient = new aws_cognito.UserPoolClient(
      this,
      "UserPoolClient",
      {
        userPool,
        supportedIdentityProviders: [
          aws_cognito.UserPoolClientIdentityProvider.COGNITO
        ]
      }
    );

    const identityPool = new aws_cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolCLient.userPoolClientId,
          providerName: userPool.userPoolProviderName
        }
      ]
    });

    const allowEvidentlyEvaluationStatement = new aws_iam.PolicyStatement({
      effect: aws_iam.Effect.ALLOW,
      actions: ["evidently:EvaluateFeature"],
      resources: [evidentlyProject.attrArn, evidentlyFeature.attrArn]
    });

    const unauthenticatedRole = new aws_iam.Role(this, "UnauthenticatedRole", {
      assumedBy: new aws_iam.FederatedPrincipal(
        constants.FederatedPrincipals.COGNITO_IDENTITY,
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated"
          }
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      inlinePolicies: {
        allowEvidently: new aws_iam.PolicyDocument({
          statements: [allowEvidentlyEvaluationStatement]
        })
      }
    });

    const authenticatedRole = new aws_iam.Role(this, "AuthenticatedRole", {
      assumedBy: new aws_iam.FederatedPrincipal(
        constants.FederatedPrincipals.COGNITO_IDENTITY,
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated"
          }
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      inlinePolicies: {
        allowEvidently: new aws_iam.PolicyDocument({
          statements: [allowEvidentlyEvaluationStatement]
        })
      }
    });

    new aws_cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: {
          unauthenticated: unauthenticatedRole.roleArn,
          authenticated: authenticatedRole.roleArn
        }
      }
    );

    new CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: userPoolCLient.userPoolClientId
    });

    new CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref
    });

    // If the SDK requires the name (instead of ids), why would not the CFN resources provide that as a reference?
    new CfnOutput(this, "EvidentlyProjectName", {
      value: "TestProject"
    });

    new CfnOutput(this, "EvidentlyFeatureName", {
      value: "TestFeature"
    });

    new CfnOutput(this, "RoleArn", {
      value: unauthenticatedRole.roleArn
    });
  }
}
