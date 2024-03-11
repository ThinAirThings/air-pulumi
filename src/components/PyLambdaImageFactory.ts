import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import * as docker from "@pulumi/docker";

export const PyLambdaImageFactory = 
    (applicationIamUser: aws.iam.User) =>
    ({
        tag,
        dockerProjectPath,
        environmentVariables,
    }: {
        tag: string;
        dockerProjectPath: string;
        environmentVariables?: Record<string, string>
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
        const lambda = new aws.lambda.Function(`${nameTag}_lambda`, {
            role: lambdaRole.arn,
            imageUri,
            environment: {
                variables: environmentVariables,
            },
        });
        return lambda;
    }
