import { ZodType, infer as InferType } from "zod";
import * as aws from "@pulumi/aws";
import { APIGatewayProxyEvent } from "aws-lambda";
import { validatedCallback } from "../utils/validatedCallback";


export const TSLambdaCallbackFactory = <
    E extends ZodType,
    P extends ZodType
>({
    fnName,
    environmentVariables,
    payloadType,
    callback
}: {
    fnName: string;
    environmentVariables: E;
    payloadType: P
    callback: (payload: InferType<P>) => Promise<any>;
}) => ({
    environmentVariables
}: {
    environmentVariables: InferType<E>;
}) => {
        const lambda = new aws.lambda.CallbackFunction(`${fnName}-lambda`, {
            runtime: aws.lambda.Runtime.NodeJS12dX,
            timeout: 60 * 15,
            memorySize: 10240,
            environment: {
                variables: {
                    ...environmentVariables,
                },
            },
            callback: async (event: APIGatewayProxyEvent) => {
                return validatedCallback(event, payloadType, callback);
            }
        })
        return lambda;
    }