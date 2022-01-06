import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Amplify from "aws-amplify";
import { config } from "./config";

Amplify.configure({
  Auth: {
    identityPoolId: config.identityPoolId,
    region: config.region,
    userPoolId: config.userPoolId,
    identityPoolRegion: config.region,
    userPoolWebClientId: config.userPoolClientId
  },
  API: {
    region: config.region,
    endpoints: [
      {
        name: "default",
        endpoint: "https://r4o6dli4ke.execute-api.eu-west-1.amazonaws.com/prod"
      }
    ]
  }
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
