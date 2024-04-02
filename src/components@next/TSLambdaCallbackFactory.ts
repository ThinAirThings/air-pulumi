import { ZodType, infer as InferType, z, ZodVoid } from "zod";
import * as aws from "@pulumi/aws";
import { APIGatewayProxyEvent } from "aws-lambda";
import { validatedCallback } from "../utils/validatedCallback";


export const TSLambdaCallbackFactory = <
    P extends ZodType,
    E extends ZodType = ZodVoid
>({
    fnName,
    environmentVariables,
    payloadType,
    callback
}: {
    fnName: string;
    environmentVariables?: E;
    payloadType: P
    callback: (payload: InferType<P>) => Promise<any>;
}) => (...args: E extends ZodVoid ? [] : [{
    environmentVariables: InferType<E>
}]) => {
        const lambda = new aws.lambda.CallbackFunction(`${fnName}-lambda`, {
            runtime: aws.lambda.Runtime.NodeJS20dX,
            timeout: 60 * 15,
            memorySize: 10240,
            environment: {
                variables: {
                    ...args[0].environmentVariables,
                },
            },
            callback: async (event: APIGatewayProxyEvent) => {
                return validatedCallback(event, payloadType, callback);
            }
        })
        return lambda;
    }

