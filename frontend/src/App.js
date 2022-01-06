import {
  CognitoIdentityClient,
  GetIdCommand,
  GetOpenIdTokenCommand
} from "@aws-sdk/client-cognito-identity";
import {
  EvaluateFeatureCommand,
  EvidentlyClient
} from "@aws-sdk/client-evidently";
import { fromWebToken } from "@aws-sdk/credential-providers";
import { useEffect, useState } from "react";
import { config } from "./config";

function App() {
  const [isEnabled, setIsEnabled] = useState(undefined);

  useEffect(() => {
    getFeatureFlagValue().then(setIsEnabled);
  }, []);

  if (isEnabled === undefined) {
    return <p>Loading...</p>;
  }

  if (isEnabled) {
    return <p>Feature is: Enabled</p>;
  }

  return <p>Feature is: Disabled</p>;
}

export default App;

function getFeatureFlagValue() {
  const cognitoIdentityClient = new CognitoIdentityClient({
    region: config.region
  });

  return cognitoIdentityClient
    .send(new GetIdCommand({ IdentityPoolId: config.identityPoolId }))
    .then(response => {
      return cognitoIdentityClient.send(
        new GetOpenIdTokenCommand({
          IdentityId: response.IdentityId
        })
      );
    })
    .then(response => {
      const evidently = new EvidentlyClient({
        region: config.region,
        credentials: fromWebToken({
          roleArn: config.roleArn,
          webIdentityToken: response.Token
        })
      });

      return evidently.send(
        new EvaluateFeatureCommand({
          entityId: "artificial_id",
          feature: config.featureName,
          project: config.projectName
        })
      );
    })
    .then(response => {
      return response.value.boolValue;
    });
}
