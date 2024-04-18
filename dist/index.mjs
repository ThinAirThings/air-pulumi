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

// src/components@next/TSLambdaCallback.ts
import { z as z2 } from "zod";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// src/utils@next/parseLamdbaEvent.ts
import { ZodObject, ZodVoid, z } from "zod";
var parseLambdaEvent = async (event, payloadSchema, stackVariablesSchema, callback) => {
  const result = z.object({}).merge(stackVariablesSchema instanceof ZodVoid ? z.object({}) : stackVariablesSchema).merge(payloadSchema instanceof ZodVoid ? z.object({}) : payloadSchema).safeParse({
    ...stackVariablesSchema instanceof ZodObject ? Object.fromEntries(Object.keys(stackVariablesSchema.shape).map((key) => [key, process.env[key]])) : {},
    ...event.pathParameters,
    ...event.queryStringParameters,
    ...!!event.body ? event.isBase64Encoded ? JSON.parse(
      Buffer.from(event.body, "base64").toString("utf-8")
    ) : JSON.parse(event.body) : {},
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
    return {
      headers: {
        "Access-Control-Allow-Origin": event.headers["Origin"] || "*"
      },
      ...await callback(result.data)
    };
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

// src/components@next/TSLambdaCallback.ts
var TSLambdaCallback = ({
  fnName,
  stackVariablesType,
  payloadType,
  callback
}, ...args) => {
  const lambda2 = new aws.lambda.CallbackFunction(`${fnName}-lambda`, {
    runtime: aws.lambda.Runtime.NodeJS20dX,
    timeout: 60 * 15,
    tags: {
      Name: fnName,
      Organization: pulumi.getOrganization(),
      Project: pulumi.getProject(),
      Stack: pulumi.getStack()
    },
    environment: {
      variables: {
        ...args?.[0]?.stackVariables ?? {}
      }
    },
    callback: async (event) => {
      return parseLambdaEvent(
        event,
        payloadType?.() ?? z2.void(),
        stackVariablesType?.() ?? z2.void(),
        callback
      );
    }
  });
  return lambda2;
};

// src/components@next/IamUser.ts
import * as aws2 from "@pulumi/aws";
import * as pulumi3 from "@pulumi/pulumi";

// src/utils@next/createTags.ts
import * as pulumi2 from "@pulumi/pulumi";
var createTags = (name) => ({
  Name: name,
  Organization: pulumi2.getOrganization(),
  Project: pulumi2.getProject(),
  Stack: pulumi2.getStack()
});

// src/components@next/IamUser.ts
var IamUser = ({
  name,
  ...props
}) => {
  const iamUser = new aws2.iam.User(name, {
    path: `/${pulumi3.getProject()}/${pulumi3.getStack()}/${name}/`,
    tags: createTags(name),
    ...props
  });
  const accessKey = new aws2.iam.AccessKey("accessKey", {
    user: iamUser.name
  });
  return { iamUser, accessKey };
};

// src/components@next/S3Bucket.ts
import * as aws3 from "@pulumi/aws";
import * as pulumi4 from "@pulumi/pulumi";
var S3Bucket = ({
  name,
  iamUser,
  publicAccess = false,
  corsRules,
  ...props
}) => {
  const bucket = new aws3.s3.BucketV2(`${pulumi4.getOrganization()}-${pulumi4.getStack()}-${name}`, {
    tags: createTags(name),
    forceDestroy: pulumi4.getStack() === "prod" ? false : true,
    ...props
  });
  if (corsRules) {
    new aws3.s3.BucketCorsConfigurationV2(`${name}_cors`, {
      bucket: bucket.id,
      corsRules
    });
  }
  if (publicAccess) {
    const publicAccessBlock = new aws3.s3.BucketPublicAccessBlock(
      `${name}_publicAccessBlock`,
      {
        bucket: bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }
    );
    new aws3.s3.BucketPolicy(
      `${name}_policy`,
      {
        bucket: bucket.id,
        policy: pulumi4.jsonStringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "PublicReadGetObject",
              Action: ["s3:GetObject"],
              Effect: "Allow",
              Resource: pulumi4.interpolate`${bucket.arn}/*`,
              Principal: "*"
            }
          ]
        })
      },
      { dependsOn: [publicAccessBlock] }
    );
  }
  if (!iamUser)
    return bucket;
  new aws3.iam.UserPolicyAttachment(`${name}_policy_attachment`, {
    user: iamUser.name,
    policyArn: new aws3.iam.Policy(`${name}_policy`, {
      policy: bucket.arn.apply((arn) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Effect: "Allow",
          Action: ["s3:ListBucket"],
          Resource: [arn]
        }, {
          Effect: "Allow",
          Action: ["s3:GetObject", "s3:PutObject"],
          Resource: [`${arn}/*`]
        }]
      }))
    }).arn
  });
  return bucket;
};

// src/components@next/RestAPI.ts
import * as aws4 from "@pulumi/aws";
import * as pulumi5 from "@pulumi/pulumi";
import * as apigateway2 from "@pulumi/aws-apigateway";
var RestAPI2 = ({
  name,
  routes,
  apiSubdomain
}) => {
  const domainName = `${pulumi5.getStack() !== "prod" || pulumi5.getStack() !== "dev" ? pulumi5.getStack() : ""}-${apiSubdomain}.api${pulumi5.getStack() !== "prod" ? ".dev" : ""}.${new pulumi5.Config().require("rootDomain")}`;
  const gatewayDomainName = new aws4.apigateway.DomainName(
    `${name}_api_domain_name`,
    {
      domainName,
      certificateArn: new pulumi5.Config().require("certificateArn")
    }
  );
  const api = new apigateway2.RestAPI(`${name}_api`, {
    stageName: pulumi5.getStack() === "prod" ? "prod" : "dev",
    routes
  });
  const basepathMapping = new aws4.apigateway.BasePathMapping(
    `${name}_api_base_path_mapping`,
    {
      restApi: api.api.id,
      stageName: pulumi5.getStack() === "prod" ? "prod" : "dev",
      domainName
    }
  );
  const zone = aws4.route53.getZoneOutput({
    name: new pulumi5.Config().require("rootDomain")
  });
  new aws4.route53.Record(`${name}_api_record`, {
    zoneId: zone.zoneId,
    name: domainName,
    type: "A",
    aliases: [
      {
        evaluateTargetHealth: false,
        name: gatewayDomainName.cloudfrontDomainName,
        zoneId: gatewayDomainName.cloudfrontZoneId
      }
    ]
  });
  return {
    api,
    domainName
  };
};

// src/components@next/DynamoTable.ts
import * as aws5 from "@pulumi/aws";
var DynamoTable = ({
  name,
  version,
  iamUser,
  ...props
}) => {
  const table = new aws5.dynamodb.Table(`${name}_table`, {
    ...props,
    tags: {
      Name: `${name}-${version}`
    }
  });
  if (!iamUser)
    return table;
  new aws5.iam.UserPolicyAttachment(`${name}_policy_attachment`, {
    user: iamUser.name,
    policyArn: new aws5.iam.Policy(`${name}_policy`, {
      policy: table.arn.apply(
        (arn) => JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["dynamodb:*"],
              Resource: [arn, `${arn}/index/*`]
            }
          ]
        })
      )
    }).arn
  });
  return table;
};
export {
  DynamoTable,
  GitHubRepository,
  IamUser,
  RestAPI2 as RestAPI,
  S3Bucket,
  TSLambdaCallback
};
