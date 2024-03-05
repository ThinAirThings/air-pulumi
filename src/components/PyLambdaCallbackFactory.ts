import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import { ZodType, z, infer as InferType } from "zod";
import { Input } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import path = require("path");

export const PyLambdaCallbackFactory =
    (applicationIamUser: aws.iam.User) =>
    ({
        tag,
        codePath,
        environmentVariables,
    }: {
        tag: string;
        codePath: string;
        environmentVariables?: Input<Record<string, Input<string>>>;
    }) => {
        // Create nametag
        const nameTag = createNameTag(tag).replaceAll("_", "-");
        // Create Lambda Permissions
        // Configure IAM so that the AWS Lambda can be run.
        const lambdaRole = new aws.iam.Role(`${nameTag}_lambda_role`, {
            assumeRolePolicy: {
                Version: "2012-10-17",
                Statement: [{
                    Action: "sts:AssumeRole",
                    Principal: {
                        Service: "lambda.amazonaws.com",
                    },
                    Effect: "Allow",
                    Sid: "",
                }],
            },
        })
        // Create Lambda Policy
        new aws.iam.RolePolicyAttachment(`${nameTag}_lambda_policy_attachment`, {
            role: lambdaRole,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaExecute,
        })
        // Create Lambda
        const lambda = new aws.lambda.Function(`${nameTag}-lambda`, {
            role: lambdaRole.arn,
            runtime: aws.lambda.Runtime.Python3d11,
            timeout: 60 * 15,
            memorySize: 10240,
            environment: {
                variables: {
                    ...environmentVariables,
                },
            },
            code: new pulumi.asset.AssetArchive({
                ".": new pulumi.asset.FileArchive(codePath),
                "deps": new pulumi.asset.FileArchive(path.join(codePath, "venv", "lib", "python3.10", "site-packages")),
            }),
            handler: "index.handler"
        });
        // Set Permissions
        new aws.iam.UserPolicyAttachment(`${nameTag}_policy_attachment`, {
            user: applicationIamUser.name,
            policyArn: new aws.iam.Policy(`${nameTag}_policy`, {
                policy: lambda.arn.apply((arn) =>
                    JSON.stringify({
                        Version: "2012-10-17",
                        Statement: [
                            {
                                Effect: "Allow",
                                Action: ["lambda:InvokeFunction"],
                                Resource: arn,
                            },
                        ],
                    }),
                ),
            }).arn,
        });
        return lambda;
    };