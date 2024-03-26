import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";


export const PyLambdaImageFactory =
    (applicationIamUser: aws.iam.User) =>
        ({
            tag,
            dockerProjectPath,
            environmentVariables,
            timeout,
            memorySize
        }: {
            tag: string;
            dockerProjectPath: string;
            environmentVariables?: Record<string, pulumi.Input<string>>;
            timeout?: number;
            memorySize?: number;
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
            // Create SQS Policy
            new aws.iam.RolePolicyAttachment(`${nameTag}_lambda_sqs_policy_attachment`, {
                role: lambdaRole,
                policyArn: aws.iam.ManagedPolicy.AWSLambdaSQSQueueExecutionRole,
            })
            // Create Full Access
            new aws.iam.RolePolicyAttachment(`${nameTag}_lambda_full_access_policy_attachment`, {
                role: lambdaRole,
                policyArn: aws.iam.ManagedPolicy.LambdaFullAccess,
            })
            // DynamoFull Access
            new aws.iam.RolePolicyAttachment(`${nameTag}_lambda_dynamo_policy_attachment`, {
                role: lambdaRole,
                policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess,
            })
            new aws.iam.RolePolicyAttachment(`${nameTag}_lambda_dynamo_execute_policy_attachment`, {
                role: lambdaRole,
                policyArn: aws.iam.ManagedPolicy.AWSLambdaInvocationDynamoDB,
            })
            // Create ECR Repo
            const ecrRepository = new aws.ecr.Repository(`${nameTag}_ecr_repository`, {
                forceDelete: true,
            });
            const authToken = aws.ecr.getAuthorizationTokenOutput({
                registryId: ecrRepository.registryId,
            });

            // Create Docker Image
            const imageTag = `latest-${Math.floor(new Date().getTime() / 1000)}`
            const image = new docker.Image(`${nameTag}_docker_image`, {
                build: {
                    // args: {
                    //     BUILDKIT_INLINE_CACHE: "1",
                    // },
                    // cacheFrom: {
                    //     images: [pulumi.interpolate`${ecrRepository.repositoryUrl}:latest`],
                    // },
                    platform: "linux/amd64",
                    context: `${dockerProjectPath}/`,
                    dockerfile: `${dockerProjectPath}/Dockerfile`
                },
                imageName: pulumi.interpolate`${ecrRepository.repositoryUrl}:${imageTag}`,
                registry: {
                    username: "AWS",
                    password: pulumi.secret(authToken.apply(authToken => authToken.password)),
                    server: ecrRepository.repositoryUrl,
                }
            })
            // Create Lambda
            const lambda = new aws.lambda.Function(`${nameTag}_lambda`, {
                packageType: "Image",
                role: lambdaRole.arn,
                imageUri: image.imageName,
                environment: {
                    variables: environmentVariables,
                },
                timeout: timeout,
                memorySize: memorySize
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
        }
