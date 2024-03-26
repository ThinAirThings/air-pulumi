import { Input } from "@pulumi/pulumi";
import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import { DynamoDBStreamEvent, SQSEvent } from "aws-lambda";
import { dynamodb } from "@thinairthings/air-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export const TsLambdaSQSCallback = <T extends Record<string, any>>({
    tag,
    callback,
    environmentVariables,
    layers,
}: {
    tag: string;
    callback: (payload: T) => Promise<any>;
    environmentVariables?: Input<Record<string, Input<string>>>;
    layers?: Input<Input<string>[]>;
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create Lambda
    const lambda = new aws.lambda.CallbackFunction(`${nameTag}-lambda`, {
        runtime: aws.lambda.Runtime.NodeJS20dX,
        timeout: 60 * 15,
        memorySize: 10240,
        environment: {
            variables: {
                ...environmentVariables,
            },
        },
        layers: layers,
        callback: async (event: SQSEvent) => {
            return await callback(event as any);
        }
    });
    return lambda;
}