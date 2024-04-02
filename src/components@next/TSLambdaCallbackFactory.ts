import { ZodType, TypeOf, z, ZodVoid } from "zod";
import * as aws from "@pulumi/aws";
import { APIGatewayProxyEvent } from "aws-lambda";
import { validatedCallback } from "../utils/validatedCallback";
import * as pulumi from "@pulumi/pulumi";


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
    callback: (payload: TypeOf<P>) => Promise<any>;
}) => (...args: E extends ZodVoid ? [] : [{
    environmentVariables: TypeOf<E>
}]) => {
        const lambda = new aws.lambda.CallbackFunction(`${fnName}-lambda`, {
            runtime: aws.lambda.Runtime.NodeJS20dX,
            timeout: 60 * 15,
            memorySize: 10240,
            tags: {
                Name: fnName,
                Organization: pulumi.getOrganization(),
                Project: pulumi.getProject(),
                Stack: pulumi.getStack(),
            },
            environment: {
                variables: {
                    ...args?.[0]?.environmentVariables ?? {},
                },
            },
            callback: async (event: APIGatewayProxyEvent) => {
                return validatedCallback(event, payloadType, callback);
            }
        })
        return lambda;
    }

