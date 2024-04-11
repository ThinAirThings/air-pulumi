// const fn = TSLambdaCallbackFactory({
//     fnName: "test",
//     payloadType: () => z.object({
//         test: z.string()
//     }),
//     stackVariablesType: () => z.object({
//         test2: z.string()
//     }),
//     callback: async (payload) => {
//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 message: "Hello from lambda",
//                 payload
//             })
//         }
//     }
// })

// fn({
//     stackVariables: {
//         test2: "test" as unknown as pulumi.Output<string>
//     }
// })