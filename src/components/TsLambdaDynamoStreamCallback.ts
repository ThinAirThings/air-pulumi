import { Input } from "@pulumi/pulumi";
import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import { DynamoDBStreamEvent } from "aws-lambda";
import { dynamodb } from "@thinairthings/air-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";


export const TsLambdaDynamoStreamCallback = ({
    tag,
    callback,
    environmentVariables,
}: {
    tag: string;
    callback: <T extends Record<string, any>>(payload: T) => Promise<any>;
    environmentVariables?: Input<Record<string, Input<string>>>;
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
        callback: async (event: DynamoDBStreamEvent) => {
            if (!event.Records[0]?.dynamodb?.NewImage) {
                return;
            }
            const payload = unmarshall(event.Records[0].dynamodb.NewImage as any);
            return await callback(payload);
        }
    });
    return lambda;
}