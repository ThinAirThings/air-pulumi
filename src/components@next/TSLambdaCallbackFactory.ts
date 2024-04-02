import { ZodType, TypeOf, z, ZodVoid, ZodObject } from "zod";
import * as aws from "@pulumi/aws";
import { APIGatewayProxyEvent } from "aws-lambda";
import { validatedCallback } from "../utils/validatedCallback";
import * as pulumi from "@pulumi/pulumi";

export const TSLambdaCallbackFactory = <
    P extends ZodObject<any>,
    E extends ZodObject<any> | ZodVoid = ZodVoid
>({
    fnName,
    stackVariablesType,
    payloadType,
    callback
}: {
    fnName: string;
    stackVariablesType?: () => E;
    payloadType: () => P
    callback: (payload: (TypeOf<P> & TypeOf<E>)) => Promise<any>;
}) => (...args: E extends ZodVoid ? [] : [{
    stackVariables: pulumi.Input<TypeOf<E>>
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
                    ...args?.[0]?.stackVariables ?? {},
                },
            },
            callback: async (event: APIGatewayProxyEvent) => {
                return validatedCallback(
                    event,
                    payloadType(),
                    stackVariablesType?.() as undefined | ZodObject<any>,
                    callback
                );
            }
        })
        return lambda;
    }


const fn = TSLambdaCallbackFactory({
    fnName: "test",
    payloadType: () => z.object({
        test: z.string()
    }),
    stackVariablesType: () => z.object({
        test2: z.string()
    }),
    callback: async (payload) => {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Hello from lambda",
                payload
            })
        }
    }
})
