import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import { ZodType, z, infer as InferType } from "zod";
import { Input } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import path = require("path");
import fs = require("fs");
import os = require("os");
import { LayerVersion } from "@pulumi/aws/lambda";

export const PyLambdaCallbackFactory =
    (applicationIamUser: aws.iam.User) =>
    ({
        tag,
        codePath,
        environmentVariables,
    }: {
        tag: string;
        codePath: string;
        environmentVariables?: Input<Record<string, Input<string>>>
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
            policyArn: aws.iam.ManagedPolicy.LambdaFullAccess,
        })

        // Check if the 'venv' directory exists within the 'codePath'
        const dependencyPath = path.join(codePath, 'venv', 'lib', 'python3.11', 'site-packages');
        const hasDependencies = fs.existsSync(dependencyPath);
        let lambdaLayer: LayerVersion | undefined;
        if (hasDependencies) {
            // Define the target path as 'python' to match the Lambda Layer structure
            const layerTargetPath = path.join(os.tmpdir(), 'python');

            // Ensure the target directory exists
            if (!fs.existsSync(layerTargetPath)) {
                fs.mkdirSync(layerTargetPath, { recursive: true });
            }

            // Copy dependencies from the source path to the target path
            fs.readdirSync(dependencyPath).forEach((file) => {
                const srcPath = path.join(dependencyPath, file);
                const destPath = path.join(layerTargetPath, file);
                
                // Copy file or directory
                const stat = fs.statSync(srcPath);
                if (stat.isDirectory()) {
                    fs.cpSync(srcPath, destPath, { recursive: true });
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            });
            // Upload the dependencies to S3
            const bucket = new aws.s3.Bucket(`${nameTag}-lambda-layer-bucket`);
            const object = new aws.s3.BucketObject(`${nameTag}-lambda-layer-object`, {
                bucket: bucket,
                source: new pulumi.asset.AssetArchive({
                    "python": new pulumi.asset.FileArchive(layerTargetPath),
                }),
            });
            // Create Lambda Layer if necessary
            lambdaLayer = new aws.lambda.LayerVersion(`${nameTag}-lambda-layer`, {
                compatibleRuntimes: [aws.lambda.Runtime.Python3d11],
                // code: new pulumi.asset.AssetArchive({
                //     "python": new pulumi.asset.FileArchive(layerTargetPath),
                // }),
                s3Bucket: bucket.bucket,
                s3Key: object.key,
                layerName: `${nameTag}-lambda-layer`,
                description: `${nameTag} dependencies`,
            })
        }

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
                ".": new pulumi.asset.FileArchive(path.join(codePath, "src"))
            }),
            handler: "index.handler",
            layers: lambdaLayer ? [lambdaLayer.arn] : undefined,
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