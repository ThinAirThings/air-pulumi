import { APIGatewayProxyEvent } from "aws-lambda";
import { ZodType, infer as InferType } from "zod";

export const validatedCallback = async <T extends ZodType>(
    event: APIGatewayProxyEvent,
    schema: T,
    callback: (payload: InferType<T>) => Promise<any>,
) => {
    const result = schema.safeParse({
        ...event.pathParameters,
        ...event.queryStringParameters,
        ...(!!event.body
            ? event.isBase64Encoded
                ? JSON.parse(
                      Buffer.from(event.body, "base64").toString("utf-8"),
                  )
                : JSON.parse(event.body)
            : {}),
        // Check for directly invoked function
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
