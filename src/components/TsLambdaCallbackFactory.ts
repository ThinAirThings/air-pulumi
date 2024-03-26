import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import { validatedCallback } from "../utils/validatedCallback";
import { ZodType, z, infer as InferType } from "zod";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Input } from "@pulumi/pulumi";

export const TsLambdaCallbackFactory =
    (applicationIamUser: aws.iam.User) =>
        <T extends ZodType>({
            tag,
            payloadType,
            callback,
            environmentVariables,
            layers
        }: {
            tag: string;
            payloadType: () => T;
            callback: (payload: InferType<T>) => Promise<any>;
            environmentVariables?: Input<Record<string, Input<string>>>;
            layers?: Input<Input<string>[]>;
        }) => {
            // Create nametag
            const nameTag = createNameTag(tag).replaceAll("_", "-");
            // Create Lambda
            const lambda = new aws.lambda.CallbackFunction(`${nameTag}-lambda`, {
                runtime: aws.lambda.Runtime.NodeJS20dX,
                timeout: 60 * 15,
                layers: layers,
                memorySize: 10240,
                environment: {
                    variables: {
                        ...environmentVariables,
                    },
                },
                callback: async (event: APIGatewayProxyEvent) =>
                    validatedCallback(event, payloadType(), callback),
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
