import { APIGatewayProxyEvent } from "aws-lambda";
import { TypeOf, ZodObject, ZodVoid, z, ZodString } from "zod";



export const parseLambdaEvent = async <
    P extends ZodObject<any> | ZodVoid,
    E extends ZodObject<Record<string, ZodString>> | ZodVoid
>(
    event: APIGatewayProxyEvent,
    payloadSchema: P,
    stackVariablesSchema: E,
    callback: (payload: TypeOf<P> & TypeOf<E>) => Promise<any>,
) => {
    const result = z.object({})
        .merge(stackVariablesSchema instanceof ZodVoid ? z.object({}) : stackVariablesSchema)
        .merge(payloadSchema instanceof ZodVoid ? z.object({}) : payloadSchema)
        .safeParse({
            ...(stackVariablesSchema instanceof ZodObject
                ? Object.fromEntries(Object.keys(stackVariablesSchema.shape).map((key) => [key, process.env[key]]))
                : {}
            ),
            ...event.pathParameters,
            ...event.queryStringParameters,
            ...(!!event.body
                ? event.isBase64Encoded
                    ? JSON.parse(
                        Buffer.from(event.body, "base64").toString("utf-8"),
                    )
                    : JSON.parse(event.body)
                : {}),
            ...(!!!event.requestContext && !!!event.path ? event : {}),
        });
    if (!result.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Invalid payload",
                errors: result.error.issues,
            }),
        };
    }
    try {
        return {
            headers: {
                "Access-Control-Allow-Origin": event.headers['Origin'] || "*",
            },
            ...await callback(result.data)
        };
    } catch (e) {
        const error = e as Error;
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error",
                error: error.message,
            }),
        };
    }
};
