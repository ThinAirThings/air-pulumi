// src/components/GithubRepository.ts
import * as github from "@pulumi/github";
var GitHubRepository = ({
  repositoryName,
  description,
  branchNames
}) => {
  const repository = new github.Repository(repositoryName, {
    name: repositoryName,
    description
  });
  const branches = branchNames?.map((branchName) => new github.Branch(`${repositoryName}-${branchName}`, {
    repository: repository.name,
    branch: branchName
  }));
  return {
    repository,
    branches
  };
};

// src/components@next/TSLambdaCallbackFactory.ts
import { z } from "zod";
import * as aws from "@pulumi/aws";

// src/utils/validatedCallback.ts
var validatedCallback = async (event, schema, callback) => {
  console.log(event);
  const result = schema.safeParse({
    ...event.pathParameters,
    ...event.queryStringParameters,
    ...!!event.body ? event.isBase64Encoded ? JSON.parse(
      Buffer.from(event.body, "base64").toString("utf-8")
    ) : JSON.parse(event.body) : {},
    // Check for directly invoked function
    ...!!!event.requestContext && !!!event.path ? event : {}
  });
  if (!result.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid payload",
        errors: result.error.issues
      })
    };
  }
  try {
    return await callback(result.data);
  } catch (e) {
    const error = e;
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message
      })
    };
  }
};

// src/components@next/TSLambdaCallbackFactory.ts
import * as pulumi from "@pulumi/pulumi";
var TSLambdaCallbackFactory = ({
  fnName,
  environmentVariables,
  payloadType,
  callback
}) => (...args) => {
  const lambda2 = new aws.lambda.CallbackFunction(`${fnName}-lambda`, {
    runtime: aws.lambda.Runtime.NodeJS20dX,
    timeout: 60 * 15,
    memorySize: 10240,
    tags: {
      Name: fnName,
      Organization: pulumi.getOrganization(),
      Project: pulumi.getProject(),
      Stack: pulumi.getStack()
    },
    environment: {
      variables: {
        ...args?.[0]?.environmentVariables ?? {}
      }
    },
    callback: async (event) => {
      return validatedCallback(event, payloadType, callback);
    }
  });
  return lambda2;
};
var fn = TSLambdaCallbackFactory({
  fnName: "test",
  environmentVariables: z.object({
    TEST: z.string()
  }),
  payloadType: z.object({
    test: z.string()
  }),
  callback: async (payload) => {
    console.log(payload.test);
  }
});
export {
  GitHubRepository,
  TSLambdaCallbackFactory
};
