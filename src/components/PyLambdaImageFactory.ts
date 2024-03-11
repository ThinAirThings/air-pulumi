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
    }: {
        tag: string;
        dockerProjectPath: string;
        environmentVariables?: Record<string, pulumi.Input<string>>
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
        // Create ECR Repo
        const ecrRepository = new aws.ecr.Repository(`${nameTag}_ecr_repository`);
        const ecrAuthToken = aws.ecr.getAuthorizationTokenOutput({
            registryId: ecrRepository.registryId,
        });

        // Create Docker Image
        const image = new docker.Image(`${nameTag}_docker_image`, {
            imageName: `${nameTag}:latest`,
            build: {
                context: `${dockerProjectPath}/`,
                dockerfile: `${dockerProjectPath}/Dockerfile`
            },
            registry: {
                server: ecrRepository.repositoryUrl,
                password: pulumi.secret(ecrAuthToken.apply(authToken => authToken.password)),
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
