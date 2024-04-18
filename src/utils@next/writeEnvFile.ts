import * as pulumi from "@pulumi/pulumi";
import { writeFile, writeFileSync } from "fs";
import path = require("path");




export const writeEnvFile = async (
    env: Record<string, pulumi.Output<string> | string>
) => {
    pulumi.all(Object.values(env))
        .apply((values): void => {
            writeFileSync(path.join(process.cwd(), '.env.out'), `
        ${Object.keys(env).map((key, i) => `${key}=${values[i]}`).join('\n').trim()}
    `.trim())
        })
}