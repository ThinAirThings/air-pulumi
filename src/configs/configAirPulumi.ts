import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { DynamoTableFactory } from "../components/DynamoTableFactory";
import { VercelDeploymentFactory } from "../components/VercelDeploymentFactory";
import { TsLambdaCallbackFactory } from "../components/TsLambdaCallbackFactory";
import { PyLambdaCallbackFactory } from "../components/PyLambdaCallbackFactory";
import { getDynamoTableFactory } from "../getters/getDynamoTableFactory";
import { PyLambdaImageFactory } from "../components/PyLambdaImageFactory";
import { NodeTableFactory } from "../components/NodeTableFactory";

export const configAirPulumi = () => {
    // Create IAM User
    const iamUser = new aws.iam.User(createNameTag("iamUser"), {
        path: `/${pulumi.getProject()}/${pulumi.getStack()}/application/`,
    });
    // Create Access Key
    const accessKey = new aws.iam.AccessKey(createNameTag("accessKey"), {
        user: iamUser.name,
    });
    
    const DynamoTable = DynamoTableFactory(iamUser);
    return {
        iamUser,
        accessKey,
        DynamoTable,
        NodeTable: NodeTableFactory(DynamoTable),
        getDynamoTable: getDynamoTableFactory(iamUser),
        VercelDeployment: VercelDeploymentFactory(accessKey),
        TsLambdaCallback: TsLambdaCallbackFactory(iamUser),
        PyLambdaCallback: PyLambdaCallbackFactory(iamUser),
        PyLambdaImage: PyLambdaImageFactory(iamUser)
    };
};
