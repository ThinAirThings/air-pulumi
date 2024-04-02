import { APIGatewayProxyEvent } from "aws-lambda";
import { ZodType, infer as InferType, ZodObject, ZodVoid } from "zod";

export const validatedCallback = async <
    P extends ZodObject<any>,
    E extends ZodObject<any> | undefined
>(
    event: APIGatewayProxyEvent,
    payloadSchema: P,
    stackVariablesSchema: E,
    callback: (payload: InferType<P>) => Promise<any>,
) => {

    const result = payloadSchema.safeParse({
        ...(typeof stackVariablesSchema !== "undefined"
            ? Object.fromEntries(Object.keys(stackVariablesSchema.shape).map(([key]) => [key, process.env[key]]))
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
        return await callback(result.data);
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
