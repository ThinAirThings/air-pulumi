import { Input } from "@pulumi/pulumi";
import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import { DynamoDBStreamEvent } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";


type CallbackFunctionParams = ConstructorParameters<typeof aws.lambda.CallbackFunction>[1]
interface CallbackFunctionExtension<T extends Record<string, any>> extends Omit<CallbackFunctionParams, 'callback'> {
    tag: string;
    callback: (payload: T) => Promise<any>;
    environmentVariables?: Input<Record<string, Input<string>>>;
}

export const TsLambdaDynamoStreamCallback = <T extends Record<string, any>>(props: CallbackFunctionExtension<T>) => {
    // Create nametag
    const nameTag = createNameTag(props.tag).replaceAll("_", "-");
    // Create Lambda
    const lambda = new aws.lambda.CallbackFunction(`${nameTag}-lambda`, {
        runtime: aws.lambda.Runtime.NodeJS20dX,
        timeout: 60 * 15,
        memorySize: 10240,
        environment: {
            variables: {
                ...props.environmentVariables,
            },
        },
        layers: props.layers,
        callback: async (event: DynamoDBStreamEvent) => {
            if (!event.Records[0]?.dynamodb?.NewImage) {
                return;
            }
            const payload = unmarshall(event.Records[0].dynamodb.NewImage as any);
            return await props.callback(payload as any);
        }
    });
    return lambda;
}